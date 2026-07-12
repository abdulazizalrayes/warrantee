import { NextResponse } from "next/server";

type JsonWebKey = Record<string, unknown>;

function readConfiguredKeys(): JsonWebKey[] {
  const configured = process.env.WEB_BOT_AUTH_PUBLIC_JWKS?.trim();
  if (!configured) return [];

  try {
    const parsed = JSON.parse(configured);
    if (Array.isArray(parsed?.keys)) return parsed.keys;
    if (parsed?.kty) return [parsed];
  } catch {
    return [];
  }

  return [];
}

function buildDirectory() {
  const keys = readConfiguredKeys();

  return {
    keys,
    status: keys.length > 0 ? "enabled" : "not_configured",
    service: "Warrantee Web Bot Auth directory",
    usage:
      keys.length > 0
        ? "Public keys for Warrantee-operated signed bot or agent traffic."
        : "No Warrantee-operated signed bot or agent public keys are currently advertised.",
    policy:
      "Private signing keys must never be stored in the repository or exposed through this endpoint. Configure WEB_BOT_AUTH_PUBLIC_JWKS with public JWKs only when Warrantee actually operates signed outbound bot or agent traffic.",
    documentation: "https://warrantee.io/auth.md",
  };
}

export function GET() {
  return NextResponse.json(buildDirectory(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
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
