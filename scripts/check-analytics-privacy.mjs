import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const measurementId = "G-ZQJ4LRG4GN";
const eventNames = new Set([
  "page_view", "scroll", "user_engagement", "session_start", "first_visit", "funnel_cta_click", "whatsapp_click",
  "auth_intent", "signup_submit", "sign_up", "contact_form_submit", "seller_application_submit",
  "onboarding_completed", "activation_started", "activation_milestone", "onboarding_template_selected",
]);
const forbiddenEvents = new Set(["view_search_results", "click", "form_start", "form_submit", "video_start", "video_progress", "video_complete", "file_download"]);
const reportableEvents = new Set([...eventNames, ...forbiddenEvents]);
const marker = /qa-(?:redaction|token|fragment)|private-referrer|privacy-gate-synthetic/i;
const privateKey = /(?:^|[._])(?:email|phone|full_name|allowed_domain|warranty_id|document_id|serial_number|password|token|message|reason|user_id|uid)$/i;
const modes = ["denied", "marketing_only", "malformed", "storage_unavailable", "storage_write_unavailable", "storage_readonly_grant", "withdrawal_write_failure", "analytics"];
const phases = ["initial", "whatsapp", "scroll", "cta", "path", "query", "withdrawal", "withdrawn", "regrant", "regrant_path", "regrant_cta", "cross_tab_withdrawal", "cross_tab_withdrawn", "cross_tab_regrant", "cross_tab_path", "cross_tab_cta", "private_path", "private_ar_path"];
const maskedPaths = new Set(["/en/approval/[id]", "/ar/verify/[id]"]);

function decodedMarker(value) {
  let text = String(value);
  for (let i = 0; i < 3; i++) {
    if (marker.test(text)) return true;
    try { const next = decodeURIComponent(text); if (next === text) break; text = next; } catch { break; }
  }
  return false;
}

function safeEvent(params) {
  const names = params.getAll("en");
  const name = names.length === 1 ? names[0] : "";
  let locationSafe = false;
  let referrerSafe = true;
  let privatePathMasked = false;
  try {
    const locations = params.getAll("dl");
    if (locations.length === 1) {
      const url = new URL(locations[0]);
      privatePathMasked = maskedPaths.has(url.pathname);
      locationSafe = url.origin === "https://warrantee.io" && !url.username && !url.password &&
        !url.search && !url.hash && (["/en/pricing", "/ar/pricing"].includes(url.pathname) || privatePathMasked);
    }
    for (const value of params.getAll("dr")) {
      if (!value) continue;
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") referrerSafe = false;
    }
  } catch { referrerSafe = false; }
  return {
    event: reportableEvents.has(name) ? name : "unexpected",
    parsed: Boolean(name),
    expectedProperty: params.getAll("tid").length > 0 && params.getAll("tid").every((id) => id === measurementId),
    locationSafe,
    privatePathMasked,
    referrerSafe,
    markerFree: ![...params].some(([key, value]) => decodedMarker(key) || decodedMarker(value)),
    privateFieldsAbsent: ![...params.keys()].some((key) => privateKey.test(key)),
    allowedEvent: eventNames.has(name) && !forbiddenEvents.has(name),
  };
}

const invalidEvent = () => ({ event: "unexpected", parsed: false, expectedProperty: false, locationSafe: false, privatePathMasked: false, referrerSafe: false, markerFree: false, privateFieldsAbsent: false, allowedEvent: false });

// Never return raw URLs, arbitrary event names, parameter values, or request bodies.
export function parseCollectorEvents(requestUrl, body = "") {
  try {
    const base = new URL(requestUrl).searchParams;
    if (body.length > 1024 * 1024) return [invalidEvent()];
    if (body.trimStart().startsWith("{")) {
      const json = JSON.parse(body);
      if (!Array.isArray(json.events) || !json.events.length || json.events.length > 200) return [invalidEvent()];
      return json.events.map((event) => {
        const params = new URLSearchParams(base);
        params.set("en", typeof event.name === "string" ? event.name : "");
        for (const [key, value] of Object.entries(event.params ?? {})) {
          params.append(key === "page_location" ? "dl" : key === "page_referrer" ? "dr" : key, typeof value === "string" ? value : JSON.stringify(value));
        }
        if (json.user_id !== undefined) params.append("user_id", String(json.user_id));
        return safeEvent(params);
      });
    }
    const lines = body ? body.split(/\r?\n/).filter((line) => line.trim()) : [""];
    if (!lines.length || lines.length > 200) return [invalidEvent()];
    return lines.map((line) => safeEvent(new URLSearchParams([...base, ...new URLSearchParams(line)])));
  } catch { return [invalidEvent()]; }
}

