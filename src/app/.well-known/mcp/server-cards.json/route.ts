import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";
const serverCard = {
  $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
  version: "1.0",
  protocolVersion: "2025-06-18",
  serverInfo: {
    name: "warrantee-public-discovery",
    title: "Warrantee API / CLI / MCP Discovery",
    version: "1.0.0",
  },
  description:
    "Warrantee public discovery and authenticated warranty API / CLI / MCP server card.",
  documentationUrl: `${BASE_URL}/en/api-docs`,
  transport: {
    type: "http-json-rpc",
    url: `${BASE_URL}/api/mcp`,
    method: "POST",
    headers: ["Content-Type", "x-api-key"],
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
  authentication: {
    required: "private tools only",
    schemes: ["x-api-key", "bearer", "oauth2"],
  },
  links: {
    canonical: `${BASE_URL}/.well-known/mcp/server-card.json`,
    apiCatalog: `${BASE_URL}/.well-known/api-catalog`,
    openapi: `${BASE_URL}/openapi.json`,
    auth: `${BASE_URL}/auth.md`,
  },
};

export function GET() {
  return NextResponse.json(
    {
      servers: [serverCard],
      cards: [serverCard],
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
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
      "Cache-Control": "public, max-age=3600",
    },
  });
}
