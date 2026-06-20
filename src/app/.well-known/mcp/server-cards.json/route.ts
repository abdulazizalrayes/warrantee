import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";

export function GET() {
  return NextResponse.json(
    {
      servers: [
        {
          name: "warrantee-public-discovery",
          url: `${BASE_URL}/.well-known/mcp.json`,
          transport: `${BASE_URL}/api/mcp`,
          description:
            "Warrantee public discovery and authenticated warranty API / CLI / MCP server card.",
        },
      ],
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
