import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { MistralOCRConfigurationError, MistralOCRRateLimitError, MistralOCRSubscriptionError, recognizeBase64WithMistral } from "../mistral";

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
  getClientIp: () => "192.0.2.1", getRateLimitHeaders: () => ({}),
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
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
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
    expect(mocks.pdf).not.toHaveBeenCalled();
  });

  it("still enforces OCR request rate limits", async () => {
    mocks.rate.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
    expect((await POST(request("image/png", image))).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.image).not.toHaveBeenCalled();
    expect(mocks.pdf).not.toHaveBeenCalled();
  });

  it("still enforces the API rate limit before authentication or OCR", async () => {
    mocks.rate.mockResolvedValueOnce({ success: false });
    expect((await POST(request("image/png", image))).status).toBe(429);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.image).not.toHaveBeenCalled();
    expect(mocks.pdf).not.toHaveBeenCalled();
  });

  it("does not return success when local recovery fails", async () => {
    mocks.image.mockRejectedValue(new Error("Local OCR unavailable"));
    expect((await POST(request("image/png", image))).status).toBe(500);
  });

  it.each([
    [401, "image/png", image],
    [403, "image/png", image],
    [401, "application/pdf", pdf],
    [403, "application/pdf", pdf],
  ])("does not bypass explicit Mistral %s errors for %s in either entry point", async (status, mime, data) => {
    vi.mocked(fetch).mockImplementation(async () => new Response('{}', { status }));
    mocks.pdf.mockResolvedValue({ text: "", confidence: 0, engine: "pdfjs", pageCount: 1 });
    const response = await POST(request(mime, data));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("configuration/auth error") });
    await expect(processDocument(data, mime)).rejects.toBeInstanceOf(MistralOCRConfigurationError);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(mocks.image).not.toHaveBeenCalled();
    if (mime === "application/pdf") {
      expect(mocks.pdf).toHaveBeenCalledTimes(2);
      for (const call of mocks.pdf.mock.calls) {
        expect(call).toEqual([Buffer.from(data, "base64"), 5, { enableImageOcr: false }]);
      }
    } else {
      expect(mocks.pdf).not.toHaveBeenCalled();
    }
  });

  describe("subscription recovery on 402", () => {
    const providerWording = "PRIVATE_PROVIDER_BILLING_DETAIL: subscription rejected for synthetic account";
    const documents = [
      { mime: "image/png", data: image, provider: "tesseract", engine: "tesseract" },
      { mime: "application/pdf", data: pdf, provider: "pdfjs", engine: "pdfjs+tesseract" },
    ];

    beforeEach(() => {
      vi.stubEnv("GOOGLE_CLOUD_VISION_API_KEY", "test-only-google");
      vi.stubEnv("PADDLE_OCR_URL", "https://paddle.example.invalid/ocr");
      vi.stubEnv("PADDLE_OCR_TOKEN", "test-only-paddle");
      vi.mocked(fetch).mockImplementation(async () => new Response(
        JSON.stringify({ message: providerWording, error: { message: providerWording } }),
        { status: 402 },
      ));
    });

    afterEach(() => {
      const logs = JSON.stringify(
        [console.warn, console.info, console.error, console.log, console.debug].map((method) => vi.mocked(method).mock.calls),
        (_key, value) => value instanceof Error ? `${value.name}: ${value.message}\n${value.stack}` : value,
      );
      expect(logs).not.toContain(providerWording);
    });

    function expectOnlyMistralRequest() {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(vi.mocked(fetch).mock.calls[0][0]).toBe("https://api.mistral.ai/v1/ocr");
    }

    it.each([
      JSON.stringify({ message: providerWording }),
      JSON.stringify({ error: { message: providerWording } }),
      providerWording,
    ])("returns a typed fixed error without retaining provider payload %#", async (payload) => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(payload, { status: 402 }));
      const error = await recognizeBase64WithMistral(image, "image/png").catch((error: unknown) => error);
      expect(error).toBeInstanceOf(MistralOCRSubscriptionError);
      expect(error).toMatchObject({
        name: "MistralOCRSubscriptionError",
        message: "Mistral OCR subscription is unavailable.",
      });
      expect(String(error)).not.toContain(providerWording);
      expect(JSON.stringify(error)).not.toContain(providerWording);
      expectOnlyMistralRequest();
      expect(mocks.image).not.toHaveBeenCalled();
      expect(mocks.pdf).not.toHaveBeenCalled();
    });

    describe.each(["mistral", "auto"])("with %s preference and other hosted providers configured", (preference) => {
      beforeEach(() => {
        vi.stubEnv("OCR_PROVIDER", preference);
      });

      it.each(documents)("recovers browser $mime locally with truthful telemetry and no hosted retry", async ({ mime, data, provider, engine }) => {
        if (mime === "application/pdf") {
          mocks.pdf.mockResolvedValueOnce({ text: "", confidence: 0, engine: "pdfjs", pageCount: 1 });
        }
        const response = await POST(request(mime, data));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          success: true,
          text,
          ocr: { provider, engine, mode: "fallback", providerPreference: preference, fallback: true, mimeType: mime, confidence: 0.9 },
        });
        expect(body.ocr).not.toHaveProperty("model");
        expect(JSON.stringify(body)).not.toContain(providerWording);
        expectOnlyMistralRequest();
        expect(console.info).toHaveBeenCalledWith("OCR provider selected", expect.objectContaining({
          provider, engine, mode: "fallback", fallback: true, mimeType: mime,
        }));
        if (mime === "application/pdf") {
          expect(mocks.pdf.mock.calls).toEqual([
            [Buffer.from(data, "base64"), 5, { enableImageOcr: false }],
            [Buffer.from(data, "base64"), 5, { enableImageOcr: true }],
          ]);
          expect(body.ocr.pageCount).toBe(1);
          expect(mocks.image).not.toHaveBeenCalled();
        } else {
          expect(mocks.image).toHaveBeenCalledExactlyOnceWith(`data:${mime};base64,${data}`, ["eng"]);
          expect(mocks.pdf).not.toHaveBeenCalled();
        }
      });

      it.each(documents)("recovers ingestion $mime locally with truthful telemetry and no hosted retry", async ({ mime, data, provider, engine }) => {
        if (mime === "application/pdf") {
          mocks.pdf.mockResolvedValueOnce({ text: "", confidence: 0, engine: "pdfjs", pageCount: 1 });
        }
        const result = await processDocument(data, mime);
        expect(result).toMatchObject({
          raw_text: text,
          confidence: 0.9,
          provider: { provider, engine, mode: "fallback", providerPreference: preference, fallback: true, mimeType: mime, confidence: 0.9 },
        });
        expect(result.provider).not.toHaveProperty("model");
        expect(JSON.stringify(result)).not.toContain(providerWording);
        expectOnlyMistralRequest();
        if (mime === "application/pdf") {
          expect(mocks.pdf.mock.calls).toEqual([
            [Buffer.from(data, "base64"), 5, { enableImageOcr: false }],
            [Buffer.from(data, "base64"), 5, { enableImageOcr: true }],
          ]);
          expect(result.provider?.pageCount).toBe(1);
          expect(mocks.image).not.toHaveBeenCalled();
        } else {
          expect(mocks.image).toHaveBeenCalledExactlyOnceWith(Buffer.from(data, "base64"), ["eng", "ara"]);
          expect(mocks.pdf).not.toHaveBeenCalled();
        }
      });

      it.each(documents)("fails browser $mime when local recovery fails without trying another provider", async ({ mime, data }) => {
        const localError = new Error("Local OCR unavailable");
        if (mime === "application/pdf") {
          mocks.pdf.mockResolvedValueOnce({ text: "", confidence: 0, engine: "pdfjs", pageCount: 1 });
          mocks.pdf.mockRejectedValueOnce(localError);
        } else {
          mocks.image.mockRejectedValueOnce(localError);
        }
        const response = await POST(request(mime, data));
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: localError.message });
        expect(console.info).not.toHaveBeenCalled();
        expectOnlyMistralRequest();
        expect(mocks.pdf).toHaveBeenCalledTimes(mime === "application/pdf" ? 2 : 0);
        expect(mocks.image).toHaveBeenCalledTimes(mime === "application/pdf" ? 0 : 1);
      });

      it.each(documents)("rejects ingestion $mime when local recovery fails without trying another provider", async ({ mime, data }) => {
        const localError = new Error("Local OCR unavailable");
        if (mime === "application/pdf") {
          mocks.pdf.mockResolvedValueOnce({ text: "", confidence: 0, engine: "pdfjs", pageCount: 1 });
          mocks.pdf.mockRejectedValueOnce(localError);
        } else {
          mocks.image.mockRejectedValueOnce(localError);
        }
        await expect(processDocument(data, mime)).rejects.toBe(localError);
        expectOnlyMistralRequest();
        expect(mocks.pdf).toHaveBeenCalledTimes(mime === "application/pdf" ? 2 : 0);
        expect(mocks.image).toHaveBeenCalledTimes(mime === "application/pdf" ? 0 : 1);
      });
    });
  });
});
