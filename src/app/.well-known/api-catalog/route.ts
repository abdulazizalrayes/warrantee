import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";

export function GET() {
  return NextResponse.json(
    {
      linkset: [
        {
          anchor: `${BASE_URL}/api`,
          item: [
            {
              href: `${BASE_URL}/api/v1/warranties`,
              type: "application/json",
              title: "Warrantee warranty API",
            },
            {
              href: `${BASE_URL}/api/claims`,
              type: "application/json",
              title: "Warrantee claims API",
            },
            {
              href: `${BASE_URL}/api/mcp`,
              type: "application/json",
              title: "Warrantee hosted MCP JSON-RPC endpoint",
            },
          ],
          "service-desc": [
            {
              href: `${BASE_URL}/openapi.json`,
              type: "application/openapi+json",
              title: "OpenAPI service description",
            },
            {
              href: `${BASE_URL}/.well-known/openapi.json`,
              type: "application/openapi+json",
              title: "Well-known OpenAPI alias",
            },
          ],
          "service-doc": [
            {
              href: `${BASE_URL}/en/api-docs`,
              type: "text/html",
              title: "API / CLI / MCP guide",
            },
          ],
          status: [
            {
              href: `${BASE_URL}/api/health`,
              type: "application/json",
              title: "Health endpoint",
            },
          ],
          describedby: [
            {
              href: `${BASE_URL}/llms.txt`,
              type: "text/plain",
              title: "LLM summary",
            },
            {
              href: `${BASE_URL}/llms-full.txt`,
              type: "text/plain",
              title: "Full LLM brief",
            },
            {
              href: `${BASE_URL}/.well-known/agent-card.json`,
              type: "application/json",
              title: "Agent card",
            },
            {
              href: `${BASE_URL}/.well-known/mcp.json`,
              type: "application/json",
              title: "MCP discovery card",
            },
            {
              href: `${BASE_URL}/data/company.json`,
              type: "application/json",
              title: "Company structured data",
            },
            {
              href: `${BASE_URL}/data/agent-routing.json`,
              type: "application/json",
              title: "Agent routing rules",
            },
          ],
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/linkset+json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}

export function HEAD() {
  return new NextResponse(null, {
    headers: {
      "Content-Type": "application/linkset+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
