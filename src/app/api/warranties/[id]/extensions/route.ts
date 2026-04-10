import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/warranties/[id]/extensions — list extension offers for a warranty
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: warranty } = await supabase
    .from("warranties")
    .select("id, user_id, issuer_user_id, recipient_user_id")
    .eq("id", id)
    .single();

  if (!warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  const isParty =
    warranty.user_id === user.id ||
    warranty.issuer_user_id === user.id ||
    warranty.recipient_user_id === user.id;

  if (!isParty) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: extensions, error } = await supabase
    .from("warranty_extensions")
    .select("*")
    .eq("warranty_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch extensions" }, { status: 500 });
  }

  return NextResponse.json({ data: extensions });
}

// POST /api/warranties/[id]/extensions — create an extension offer
// Body: { extension_months, price, currency?, terms?, purchase_now? }
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

  const { data: warranty, error: fetchError } = await supabase
    .from("warranties")
    .select("id, status, end_date, user_id, issuer_user_id, product_name")
    .eq("id", id)
    .single();

  if (fetchError || !warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  if (!["active", "expired"].includes(warranty.status)) {
    return NextResponse.json(
      { error: `Extensions can only be offered on active or expired warranties (current: ${warranty.status})` },
      { status: 422 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const extensionMonths = Number(body.extension_months);
  if (!extensionMonths || extensionMonths < 1 || extensionMonths > 120) {
    return NextResponse.json(
      { error: "extension_months must be between 1 and 120" },
      { status: 400 }
    );
  }

  const currentEnd = new Date(warranty.end_date);
  const newEnd = new Date(currentEnd);
  newEnd.setMonth(newEnd.getMonth() + extensionMonths);

  const extensionRecord: Record<string, unknown> = {
    warranty_id: id,
    new_end_date: newEnd.toISOString().split("T")[0],
    price: body.price ?? 0,
    currency: body.currency ?? "SAR",
    terms: body.terms ?? null,
    offered_by: user.id,
    is_purchased: false,
  };

  const purchaseNow = body.purchase_now === true;
  if (purchaseNow) {
    extensionRecord.is_purchased = true;
    extensionRecord.purchased_by = user.id;
    extensionRecord.purchased_at = new Date().toISOString();
  }

  const { data: extension, error: insertError } = await supabase
    .from("warranty_extensions")
    .insert(extensionRecord)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to create extension" }, { status: 500 });
  }

  if (purchaseNow) {
    // Update the warranty end date and status if expired
    const updates: Record<string, unknown> = {
      end_date: newEnd.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    };
    if (warranty.status === "expired") {
      updates.status = "active";
    }

    await supabase.from("warranties").update(updates).eq("id", id);

    await supabase.from("activity_log").insert({
      actor_id: user.id,
      entity_type: "warranty",
      entity_id: id,
      action: "extended",
      previous_state: { end_date: warranty.end_date, status: warranty.status },
      new_state: { end_date: newEnd.toISOString().split("T")[0], extension_months: extensionMonths },
    });
  }

  return NextResponse.json(
    { data: extension, new_end_date: extensionRecord.new_end_date },
    { status: 201 }
  );
}
