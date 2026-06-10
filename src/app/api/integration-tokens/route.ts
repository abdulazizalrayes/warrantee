import { NextRequest } from "next/server";
import { createApiIntegrationToken, normalizeApiRateLimit, normalizeApiScopes } from "@/lib/api-v1";
import { apiJson } from "@/lib/api-response";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isStringInRange, sanitizeString } from "@/lib/validation";
import type { Json } from "@/types/database";

const TOKEN_SELECT =
  "id, name, token_prefix, scopes, rate_limit_per_minute, last_used_at, expires_at, revoked_at, created_at, updated_at";

const MAX_ACTIVE_INTEGRATION_TOKENS = 20;

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  Vary: "Cookie, Authorization",
};

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  return apiJson(body, {
    ...init,
    headers,
  });
}

async function recordTokenManagementEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  request: NextRequest,
  input: {
    userId: string;
    tokenId?: string | null;
    statusCode: number;
    action: string;
    metadata?: Record<string, Json | undefined>;
  }
) {
  const { error } = await supabase.from("api_usage_events").insert({
    user_id: input.userId,
    token_id: input.tokenId || null,
    credential_kind: "user",
    method: request.method,
    path: new URL(request.url).pathname,
    status_code: input.statusCode,
    metadata: {
      action: input.action,
      ...(input.metadata || {}),
    },
  });
  if (error) {
    console.warn("Integration token audit event failed:", error.message);
  }
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

async function enforceTokenManagementLimit(request: NextRequest, userId: string) {
  const result = await rateLimit(`${userId}:${getClientIp(request)}`, {
    maxRequests: 20,
    windowMs: 10 * 60_000,
    identifier: "api-token-management",
  });

  if (result.success) return null;

  return json(
    { error: "Too many token management requests" },
    { status: 429, headers: { ...getRateLimitHeaders(result), "X-RateLimit-Limit": "20" } }
  );
}

function normalizeExpiry(value: unknown) {
  if (value == null || value === "") {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry.toISOString();
  }

  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const rateLimitResponse = await enforceTokenManagementLimit(request, user.id);
  if (rateLimitResponse) return rateLimitResponse;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_integration_tokens")
    .select(TOKEN_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return json({ error: "Could not load integration tokens" }, { status: 500 });
  return json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const rateLimitResponse = await enforceTokenManagementLimit(request, user.id);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));
  if (!isStringInRange(body.name, 2, 120)) {
    return json({ error: "name must be between 2 and 120 characters" }, { status: 400 });
  }

  const scopes = normalizeApiScopes(body.scopes);
  const rateLimitPerMinute = normalizeApiRateLimit(body.rate_limit_per_minute);
  const expiresAt = normalizeExpiry(body.expires_at);
  if (!expiresAt) {
    return json({ error: "expires_at must be a future ISO date" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { count: activeTokenCount, error: activeTokenCountError } = await supabase
    .from("api_integration_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());

  if (activeTokenCountError) {
    return json({ error: "Could not validate active integration token limit" }, { status: 500 });
  }

  if ((activeTokenCount || 0) >= MAX_ACTIVE_INTEGRATION_TOKENS) {
    return json(
      { error: `Maximum active integration tokens reached (${MAX_ACTIVE_INTEGRATION_TOKENS})` },
      { status: 409 }
    );
  }

  const generated = createApiIntegrationToken();
  const { data, error } = await supabase
    .from("api_integration_tokens")
    .insert({
      user_id: user.id,
      name: sanitizeString(body.name, 120),
      token_prefix: generated.prefix,
      token_hash: generated.hash,
      scopes,
      rate_limit_per_minute: rateLimitPerMinute,
      expires_at: expiresAt,
    })
    .select(TOKEN_SELECT)
    .single();

  if (error || !data) {
    await recordTokenManagementEvent(supabase, request, {
      userId: user.id,
      statusCode: 500,
      action: "api_token_create_failed",
    });
    return json({ error: "Could not create integration token" }, { status: 500 });
  }

  await recordTokenManagementEvent(supabase, request, {
    userId: user.id,
    tokenId: data.id,
    statusCode: 201,
    action: "api_token_created",
    metadata: {
      scopes,
      rate_limit_per_minute: rateLimitPerMinute,
      expires_at: expiresAt,
    },
  });

  return json(
    {
      data,
      token: generated.token,
      warning: "Store this token now. Warrantee only shows it once.",
    },
    { status: 201 }
  );
}
