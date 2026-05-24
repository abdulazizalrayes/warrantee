import { describe, expect, it } from "vitest";
import { normalizeWarrantyDocumentStoragePath } from "@/lib/documents";

describe("normalizeWarrantyDocumentStoragePath", () => {
  it("extracts paths from approved Supabase storage URLs", () => {
    expect(
      normalizeWarrantyDocumentStoragePath(
        null,
        "https://example.supabase.co/storage/v1/object/public/warranty-documents/user-1/warranty-1/proof.pdf"
      )
    ).toBe("user-1/warranty-1/proof.pdf");

    expect(
      normalizeWarrantyDocumentStoragePath(
        null,
        "https://example.supabase.co/storage/v1/object/sign/warranty-documents/user-1/warranty-1/proof.pdf?token=abc"
      )
    ).toBe("user-1/warranty-1/proof.pdf");
  });

  it("rejects absolute URLs outside the approved storage bucket", () => {
    expect(normalizeWarrantyDocumentStoragePath(null, "https://example.com/proof.pdf")).toBe("");
    expect(
      normalizeWarrantyDocumentStoragePath(
        null,
        "https://example.supabase.co/storage/v1/object/public/avatars/user-1/profile.png"
      )
    ).toBe("");
  });
});
