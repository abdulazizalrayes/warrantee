import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  buildWarrantyAccessOrClause,
  canMutateWarranty,
} from "@/lib/warranty-access";

export async function GET(
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

    const { data, error } = await supabase
      .from("warranties")
      .select("*, warranty_documents(*), warranty_claims(*)")
      .eq("id", id)
      .or(buildWarrantyAccessOrClause(user.id))
      .single();

    if (error) {
      return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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

    const { data: existing, error: lookupError } = await supabase
      .from("warranties")
      .select("id, user_id, created_by, seller_id, issuer_user_id")
      .eq("id", id)
      .or(buildWarrantyAccessOrClause(user.id))
      .single();

    if (lookupError || !existing) {
      return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
    }

    if (!canMutateWarranty(existing, user.id)) {
      return NextResponse.json(
        { error: "Only the warranty owner, seller, or issuer can update this warranty" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const ALLOWED_FIELDS = [
      "product_name",
      "product_name_ar",
      "description",
      "serial_number",
      "sku",
      "quantity",
      "category",
      "seller_name",
      "seller_email",
      "po_reference",
      "invoice_reference",
      "purchase_price",
      "coverage_type",
      "start_date",
      "end_date",
      "terms_and_conditions",
      "custom_clauses",
      "language",
    ];
    const updateBody = Object.fromEntries(
      Object.entries(body).filter(([key]) => ALLOWED_FIELDS.includes(key))
    );

    if (Object.keys(updateBody).length === 0) {
      return NextResponse.json({ error: "No allowed fields supplied" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("warranties")
      .update({ ...updateBody, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const { data: existing, error: lookupError } = await supabase
      .from("warranties")
      .select("id, user_id, created_by, seller_id, issuer_user_id")
      .eq("id", id)
      .or(buildWarrantyAccessOrClause(user.id))
      .single();

    if (lookupError || !existing) {
      return NextResponse.json({ error: "Warranty not found" }, { status: 404 });
    }

    if (!canMutateWarranty(existing, user.id)) {
      return NextResponse.json(
        { error: "Only the warranty owner, seller, or issuer can delete this warranty" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("warranties")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
