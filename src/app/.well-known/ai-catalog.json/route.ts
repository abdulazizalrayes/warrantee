import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";

const catalog = {
  specVersion: "1.0",
  host: {
    displayName: "Warrantee",
    identifier: "warrantee.io",
    documentationUrl: `${BASE_URL}/en/api-docs`,
  },
  entries: [
    {
      identifier: "urn:air:warrantee.io:mcp:public-discovery",
      displayName: "Warrantee MCP Server Card",
      type: "application/mcp-server-card+json",
      url: `${BASE_URL}/.well-known/mcp/server-card.json`,
      description:
        "Hosted and local MCP discovery for Warrantee public resources and user-authorized account tools.",
    },
    {
      identifier: "urn:air:warrantee.io:skills:public-index",
      displayName: "Warrantee Agent Skills",
      type: "application/agent-skills+json",
      url: `${BASE_URL}/.well-known/agent-skills/index.json`,
      description:
        "Public skill metadata for warranty discovery, integration, verification, and inquiry preparation.",
    },
    {
      identifier: "urn:air:warrantee.io:agent:public-card",
      displayName: "Warrantee A2A Agent Card",
      type: "application/agent-card+json",
      url: `${BASE_URL}/.well-known/agent-card.json`,
      description:
        "A2A 1.0 discovery card for the synchronous public read-only Warrantee Agent Concierge.",
    },
    {
      identifier: "urn:air:warrantee.io:a2a:concierge",
      displayName: "Warrantee A2A Concierge",
      type: "application/json",
      url: `${BASE_URL}/api/a2a`,
      description:
        "A2A 1.0 HTTP+JSON endpoint for deterministic public questions. It has no task, streaming, push, submission, purchase, or private-account capability.",
    },
    {
      identifier: "urn:air:warrantee.io:api:openapi",
      displayName: "Warrantee OpenAPI Description",
      type: "application/openapi+json",
      url: `${BASE_URL}/openapi.json`,
      description:
        "Public API description covering discovery, verification, MCP, and scoped account integrations.",
    },
    {
      identifier: "urn:air:warrantee.io:api:catalog",
      displayName: "Warrantee API Catalog",
      type: "application/linkset+json",
      url: `${BASE_URL}/.well-known/api-catalog`,
      description:
        "Linkset catalog for Warrantee API documentation, health, structured data, and agent resources.",
    },
  ],
} as const;

const headers = {
  "Content-Type": "application/ai-catalog+json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

export function GET() {
  return NextResponse.json(catalog, { headers });
}

export function HEAD() {
  return new NextResponse(null, { headers });
}
