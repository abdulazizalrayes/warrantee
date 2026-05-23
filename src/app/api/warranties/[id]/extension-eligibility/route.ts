import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canViewWarranty } from "@/lib/warranty-access";
import { getExtensionEligibility } from "@/lib/extension-eligibility";
import { getLatestExtensionPolicy } from "@/lib/extension-policy";

export async function GET(
  _request: NextRequest,
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
    .select("id, status, end_date, user_id, created_by, seller_id, issuer_user_id, recipient_user_id, buyer_id")
    .eq("id", id)
    .single();

  if (!warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  if (!canViewWarranty(warranty, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const policy = await getLatestExtensionPolicy(supabase, id);
  const eligibility = getExtensionEligibility(warranty, policy);

  return NextResponse.json({ data: { eligibility, policy } });
}
