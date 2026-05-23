import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filter = request.nextUrl.searchParams.get("filter") || "all";

  const { data: warranties, error: warrantyError } = await supabase
    .from("warranties")
    .select("id")
    .or(buildWarrantyAccessOrClause(user.id))
    .limit(500);

  if (warrantyError) {
    return NextResponse.json({ error: "Failed to load extensions" }, { status: 500 });
  }

  const warrantyIds = (warranties || []).map((warranty) => warranty.id).filter(Boolean);
  if (warrantyIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  let query = supabase
    .from("warranty_extensions")
    .select(
      "id, new_end_date, price, currency, commission_rate, commission_amount, terms, is_purchased, created_at, warranty_id"
    )
    .in("warranty_id", warrantyIds)
    .order("created_at", { ascending: false });

  if (filter === "purchased") {
    query = query.eq("is_purchased", true);
  } else if (filter === "available") {
    query = query.eq("is_purchased", false);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to load extensions" }, { status: 500 });
  }

  const extensionRows = data || [];
  const extensionWarrantyIds = Array.from(
    new Set(extensionRows.map((row) => row.warranty_id).filter(Boolean))
  );

  let warrantyMeta = new Map<
    string,
    {
      product_name: string | null;
      product_name_ar: string | null;
      reference_number: string | null;
      end_date: string | null;
    }
  >();

  if (extensionWarrantyIds.length > 0) {
    const { data: warrantyRows } = await supabase
      .from("warranties")
      .select("id, product_name, product_name_ar, reference_number, end_date")
      .in("id", extensionWarrantyIds);

    warrantyMeta = new Map(
      (warrantyRows || []).map((warranty) => [
        warranty.id,
        {
          product_name: warranty.product_name ?? null,
          product_name_ar: warranty.product_name_ar ?? null,
          reference_number: warranty.reference_number ?? null,
          end_date: warranty.end_date ?? null,
        },
      ])
    );
  }

  return NextResponse.json({
    data: extensionRows.map((row) => ({
      ...row,
      warranties: warrantyMeta.get(row.warranty_id) || null,
    })),
  });
}
