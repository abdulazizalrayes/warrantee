import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { readSheet } from "read-excel-file/browser";
import { apiRateLimit, bulkImportRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildImportWarrantyInsert,
  getImportDuplicateKey,
  mapImportRows,
  normalizeImportHeader,
  parseImportMapping,
  reviewImportRows,
} from "@/lib/warranty-import";
import { isWarrantyLimitError, warrantyLimitResponseBody } from "@/lib/warranty-entitlements";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_ROWS = 500;

function normalizeSpreadsheetValue(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function rowsFromSheet(sheetRows: unknown[][]) {
  const [rawHeaders, ...dataRows] = sheetRows;
  if (!rawHeaders) return { headers: [] as string[], rows: [] as Record<string, string>[] };
  const headers = rawHeaders.map((header) => normalizeSpreadsheetValue(header));
  return {
    headers,
    rows: dataRows
      .filter((row) => row.some((cell) => normalizeSpreadsheetValue(cell) !== ""))
      .map((row) => Object.fromEntries(headers.map((header, index) => [header, normalizeSpreadsheetValue(row[index])]))),
  };
}

async function parseFile(file: File) {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".xlsx")) return rowsFromSheet(await readSheet(await file.arrayBuffer()));
  if (!fileName.endsWith(".csv")) throw new Error("Only CSV and .xlsx files are supported");
  const parsed = Papa.parse<Record<string, string>>(await file.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length > 0) throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  return { headers: parsed.meta.fields || Object.keys(parsed.data[0] || {}), rows: parsed.data };
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedSameOriginRequest(request, request.nextUrl.origin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getClientIp(request);
    const globalLimit = await apiRateLimit(ip);
    if (!globalLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: getRateLimitHeaders(globalLimit) });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const importLimit = await bulkImportRateLimit(`${user.id}:${ip}`);
    if (!importLimit.success) {
      return NextResponse.json({ error: "Too many import attempts. Please wait before uploading another file." }, { status: 429, headers: getRateLimitHeaders(importLimit) });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const mode = formData.get("mode") === "commit" ? "commit" : "preview";
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File too large. Maximum size is 2MB" }, { status: 400 });

    const { headers, rows } = await parseFile(file);
    if (rows.length === 0) return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
    if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Too many rows. Maximum is ${MAX_ROWS} rows per import` }, { status: 400 });

    const mapping = parseImportMapping(formData.get("mapping"), headers);
    const normalizedRows = mapImportRows(rows, mapping);
    const duplicateProbes = normalizedRows.map((row) => ({
      key: getImportDuplicateKey(row),
      serial_number: row.serial_number || null,
      invoice_reference: row.invoice_reference || null,
      product_name: row.product_name || null,
      start_date: row.start_date || null,
      end_date: row.end_date || null,
    }));
    const { data: duplicateMatches, error: duplicateMatchError } = await supabase.rpc(
      "match_warranty_import_duplicate_keys",
      { p_rows: duplicateProbes },
    );
    if (duplicateMatchError) {
      console.warn("Bulk import duplicate matching failed:", duplicateMatchError.message);
      return NextResponse.json(
        { error: "Could not safely check the import for duplicates" },
        { status: 500 },
      );
    }
    const existingKeys = new Set<string>(
      ((duplicateMatches || []) as { duplicate_key: string }[]).map(
        (row) => row.duplicate_key,
      ),
    );
    const reviewed = reviewImportRows(normalizedRows, existingKeys);
    const summary = {
      total: reviewed.length,
      valid: reviewed.filter((row) => row.valid).length,
      invalid: reviewed.filter((row) => !row.valid).length,
      duplicates: reviewed.filter((row) => row.duplicate).length,
    };

    if (mode === "preview") {
      return NextResponse.json({
        mode,
        headers,
        normalizedHeaders: headers.map(normalizeImportHeader),
        mapping,
        rows: reviewed.slice(0, 100),
        summary,
      });
    }

    if (summary.invalid > 0) {
      return NextResponse.json({ error: "Resolve invalid or duplicate rows before committing", rows: reviewed.slice(0, 100), summary }, { status: 409 });
    }

    const batchId = crypto.randomUUID();
    const inserts = reviewed.map((row) => buildImportWarrantyInsert(row, user.id, batchId));
    const { data: imported, error: insertError } = await supabase.from("warranties").insert(inserts).select("id");
    if (insertError) {
      if (isWarrantyLimitError(insertError)) {
        return NextResponse.json(warrantyLimitResponseBody(), { status: 409 });
      }
      console.warn("Bulk import commit failed:", insertError.message);
      return NextResponse.json({ error: "Import was not committed. No rows were added." }, { status: 500 });
    }

    await supabase.from("activity_log").insert({
      actor_id: user.id,
      entity_type: "warranty_import",
      entity_id: batchId,
      action: "bulk_import_committed",
      metadata: { batch_id: batchId, imported: imported?.length || 0, file_type: file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv" },
    });
    return NextResponse.json({ imported: imported?.length || 0, batchId, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const clientError = message.includes("supported") || message.includes("parse error");
    if (!clientError) console.warn("Bulk import error:", message);
    return NextResponse.json({ error: clientError ? message : "Internal server error" }, { status: clientError ? 400 : 500 });
  }
}
