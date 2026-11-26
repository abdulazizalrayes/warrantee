import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "synthetic-local-ocr" } }, error: null }) },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: async () => ({ success: true }),
  ocrRateLimit: async () => ({ success: true }),
  getClientIp: () => "192.0.2.1", getRateLimitHeaders: () => ({}),
}));
vi.mock("@/lib/server/untrusted-content-events", () => ({ recordUntrustedContentEvent: vi.fn() }));

import { POST } from "@/app/api/ocr/route";

describe("subscription recovery through the actual bundled local engine", () => {
  beforeEach(() => {
    vi.stubEnv("OCR_PROVIDER", "mistral");
    vi.stubEnv("MISTRAL_API_KEY", "synthetic-not-a-credential");
    vi.stubEnv("PADDLE_OCR_URL", "");
    vi.stubEnv("PADDLE_OCR_TOKEN", "");
    vi.stubEnv("GOOGLE_CLOUD_VISION_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn(async (url: unknown) => {
      expect(url).toBe("https://api.mistral.ai/v1/ocr");
      return new Response("{}", { status: 402 });
    }));
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    ["synthetic-en-receipt-clean.png", "SYN-LAP-2026-0001"],
    ["synthetic-ar-receipt-clean.png", "SYN-AR-123456"],
  ])("recovers %s without a hosted OCR service", async (file, identifier) => {
    const bytes = fs.readFileSync(`tests/fixtures/ocr-corpus/synthetic/media/${file}`);
    const request = new NextRequest("https://warrantee.io/api/ocr", {
      method: "POST", body: JSON.stringify({ image: `data:image/png;base64,${bytes.toString("base64")}` }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.text).toContain(identifier);
    expect(result.ocr).toMatchObject({ provider: "tesseract", fallback: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  }, 30000);

  it("recovers a scanned PDF with actual PDF rendering and local OCR", async () => {
    const bytes = fs.readFileSync("tests/fixtures/ocr-corpus/synthetic/media/synthetic-en-receipt-clean.png");
    const pdf = await new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({ margin: 0 });
      const chunks: Buffer[] = [];
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("error", reject);
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.image(bytes, 0, 0, { width: 550 });
      document.end();
    });
    const response = await POST(new NextRequest("https://warrantee.io/api/ocr", {
      method: "POST", body: JSON.stringify({ image: `data:application/pdf;base64,${pdf.toString("base64")}` }),
    }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.text).toContain("SYN-LAP-2026-0001");
    expect(result.ocr).toMatchObject({ provider: "pdfjs", engine: "pdf_tesseract", fallback: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  }, 30000);
});
