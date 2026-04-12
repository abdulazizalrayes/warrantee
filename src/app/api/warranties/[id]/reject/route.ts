import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let reason: string | undefined;
    try {
      const body = await request.json();
      if (typeof body.reason === "string") reason = body.reason.trim().slice(0, 500);
    } catch {
      // reason is optional
    }

    const { data: warranty, error: fetchError } = await supabase
      .from("warranties")
      .select("id, product_name, user_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !warranty) {
      return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
    }

    if (!["pending_approval", "pending"].includes(warranty.status)) {
      return NextResponse.json({ error: "Warranty is not pending approval" }, { status: 409 });
    }

    const { error: updateError } = await supabase
      .from("warranties")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to reject warranty" }, { status: 500 });
    }

    await supabase.from("activity_log").insert({
      entity_type: "warranty",
      entity_id: id,
      action: "rejected",
      actor_id: user.id,
      previous_state: { status: warranty.status },
      new_state: { status: "cancelled", reason },
    });

    await supabase.from("notifications").insert({
      user_id: warranty.user_id,
      warranty_id: id,
      type: "warranty_rejected",
      title: "Warranty Rejected",
      message: `Your warranty for ${warranty.product_name} has been rejected${reason ? `: ${reason}` : "."}`,
    });

    return NextResponse.json({ success: true, status: "cancelled" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
