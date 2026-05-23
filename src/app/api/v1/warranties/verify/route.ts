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
  const query = searchParams?.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ success: false, error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const safeQuery = query.replace(/[%_,]/g, "").slice(0, 80);
    if (!safeQuery) {
      return NextResponse.json({ success: false, error: "Invalid verification query" }, { status: 400 });
    }

    // Public verification intentionally returns only proof-safe fields.
    const { data, error } = await supabase
      .from("warranties")
      .select("id, reference_number, product_name, product_name_ar, serial_number, status, start_date, end_date, category, seller_name, certificate_url, created_at")
      .or(`id.eq.${safeQuery},reference_number.ilike.${safeQuery},serial_number.ilike.${safeQuery}`)
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
