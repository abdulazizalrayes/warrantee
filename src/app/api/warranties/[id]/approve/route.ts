import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/warranties/[id]/approve
// Transitions: pending_approval → active
// Requires role: approver, company_admin, or platform_admin
export async function POST(
  _req: NextRequest,
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

  const { data: warranty, error: fetchError } = await supabase
    .from("warranties")
    .select("id, status, product_name")
    .eq("id", id)
    .single();

  if (fetchError || !warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  if (warranty.status !== "pending_approval") {
    return NextResponse.json(
      { error: `Cannot approve warranty in '${warranty.status}' status. Must be 'pending_approval'.` },
      { status: 422 }
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("warranties")
    .update({
      status: "active",
      approved_by: user.id,
      approved_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to approve warranty" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    entity_type: "warranty",
    entity_id: id,
    action: "approved",
    previous_state: { status: "pending_approval" },
    new_state: { status: "active" },
  });

  await supabase.from("notifications").insert({
    user_id: user.id,
    warranty_id: id,
    type: "warranty_approved",
    title: "Warranty Approved",
    body: `${warranty.product_name} has been approved and is now active`,
  });

  return NextResponse.json({ success: true, status: "active", approved_at: now });
}
