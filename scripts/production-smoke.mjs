const baseUrl = (process.env.SMOKE_BASE_URL || "https://warrantee.io").replace(/\/$/, "");
const indexNowKey = "99975fddf27362d564d730362b73f94d";

const publicChecks = [
  { path: "/", expect: 200 },
  { path: "/en", expect: 200 },
  { path: "/en/features", expect: 200 },
  { path: "/en/pricing", expect: 200 },
  { path: "/en/contact", expect: 200 },
  { path: "/en/api-docs", expect: 200 },
  { path: "/en/support", expect: 200 },
  {
    path: "/en/seller/register",
    expect: 200,
    containsAny: ["Issue digital warranties faster", "Become a Warrantee seller"],
  },
  { path: "/robots.txt", expect: 200, contains: "Sitemap: https://warrantee.io/sitemap.xml" },
  { path: "/sitemap.xml", expect: 200, contains: "https://warrantee.io/en" },
  { path: `/${indexNowKey}.txt`, expect: 200, contains: indexNowKey },
  { path: "/.well-known/agent-card.json", expect: 200 },
  { path: "/.well-known/api-catalog", expect: 200 },
  { path: "/.well-known/mcp.json", expect: 200 },
  { path: "/.well-known/mcp/server-cards.json", expect: 200 },
  { path: "/.well-known/agent-skills/index.json", expect: 200 },
  { path: "/llms-full.txt", expect: 200 },
  { path: "/openapi.json", expect: 200 },
  { path: "/auth.md", expect: 200, contains: "must not ask users for Warrantee usernames or passwords" },
  { path: "/data/company.json", expect: 200 },
  { path: "/data/agent-routing.json", expect: 200 },
  { path: "/api/mcp", expect: 200 },
  { path: "/api/health", expect: 200 },
];

const redirectChecks = [
  { path: "/features.html", location: /\/en\/features$/ },
  { path: "/favicon.ico", location: /\/favicon\.svg$/ },
  { path: "/en/dashboard", location: /\/en\/auth\?redirect=%2Fen%2Fdashboard$/ },
  { path: "/en/warranties", location: /\/en\/auth\?redirect=%2Fen%2Fwarranties$/ },
  { path: "/en/documents", location: /\/en\/auth\?redirect=%2Fen%2Fdocuments$/ },
  { path: "/en/notifications", location: /\/en\/auth\?redirect=%2Fen%2Fnotifications$/ },
  { path: "/en/settings/team", location: /\/en\/auth\?redirect=%2Fen%2Fsettings%2Fteam$/ },
  { path: "/en/seller/accept-invite?token=smoke-token", location: /\/en\/auth\?redirect=%2Fen%2Fseller%2Faccept-invite%3Ftoken%3Dsmoke-token$/ },
];

const protectedApiChecks = [
  { path: "/api/warranties", method: "GET", expect: 401 },
  { path: "/api/claims", method: "GET", expect: 401 },
  { path: "/api/notifications", method: "GET", expect: 401 },
  { path: "/api/team/members", method: "GET", expect: 401 },
  { path: "/api/integration-tokens", method: "GET", expect: 401 },
  { path: "/api/integration-tokens", method: "POST", expect: 401, body: {} },
  { path: "/api/integration-tokens/00000000-0000-4000-8000-000000000000", method: "DELETE", expect: 401 },
  { path: "/api/v1/warranties", method: "GET", expect: 401 },
  { path: "/api/cron/check-expiry", method: "GET", expect: [401, 503] },
  { path: "/api/cron/scan-documents", method: "GET", expect: [401, 503] },
  { path: "/api/cron/data-retention", method: "POST", expect: [401, 503], body: {} },
  { path: "/api/internal/document-security-scan", method: "POST", expect: [401, 503], body: {} },
  { path: "/api/email/send", method: "POST", expect: [401, 503], body: {} },
  { path: "/api/push/send", method: "POST", expect: 401, body: {} },
  { path: "/api/notifications/expiry-alerts", method: "POST", expect: [401, 503], body: {} },
];

