import fs from "node:fs";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8").split(/\r?\n/).flatMap((line) => {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) return [];
      const separator = line.indexOf("=");
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return [[key, value]];
    }),
  );
}

const env = {
  ...parseEnvFile(".env.production.local"),
  ...parseEnvFile(".env.local"),
  ...process.env,
};
const token = env.SENTRY_ISSUES_READ_TOKEN || env.SENTRY_AUTH_TOKEN;
const org = env.SENTRY_ORG;
const project = env.SENTRY_PROJECT;
const summaryOnly = process.argv.includes("--summary-only");
const failOnUnresolved = process.argv.includes("--fail-on-unresolved");

if (!token || !org || !project) {
  console.error(JSON.stringify({
    ok: false,
    error: "Sentry issue visibility is not configured.",
    missing: [
      !token ? "SENTRY_ISSUES_READ_TOKEN" : null,
      !org ? "SENTRY_ORG" : null,
      !project ? "SENTRY_PROJECT" : null,
    ].filter(Boolean),
  }, null, 2));
  process.exit(1);
}

const url = new URL(`https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/`);
url.searchParams.set("query", "is:unresolved");
url.searchParams.set("limit", "25");

let response;
try {
  response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: "Sentry issue inventory is unreachable from this machine.",
    cause: error instanceof Error ? error.cause?.code || error.name : "unknown",
  }, null, 2));
  process.exit(1);
}

if (!response.ok) {
  console.error(JSON.stringify({
    ok: false,
    status: response.status,
    error: response.status === 403
      ? "The configured token lacks least-privilege Sentry issue-read access. Create a separate read-only issue token; do not broaden the release-upload token blindly."
      : "Sentry issue inventory could not be read.",
  }, null, 2));
  process.exit(1);
}

const issues = await response.json();
const sanitized = Array.isArray(issues) ? issues.map((issue) => ({
  id: issue.id,
  shortId: issue.shortId,
  title: issue.title,
  status: issue.status,
  level: issue.level,
  count: Number(issue.count || 0),
  userCount: Number(issue.userCount || 0),
  firstSeen: issue.firstSeen,
  lastSeen: issue.lastSeen,
  permalink: issue.permalink,
})) : [];

console.log(JSON.stringify(
  summaryOnly
    ? { ok: true, unresolvedCount: sanitized.length }
    : { ok: true, unresolvedCount: sanitized.length, issues: sanitized },
  null,
  2,
));

if (failOnUnresolved && sanitized.length > 0) {
  process.exitCode = 1;
}
