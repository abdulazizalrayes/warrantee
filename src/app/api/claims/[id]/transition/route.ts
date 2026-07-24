import { NextRequest, NextResponse } from "next/server";
import { CLAIM_TRANSITIONS } from "@/lib/claim-transitions";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidUUID, sanitizeString } from "@/lib/validation";

const ALL_TRANSITION_TARGETS = new Set(Object.values(CLAIM_TRANSITIONS).flat());

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid claim ID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await apiRateLimit(`${user.id}:${getClientIp(request)}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many claim status requests" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  const body = await request.json().catch(() => null);
  const newStatus = typeof body?.status === "string" ? body.status : "";
  if (!ALL_TRANSITION_TARGETS.has(newStatus)) {
    return NextResponse.json({ error: "Invalid claim status" }, { status: 400 });
  }

  const note = sanitizeString(body?.note, 2000);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("transition_warranty_claim", {
    p_claim_id: id,
    p_new_status: newStatus,
    p_note: note || null,
    p_actor_id: user.id,
  });

  if (error) {
    const message = String(error.message || "");
    if (message.includes("claim_not_found") || message.includes("warranty_not_found")) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    if (message.includes("claim_transition_forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (message.includes("invalid_claim_transition")) {
      return NextResponse.json({ error: "Invalid claim status transition" }, { status: 409 });
    }
    if (message.includes("claim_transition_conflict")) {
      return NextResponse.json(
        { error: "Claim status changed; reload and try again" },
        { status: 409 }
      );
    }

    console.error("Claim transition failed:", error.message);
    return NextResponse.json({ error: "Could not update claim status" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
