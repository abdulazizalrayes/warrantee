import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  getDefaultExtensionPolicy,
  parseExtensionPolicyMetadata,
} from "@/lib/extension-policy";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;
  return { ...user, role: profile.role, full_name: profile.full_name };
}

export async function GET(_request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const [{ data: warranties, error: warrantiesError }, { data: policyLogs, error: logsError }, { data: interestLogs, error: interestError }] =
    await Promise.all([
      supabaseAdmin
        .from("warranties")
        .select("id, product_name, seller_name, seller_email, seller_id, issuer_user_id, status, end_date, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("activity_log")
        .select("entity_id, metadata, created_at, actor_id")
        .eq("entity_type", "warranty")
        .eq("action", "extension_policy_set")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("activity_log")
        .select("entity_id")
        .eq("entity_type", "warranty")
        .eq("action", "extension_interest_registered")
        .limit(1000),
    ]);

  if (warrantiesError || logsError || interestError) {
    return NextResponse.json({ error: "Failed to load extension policies" }, { status: 500 });
  }

  const latestPolicyByWarranty = new Map<string, any>();
  for (const log of policyLogs || []) {
    if (!log.entity_id || latestPolicyByWarranty.has(log.entity_id)) continue;
    latestPolicyByWarranty.set(log.entity_id, log);
  }

  const interestCountByWarranty = new Map<string, number>();
  for (const log of interestLogs || []) {
    if (!log.entity_id) continue;
    interestCountByWarranty.set(log.entity_id, (interestCountByWarranty.get(log.entity_id) || 0) + 1);
  }

  return NextResponse.json({
    data: (warranties || []).map((warranty) => {
      const policyLog = latestPolicyByWarranty.get(warranty.id);
      const policy = policyLog
        ? parseExtensionPolicyMetadata({
            ...policyLog.metadata,
            configuredAt: policyLog.created_at,
            configuredBy: policyLog.actor_id,
          })
        : getDefaultExtensionPolicy();

      return {
        warranty,
        policy,
        wishlistCount: interestCountByWarranty.get(warranty.id) || 0,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.warrantyId || !body?.source || !body?.status) {
    return NextResponse.json({ error: "warrantyId, source, and status are required" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const allowedSources = ["none", "seller", "platform", "third_party", "seller_then_platform"];
  const allowedStatuses = ["not_configured", "pending", "approved", "rejected"];
  if (!allowedSources.includes(body.source) || !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid policy values" }, { status: 400 });
  }

  const { data: warranty } = await supabaseAdmin
    .from("warranties")
    .select("id")
    .eq("id", body.warrantyId)
    .single();

  if (!warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("activity_log").insert({
    actor_id: authUser.id,
    entity_type: "warranty",
    entity_id: body.warrantyId,
    action: "extension_policy_set",
    metadata: {
      source: body.source,
      status: body.status,
      providerLabel: typeof body.providerLabel === "string" ? body.providerLabel : null,
      providerEmail: typeof body.providerEmail === "string" ? body.providerEmail : null,
      providerReference: typeof body.providerReference === "string" ? body.providerReference : null,
      pricingMode: ["quote_required", "fixed_price", "admin_review"].includes(body.pricingMode)
        ? body.pricingMode
        : "quote_required",
      price: Number.isFinite(Number(body.price)) && Number(body.price) > 0 ? Number(body.price) : null,
      currency: typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : null,
      coverageTerms: typeof body.coverageTerms === "string" ? body.coverageTerms : null,
      underwritingStatus: ["not_started", "requires_review", "approved", "rejected"].includes(body.underwritingStatus)
        ? body.underwritingStatus
        : "not_started",
      slaHours: Number.isFinite(Number(body.slaHours)) && Number(body.slaHours) > 0 ? Number(body.slaHours) : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      configuredAt: new Date().toISOString(),
      configuredBy: authUser.id,
      configuredByName: authUser.full_name || authUser.email || "Super Admin",
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
