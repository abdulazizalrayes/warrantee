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
        required: true,
        schemes: ["x-api-key", "bearer", "oauth2"],
      },
      instructions:
        "Use /llms.txt, the API catalog, and this MCP card to understand Warrantee. Public warranty verification can be discovered without private account data. Private warranty, claim, seller, or account actions require the user to sign in to Warrantee, open Settings > API / CLI / MCP, generate a scoped integration token, and provide it as x-api-key. Never ask users for passwords, and never request or store a Warrantee username or password for integrations. Respect scopes, rate limits, owner isolation, and revocation.",
      resources: [],
      tools: [
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
