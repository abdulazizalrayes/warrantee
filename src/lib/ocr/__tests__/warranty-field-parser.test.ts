import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractWarrantyFields } from "@/lib/ocr/warranty-field-parser";

type CorpusEntry = {
  id: string;
  file?: string;
  text?: string;
  minConfidence?: number;
  expectedFields: Record<string, string | number>;
};

const corpusDir = path.join(
  process.cwd(),
  process.env.OCR_CORPUS_DIR || "tests/fixtures/ocr-corpus/synthetic",
);
const manifestPath = path.join(
  corpusDir,
  "manifest.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  entries: CorpusEntry[];
};

describe(`OCR warranty field parser corpus: ${path.dirname(manifestPath)}`, () => {
  for (const entry of manifest.entries) {
    it(`extracts expected fields for ${entry.id}`, () => {
      const sourceText = entry.text ?? (
        entry.file ? fs.readFileSync(path.join(corpusDir, entry.file), "utf8") : ""
      );
      expect(sourceText.length, `${entry.id}.sourceText`).toBeGreaterThan(0);

      const fields = extractWarrantyFields(sourceText);
      const duration = typeof fields.warranty_duration === "string"
        ? fields.warranty_duration
        : "";
      const durationAmount = Number.parseInt(duration, 10);
      const warrantyMonths = Number.isFinite(durationAmount)
        ? /(?:year|yr|سنة|سنوات|عام)/i.test(duration)
          ? durationAmount * 12
          : durationAmount
        : undefined;
      const normalizedFields: Record<string, string | number | undefined> = {
        ...fields,
        purchase_date: fields.purchase_date ?? fields.start_date,
        warranty_months: fields.warranty_months ?? warrantyMonths,
      };

      for (const [fieldName, expectedValue] of Object.entries(entry.expectedFields)) {
        expect(normalizedFields[fieldName], `${entry.id}.${fieldName}`).toBe(expectedValue);
      }

      if (entry.minConfidence !== undefined) {
        expect(fields.confidence, `${entry.id}.confidence`).toBeGreaterThanOrEqual(
          entry.minConfidence,
        );
      }
    });
  }
});

describe("sentence-separated OCR fields", () => {
  it("extracts English supplier and product labels between sentences", () => {
    const fields = extractWarrantyFields(
      "Invoice DEMO-001. Seller: Riyadh Equipment. Product: Industrial Pump. Warranty: 24 months.",
    );

    expect(fields.supplier).toBe("Riyadh Equipment");
    expect(fields.product_name).toBe("Industrial Pump");
  });

  it("extracts Arabic supplier and product labels between sentences", () => {
    const fields = extractWarrantyFields(
      "فاتورة DEMO-AR-001. المورد: شركة المعدات. المنتج: مضخة صناعية. الضمان: 24 شهر.",
    );

    expect(fields.supplier).toBe("شركة المعدات");
    expect(fields.product_name).toBe("مضخة صناعية");
  });

  it("prefers noisy labelled product text over an invoice-heading fallback", () => {
    const fields = extractWarrantyFields(
      "INV0ICE DEMO-BLUR-001. S0LD BY Demo Appliances. PR0DUCT Demo Washer. WARRANTY 24 M0NTHS.",
    );

    expect(fields.supplier).toBe("Demo Appliances");
    expect(fields.product_name).toBe("Demo Washer");
  });
});