const callbackSafetyChecks = [
  { path: "/auth/callback?code=invalid&next=//evil.example" },
  { path: "/en/auth/callback?code=invalid&next=//evil.example" },
];

class SmokeCheckError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "SmokeCheckError";
    this.details = details;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new SmokeCheckError(`Request timed out after 15000ms: ${url}`, {
        url,
        timeoutMs: 15000,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function runCheck(kind, check, fn) {
  const startedAt = Date.now();
  try {
    const result = await fn(check);
    return {
      kind,
      durationMs: Date.now() - startedAt,
      ...result,
    };
  } catch (error) {
    const method = check.method || "GET";
    const message = `${kind} ${method} ${check.path} failed after ${Date.now() - startedAt}ms: ${
      error instanceof Error ? error.message : String(error)
    }`;
    throw new SmokeCheckError(message, {
      kind,
      path: check.path,
      method,
      durationMs: Date.now() - startedAt,
      cause: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      ...(error instanceof SmokeCheckError ? error.details : {}),
    });
  }
}

async function checkPublic({ path, expect, contains, containsAny }) {
  const url = `${baseUrl}${path}`;
  const response = await fetchWithTimeout(url, { redirect: "follow" });
  const expected = Array.isArray(expect) ? expect : [expect];
  if (!expected.includes(response.status)) {
    throw new Error(`${path} returned ${response.status}; expected ${expected.join(" or ")}`);
  }

  if (contains) {
    const body = await response.text();
    if (!body.includes(contains)) {
      throw new Error(`${path} did not contain required text: ${contains}`);
    }
  }

  if (containsAny) {
    const body = await response.text();
    if (!containsAny.some((requiredText) => body.includes(requiredText))) {
      throw new Error(`${path} did not contain any required text: ${containsAny.join(" | ")}`);
    }
  }

  return { path, status: response.status, finalUrl: response.url };
}

async function checkRedirect({ path, location }) {
  const url = `${baseUrl}${path}`;
  const response = await fetchWithTimeout(url, { redirect: "manual" });
  if (![301, 302, 303, 307, 308].includes(response.status)) {
    throw new Error(`${path} returned ${response.status}; expected redirect`);
  }

  const header = response.headers.get("location") || "";
  const resolved = new URL(header, baseUrl).toString();
  if (!location.test(resolved)) {
    throw new Error(`${path} redirected to ${resolved}; expected ${location}`);
  }

  return { path, status: response.status, location: resolved };
}

async function checkProtectedApi({ path, method, expect, body }) {
  const url = `${baseUrl}${path}`;
  const response = await fetchWithTimeout(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const expected = Array.isArray(expect) ? expect : [expect];
  if (!expected.includes(response.status)) {
    throw new Error(`${path} returned ${response.status}; expected ${expected.join(" or ")}`);
  }

  return { path, method, status: response.status };
}

async function checkCallbackSafety({ path }) {
  const url = `${baseUrl}${path}`;
  const response = await fetchWithTimeout(url, { redirect: "follow" });
  const finalUrl = new URL(response.url);
  const expectedOrigin = new URL(baseUrl).origin;

  if (finalUrl.origin !== expectedOrigin) {
    throw new Error(`${path} escaped to external origin: ${response.url}`);
  }

  if (!finalUrl.pathname.endsWith("/auth")) {
    throw new Error(`${path} ended at ${response.url}; expected same-origin auth error page`);
  }

  return { path, status: response.status, finalUrl: response.url };
}

async function main() {
  const results = [];
  for (const check of publicChecks) {
    results.push(await runCheck("public", check, checkPublic));
  }
  for (const check of redirectChecks) {
    results.push(await runCheck("redirect", check, checkRedirect));
  }
  for (const check of protectedApiChecks) {
    results.push(await runCheck("protected-api", check, checkProtectedApi));
  }
  for (const check of callbackSafetyChecks) {
    results.push(await runCheck("callback-safety", check, checkCallbackSafety));
  }

  console.log(JSON.stringify({ status: "ok", baseUrl, checks: results }, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        baseUrl,
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof SmokeCheckError ? error.details : undefined,
      },
      null,
      2
    )
  );
  process.exit(1);
});
