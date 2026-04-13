// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  // Require service role key for secure operations
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { searchParams } = new URL(request.url);
  const query = searchParams?.get("q");

  if (!query) {
    return NextResponse.json({ success: false, error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    // Search by ID, certificate_number, or serial_number
    const { data, error } = await supabase
      .from("warranties")
      .select("id, product_name, serial_number, status, warranty_start_date, warranty_end_date, coverage_type, customer_name, certificate_number, created_at")
      .or(`id.eq.${query},serial_number.ilike.${query},certificate_number.ilike.${query}`)
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "Warranty not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
