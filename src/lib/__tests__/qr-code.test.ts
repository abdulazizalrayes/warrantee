import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateQRCode, getVerifyUrl } from "../qr-code";

const repoRoot = process.cwd();

describe("warranty QR codes", () => {
  it("generates a real PNG data URL for warranty verification", async () => {
    const dataUrl = await generateQRCode("00000000-0000-4000-8000-000000000000", "en");

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(dataUrl.length).toBeGreaterThan(500);
  });

  it("builds canonical Warrantee verification URLs", () => {
    expect(getVerifyUrl("abc123", "ar")).toBe("https://warrantee.io/ar/verify/abc123");
  });

  it("keeps certificate and passport QR rendering first-party", () => {
    const files = [
      "src/components/WarrantyQRCode.tsx",
      "src/app/[locale]/verify/[id]/page.tsx",
      "src/app/api/warranties/[id]/certificate/route.ts",
      "src/app/api/v1/warranties/verify/[id]/certificate/route.ts",
    ];

    for (const file of files) {
      const source = readFileSync(join(repoRoot, file), "utf8");
      expect(source).not.toContain("api.qrserver.com");
    }
  });
});
