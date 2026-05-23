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
        title: "Warrantee Public Discovery",
        version: "1.0.0",
      },
      description:
        "Public discovery metadata for Warrantee warranty verification, claims, seller onboarding, and certificate workflows.",
      documentationUrl: `${BASE_URL}/en/api-docs`,
      transport: {
        type: "streamable-http",
        endpoint: "/api",
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
        schemes: ["bearer", "oauth2"],
      },
      instructions:
        "Use the public discovery metadata to understand Warrantee's warranty APIs. Interactive browser-side actions are available through WebMCP when supported by the user agent.",
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
