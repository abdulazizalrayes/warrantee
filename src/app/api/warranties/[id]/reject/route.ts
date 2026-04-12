import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/warranties/[id]/reject
// Body: { reason: string }
// Transitions: pending_approval → draft
// Requires role: approver, company_admin, or platform_admin
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const approverRoles = ["approver", "company_admin", "platform_admin"];
  if (!profile || !approverRoles.includes(profile.role)) {
    return NextResponse.json(
      { error: "Forbidden: approver role required" },
      { status: 403 }
    );
  }

  let reason = "";
  try {
    const body = await req.json();
    reason = (body?.reason || "").trim();
  } catch {
    // no body is fine; reason stays empty
  }

  if (!reason) {
    return NextResponse.json(
      { error: "A rejection reason is required" },
      { status: 400 }
    );
  }

  const { data: warranty, error: fetchError } = await supabase
    .from("warranties")
    .select("id, status, product_name, created_by")
    .eq("id", id)
    .single();

  if (fetchError || !warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  if (warranty.status !== "pending_approval") {
    return NextResponse.json(
      { error: `Cannot reject warranty in '${warranty.status}' status. Must be 'pending_approval'.` },
      { status: 422 }
    );
  }

  const { error: updateError } = await supabase
    .from("warranties")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to reject warranty" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    entity_type: "warranty",
    entity_id: id,
    action: "rejected",
    previous_state: { status: "pending_approval" },
    new_state: { status: "draft" },
    details: { reason },
  });

  await supabase.from("notifications").insert({
    user_id: warranty.created_by,
    warranty_id: id,
    type: "warranty_rejected",
    title: "Warranty Rejected",
    body: `${warranty.product_name} was rejected: ${reason}`,
  });

  return NextResponse.json({ success: true, status: "draft", reason });
}
