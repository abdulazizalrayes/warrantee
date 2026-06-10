import { NextRequest } from "next/server";
import { apiJson } from "@/lib/api-response";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isValidUUID } from "@/lib/validation";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  Vary: "Cookie, Authorization",
};

const MAX_LIMIT = 100;

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return apiJson(body, { ...init, headers });
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

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const limitResult = await rateLimit(`${user.id}:${getClientIp(request)}`, {
    maxRequests: 30,
    windowMs: 10 * 60_000,
    identifier: "api-usage",
  });
  if (!limitResult.success) {
    return json(
      { error: "Too many API usage requests" },
      { status: 429, headers: { ...getRateLimitHeaders(limitResult), "X-RateLimit-Limit": "30" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));
  const tokenId = searchParams.get("token_id")?.trim() || null;
  if (tokenId && !isValidUUID(tokenId)) {
    return json({ error: "Invalid token_id" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("api_usage_events")
    .select("id, token_id, credential_kind, method, path, status_code, scope, user_agent, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tokenId) {
    query = query.eq("token_id", tokenId);
  }

  const { data, error } = await query;
  if (error) {
    return json({ error: "Could not load API usage events" }, { status: 500 });
  }

  return json({ data: data || [] });
}
