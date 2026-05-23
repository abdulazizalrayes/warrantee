import { describe, expect, it } from "vitest";
import {
  getDocumentKindLabel,
  inferWarrantyDocumentKind,
  isSchemaColumnError,
  shortDocumentHash,
} from "@/lib/warranty-document-provenance";

describe("warranty document provenance helpers", () => {
  it("prefers an explicit valid document kind", () => {
    expect(inferWarrantyDocumentKind("anything.pdf", "certificate")).toBe("certificate");
  });

  it("infers original proof from common receipt and warranty names", () => {
    expect(inferWarrantyDocumentKind("Samsung Warranty Receipt.pdf")).toBe("original_proof");
  });

  it("falls back to reference for unknown filenames", () => {
    expect(inferWarrantyDocumentKind("notes.docx")).toBe("reference");
  });

  it("shortens a long hash safely", () => {
    expect(shortDocumentHash("1234567890abcdef1234567890abcdef")).toBe("1234567890ab...abcdef");
  });

  it("returns localized labels", () => {
    expect(getDocumentKindLabel("certificate", false)).toBe("Certificate");
    expect(getDocumentKindLabel("certificate", true)).toBe("شهادة");
  });

  it("recognizes schema column errors", () => {
    expect(isSchemaColumnError('column "document_kind" does not exist')).toBe(true);
    expect(isSchemaColumnError("random failure")).toBe(false);
  });
});
