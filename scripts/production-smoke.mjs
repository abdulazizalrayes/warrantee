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
  { path: "/robots.txt", expect: 200, contains: "Sitemap: https://warrantee.io/sitemap.xml" },
  { path: "/sitemap.xml", expect: 200, contains: "https://warrantee.io/en" },
  { path: `/${indexNowKey}.txt`, expect: 200, contains: indexNowKey },
  { path: "/.well-known/agent-card.json", expect: 200 },
  { path: "/.well-known/api-catalog", expect: 200 },
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
];

const protectedApiChecks = [
  { path: "/api/warranties", method: "GET", expect: 401 },
  { path: "/api/claims", method: "GET", expect: 401 },
  { path: "/api/notifications", method: "GET", expect: 401 },
  { path: "/api/team/members", method: "GET", expect: 401 },
  { path: "/api/v1/warranties", method: "GET", expect: 401 },
  { path: "/api/cron/check-expiry", method: "GET", expect: [401, 503] },
  { path: "/api/push/send", method: "POST", expect: 401, body: {} },
  { path: "/api/notifications/expiry-alerts", method: "POST", expect: [401, 503], body: {} },
];

const callbackSafetyChecks = [
  { path: "/auth/callback?code=invalid&next=//evil.example" },
  { path: "/en/auth/callback?code=invalid&next=//evil.example" },
];

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkPublic({ path, expect, contains }) {
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
    results.push(await checkPublic(check));
  }
  for (const check of redirectChecks) {
    results.push(await checkRedirect(check));
  }
  for (const check of protectedApiChecks) {
    results.push(await checkProtectedApi(check));
  }
  for (const check of callbackSafetyChecks) {
    results.push(await checkCallbackSafety(check));
  }

  console.log(JSON.stringify({ status: "ok", baseUrl, checks: results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ status: "failed", baseUrl, error: error.message }, null, 2));
  process.exit(1);
});
