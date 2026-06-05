import { NextRequest, NextResponse } from "next/server";
import { getClientIp, getRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/validation";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  Vary: "Cookie, Authorization",
};

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...SECURITY_HEADERS,
      ...init?.headers,
    },
  });
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

  if (error) return json({ error: "Could not revoke integration token" }, { status: 500 });
  if (!data) return json({ error: "Integration token not found" }, { status: 404 });

  return json({ success: true });
}
