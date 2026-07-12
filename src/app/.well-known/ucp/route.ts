import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";

export function GET() {
  return NextResponse.json(
    {
      protocol: {
        name: "ucp",
        version: "discovery-only",
        status: "not_enabled",
      },
      services: [],
      capabilities: {
        content_payments: false,
        checkout: false,
      },
      endpoints: {
        openapi: `${BASE_URL}/openapi.json`,
        api_catalog: `${BASE_URL}/.well-known/api-catalog`,
        auth: `${BASE_URL}/auth.md`,
      },
      policy:
        "Warrantee does not currently support Universal Commerce Protocol payments. Agents may use this endpoint only to learn that UCP commerce is not enabled.",
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
