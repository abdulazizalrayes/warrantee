import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";

export function GET() {
  return NextResponse.json(
    {
      $schema:
        "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
      version: "1.0",
      protocolVersion: "2025-06-18",
      serverInfo: {
        name: "warrantee-public-discovery",
        title: "Warrantee API / CLI / MCP Discovery",
        version: "1.0.0",
      },
      description:
        "Public discovery metadata for Warrantee warranty verification, account integrations, CLI-ready API usage, seller onboarding, claims, and certificate workflows.",
      documentationUrl: `${BASE_URL}/en/api-docs`,
      transport: {
        type: "stdio",
        command: "npm",
        args: ["run", "warrantee:mcp", "--"],
      },
      transports: [
        {
          type: "http-json-rpc",
          url: `${BASE_URL}/api/mcp`,
          method: "POST",
          headers: ["Content-Type", "x-api-key"],
        },
        {
          type: "stdio",
          command: "npm",
          args: ["run", "warrantee:mcp", "--"],
        },
        {
          type: "stdio",
          command: "warrantee-mcp",
        },
      ],
      capabilities: {
        tools: {
          listChanged: false,
        },
        resources: {
          subscribe: false,
          listChanged: false,
        },
        prompts: {
          listChanged: false,
        },
      },
      authentication: {
        required: "private tools only",
        schemes: ["x-api-key", "bearer", "oauth2"],
      },
      instructions:
        "Use /llms.txt, /llms-full.txt, /data/*.json, the API catalog, and this MCP card to understand Warrantee. Public discovery tools and resources are read-only. Private warranty, claim, seller, document, or account actions require the user to sign in to Warrantee, open Settings > API / CLI / MCP, generate a scoped integration token, and provide it as x-api-key. Never ask users for passwords, and never request or store a Warrantee username or password for integrations. Agents may prepare inquiry drafts but must not submit forms, send emails, upload files, or contact Warrantee without explicit user approval.",
      resources: [
        { uri: "warrantee://company", name: "Company overview", mimeType: "application/json" },
        { uri: "warrantee://services", name: "Services", mimeType: "application/json" },
        { uri: "warrantee://capabilities", name: "Capabilities", mimeType: "application/json" },
        { uri: "warrantee://service-areas", name: "Service areas", mimeType: "application/json" },
        { uri: "warrantee://agent-routing", name: "Agent routing", mimeType: "application/json" },
      ],
      tools: [
        {
          name: "get_company_overview",
          title: "Get Company Overview",
          description: "Read Warrantee public company overview without private account data.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "list_services",
          title: "List Services",
          description: "List Warrantee public services and product capabilities.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "match_project_scope",
          title: "Match Inquiry Scope",
          description:
            "Classify whether a user request fits Warrantee enterprise, seller, support, partnership, or API / CLI / MCP inquiry paths, and route non-fit requests away.",
          inputSchema: {
            type: "object",
            properties: { request: { type: "string" } },
            required: ["request"],
          },
        },
        {
          name: "prepare_project_inquiry",
          title: "Prepare Inquiry Draft",
          description:
            "Prepare a Warrantee inquiry draft only. Must not submit forms, send emails, or contact Warrantee without explicit user approval.",
          inputSchema: {
            type: "object",
            properties: { request: { type: "string" } },
            required: ["request"],
          },
        },
        {
          name: "list_service_areas",
          title: "List Service Areas",
          description: "Read Warrantee public service-area and delivery model data.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "read_public_resource",
          title: "Read Public Resource",
          description:
            "Read one public Warrantee resource by name: company.json, services.json, capabilities.json, service-areas.json, project-inquiry-schema.json, or agent-routing.json.",
          inputSchema: {
            type: "object",
            properties: { resource: { type: "string" } },
            required: ["resource"],
          },
        },
        {
          name: "get_asset_intelligence",
          title: "Get Asset Lifecycle Intelligence",
          description:
            "Return authenticated warranty, claim, supplier, expiry, data-quality, lifecycle-health, and next-action signals for the user's accessible portfolio. Requires a scoped x-api-key or bearer token with warranties:read.",
          inputSchema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                minimum: 1,
                maximum: 10000,
                default: 5000,
              },
            },
          },
        },
        {
          name: "verify-warranty",
          title: "Verify Warranty",
          description:
            "Verify a warranty reference and return a public validity result.",
          inputSchema: {
            type: "object",
            properties: {
              reference: {
                type: "string",
                description:
                  "The warranty reference or public verification identifier.",
              },
            },
            required: ["reference"],
          },
        },
      ],
      prompts: [],
      _meta: {
        publicApiCatalog: `${BASE_URL}/.well-known/api-catalog`,
        agentSkills: `${BASE_URL}/.well-known/agent-skills/index.json`,
        apiCliMcpGuide: `${BASE_URL}/en/api-docs`,
        hostedMcpEndpoint: `${BASE_URL}/api/mcp`,
        serverCards: `${BASE_URL}/.well-known/mcp/server-cards.json`,
        markdownRepresentations: `${BASE_URL}/data/agent-markdown-manifest.json`,
        markdownNegotiation: "Send Accept: text/markdown to canonical sitemap URLs.",
        keyManagement: `${BASE_URL}/en/settings?section=integrations`,
        stdioCommand: {
          command: "npm",
          args: ["run", "warrantee:mcp", "--"],
          env: ["WARRANTEE_API_KEY", "WARRANTEE_BASE_URL"],
        },
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}

export function HEAD() {
  return new NextResponse(null, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
