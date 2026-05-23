import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canViewWarranty } from "@/lib/warranty-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: warranty } = await supabase
    .from("warranties")
    .select("id, user_id, created_by, seller_id, issuer_user_id, recipient_user_id, buyer_id")
    .eq("id", id)
    .single();

  if (!warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  if (!canViewWarranty(warranty, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  const { error } = await supabase.from("activity_log").insert({
    actor_id: user.id,
    entity_type: "warranty",
    entity_id: id,
    action: "extension_interest_registered",
    metadata: {
      requested_months:
        typeof body.extensionMonths === "number" && body.extensionMonths > 0
          ? body.extensionMonths
          : null,
      source: "wishlist",
      created_at: new Date().toISOString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: "Failed to record wishlist interest" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
