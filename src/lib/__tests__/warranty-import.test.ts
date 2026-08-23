import { describe, expect, it } from "vitest";
import {
  autoMapImportHeaders,
  getImportDuplicateKey,
  getImportDuplicateKeys,
  mapImportRows,
  reviewImportRows,
} from "@/lib/warranty-import";

describe("warranty import", () => {
  it("maps common spreadsheet headings to canonical fields", () => {
    expect(autoMapImportHeaders(["Product", "Serial No", "Purchase Date", "Expiry Date", "Unknown"])).toEqual({
      Product: "product_name",
      "Serial No": "serial_number",
      "Purchase Date": "start_date",
      "Expiry Date": "end_date",
      Unknown: "ignore",
    });
  });

  it("rejects invalid dates and in-file duplicates before commit", () => {
    const mapping = autoMapImportHeaders(["product_name", "serial_number", "start_date", "end_date"]);
    const rows = mapImportRows([
      { product_name: "Pump", serial_number: "P-1", start_date: "2026-01-01", end_date: "2027-01-01" },
      { product_name: "Pump", serial_number: "P-1", start_date: "2026-01-01", end_date: "2027-01-01" },
      { product_name: "Valve", serial_number: "V-1", start_date: "01/01/2026", end_date: "2025-01-01" },
    ], mapping);
    const review = reviewImportRows(rows);
    expect(review[0]).toMatchObject({ valid: true, duplicate: false });
    expect(review[1]).toMatchObject({ valid: false, duplicate: true });
    expect(review[2].errors).toContain("start_date must use YYYY-MM-DD");
  });

  it("rejects impossible calendar dates instead of allowing JavaScript normalization", () => {
    const review = reviewImportRows([{
      sourceRow: 2,
      product_name: "Compressor",
      serial_number: "C-2026-02-30",
      start_date: "2026-02-30",
      end_date: "2027-02-30",
    }]);

    expect(review[0]).toMatchObject({ valid: false, duplicate: false });
    expect(review[0].errors).toEqual(expect.arrayContaining([
      "start_date must use YYYY-MM-DD",
      "end_date must use YYYY-MM-DD",
    ]));
  });

  it("detects duplicates already owned by the importer", () => {
    const row = { sourceRow: 2, product_name: "Laptop", serial_number: "ABC-123", start_date: "2026-01-01", end_date: "2027-01-01" };
    const existing = new Set([getImportDuplicateKey(row)]);
    expect(reviewImportRows([row], existing)[0]).toMatchObject({ valid: false, duplicate: true });
  });

  it("detects repeated invoice references even when serial numbers differ", () => {
    const first = {
      sourceRow: 2,
      product_name: "Laptop",
      serial_number: "ABC-123",
      invoice_reference: "INV-400",
      start_date: "2026-01-01",
      end_date: "2027-01-01",
    };
    const second = { ...first, sourceRow: 3, serial_number: "ABC-124" };

    expect(getImportDuplicateKeys(first)).toEqual([
      "serial:abc-123",
      "invoice:inv-400",
    ]);
    expect(reviewImportRows([first, second])[1]).toMatchObject({
      valid: false,
      duplicate: true,
    });
  });
});
