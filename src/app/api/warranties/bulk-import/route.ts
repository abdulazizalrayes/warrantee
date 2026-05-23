import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/validation";
import { buildWarrantyOwnershipInsert } from "@/lib/warranty-access";
import Papa from "papaparse";
import { readSheet } from "read-excel-file/browser";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_ROWS = 500;

function generateReferenceNumber(rowIndex: number) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WR-IMP-${timestamp}-${rowIndex + 1}-${suffix}`;
}

function normalizeSpreadsheetValue(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function rowsFromSheet(sheetRows: unknown[][]) {
  const [rawHeaders, ...dataRows] = sheetRows;
  if (!rawHeaders) return [];

  const headers = rawHeaders.map((header) =>
    normalizeSpreadsheetValue(header).toLowerCase()
  );

  return dataRows
    .filter((row) => row.some((cell) => normalizeSpreadsheetValue(cell) !== ""))
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, normalizeSpreadsheetValue(row[index])])
      )
    );
}

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

    // Parse CSV or XLSX
    const fileName = file.name.toLowerCase();
    const isXlsx = fileName.endsWith(".xlsx");
    let rows: Record<string, string>[] = [];

    if (isXlsx) {
      const sheetRows = await readSheet(await file.arrayBuffer());
      rows = rowsFromSheet(sheetRows);
    } else if (fileName.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Legacy .xls files are not supported. Please upload CSV or .xlsx." },
        { status: 400 }
      );
    } else {
      // Default: CSV
      const text = await file.text();
      const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      if (parseErrors.length > 0) {
        return NextResponse.json(
          { error: "CSV parse errors", details: parseErrors.slice(0, 10) },
          { status: 400 }
        );
      }
      rows = data;
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
        { error: "File is empty or has no data rows" },
        { status: 400 }
      );
    }

    const results = { imported: 0, errors: [] as { row: number; message: string }[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

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

      const parsedQuantity = Number.parseInt(String(row.quantity || "1"), 10);

      const { error } = await supabase.from("warranties").insert({
        ...buildWarrantyOwnershipInsert(user.id),
        reference_number: generateReferenceNumber(i),
        product_name: sanitizeString(row.product_name, 200),
        product_name_ar: row.product_name_ar ? sanitizeString(row.product_name_ar, 200) : null,
        serial_number: row.serial_number ? sanitizeString(row.serial_number, 100) : null,
        sku: row.sku ? sanitizeString(row.sku, 100) : null,
        quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1,
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
