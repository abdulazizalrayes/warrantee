// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = await rateLimit(ip, { maxRequests: 10, windowMs: 60000, identifier: "export" });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams?.get("format") || "csv";
  const type = searchParams?.get("type") || "warranties";

  try {
    let data: any[] = [];

    if (type === "warranties") {
      const { data: warranties, error } = await supabase
        .from("warranties")
        .select("id, reference_number, product_name, product_name_ar, sku, serial_number, quantity, category, status, start_date, end_date, coverage_type, seller_name, seller_email, purchase_price, currency, created_at")
        .or(buildWarrantyAccessOrClause(user.id))
        .order("created_at", { ascending: false });
      if (error) throw error;
      data = warranties || [];
    } else if (type === "claims") {
      const { data: visibleWarranties, error: warrantyError } = await supabase
        .from("warranties")
        .select("id")
        .or(buildWarrantyAccessOrClause(user.id));

      if (warrantyError) throw warrantyError;

      const warrantyIds = (visibleWarranties || []).map((warranty) => warranty.id);
      if (warrantyIds.length === 0) {
        data = [];
      } else {
        const { data: claims, error } = await supabase
          .from("warranty_claims")
          .select("id, warranty_id, claim_type, status, description, created_at, updated_at")
          .in("warranty_id", warrantyIds)
          .order("created_at", { ascending: false });
        if (error) throw error;
        data = claims || [];
      }
    } else {
      return NextResponse.json({ error: "Unsupported export type" }, { status: 400 });
    }

    if (format === "pdf") {
      return NextResponse.json(
        { error: "PDF export is not available yet. Use format=csv for a real data export." },
        { status: 501 }
      );
    }

    if (format === "csv") {
      if (data.length === 0) {
        return new NextResponse("No data to export", { status: 200, headers: { "Content-Type": "text/plain" } });
      }
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(",")];
      for (const row of data) {
        const values = headers.map(h => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
        });
        csvRows.push(values.join(","));
      }
      const csv = csvRows.join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${type}-export-${new Date().toISOString().slice(0,10)}.csv"`,
        },
      });
    }

    if (format !== "json") {
      return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
    }

    // JSON format fallback
    return NextResponse.json({ success: true, data, total: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
