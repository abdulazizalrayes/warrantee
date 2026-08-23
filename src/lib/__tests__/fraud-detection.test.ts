import { describe, expect, it } from "vitest";
import { computeSimHash, getSimHashBuckets } from "@/lib/ingestion/fraud-detection";

describe("OCR duplicate candidate indexing", () => {
  it("produces deterministic 64-bit hashes and four stable index buckets", () => {
    const simHash = computeSimHash("Invoice 1234 mixer serial ABC-99");

    expect(simHash).toMatch(/^[0-9a-f]{16}$/);
    expect(getSimHashBuckets(simHash).join("")).toBe(simHash);
    expect(computeSimHash("Invoice 1234 mixer serial ABC-99")).toBe(simHash);
  });

  it("rejects malformed bucket input", () => {
    expect(() => getSimHashBuckets("not-a-hash")).toThrow("Invalid SimHash");
  });
});
