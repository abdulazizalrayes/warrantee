import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";

export function GET() {
  return NextResponse.json(
    {
      openapi: "3.1.0",
      info: {
        title: "Warrantee Public API",
        version: "1.0.0",
        description:
          "Public discovery description for warranty verification, claims, extensions, certificates, and seller workflows.",
      },
      servers: [{ url: `${BASE_URL}/api` }],
      paths: {
        "/health": {
          get: {
            summary: "Health check",
            responses: {
              "200": { description: "Service is healthy" },
            },
          },
        },
        "/v1/warranties": {
          get: {
            summary: "List warranties",
            responses: { "200": { description: "Warranties returned" } },
          },
          post: {
            summary: "Create warranty",
            responses: { "201": { description: "Warranty created" } },
          },
        },
        "/v1/warranties/verify": {
          get: {
            summary: "Verify warranty",
            responses: { "200": { description: "Verification result returned" } },
          },
        },
        "/claims": {
          post: {
            summary: "Submit claim",
            responses: { "201": { description: "Claim created" } },
          },
        },
      },
    },
    {
      headers: {
        "Content-Type": "application/openapi+json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
