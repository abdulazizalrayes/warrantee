import { sanitizeString } from "@/lib/validation";

export const WARRANTY_IMPORT_FIELDS = [
  "product_name", "product_name_ar", "serial_number", "sku", "category",
  "start_date", "end_date", "seller_name", "seller_email", "quantity",
  "invoice_reference", "po_reference", "supplier", "purchase_price", "language",
] as const;

export type WarrantyImportField = (typeof WARRANTY_IMPORT_FIELDS)[number];
export type WarrantyImportMapping = Record<string, WarrantyImportField | "ignore">;

const HEADER_ALIASES: Record<string, WarrantyImportField> = {
  product: "product_name", item: "product_name", item_name: "product_name", asset: "product_name", asset_name: "product_name",
  product_ar: "product_name_ar", arabic_product_name: "product_name_ar",
  serial: "serial_number", serial_no: "serial_number", serial_num: "serial_number",
  model: "sku", model_number: "sku", product_code: "sku",
  purchase_date: "start_date", warranty_start: "start_date", warranty_start_date: "start_date",
  expiry_date: "end_date", expiration_date: "end_date", warranty_end: "end_date", warranty_end_date: "end_date",
  vendor: "seller_name", retailer: "seller_name", vendor_email: "seller_email", retailer_email: "seller_email",
  qty: "quantity", invoice: "invoice_reference", invoice_no: "invoice_reference",
  po: "po_reference", po_number: "po_reference", price: "purchase_price", value: "purchase_price", locale: "language",
};

export function normalizeImportHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "_").replace(/^_+|_+$/g, "");
}

export function autoMapImportHeaders(headers: string[]): WarrantyImportMapping {
  return Object.fromEntries(headers.map((header) => {
    const normalized = normalizeImportHeader(header);
    const exact = WARRANTY_IMPORT_FIELDS.find((field) => field === normalized);
    return [header, exact || HEADER_ALIASES[normalized] || "ignore"];
  }));
}

export function parseImportMapping(value: FormDataEntryValue | null, headers: string[]) {
  const automatic = autoMapImportHeaders(headers);
  if (typeof value !== "string" || !value) return automatic;
  try {
    const input = JSON.parse(value) as Record<string, unknown>;
    const allowed = new Set<string>([...WARRANTY_IMPORT_FIELDS, "ignore"]);
    for (const header of headers) {
      const selected = input[header];
      if (typeof selected === "string" && allowed.has(selected)) automatic[header] = selected as WarrantyImportField | "ignore";
    }
  } catch {
    // Invalid client mapping falls back to deterministic automatic mapping.
  }
  return automatic;
}

export type NormalizedImportRow = Partial<Record<WarrantyImportField, string>> & { sourceRow: number };

export function mapImportRows(rows: Record<string, string>[], mapping: WarrantyImportMapping): NormalizedImportRow[] {
  return rows.map((row, index) => {
    const normalized: NormalizedImportRow = { sourceRow: index + 2 };
    for (const [header, value] of Object.entries(row)) {
      const field = mapping[header];
      if (field && field !== "ignore") normalized[field] = String(value ?? "").trim();
    }
    return normalized;
  });
}

export type ImportRowReview = NormalizedImportRow & { valid: boolean; duplicate: boolean; errors: string[] };

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

export function getImportDuplicateKey(row: NormalizedImportRow) {
  return getImportDuplicateKeys(row)[0];
}

export function getImportDuplicateKeys(row: NormalizedImportRow) {
  const keys: string[] = [];
  const serial = row.serial_number?.trim().toLowerCase();
  if (serial) keys.push(`serial:${serial}`);
  const invoice = row.invoice_reference?.trim().toLowerCase();
  if (invoice) keys.push(`invoice:${invoice}`);
  if (keys.length === 0) {
    keys.push(
      [row.product_name, row.start_date, row.end_date]
        .map((value) => String(value || "").trim().toLowerCase())
        .join("|"),
    );
  }
  return keys;
}

export function reviewImportRows(rows: NormalizedImportRow[], existingKeys: Set<string> = new Set()) {
  const seen = new Set<string>();
  return rows.map<ImportRowReview>((row) => {
    const errors: string[] = [];
    if (!row.product_name) errors.push("product_name is required");
    if (!row.start_date) errors.push("start_date is required");
    if (!row.end_date) errors.push("end_date is required");
    const start = parseDate(row.start_date);
    const end = parseDate(row.end_date);
    if (row.start_date && !start) errors.push("start_date must use YYYY-MM-DD");
    if (row.end_date && !end) errors.push("end_date must use YYYY-MM-DD");
    if (start && end && end <= start) errors.push("end_date must be after start_date");
    const quantity = Number.parseInt(row.quantity || "1", 10);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100000) errors.push("quantity must be between 1 and 100000");
    const price = row.purchase_price ? Number(row.purchase_price) : null;
    if (price !== null && (!Number.isFinite(price) || price < 0)) errors.push("purchase_price must be a positive number");
    if (row.seller_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.seller_email)) errors.push("seller_email is invalid");
    const keys = getImportDuplicateKeys(row);
    const duplicate = keys.some((key) => existingKeys.has(key) || seen.has(key));
    keys.forEach((key) => seen.add(key));
    if (duplicate) errors.push("possible duplicate");
    return { ...row, valid: errors.length === 0, duplicate, errors };
  });
}

export function buildImportWarrantyInsert(row: ImportRowReview, userId: string, batchId: string) {
  return {
    user_id: userId, created_by: userId, issuer_user_id: userId,
    reference_number: `WR-IMP-${batchId.slice(0, 8).toUpperCase()}-${row.sourceRow}`,
    product_name: sanitizeString(row.product_name ?? "", 200),
    product_name_ar: row.product_name_ar ? sanitizeString(row.product_name_ar, 200) : null,
    serial_number: row.serial_number ? sanitizeString(row.serial_number, 100) : null,
    sku: row.sku ? sanitizeString(row.sku, 100) : null,
    quantity: Number.parseInt(row.quantity || "1", 10),
    category: row.category ? sanitizeString(row.category, 50) : null,
    start_date: row.start_date!, end_date: row.end_date!,
    seller_name: row.seller_name ? sanitizeString(row.seller_name, 200) : null,
    seller_email: row.seller_email ? sanitizeString(row.seller_email, 200).toLowerCase() : null,
    invoice_reference: row.invoice_reference ? sanitizeString(row.invoice_reference, 100) : null,
    po_reference: row.po_reference ? sanitizeString(row.po_reference, 100) : null,
    supplier: row.supplier ? sanitizeString(row.supplier, 200) : null,
    purchase_price: row.purchase_price ? Number(row.purchase_price) : null,
    status: "active" as const, language: row.language === "ar" ? "ar" : "en",
    source: `bulk_import:${batchId}`,
  };
}
