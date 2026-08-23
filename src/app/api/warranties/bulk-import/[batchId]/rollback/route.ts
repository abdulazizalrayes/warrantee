import { NextRequest, NextResponse } from "next/server";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";
import { resolveWarrantyAccessOrClause } from "@/lib/warranty-access";

export async function POST(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  if (!isTrustedSameOriginRequest(request, request.nextUrl.origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { batchId } = await params;
  if (!isValidUUID(batchId)) return NextResponse.json({ error: "Invalid import batch" }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await apiRateLimit(`${user.id}:${getClientIp(request)}:import-rollback`);
  if (!limit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: getRateLimitHeaders(limit) });

  const admin = createSupabaseAdminClient();
  const access = await resolveWarrantyAccessOrClause(supabase, user.id);
  const { data: rows, error: lookupError } = await admin.from("warranties").select("id")
    .eq("source", `bulk_import:${batchId}`).is("deleted_at", null).or(access);
  if (lookupError) return NextResponse.json({ error: "Could not load import batch" }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ error: "Import batch not found or already rolled back" }, { status: 404 });

  const now = new Date().toISOString();
  const ids = rows.map((row) => row.id);
  const { error: rollbackError } = await admin.from("warranties").update({
    deleted_at: now, is_archived: true, archived_at: now, archived_by: user.id, archive_reason: "bulk_import_rollback",
  }).in("id", ids);
  if (rollbackError) return NextResponse.json({ error: "Import rollback failed" }, { status: 500 });
  await admin.from("activity_log").insert({
    actor_id: user.id, entity_type: "warranty_import", entity_id: batchId,
    action: "bulk_import_rolled_back", metadata: { batch_id: batchId, rolled_back: ids.length },
  });
  return NextResponse.json({ rolledBack: ids.length });
}
