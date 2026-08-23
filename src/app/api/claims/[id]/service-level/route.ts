import { NextRequest, NextResponse } from "next/server";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidUUID, sanitizeString } from "@/lib/validation";
import { canMutateWarrantyForUser, canViewWarrantyForUser } from "@/lib/warranty-access";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";

const REASON_CODES = new Set(["coverage_confirmed", "coverage_excluded", "insufficient_evidence", "duplicate_claim", "repair_authorized", "replacement_authorized", "customer_withdrew", "other"]);

function parseTarget(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

async function getContext(
  id: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const admin = createSupabaseAdminClient();
  const { data: claim } = await admin.from("warranty_claims").select("id,warranty_id,target_response_at,target_resolution_at,decision_reason_code,failure_mode_code,evidence_requirements").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!claim) return { claim: null, canView: false, canManage: false, admin };
  const { data: warranty } = await admin.from("warranties").select("id,user_id,created_by,seller_id,issuer_user_id,recipient_user_id,buyer_id,issuer_company_id,recipient_company_id").eq("id", claim.warranty_id).maybeSingle();
  return {
    claim,
    canView: await canViewWarrantyForUser(supabase, warranty, userId),
    canManage: await canMutateWarrantyForUser(supabase, warranty, userId),
    admin,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid claim ID" }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const context = await getContext(id, user.id, supabase);
  if (!context.claim || !context.canView) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  return NextResponse.json({ data: context.claim, canManage: context.canManage });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedSameOriginRequest(request, request.nextUrl.origin)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid claim ID" }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await apiRateLimit(`${user.id}:${getClientIp(request)}:claim-service-level`);
  if (!limit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: getRateLimitHeaders(limit) });
  const context = await getContext(id, user.id, supabase);
  if (!context.claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  if (!context.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const responseTarget = parseTarget(body.target_response_at);
  const resolutionTarget = parseTarget(body.target_resolution_at);
  if (responseTarget === undefined || resolutionTarget === undefined) return NextResponse.json({ error: "Invalid target date" }, { status: 400 });
  if (responseTarget && resolutionTarget && new Date(resolutionTarget) < new Date(responseTarget)) return NextResponse.json({ error: "Resolution target cannot be before response target" }, { status: 400 });
  if (body.decision_reason_code && (typeof body.decision_reason_code !== "string" || !REASON_CODES.has(body.decision_reason_code))) {
    return NextResponse.json({ error: "Invalid decision reason" }, { status: 400 });
  }
  const reason = typeof body.decision_reason_code === "string" ? body.decision_reason_code || null : null;
  const failureMode = typeof body.failure_mode_code === "string" ? sanitizeString(body.failure_mode_code, 80).toLowerCase().replace(/[^a-z0-9_\-]/g, "_") : null;
  const evidence = Array.isArray(body.evidence_requirements)
    ? body.evidence_requirements
      .slice(0, 10)
      .filter((item: unknown): item is string => typeof item === "string")
      .map((item: string) => sanitizeString(item, 160))
      .filter(Boolean)
    : [];

  const update = {
    target_response_at: responseTarget,
    target_resolution_at: resolutionTarget,
    decision_reason_code: reason,
    failure_mode_code: failureMode || null,
    evidence_requirements: evidence,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await context.admin.from("warranty_claims").update(update).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: "Could not update claim service targets" }, { status: 500 });
  await context.admin.from("claim_events").insert({
    claim_id: id, event_type: "comment", created_by: user.id,
    description: "Claim response targets and evidence requirements updated.",
  });
  return NextResponse.json({ data });
}
