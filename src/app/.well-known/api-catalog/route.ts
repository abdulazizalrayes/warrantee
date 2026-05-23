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
          ],
          "service-desc": [
            {
              href: `${BASE_URL}/.well-known/openapi.json`,
              type: "application/openapi+json",
              title: "OpenAPI service description",
            },
          ],
          "service-doc": [
            {
              href: `${BASE_URL}/en/api-docs`,
              type: "text/html",
              title: "API documentation",
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
              href: `${BASE_URL}/.well-known/agent-card.json`,
              type: "application/json",
              title: "Agent card",
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
