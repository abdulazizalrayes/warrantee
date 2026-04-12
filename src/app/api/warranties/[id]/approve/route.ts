import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
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
      .update({ status: "active" })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to approve warranty" }, { status: 500 });
    }

    await supabase.from("activity_log").insert({
      entity_type: "warranty",
      entity_id: id,
      action: "approved",
      actor_id: user.id,
      previous_state: { status: warranty.status },
      new_state: { status: "active" },
    });

    await supabase.from("notifications").insert({
      user_id: warranty.user_id,
      warranty_id: id,
      type: "warranty_approved",
      title: "Warranty Approved",
      message: `Your warranty for ${warranty.product_name} has been approved.`,
    });

    return NextResponse.json({ success: true, status: "active" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
