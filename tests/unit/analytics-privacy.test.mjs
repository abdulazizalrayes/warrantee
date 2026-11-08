import { describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { createCaseState, createNetworkGuard, parseCollectorEvents, summarizeCase } from "../../scripts/check-analytics-privacy.mjs";

const base = "https://www.google-analytics.com/g/collect?tid=G-ZQJ4LRG4GN&v=2";
const location = "https://warrantee.io/en/pricing";
const payload = (name, extras = {}) => new URLSearchParams({ en: name, dl: location, dr: "https://reference.example.invalid", ...extras }).toString();

describe("collector parsing with captured-shape synthetic fixtures", () => {
  it("parses a GET collector request without exposing parameter values", () => {
    const events = parseCollectorEvents(`${base}&${payload("page_view")}`);
    expect(events).toEqual([{ event: "page_view", parsed: true, expectedProperty: true, locationSafe: true, privatePathMasked: false, referrerSafe: true, markerFree: true, privateFieldsAbsent: true, allowedEvent: true }]);
    expect(JSON.stringify(events)).not.toContain("reference.example.invalid");
    expect(JSON.stringify(events)).not.toContain("G-ZQJ4LRG4GN");
  });
  it("parses every newline-delimited event, including a leak on a later batch line", () => {
    const events = parseCollectorEvents(base, `${payload("page_view")}\r\n${payload("whatsapp_click", { "ep.message": "qa-redaction%2540example.invalid" })}\n${payload("scroll")}`);
    expect(events).toHaveLength(3);
    expect(events.map((event) => event.event)).toEqual(["page_view", "whatsapp_click", "scroll"]);
    expect(events[1].markerFree).toBe(false);
    expect(events[1].privateFieldsAbsent).toBe(false);
    expect(JSON.stringify(events)).not.toContain("qa-redaction");
  });
  it("parses JSON event batches and detects user IDs without printing them", () => {
    const events = parseCollectorEvents(base, JSON.stringify({ client_id: "synthetic-client", user_id: "qa-token", events: [
      { name: "page_view", params: { page_location: location, page_referrer: "https://reference.example.invalid" } },
      { name: "scroll", params: { page_location: `${location}?q=qa-redaction#qa-fragment` } },
    ] }));
    expect(events).toHaveLength(2);
    expect(events[0].privateFieldsAbsent).toBe(false);
    expect(events[1].locationSafe).toBe(false);
    expect(JSON.stringify(events)).not.toContain("qa-token");
  });
  it.each([
    { dl: `${location}?email=qa-redaction@example.invalid` },
    { dl: `${location}#qa-fragment` },
    { dl: "https://warrantee.io/en/approval/qa-token" },
    { dr: "https://reference.example.invalid/private-referrer?token=qa-token" },
    { "ep.email": "synthetic@example.invalid" },
  ])("fails closed on location/referrer/private-field leaks", (extra) => {
    const [event] = parseCollectorEvents(base, payload("page_view", extra));
    expect(event.locationSafe && event.referrerSafe && event.markerFree && event.privateFieldsAbsent).toBe(false);
  });
  it("rejects wrong properties, disabled enhanced measurement and unknown arbitrary event names", () => {
    expect(parseCollectorEvents(base.replace("G-ZQJ4LRG4GN", "G-WRONG"), payload("page_view"))[0].expectedProperty).toBe(false);
    for (const name of ["view_search_results", "click", "form_start", "form_submit", "video_start", "file_download", "qa-token-secret-event"]) {
      const [event] = parseCollectorEvents(base, payload(name));
      expect(event.allowedEvent).toBe(false);
      expect(event.event).toBe(name.startsWith("qa-token") ? "unexpected" : name);
      if (name.startsWith("qa-token")) expect(JSON.stringify(event)).not.toContain(name);
    }
  });
  it.each(["/en/approval/[id]", "/ar/verify/[id]"])("accepts the approved masked private route but not its raw identifier (%s)", (path) => {
    const masked = parseCollectorEvents(base, payload("page_view", { dl: `https://warrantee.io${path}` }))[0];
    expect(masked.locationSafe).toBe(true);
    expect(masked.privatePathMasked).toBe(true);
    const raw = parseCollectorEvents(base, payload("page_view", { dl: `https://warrantee.io${path.replace("[id]", "arbitrary-private-record")}` }))[0];
    expect(raw.locationSafe).toBe(false);
    expect(raw.privatePathMasked).toBe(false);
  });
  it.each(["", "v=2&gcs=G100", "{invalid", "{\"events\":[]}"])("does not silently drop unparsed collectors: %s", (body) => {
    const events = parseCollectorEvents(base, body);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.parsed)).toBe(false);
  });
});

