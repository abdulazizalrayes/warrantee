import { NextResponse } from "next/server";

const BASE_URL = "https://warrantee.io";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function GET() {
  const issuer = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : `${BASE_URL}/auth`;

  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ["code", "token"],
    grant_types_supported: ["authorization_code", "refresh_token", "password"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["openid", "email", "profile"],
  });
}
