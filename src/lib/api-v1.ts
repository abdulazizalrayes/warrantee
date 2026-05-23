import crypto from "crypto";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase client environment variables are not configured");
  }

  return createClient(url, key);
}

function readToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  return request.headers.get("x-api-key")?.trim() || null;
}

export async function resolveApiRequester(request: NextRequest) {
  const token = readToken(request);
  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error: "Unauthorized. Provide a Bearer token or x-api-key.",
    };
  }

  const integrationToken = process.env.WARRANTEE_API_INTEGRATION_TOKEN;
  if (integrationToken && token === integrationToken) {
    const integrationOwnerId =
      process.env.WARRANTEE_API_INTEGRATION_OWNER_ID || process.env.WARRANTEE_API_OWNER_ID;

    if (!integrationOwnerId) {
      return {
        ok: false as const,
        status: 503,
        error: "Integration token is configured without a bound owner account.",
      };
    }

    return {
      ok: true as const,
      kind: "integration" as const,
      userId: integrationOwnerId,
    };
  }

  const supabase = getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      ok: false as const,
      status: 401,
      error: "Invalid token",
    };
  }

  return {
    ok: true as const,
    kind: "user" as const,
    userId: user.id,
  };
}

export function buildIdempotencyReference(idempotencyKey: string) {
  return `API-${crypto.createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 24)}`;
}

export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function isValidIsoDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  return !Number.isNaN(Date.parse(value));
}
