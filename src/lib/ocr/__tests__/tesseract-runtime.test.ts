import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { recognizeImageBufferWithTesseract } from "../tesseract";

describe("packaged local OCR runtime", () => {
  it.each([
    ["synthetic-en-receipt-clean.png", ["eng"], /SYN-LAP-2026-0001/],
    ["synthetic-ar-receipt-clean.png", ["eng", "ara"], /SYN-AR-123456/],
  ])("extracts the fixture identifier from %s using bundled models", async (file, languages, expected) => {
    const buffer = fs.readFileSync(`tests/fixtures/ocr-corpus/synthetic/media/${file}`);
    const result = await recognizeImageBufferWithTesseract(buffer, languages as string[]);
    expect(result.text).toMatch(expected as RegExp);
    expect(result.confidence).toBeGreaterThan(0.3);
  }, 20000);

  it("rejects unapproved language paths before creating a worker", async () => {
    await expect(recognizeImageBufferWithTesseract(Buffer.alloc(0), ["../other"]))
      .rejects.toThrow("Unsupported local OCR language");
  });
});
