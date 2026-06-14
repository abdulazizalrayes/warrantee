import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function authorizeAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { authorized: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    authorized: Boolean(profile && ["admin", "super_admin"].includes(profile.role)),
  };
}

export async function GET() {
  const { authorized } = await authorizeAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const sinceToday = new Date();
  sinceToday.setHours(0, 0, 0, 0);

  const [{ data: jobs }, { data: attachments }, { data: fraud }] = await Promise.all([
    supabaseAdmin
      .from("ingestion_jobs")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabaseAdmin
      .from("ingestion_attachments")
      .select("aggregate_confidence")
      .not("aggregate_confidence", "is", null)
      .limit(1000),
    supabaseAdmin
      .from("fraud_signals")
      .select("id, resolved")
      .eq("resolved", false)
      .limit(1000),
  ]);

  const rows = jobs || [];
  const statusBreakdown = rows.reduce((acc: Record<string, number>, row: any) => {
    const status = row.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const confidences = (attachments || [])
    .map((row: any) => Number(row.aggregate_confidence))
    .filter((value: number) => Number.isFinite(value));

  return NextResponse.json({
    total_jobs: rows.length,
    today_jobs: rows.filter((row: any) => row.created_at >= sinceToday.toISOString()).length,
    pending_review: rows.filter((row: any) => row.status === "pending_review").length,
    auto_confirmed: rows.filter((row: any) => row.status === "auto_confirmed").length,
    failed: rows.filter((row: any) => row.status === "failed").length,
    avg_confidence: confidences.length
      ? confidences.reduce((sum: number, value: number) => sum + value, 0) / confidences.length
      : 0,
    unresolved_fraud: fraud?.length || 0,
    pending_provisional: rows.filter((row: any) => row.status === "pending_buyer_confirmation").length,
    status_breakdown: statusBreakdown,
  });
}
