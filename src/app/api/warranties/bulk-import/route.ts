import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/validation";
import Papa from "papaparse";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_ROWS = 500;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await apiRateLimit(ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Parse CSV
    const text = await file.text();
    const { data: rows, errors: parseErrors } = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseErrors.length > 0) {
      return NextResponse.json(
        { error: "CSV parse errors", details: parseErrors.slice(0, 10) },
        { status: 400 }
      );
    }

    // Row count check
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Too many rows. Maximum is ${MAX_ROWS} rows per import` },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    const results = { imported: 0, errors: [] as { row: number; message: string }[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, string>;

      // Validate required fields
      if (!row.product_name || !row.start_date || !row.end_date) {
        results.errors.push({
          row: i + 2,
          message: "Missing required fields: product_name, start_date, end_date",
        });
        continue;
      }

      // Validate dates
      const startDate = new Date(row.start_date);
      const endDate = new Date(row.end_date);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        results.errors.push({
          row: i + 2,
          message: "Invalid date format for start_date or end_date",
        });
        continue;
      }

      if (endDate <= startDate) {
        results.errors.push({
          row: i + 2,
          message: "end_date must be after start_date",
        });
        continue;
      }

      const { error } = await supabase.from("warranties").insert({
        user_id: user.id,
        product_name: sanitizeString(row.product_name, 200),
        product_name_ar: row.product_name_ar ? sanitizeString(row.product_name_ar, 200) : null,
        serial_number: row.serial_number ? sanitizeString(row.serial_number, 100) : null,
        sku: row.sku ? sanitizeString(row.sku, 100) : null,
        category: row.category ? sanitizeString(row.category, 50) : null,
        start_date: row.start_date,
        end_date: row.end_date,
        seller_name: row.seller_name ? sanitizeString(row.seller_name, 200) : null,
        seller_email: row.seller_email ? sanitizeString(row.seller_email, 200) : null,
        status: "active",
        language: row.language === "ar" ? "ar" : "en",
      });

      if (error) {
        results.errors.push({ row: i + 2, message: error.message });
      } else {
        results.imported++;
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    console.warn("Bulk import error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