export function createCaseState(mode) {
  if (!modes.includes(mode)) throw new Error("unsupported_mode");
  return {
    mode, phase: "initial", events: [], collectorRequests: 0, writesBlocked: 0, externalBlocked: 0,
    scriptLoads: 0, bootstrapReads: 0, guardFailures: 0, pageErrors: 0, lastActivity: Date.now(),
    initialScriptLoads: 0, finalScriptLoads: 0, actionsCompleted: false, storageFailureObserved: false, healthyDocument: false,
  };
}

function isCollector(url) {
  return /\/(?:collect|batch)\/?$/.test(url.pathname);
}

export function createNetworkGuard(origin, state, candidateSources = null) {
  return async (route) => {
    try {
      const request = route.request();
      const url = new URL(request.url());
      if (isCollector(url)) {
        state.collectorRequests++;
        state.lastActivity = Date.now();
        state.events.push(...parseCollectorEvents(request.url(), request.postData() || "").map((event) => ({ ...event, phase: state.phase })));
        return await route.fulfill({ status: 204, body: "" });
      }
      if (url.origin === origin) {
        if (!["GET", "HEAD"].includes(request.method()) || url.pathname.startsWith("/api/") || url.pathname.startsWith("/monitoring")) {
          state.writesBlocked++;
          return await route.fulfill({ status: 204, body: "" });
        }
        if (["/agent-bootstrap/analytics/gtm.js", "/agent-bootstrap/analytics/ga.js"].includes(url.pathname)) {
          state.bootstrapReads++;
          if (candidateSources) return await route.fulfill({ status: 200, contentType: "application/javascript", body: candidateSources[url.pathname] });
        }
        return await route.continue();
      }
      if (url.protocol === "https:" && url.hostname === "www.googletagmanager.com" && request.method() === "GET" && request.resourceType() === "script") {
        state.scriptLoads++;
        state.lastActivity = Date.now();
        return await route.continue();
      }
      state.externalBlocked++;
      return await route.abort("blockedbyclient");
    } catch {
      state.guardFailures++;
      // A guard failure must never fall through to the network.
      try { await route.abort("blockedbyclient"); } catch { /* Already handled requests cannot be aborted twice. */ }
    }
  };
}

export function summarizeCase(state) {
  const counts = Object.fromEntries(phases.map((phase) => [phase, {}]));
  for (const entry of state.events) {
    const phase = phases.includes(entry.phase) ? entry.phase : "initial";
    const event = reportableEvents.has(entry.event) ? entry.event : "unexpected";
    counts[phase][event] = (counts[phase][event] || 0) + 1;
  }
  const count = (phase, event) => counts[phase][event] || 0;
  const phaseCount = (phase) => Object.values(counts[phase]).reduce((sum, value) => sum + value, 0);
  const analytics = state.mode === "analytics";
  const consented = analytics || state.mode === "withdrawal_write_failure";
  const checks = {
    actionsCompleted: state.actionsCompleted,
    bootstrapObserved: state.bootstrapReads > 0,
    noGuardFailures: state.guardFailures === 0,
    noPageErrors: state.pageErrors === 0,
    healthyDocument: state.healthyDocument,
    collectorsParsed: state.events.every((entry) => entry.parsed),
    exactProperty: state.events.every((entry) => entry.expectedProperty),
    privateValuesAbsent: state.events.every((entry) => entry.markerFree && entry.privateFieldsAbsent),
    locationsSanitized: state.events.every((entry) => entry.locationSafe && entry.referrerSafe),
    onlyExpectedEvents: state.events.every((entry) => entry.allowedEvent),
    deniedModesQuiet: consented || (state.collectorRequests === 0 && state.scriptLoads === 0),
    initialPageViewExactlyOnce: !consented || count("initial", "page_view") === 1,
    whatsappExactlyOnce: !consented || state.events.filter((entry) => entry.event === "whatsapp_click").length === 1 && count("whatsapp", "whatsapp_click") === 1,
    customCtaExactlyOnce: !consented || count("cta", "funnel_cta_click") === 1,
    pathPageViewExactlyOnce: !consented || count("path", "page_view") === 1,
    scrollObserved: !consented || state.events.some((entry) => entry.event === "scroll"),
    queryOnlyNoPageView: count("query", "page_view") === 0,
    withdrawnQuiet: phaseCount("withdrawal") === 0 && phaseCount("withdrawn") === 0,
    regrantNoTagReload: !consented || state.initialScriptLoads > 0 && state.initialScriptLoads === state.finalScriptLoads,
    regrantNoDuplicatePageView: count("regrant", "page_view") === 0,
    regrantPathExactlyOnce: !analytics || count("regrant_path", "page_view") === 1,
    regrantCtaExactlyOnce: !analytics || count("regrant_cta", "funnel_cta_click") === 1,
    crossTabWithdrawalQuiet: phaseCount("cross_tab_withdrawal") === 0 && phaseCount("cross_tab_withdrawn") === 0,
    crossTabRegrantNoDuplicatePageView: count("cross_tab_regrant", "page_view") === 0,
    crossTabPathExactlyOnce: !analytics || count("cross_tab_path", "page_view") === 1,
    crossTabCtaExactlyOnce: !analytics || count("cross_tab_cta", "funnel_cta_click") === 1,
    privatePathsMasked: !analytics || ["private_path", "private_ar_path"].every(phase => count(phase, "page_view") === 1 && state.events.filter(entry => entry.phase === phase && entry.event === "page_view").every(entry => entry.privatePathMasked)),
    storageFailureExercised: !(state.mode.startsWith("storage_") || state.mode === "withdrawal_write_failure") || state.storageFailureObserved,
  };
  return {
    mode: state.mode,
    pass: Object.values(checks).every(Boolean), checks, events: counts,
    network: { collectorRequestsIntercepted: state.collectorRequests, collectorEventsParsed: state.events.length, firstPartyRequestsBlocked: state.writesBlocked, externalBlocked: state.externalBlocked, tagScriptLoads: state.scriptLoads },
  };
}

