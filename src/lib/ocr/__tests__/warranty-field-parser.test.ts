import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractWarrantyFields } from "@/lib/ocr/warranty-field-parser";

type CorpusEntry = {
  id: string;
  text: string;
  minConfidence?: number;
  expectedFields: Record<string, string | number>;
};

const manifestPath = path.join(
  process.cwd(),
  "tests/fixtures/ocr-corpus/synthetic/manifest.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  entries: CorpusEntry[];
};

describe("OCR warranty field parser synthetic corpus", () => {
  for (const entry of manifest.entries) {
    it(`extracts expected fields for ${entry.id}`, () => {
      const fields = extractWarrantyFields(entry.text);

      for (const [fieldName, expectedValue] of Object.entries(entry.expectedFields)) {
        expect(fields[fieldName], `${entry.id}.${fieldName}`).toBe(expectedValue);
      }

      if (entry.minConfidence !== undefined) {
        expect(fields.confidence, `${entry.id}.confidence`).toBeGreaterThanOrEqual(
          entry.minConfidence,
        );
      }
    });
  }
});