function mockRoute(url, method = "GET", body = "", resourceType = "fetch") {
  return {
    request: () => ({ url: () => url, method: () => method, postData: () => body, resourceType: () => resourceType }),
    fulfill: vi.fn().mockResolvedValue(undefined), continue: vi.fn().mockResolvedValue(undefined), abort: vi.fn().mockResolvedValue(undefined),
  };
}

describe("isolated network interception harness", () => {
  it("fulfills all collectors and batches with 204 without a live continuation", async () => {
    const state = createCaseState("analytics");
    const guard = createNetworkGuard("https://warrantee.io", state);
    for (const route of [
      mockRoute(`${base}&${payload("page_view")}`),
      mockRoute(base, "POST", `${payload("whatsapp_click")}\n${payload("scroll")}`),
      mockRoute("https://www.google.com/ccm/collect", "POST", "gcs=G100"),
      mockRoute("https://stats.g.doubleclick.net/batch", "POST", payload("scroll")),
      mockRoute("https://warrantee.io/collect", "POST", payload("scroll")),
    ]) {
      await guard(route);
      expect(route.fulfill).toHaveBeenCalledExactlyOnceWith({ status: 204, body: "" });
      expect(route.continue).not.toHaveBeenCalled();
    }
    expect(state.collectorRequests).toBe(5);
    expect(state.events).toHaveLength(6);
  });
  it("permits only first-party reads and HTTPS GET scripts from the exact Google tag host", async () => {
    const state = createCaseState("analytics");
    const guard = createNetworkGuard("https://warrantee.io", state);
    for (const route of [mockRoute("https://warrantee.io/en/pricing"), mockRoute("https://www.googletagmanager.com/gtm.js?id=GTM-WFLBH83M", "GET", "", "script")]) {
      await guard(route); expect(route.continue).toHaveBeenCalledOnce();
    }
    for (const route of [
      mockRoute("https://www.google-analytics.com/private"),
      mockRoute("https://www.googletagmanager.com/private", "GET", "", "image"),
      mockRoute("https://www.googletagmanager.com/gtm.js", "POST", "", "script"),
      mockRoute("https://www.googletagmanager.com.attacker.invalid/gtm.js", "GET", "", "script"),
    ]) {
      await guard(route); expect(route.abort).toHaveBeenCalledOnce(); expect(route.continue).not.toHaveBeenCalled();
    }
    for (const route of [mockRoute("https://warrantee.io/api/contact", "POST", "synthetic"), mockRoute("https://warrantee.io/api/funnel/events", "POST", "synthetic"), mockRoute("https://warrantee.io/api/auth", "GET")]) {
      await guard(route); expect(route.fulfill).toHaveBeenCalledExactlyOnceWith({ status: 204, body: "" }); expect(route.continue).not.toHaveBeenCalled();
    }
    expect(state.writesBlocked).toBe(3);
  });
  it("defaults to the served bootstrap; only explicit candidate sources replace it", async () => {
    const url = "https://warrantee.io/agent-bootstrap/analytics/gtm.js";
    const actual = mockRoute(url, "GET", "", "script");
    await createNetworkGuard("https://warrantee.io", createCaseState("analytics"))(actual);
    expect(actual.continue).toHaveBeenCalledOnce();
    const candidate = mockRoute(url, "GET", "", "script");
    await createNetworkGuard("https://warrantee.io", createCaseState("analytics"), { "/agent-bootstrap/analytics/gtm.js": "// synthetic experimental fixture" })(candidate);
    expect(candidate.fulfill).toHaveBeenCalledOnce();
    expect(candidate.continue).not.toHaveBeenCalled();
  });
  it("aborts rather than continuing if parsing/interception fails", async () => {
    const route = mockRoute("not a valid URL");
    const state = createCaseState("analytics");
    await createNetworkGuard("https://warrantee.io", state)(route);
    expect(route.abort).toHaveBeenCalledOnce(); expect(route.continue).not.toHaveBeenCalled();
    expect(state.guardFailures).toBe(1);
  });
});