async function quiesce(page, state, settleMs) {
  const started = Date.now();
  while (Date.now() - started < settleMs + 15000) {
    await page.waitForTimeout(200);
    if (Date.now() - started >= settleMs && Date.now() - state.lastActivity >= 1500) return;
  }
  throw new Error("collector_not_quiescent");
}

async function consent(page, allowed) {
  await page.evaluate((analytics) => {
    localStorage.setItem("warrantee_cookie_consent", JSON.stringify({ necessary: true, analytics, marketing: false, timestamp: new Date().toISOString() }));
    window.dispatchEvent(new CustomEvent("warrantee_cookie_consent_updated"));
  }, allowed);
}

async function historyPath(page, pathname, queryOnly = false) {
  await page.evaluate((value) => history.pushState({}, "", value), `${pathname}?email=qa-redaction%40example.invalid&token=qa-token&q=${queryOnly ? "qa-redaction-query-only" : "qa-redaction"}#qa-fragment`);
}

async function clickSynthetic(page, selector) {
  const link = page.locator(selector).first();
  if (await link.count() !== 1) throw new Error("required_synthetic_link_missing");
  // Run the actual application click handler, but capture-phase prevention disallows navigation.
  await link.evaluate((element) => element.click());
}

export async function runAnalyticsPrivacyGate({ baseUrl, candidateBootstrap = false, channel = "chrome", settleMs = 6000 }) {
  const url = new URL(baseUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("origin_only_target_required");
  const origin = url.origin;
  const { chromium, devices } = await import("@playwright/test");
  let candidateSources = null;
  if (candidateBootstrap) {
    const { buildGaBootstrap, buildGtmBootstrap } = await import("../src/lib/analytics-bootstrap.mjs");
    candidateSources = {
      "/agent-bootstrap/analytics/gtm.js": buildGtmBootstrap("GTM-WFLBH83M", measurementId),
      "/agent-bootstrap/analytics/ga.js": buildGaBootstrap(measurementId),
    };
  }
  const browser = await chromium.launch({
    ...(channel === "chromium" ? {} : { channel }),
    args: ["--disable-background-networking", "--disable-component-update", "--disable-sync", "--no-first-run"],
  });
  const cases = [];
  try {
    for (const mode of modes) {
      const state = createCaseState(mode);
      const context = await browser.newContext({ serviceWorkers: "block", userAgent: `Warrantee-QA/1.0 ${devices["Desktop Chrome"].userAgent}` });
      try {
        await context.route("**/*", createNetworkGuard(origin, state, candidateSources));
        await context.routeWebSocket("**/*", (socket) => { state.externalBlocked++; socket.close(); });
        await context.addInitScript(({ mode }) => {
          try {
            if (mode === "storage_unavailable") {
              Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("Synthetic storage denial", "SecurityError"); } });
            } else if (mode === "storage_write_unavailable" || mode === "storage_readonly_grant") {
              if (mode === "storage_readonly_grant") localStorage.setItem("warrantee_cookie_consent", JSON.stringify({ necessary: true, analytics: true, marketing: false }));
              Object.defineProperty(Storage.prototype, "setItem", { configurable: true, value() { throw new DOMException("Synthetic storage write denial", "QuotaExceededError"); } });
            } else if (mode !== "withdrawal_write_failure" && !localStorage.getItem("__warranteePrivacyGateSeeded")) {
              localStorage.setItem("warrantee_cookie_consent", JSON.stringify({ necessary: true, analytics: mode === "malformed" ? "false" : mode === "analytics", marketing: mode === "malformed" ? "false" : mode === "marketing_only", timestamp: new Date().toISOString() }));
              localStorage.setItem("__warranteePrivacyGateSeeded", "1");
            }
          } catch { /* Some third-party frames have no storage access. */ }
          document.addEventListener("click", (event) => {
            if (event.target.closest?.("a")) event.preventDefault();
          }, true);
          document.addEventListener("submit", (event) => event.preventDefault(), true);
        }, { mode });
        const page = await context.newPage();
        page.on("pageerror", () => { state.pageErrors++; });
        const response = await page.goto(`${origin}/en/pricing?email=qa-redaction%40example.invalid&token=qa-token&utm_source=qa-redaction&utm_campaign=qa-token&q=qa-redaction#qa-fragment`, {
          waitUntil: "domcontentloaded", referer: "https://reference.example.invalid/private-referrer?email=qa-redaction@example.invalid#qa-fragment",
        });
        if (response?.status() !== 200) throw new Error("pricing_document_not_ready");
        await page.waitForFunction(() => typeof window.gtag === "function");
        if (mode === "storage_unavailable") state.storageFailureObserved = await page.evaluate(() => {
          try { window.localStorage.getItem("warrantee_cookie_consent"); return false; } catch { return true; }
        });
        if (mode === "storage_write_unavailable" || mode === "storage_readonly_grant") {
          state.storageFailureObserved = await page.evaluate(() => {
            try { localStorage.setItem("__warranteeBlockedWriteProbe", "1"); return false; } catch { return true; }
          });
          if (mode === "storage_write_unavailable") await page.getByRole("button", { name: "Accept All", exact: true }).click();
        }
        if (mode === "withdrawal_write_failure") {
          // Keep the primary banner open while another tab grants consent.
          await page.getByRole("button", { name: "Reject All", exact: true }).waitFor();
          const sibling = await context.newPage();
          const siblingResponse = await sibling.goto(`${origin}/auth.md`, { waitUntil: "domcontentloaded" });
          if (siblingResponse?.status() !== 200) throw new Error("consent_sibling_document_not_ready");
          await sibling.evaluate(() => localStorage.setItem("warrantee_cookie_consent", JSON.stringify({ analytics: true, marketing: false })));
          await page.waitForFunction(id => window[`ga-disable-${id}`] === false, measurementId);
          await sibling.close();
        }
        await quiesce(page, state, settleMs);
        state.healthyDocument = await page.locator('[data-testid="pricing-card-personal-free"]').count() === 1;
        if (!state.healthyDocument) throw new Error("pricing_document_not_healthy");
        state.initialScriptLoads = state.scriptLoads;
        state.phase = "whatsapp";
        await clickSynthetic(page, 'a[href*="wa.me"]');
        await quiesce(page, state, settleMs);
        state.phase = "scroll";
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await quiesce(page, state, settleMs);
        state.phase = "cta";
        await clickSynthetic(page, '[data-testid="pricing-card-personal-free"] a');
        await quiesce(page, state, settleMs);
        state.phase = "path";
        await historyPath(page, "/ar/pricing");
        await quiesce(page, state, settleMs);
        state.phase = "query";
        await historyPath(page, "/ar/pricing", true);
        await quiesce(page, state, settleMs);
        if (mode === "withdrawal_write_failure") {
          await page.evaluate(() => Object.defineProperty(Storage.prototype, "setItem", { configurable: true, value() { throw new DOMException("Synthetic withdrawal write denial", "QuotaExceededError"); } }));
          state.storageFailureObserved = await page.evaluate(() => {
            try { localStorage.setItem("__warranteeBlockedWriteProbe", "1"); return false; } catch { return true; }
          });
          state.phase = "withdrawal";
          await page.getByRole("button", { name: /^(Reject All|\u0631\u0641\u0636 \u0627\u0644\u0643\u0644)$/ }).click();
          await page.waitForFunction(id => window[`ga-disable-${id}`] === true && window.__warranteeConsentStorageFailed === true, measurementId);
          await quiesce(page, state, settleMs);
          state.phase = "withdrawn";
          await historyPath(page, "/en/pricing");
          await clickSynthetic(page, '[data-testid="pricing-card-personal-free"] a');
          await quiesce(page, state, settleMs);
        }
        if (mode === "analytics") {
          state.phase = "withdrawal";
          await consent(page, false);
          await quiesce(page, state, settleMs);
          state.phase = "withdrawn";
          await historyPath(page, "/en/pricing");
          await clickSynthetic(page, '[data-testid="pricing-card-personal-free"] a');
          await quiesce(page, state, settleMs);
          state.phase = "regrant";
          await consent(page, true);
          await consent(page, true);
          await quiesce(page, state, settleMs);
          state.phase = "regrant_path";
          await historyPath(page, "/ar/pricing");
          await quiesce(page, state, settleMs);
          state.phase = "regrant_cta";
          await clickSynthetic(page, '[data-testid="pricing-card-personal-free"] a');
          await quiesce(page, state, settleMs);
          // A second same-origin document must trigger a real browser storage event.
          const sibling = await context.newPage();
          sibling.on("pageerror", () => { state.pageErrors++; });
          const siblingResponse = await sibling.goto(`${origin}/auth.md`, { waitUntil: "domcontentloaded" });
          if (siblingResponse?.status() !== 200) throw new Error("consent_sibling_document_not_ready");
          await quiesce(page, state, settleMs);
          state.phase = "cross_tab_withdrawal";
          await sibling.evaluate(() => localStorage.setItem("warrantee_cookie_consent", JSON.stringify({ analytics: false, marketing: false })));
          await page.waitForFunction(id => window[`ga-disable-${id}`] === true, measurementId);
          await quiesce(page, state, settleMs);
          state.phase = "cross_tab_withdrawn";
          await historyPath(page, "/en/pricing");
          await clickSynthetic(page, '[data-testid="pricing-card-personal-free"] a');
          await quiesce(page, state, settleMs);
          state.phase = "cross_tab_regrant";
          await sibling.evaluate(() => localStorage.setItem("warrantee_cookie_consent", JSON.stringify({ analytics: true, marketing: false })));
          await page.waitForFunction(id => window[`ga-disable-${id}`] === false, measurementId);
          await quiesce(page, state, settleMs);
          state.phase = "cross_tab_path";
          await historyPath(page, "/ar/pricing");
          await quiesce(page, state, settleMs);
          state.phase = "cross_tab_cta";
          await clickSynthetic(page, '[data-testid="pricing-card-personal-free"] a');
          await quiesce(page, state, settleMs);
          await sibling.close();
          state.phase = "private_path";
          await historyPath(page, "/en/approval/qa-token-private-record");
          await quiesce(page, state, settleMs);
          state.phase = "private_ar_path";
          await historyPath(page, "/ar/verify/qa-token-private-record");
          await quiesce(page, state, settleMs);
        }
        state.finalScriptLoads = state.scriptLoads;
        state.healthyDocument = await page.locator('[data-testid="pricing-card-personal-free"]').count() === 1;
        state.actionsCompleted = true;
      } catch {
        state.actionsCompleted = false;
      } finally {
        await context.close();
      }
      cases.push(summarizeCase(state));
    }
  } finally { await browser.close(); }
  return {
    schemaVersion: 1, experimentalOverride: candidateBootstrap, servedBootstrapVerified: !candidateBootstrap && cases.every((entry) => entry.pass),
    pass: cases.length === modes.length && cases.every((entry) => entry.pass),
    actualCollectorRequests: 0, actualApplicationWrites: 0, cases,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const candidateBootstrap = args.includes("--candidate-bootstrap");
    const baseUrl = args.find((arg) => !arg.startsWith("--"));
    if (!baseUrl || args.some((arg) => arg.startsWith("--") && !["--candidate-bootstrap", "--chromium"].includes(arg))) throw new Error("origin_required");
    const proof = await runAnalyticsPrivacyGate({ baseUrl, candidateBootstrap, channel: args.includes("--chromium") ? "chromium" : "chrome" });
    console.log(JSON.stringify(proof, null, 2));
    if (!proof.pass) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({ schemaVersion: 1, pass: false, error: "privacy_gate_incomplete" }));
    process.exitCode = 1;
  }
}
