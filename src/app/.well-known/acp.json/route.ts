import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";

export function GET() {
  return NextResponse.json(
    {
      protocol: {
        name: "acp",
        version: "discovery-only",
        status: "not_enabled",
      },
      api_base_url: `${BASE_URL}/api`,
      supported_transports: ["https"],
      capabilities: {
        services: [],
        payments: false,
      },
      policy:
        "Warrantee does not currently support Agentic Commerce Protocol transactions. Agents must not attempt purchases, payments, or checkout automation through ACP until this status changes to enabled.",
      documentation: `${BASE_URL}/en/api-docs`,
      openapi: `${BASE_URL}/openapi.json`,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}

export function HEAD() {
  return new NextResponse(null, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