function passingState() {
  const state = createCaseState("analytics");
  Object.assign(state, { actionsCompleted: true, healthyDocument: true, bootstrapReads: 1, scriptLoads: 2, initialScriptLoads: 2, finalScriptLoads: 2 });
  for (const [phase, event] of [["initial", "page_view"], ["whatsapp", "whatsapp_click"], ["scroll", "scroll"], ["cta", "funnel_cta_click"], ["path", "page_view"], ["regrant_path", "page_view"], ["regrant_cta", "funnel_cta_click"], ["cross_tab_path", "page_view"], ["cross_tab_cta", "funnel_cta_click"], ["private_path", "page_view"], ["private_ar_path", "page_view"]]) {
    const dl = phase === "private_path" ? "https://warrantee.io/en/approval/[id]" : phase === "private_ar_path" ? "https://warrantee.io/ar/verify/[id]" : location;
    state.events.push({ ...parseCollectorEvents(base, payload(event, { dl }))[0], phase });
    state.collectorRequests++;
  }
  return state;
}

describe("strict aggregate privacy proof", () => {
  it("passes complete isolated observations and emits only aggregate flags/counts and registered event names", () => {
    const proof = summarizeCase(passingState());
    expect(proof.pass).toBe(true);
    expect(JSON.stringify(proof)).not.toMatch(/https?:|G-ZQJ4LRG4GN|qa-token|qa-redaction|client_id/);
  });
  it.each(["denied", "marketing_only", "malformed", "storage_unavailable", "storage_write_unavailable", "storage_readonly_grant"])("requires quiet collectors and tags for %s", (mode) => {
    const state = createCaseState(mode); state.actionsCompleted = true; state.healthyDocument = true; state.bootstrapReads = 1; state.storageFailureObserved = true;
    expect(summarizeCase(state).pass).toBe(true);
    state.collectorRequests++;
    expect(summarizeCase(state).pass).toBe(false);
  });
  it.each(["initial", "whatsapp", "path", "regrant_path", "cta", "regrant_cta", "cross_tab_path", "cross_tab_cta", "private_path", "private_ar_path"])("fails a missing or duplicated required event in %s", (phase) => {
    const missing = passingState(); missing.events = missing.events.filter((event) => event.phase !== phase);
    expect(summarizeCase(missing).pass).toBe(false);
    const duplicated = passingState(); duplicated.events.push(duplicated.events.find((event) => event.phase === phase));
    expect(summarizeCase(duplicated).pass).toBe(false);
  });
  it("fails query-only pageviews, withdrawn events, post-regrant tag reload and privacy leaks", () => {
    for (const phase of ["query", "withdrawn", "withdrawal", "regrant", "cross_tab_withdrawal", "cross_tab_withdrawn", "cross_tab_regrant"]) {
      const state = passingState(); state.events.push({ ...state.events[0], phase });
      expect(summarizeCase(state).pass).toBe(false);
    }
    const reload = passingState(); reload.finalScriptLoads++; expect(summarizeCase(reload).pass).toBe(false);
    const leak = passingState(); leak.events[0].markerFree = false; expect(summarizeCase(leak).pass).toBe(false);
  });
  it("requires actual browser storage-denial evidence, not just quiet collectors", () => {
    const state = createCaseState("storage_unavailable");
    state.actionsCompleted = true; state.healthyDocument = true; state.bootstrapReads = 1;
    expect(summarizeCase(state).pass).toBe(false);
    state.storageFailureObserved = true;
    expect(summarizeCase(state).pass).toBe(true);
  });
  it("requires a consented initial page and quiet failed withdrawal, with actual storage-denial evidence", () => {
    const state = passingState(); state.mode = "withdrawal_write_failure";
    state.events = state.events.filter(entry => ["initial", "whatsapp", "scroll", "cta", "path"].includes(entry.phase));
    expect(summarizeCase(state).pass).toBe(false);
    state.storageFailureObserved = true;
    expect(summarizeCase(state).pass).toBe(true);
    state.events.push({ ...state.events[0], phase: "withdrawn" });
    expect(summarizeCase(state).pass).toBe(false);
  });
  it("does not mistake a quiet error-boundary page for a successful privacy check", () => {
    const state = passingState(); state.healthyDocument = false;
    expect(summarizeCase(state).pass).toBe(false);
  });
  it("CLI exits nonzero without logging raw invalid arguments or starting a browser", () => {
    const result = spawnSync(process.execPath, ["scripts/check-analytics-privacy.mjs", "https://private:qa-token@warrantee.io/?email=qa-redaction"], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({ schemaVersion: 1, pass: false, error: "privacy_gate_incomplete" });
    expect(result.stderr).toBe("");
    expect(result.stdout).not.toContain("qa-token");
  });
});
