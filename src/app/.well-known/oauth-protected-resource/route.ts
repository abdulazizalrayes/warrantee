import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function GET() {
  return NextResponse.json(
    {
      resource: `${BASE_URL}/api`,
      resource_name: "Warrantee API",
      authorization_servers: [
        `${BASE_URL}/.well-known/oauth-authorization-server`,
        SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : `${BASE_URL}/auth`,
      ],
      bearer_methods_supported: ["header"],
      resource_documentation: `${BASE_URL}/en/api-docs`,
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
