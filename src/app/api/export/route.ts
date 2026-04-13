// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(ip, { maxRequests: 10, windowMs: 60000, identifier: "export" });
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
        .select("id, product_name, serial_number, status, purchase_date, warranty_start_date, warranty_end_date, coverage_type, coverage_amount, currency, customer_name, customer_email, created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      data = warranties || [];
    } else if (type === "claims") {
      const { data: claims, error } = await supabase
        .from("warranty_claims")
        .select("id, claim_number, status, claim_date, claimed_amount, description, resolved_at, created_at, warranty_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      data = claims || [];
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

    // JSON format fallback
    return NextResponse.json({ success: true, data, total: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
            }
