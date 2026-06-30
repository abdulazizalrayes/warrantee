const DEFAULT_BASE_URL = "https://warrantee.io";
const baseUrl = (process.env.AGENT_READINESS_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

const jsonEndpoints = [
  "/data/company.json",
  "/data/services.json",
  "/data/capabilities.json",
  "/data/service-areas.json",
  "/data/project-inquiry-schema.json",
  "/data/agent-routing.json",
  "/.well-known/agent-card.json",
  "/.well-known/mcp.json",
  "/.well-known/mcp/server-card.json",
  "/.well-known/mcp/server-cards.json",
  "/.well-known/agent-skills/index.json",
  "/openapi.json",
  "/.well-known/openapi.json",
];

const textEndpoints = [
  "/llms.txt",
  "/llms-full.txt",
  "/auth.md",
  "/robots.txt",
  "/sitemap.xml",
  "/.well-known/api-catalog",
];

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, baseUrl, error: message, ...details }, null, 2));
  process.exit(1);
}

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "user-agent": "warrantee-agent-readiness-check/1.0" },
  });
  const text = await response.text();
  if (response.status !== 200) {
    fail("Endpoint did not return 200.", { path, status: response.status, body: text.slice(0, 300) });
  }
  return { response, text };
}

for (const path of jsonEndpoints) {
  const { text } = await get(path);
  try {
    JSON.parse(text);
  } catch (error) {
    fail("Endpoint did not return valid JSON.", { path, cause: error instanceof Error ? error.message : String(error) });
  }
}

for (const path of textEndpoints) {
  await get(path);
}

const llms = (await get("/llms.txt")).text;
for (const required of [
  "/data/company.json",
  "/data/agent-routing.json",
  "/llms-full.txt",
  "/openapi.json",
  "/auth.md",
  "/api/mcp",
]) {
  if (!llms.includes(required)) fail("llms.txt is missing a discovery reference.", { required });
}

const llmsFull = (await get("/llms-full.txt")).text;
if (!llmsFull.includes("Agents may prepare inquiry drafts")) {
  fail("llms-full.txt is missing the inquiry-submission guardrail.");
}

const auth = (await get("/auth.md")).text;
if (!auth.includes("must not ask users for Warrantee usernames or passwords")) {
  fail("auth.md is missing the no-password integration rule.");
}

const robots = (await get("/robots.txt")).text;
if (!robots.includes("Disallow: /api/") || !robots.includes("Allow: /api/mcp")) {
  fail("robots.txt is missing API block or MCP allow guidance.");
}

const openapi = JSON.parse((await get("/openapi.json")).text);
for (const requiredPath of ["/data/company.json", "/data/agent-routing.json", "/api/mcp", "/api/v1/intelligence"]) {
  if (!openapi.paths?.[requiredPath]) fail("OpenAPI is missing a required path.", { requiredPath });
}

const mcp = JSON.parse((await get("/.well-known/mcp.json")).text);
const toolNames = new Set((mcp.tools || []).map((tool) => tool.name));
for (const requiredTool of [
  "get_company_overview",
  "list_services",
  "match_project_scope",
  "prepare_project_inquiry",
  "list_service_areas",
  "read_public_resource",
  "get_asset_intelligence",
]) {
  if (!toolNames.has(requiredTool)) fail("MCP card is missing a public read-only tool.", { requiredTool });
}

const privateIntelligence = await fetch(`${baseUrl}/api/v1/intelligence`, {
  headers: { "user-agent": "warrantee-agent-readiness-check/1.0" },
});
if (privateIntelligence.status !== 401) {
  fail("Authenticated asset intelligence endpoint must reject anonymous access.", {
    path: "/api/v1/intelligence",
    status: privateIntelligence.status,
  });
}

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  jsonEndpoints: jsonEndpoints.length,
  textEndpoints: textEndpoints.length,
}, null, 2));
