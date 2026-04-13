import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify warranty access (owner or party member)
  const { data: warranty } = await supabase
    .from("warranties")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!warranty) {
    const { data: partyMember } = await supabase
      .from("party_warranties")
      .select("warranty_id")
      .eq("warranty_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!partyMember) {
      return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
    }
  }

  const { data: items, error } = await supabase
    .from("warranty_coverage_items")
    .select("*")
    .eq("warranty_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: items ?? [] });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only warranty owner can add coverage items
  const { data: warranty } = await supabase
    .from("warranties")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  const body = await request.json();
  const { component, start_date, end_date, unit, limit_value, notes } = body;

  if (!component || !start_date || !end_date) {
    return NextResponse.json(
      { error: "component, start_date, and end_date are required" },
      { status: 400 }
    );
  }

  // unit: "time" (default) or "km" for KM-based coverage
  const validUnits = ["time", "km"];
  if (unit && !validUnits.includes(unit)) {
    return NextResponse.json(
      { error: `unit must be one of: ${validUnits.join(", ")}` },
      { status: 400 }
    );
  }

  const { data: item, error } = await supabase
    .from("warranty_coverage_items")
    .insert({
      warranty_id: id,
      component: String(component).slice(0, 200),
      start_date,
      end_date,
      unit: unit || "time",
      limit_value: limit_value ?? null,
      notes: notes ? String(notes).slice(0, 500) : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Write audit log
  await supabase.from("activity_log").insert({
    user_id: user.id,
    entity_type: "warranty",
    entity_id: id,
    action: "coverage_item_added",
    new_state: { component, start_date, end_date, unit: unit || "time" },
  });

  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only warranty owner can delete coverage items
  const { data: warranty } = await supabase
    .from("warranties")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!warranty) {
    return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams?.get("item_id");
  if (!itemId) {
    return NextResponse.json({ error: "item_id query param required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("warranty_coverage_items")
    .delete()
    .eq("id", itemId)
    .eq("warranty_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
