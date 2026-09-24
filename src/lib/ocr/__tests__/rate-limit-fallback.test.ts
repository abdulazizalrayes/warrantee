import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { MistralOCRConfigurationError, MistralOCRRateLimitError, recognizeBase64WithMistral } from "../mistral";

const mocks = vi.hoisted(() => ({
  image: vi.fn(),
  pdf: vi.fn(),
  user: vi.fn(),
  rate: vi.fn(),
}));
vi.mock("@/lib/ocr/tesseract", () => ({
  recognizeImageDataUriWithTesseract: mocks.image,
  recognizeImageBufferWithTesseract: mocks.image,
}));
vi.mock("@/lib/ocr/pdf", () => ({ extractTextFromPdfBuffer: mocks.pdf }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: mocks.user } }),
}));
vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: mocks.rate, ocrRateLimit: mocks.rate,
  getClientIp: () => "127.0.0.1", getRateLimitHeaders: () => ({}),
}));
vi.mock("@/lib/server/untrusted-content-events", () => ({ recordUntrustedContentEvent: vi.fn() }));

import { POST } from "@/app/api/ocr/route";
import { processDocument } from "@/lib/ingestion/ocr-pipeline";

const text = "Product: Refrigerator\nSerial: TEST12345\nWarranty: 12 months";
const image = fs.readFileSync("tests/fixtures/ocr-corpus/synthetic/media/synthetic-en-receipt-clean.png").toString("base64");
const pdf = fs.readFileSync("tests/fixtures/ocr-corpus/synthetic/media/synthetic-multipage-warranty.pdf").toString("base64");
const request = (mime: string, data: string) => new NextRequest("https://warrantee.io/api/ocr", {
  method: "POST", body: JSON.stringify({ image: `data:${mime};base64,${data}` }),
});

describe("Mistral rate-limit recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("OCR_PROVIDER", "mistral");
    vi.stubEnv("MISTRAL_API_KEY", "test-only");
    vi.stubEnv("GOOGLE_CLOUD_VISION_API_KEY", "");
    vi.stubEnv("PADDLE_OCR_URL", "");
    vi.stubEnv("PADDLE_OCR_TOKEN", "");
    mocks.user.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
    mocks.rate.mockResolvedValue({ success: true });
    mocks.image.mockResolvedValue({ text, confidence: 0.9, engine: "tesseract", language: "eng" });
    mocks.pdf.mockResolvedValue({ text, confidence: 0.9, engine: "pdfjs+tesseract", pageCount: 1 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"message":"Rate limit exceeded"}', { status: 429 })));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("classifies 429 without retaining provider response wording or retrying", async () => {
    await expect(recognizeBase64WithMistral(image, "image/png")).rejects.toBeInstanceOf(MistralOCRRateLimitError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])("keeps %s errors explicit rather than bypassing configuration failures", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status }));
    await expect(recognizeBase64WithMistral(image, "image/png")).rejects.toBeInstanceOf(MistralOCRConfigurationError);
    expect(mocks.image).not.toHaveBeenCalled();
  });

  it("recovers an authenticated image upload with truthful local fallback telemetry", async () => {
    const response = await POST(request("image/png", image));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, text, ocr: { provider: "tesseract", fallback: true } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("recovers a scanned PDF upload using local image OCR", async () => {
    mocks.pdf.mockResolvedValueOnce({ text: "", confidence: 0, engine: "pdfjs", pageCount: 1 });
    const response = await POST(request("application/pdf", pdf));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, ocr: { provider: "pdfjs", fallback: true } });
    expect(mocks.pdf).toHaveBeenLastCalledWith(expect.any(Buffer), 5, { enableImageOcr: true });
  });

  it("recovers email image ingestion without an additional hosted provider", async () => {
    const result = await processDocument(image, "image/png");
    expect(result).toMatchObject({ raw_text: text, provider: { provider: "tesseract", fallback: true } });
  });

  it("recovers scanned email PDFs", async () => {
    mocks.pdf.mockResolvedValueOnce({ text: "", confidence: 0, engine: "pdfjs", pageCount: 1 });
    const result = await processDocument(pdf, "application/pdf");
    expect(result).toMatchObject({ raw_text: text, provider: { provider: "pdfjs", fallback: true } });
  });

  it("leaves embedded-text PDFs local without contacting Mistral", async () => {
    expect((await processDocument(pdf, "application/pdf")).raw_text).toBe(text);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("still rejects unauthenticated uploads before any OCR execution", async () => {
    mocks.user.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request("image/png", image))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.image).not.toHaveBeenCalled();
  });

  it("still enforces OCR request rate limits", async () => {
    mocks.rate.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
    expect((await POST(request("image/png", image))).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not return success when local recovery fails", async () => {
    mocks.image.mockRejectedValue(new Error("Local OCR unavailable"));
    expect((await POST(request("image/png", image))).status).toBe(500);
  });

  it("does not bypass explicit Mistral authentication errors in either entry point", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response('{}', { status: 401 }));
    expect((await POST(request("image/png", image))).status).toBe(503);
    await expect(processDocument(image, "image/png")).rejects.toBeInstanceOf(MistralOCRConfigurationError);
    expect(mocks.image).not.toHaveBeenCalled();
  });
});
