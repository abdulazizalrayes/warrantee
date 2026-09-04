import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hasPaddleOCRConfig,
  PaddleOCRConfigurationError,
  recognizeBase64WithPaddle,
} from "@/lib/ocr/paddle";

describe("PaddleOCR adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PADDLE_OCR_URL;
    delete process.env.PADDLE_OCR_TOKEN;
  });

  it("requires an authenticated service endpoint", async () => {
    expect(hasPaddleOCRConfig()).toBe(false);
    await expect(recognizeBase64WithPaddle("abc", "image/png")).rejects.toBeInstanceOf(
      PaddleOCRConfigurationError,
    );
  });

  it("sends an authenticated bounded request and normalizes telemetry", async () => {
    process.env.PADDLE_OCR_URL = "https://ocr.example.test/v1/ocr";
    process.env.PADDLE_OCR_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ text: "Warranty ضمان", confidence: 1.2, page_count: 2, model: "PP-OCRv5" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(recognizeBase64WithPaddle("YWJj", "image/png")).resolves.toEqual({
      text: "Warranty ضمان",
      confidence: 1,
      pageCount: 2,
      model: "PP-OCRv5",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ocr.example.test/v1/ocr",
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });
});
