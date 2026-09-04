const baseUrl = String(process.env.SCANNER_BASE_URL || "").replace(/\/$/, "");
const token = String(process.env.SCANNER_TOKEN || "").trim();

if (!baseUrl || !token) {
  process.stderr.write("SCANNER_BASE_URL and SCANNER_TOKEN are required\n");
  process.exit(1);
}

const parsedBaseUrl = new URL(baseUrl);
if (parsedBaseUrl.protocol !== "https:" || parsedBaseUrl.username || parsedBaseUrl.password) {
  throw new Error("SCANNER_BASE_URL must be an HTTPS URL without credentials");
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

const health = await fetch(`${baseUrl}/healthz`, {
  redirect: "error",
  signal: AbortSignal.timeout(180_000),
});
const healthPayload = await readJson(health);
if (!health.ok || healthPayload.status !== "ok" || healthPayload.engine !== "clamav") {
  throw new Error(`ClamAV health check failed (${health.status})`);
}

const unauthorized = await fetch(`${baseUrl}/v1/scan`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
  redirect: "error",
  signal: AbortSignal.timeout(30_000),
});
if (unauthorized.status !== 401) throw new Error(`Expected unauthenticated scan to return 401, got ${unauthorized.status}`);

const invalidRequest = await fetch(`${baseUrl}/v1/scan`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ signed_url: "https://invalid.example/file", file_size: 68 }),
  redirect: "error",
  signal: AbortSignal.timeout(30_000),
});
const invalidPayload = await readJson(invalidRequest);
if (invalidRequest.status !== 400 || invalidPayload.reason !== "invalid_scan_request") {
  throw new Error(`Expected bounded invalid request response, got ${invalidRequest.status}`);
}

process.stdout.write(JSON.stringify({
  status: "ok",
  host: parsedBaseUrl.host,
  engine: healthPayload.engine,
  version: healthPayload.version || null,
  unauthorizedStatus: unauthorized.status,
  invalidRequestStatus: invalidRequest.status,
}, null, 2));
process.stdout.write("\n");
