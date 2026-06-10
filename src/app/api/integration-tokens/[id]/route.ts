import { NextRequest } from "next/server";
import { apiJson } from "@/lib/api-response";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/validation";
import type { Json } from "@/types/database";

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const rateLimitResponse = await enforceTokenManagementLimit(request, user.id);
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;
  if (!isValidUUID(id)) return json({ error: "Invalid token id" }, { status: 400 });

  const now = new Date().toISOString();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_integration_tokens")
    .update({ revoked_at: now, updated_at: now })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    await recordTokenManagementEvent(supabase, request, {
      userId: user.id,
      tokenId: id,
      statusCode: 500,
      action: "api_token_revoke_failed",
    });
    return json({ error: "Could not revoke integration token" }, { status: 500 });
  }
  if (!data) {
    await recordTokenManagementEvent(supabase, request, {
      userId: user.id,
      tokenId: id,
      statusCode: 404,
      action: "api_token_revoke_not_found",
    });
    return json({ error: "Integration token not found" }, { status: 404 });
  }

  await recordTokenManagementEvent(supabase, request, {
    userId: user.id,
    tokenId: data.id,
    statusCode: 200,
    action: "api_token_revoked",
  });

  return json({ success: true });
}
