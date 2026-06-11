import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { scanDocumentBaseline } from "@/lib/server/document-security-baseline";

function sha256(bytes: Buffer) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

describe("document security baseline scanner", () => {
  it("marks a simple PDF with matching hash as clean", () => {
    const bytes = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF", "latin1");

    const result = scanDocumentBaseline({
      fileName: "receipt.pdf",
      fileType: "application/pdf",
      fileSize: bytes.length,
      fileHash: sha256(bytes),
      bytes,
    });

    expect(result.verdict).toBe("clean");
    expect(result.engine).toBe("warrantee_baseline_document_scanner");
  });

  it("blocks PDFs with active JavaScript actions", () => {
    const bytes = Buffer.from("%PDF-1.7\n/JavaScript << /JS (app.alert('x')) >>\n%%EOF", "latin1");

    const result = scanDocumentBaseline({
      fileName: "receipt.pdf",
      fileType: "application/pdf",
      fileSize: bytes.length,
      fileHash: sha256(bytes),
      bytes,
    });

    expect(result.verdict).toBe("blocked");
    expect(result.reason).toBe("pdf_javascript_action");
  });

  it("blocks mismatched hashes", () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);

    const result = scanDocumentBaseline({
      fileName: "receipt.jpg",
      fileType: "image/jpeg",
      fileSize: bytes.length,
      fileHash: "0".repeat(64),
      bytes,
    });

    expect(result.verdict).toBe("blocked");
    expect(result.reason).toBe("file_hash_mismatch");
  });
});
