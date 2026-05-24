import { describe, expect, it } from "vitest";
import { sanitizeInboundAttachmentFilename } from "@/lib/ingestion/attachments";

describe("sanitizeInboundAttachmentFilename", () => {
  it("removes path segments and unsafe characters", () => {
    expect(sanitizeInboundAttachmentFilename("../../invoice<script>.pdf")).toBe("invoice_script_.pdf");
    expect(sanitizeInboundAttachmentFilename("receipts\\2026\\warranty #1.png")).toBe("warranty_1.png");
  });

  it("falls back for empty or dot-only filenames", () => {
    expect(sanitizeInboundAttachmentFilename("")).toBe("attachment");
    expect(sanitizeInboundAttachmentFilename("...")).toBe("attachment");
    expect(sanitizeInboundAttachmentFilename(null)).toBe("attachment");
  });
});
