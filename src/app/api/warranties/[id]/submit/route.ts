import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/warranties/[id]/submit
// Transitions: draft → pending_approval
// Any authenticated user who owns the warranty can submit it.
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

  const { data: warranty, error: fetchError } = await supabase
    .from("warranties")
    .select("id, status, product_name, created_by, issuer_user_id")
    .eq("id", id)
    .single();

  if (fetchError || !warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  if (warranty.status !== "draft") {
    return NextResponse.json(
      { error: `Cannot submit warranty in '${warranty.status}' status. Must be 'draft'.` },
      { status: 422 }
    );
  }

  const isOwner = warranty.created_by === user.id || warranty.issuer_user_id === user.id;
  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from("warranties")
    .update({ status: "pending_approval", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to submit warranty" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    entity_type: "warranty",
    entity_id: id,
    action: "submitted",
    previous_state: { status: "draft" },
    new_state: { status: "pending_approval" },
  });

  return NextResponse.json({ success: true, status: "pending_approval" });
}
