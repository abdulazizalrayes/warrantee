import { NextRequest, NextResponse } from "next/server";
import { apiRateLimit, getClientIp, getRateLimitHeaders, ocrRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractTextFromPdfBuffer } from "@/lib/ocr/pdf";
import { recognizeImageDataUriWithTesseract } from "@/lib/ocr/tesseract";
import { cleanOCRTelemetry, type OCRProviderTelemetry } from "@/lib/ocr/telemetry";
import { extractWarrantyFields } from "@/lib/ocr/warranty-field-parser";
import {
  hasMistralOCRConfig,
  MistralOCRConfigurationError,
  MistralOCRUnsupportedFileError,
  recognizeDataUriWithMistral,
} from "@/lib/ocr/mistral";

const MAX_OCR_TEXT_LENGTH = 50000;
const MAX_IMAGE_DATA_URI_BYTES = 4 * 1024 * 1024;
const MISTRAL_TIMEOUT_MS = 15000;
const VISION_TIMEOUT_MS = 8000;
const LOCAL_OCR_TIMEOUT_MS = 45000;

export const maxDuration = 60;

class OCRTimeoutError extends Error {
  constructor(message = "OCR processing timed out. Please try a clearer or smaller image.") {
    super(message);
    this.name = "OCRTimeoutError";
  }
}

class OCRServiceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OCRServiceConfigurationError";
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message?: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new OCRTimeoutError(message)), timeoutMs);
    }),
  ]);
}

function summarizeOCRProviderError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "Error";
  const message = rawMessage
    .replace(/key=[^&\s]+/gi, "key=[redacted]")
    .replace(/\b\d{10,}\b/g, "[redacted-number]")
    .slice(0, 300);

  return `${name}: ${message}`;
}

function getDataUriMeta(dataUri: string) {
  const header = dataUri.split(",")[0] || "";
  const mimeType = header.startsWith("data:") ? header.slice(5).split(";")[0] || "application/octet-stream" : "application/octet-stream";
  const base64 = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
  return { mimeType, base64 };
}

function getOCRProviderPreference() {
  return (process.env.OCR_PROVIDER || "auto").trim().toLowerCase();
}

function shouldTryMistral() {
  const provider = getOCRProviderPreference();
  return (provider === "mistral" || provider === "auto") && hasMistralOCRConfig();
}

function shouldTryGoogleVision() {
  const provider = getOCRProviderPreference();
  return (
    provider === "google" ||
    provider === "google-vision" ||
    ((provider === "auto" || provider === "mistral") && Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY))
  );
}

type OCRDocumentExtraction = {
  text: string;
  telemetry: OCRProviderTelemetry;
};

function submittedTextTelemetry(): OCRProviderTelemetry {
  return {
    provider: "submitted_text",
    engine: "submitted_text",
    mode: "input",
    providerPreference: getOCRProviderPreference(),
    fallback: false,
  };
}

async function extractTextWithMistral(dataUri: string, mimeType: string, fallback = false): Promise<OCRDocumentExtraction> {
  const result = await withTimeout(
    recognizeDataUriWithMistral(dataUri, { timeoutMs: MISTRAL_TIMEOUT_MS }),
    MISTRAL_TIMEOUT_MS + 1000,
    "Mistral OCR timed out. Please try a clearer or smaller document."
  );
  return {
    text: result.text,
    telemetry: cleanOCRTelemetry({
      provider: "mistral",
      engine: "mistral_ocr",
      mode: "hosted",
      providerPreference: getOCRProviderPreference(),
      fallback,
      mimeType,
      model: result.model,
      confidence: result.confidence,
      pageCount: result.pageCount,
    }),
  };
}

async function recognizeImageDataUriWithLocalOCR(dataUri: string) {
  const englishResult = await recognizeImageDataUriWithTesseract(dataUri, ["eng"]);
  if (englishResult.text.trim() && englishResult.confidence >= 0.3) {
    return englishResult;
  }

  return recognizeImageDataUriWithTesseract(dataUri, ["eng", "ara"]);
}

function pdfTelemetry(result: Awaited<ReturnType<typeof extractTextFromPdfBuffer>>, mimeType: string, fallback = false): OCRProviderTelemetry {
  return cleanOCRTelemetry({
    provider: "pdfjs",
    engine: result.engine,
    mode: fallback ? "fallback" : "local",
    providerPreference: getOCRProviderPreference(),
    fallback,
    mimeType,
    confidence: result.confidence,
    pageCount: result.pageCount,
  });
}

function tesseractTelemetry(result: Awaited<ReturnType<typeof recognizeImageDataUriWithLocalOCR>>, mimeType: string, fallback = false): OCRProviderTelemetry {
  return cleanOCRTelemetry({
    provider: "tesseract",
    engine: "tesseract",
    mode: fallback ? "fallback" : "local",
    providerPreference: getOCRProviderPreference(),
    fallback,
    mimeType,
    confidence: result.confidence,
  });
}

async function extractTextFromDocument(dataUri: string): Promise<OCRDocumentExtraction> {
  if (Buffer.byteLength(dataUri, "utf8") > MAX_IMAGE_DATA_URI_BYTES) {
    throw new Error("Image is too large for OCR. Please upload a file under 4MB or use a compressed image/PDF.");
  }

  const { mimeType, base64 } = getDataUriMeta(dataUri);
  const provider = getOCRProviderPreference();
  const tryMistral = shouldTryMistral();
  let fallbackFromMistral = false;

  if (mimeType === "application/pdf") {
    const result = await withTimeout(
      extractTextFromPdfBuffer(Buffer.from(base64, "base64"), 5, { enableImageOcr: !tryMistral }),
      LOCAL_OCR_TIMEOUT_MS,
      "PDF OCR timed out. Please try a smaller or clearer PDF."
    );
    if (result.text.trim() || !tryMistral) {
      return { text: result.text, telemetry: pdfTelemetry(result, mimeType) };
    }

    try {
      return await extractTextWithMistral(dataUri, mimeType);
    } catch (error) {
      fallbackFromMistral = true;
      if ((provider === "mistral" || error instanceof MistralOCRConfigurationError) && !shouldTryGoogleVision()) {
        throw new OCRServiceConfigurationError(error instanceof Error ? error.message : "Mistral OCR is unavailable.");
      }
      console.warn("Mistral PDF OCR unavailable, falling back to local PDF OCR:", summarizeOCRProviderError(error));
      const fallback = await withTimeout(
        extractTextFromPdfBuffer(Buffer.from(base64, "base64"), 5, { enableImageOcr: true }),
        LOCAL_OCR_TIMEOUT_MS,
        "PDF OCR timed out after Mistral fallback. Please try a smaller or clearer PDF."
      );
      return { text: fallback.text, telemetry: pdfTelemetry(fallback, mimeType, fallbackFromMistral) };
    }
  }

  if (tryMistral) {
    try {
      return await extractTextWithMistral(dataUri, mimeType);
    } catch (error) {
      fallbackFromMistral = true;
      if ((provider === "mistral" || error instanceof MistralOCRConfigurationError) && !shouldTryGoogleVision()) {
        throw new OCRServiceConfigurationError(error instanceof Error ? error.message : "Mistral OCR is unavailable.");
      }
      if (error instanceof MistralOCRUnsupportedFileError && !shouldTryGoogleVision()) {
        throw error;
      }
      console.warn("Mistral OCR unavailable, trying next OCR provider:", summarizeOCRProviderError(error));
    }
  }

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey || !shouldTryGoogleVision()) {
    const fallback = await withTimeout(
      recognizeImageDataUriWithLocalOCR(dataUri),
      LOCAL_OCR_TIMEOUT_MS,
      "Image OCR timed out. Please try a clearer or smaller image."
    );
    const fallbackToLocal = fallbackFromMistral || provider === "mistral" || provider === "google" || provider === "google-vision";
    return { text: fallback.text, telemetry: tesseractTelemetry(fallback, mimeType, fallbackToLocal) };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      await response.text();
      if ([400, 401, 403].includes(response.status)) {
        console.warn("Vision OCR configuration error:", `status ${response.status}`);
        throw new Error(`Google Vision OCR is configured but unavailable. Status ${response.status}.`);
      }
      throw new Error(`Vision OCR failed with status ${response.status}.`);
    }

    const payload = await response.json();
    return {
      text: payload.responses?.[0]?.fullTextAnnotation?.text || payload.responses?.[0]?.textAnnotations?.[0]?.description || "",
      telemetry: cleanOCRTelemetry({
        provider: "google_vision",
        engine: "google_document_text_detection",
        mode: "hosted",
        providerPreference: provider,
        fallback: fallbackFromMistral,
        mimeType,
      }),
    };
  } catch (error) {
    console.warn("Vision OCR unavailable, falling back to in-house Tesseract OCR:", summarizeOCRProviderError(error));
    const fallback = await withTimeout(
      recognizeImageDataUriWithLocalOCR(dataUri),
      LOCAL_OCR_TIMEOUT_MS,
      "Image OCR timed out after Vision fallback. Please try a clearer or smaller image."
    );
    return { text: fallback.text, telemetry: tesseractTelemetry(fallback, mimeType, true) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimitResult = await apiRateLimit(ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ocrLimitResult = await ocrRateLimit(`${user.id}:${ip}`);
    if (!ocrLimitResult.success) {
      return NextResponse.json(
        { error: "Too many OCR requests. Please wait before scanning more documents." },
        { status: 429, headers: getRateLimitHeaders(ocrLimitResult) }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    let { text } = body;
    const { image } = body;
    let ocrTelemetry = submittedTextTelemetry();

    if (!text && typeof image === "string") {
      const extraction = await withTimeout(
        extractTextFromDocument(image),
        LOCAL_OCR_TIMEOUT_MS + VISION_TIMEOUT_MS + 2000,
        "OCR timed out. Please try a clearer image, smaller file, or paste the text manually."
      );
      text = extraction.text;
      ocrTelemetry = extraction.telemetry;
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing 'text' field. Send OCR-extracted text or an image data URI for parsing." },
        { status: 400 }
      );
    }

    if (text.length > MAX_OCR_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_OCR_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return NextResponse.json(
        { error: "Text field cannot be empty" },
        { status: 400 }
      );
    }

    const fields = extractWarrantyFields(trimmedText);
    console.info("OCR provider selected", {
      provider: ocrTelemetry.provider,
      engine: ocrTelemetry.engine,
      mode: ocrTelemetry.mode,
      fallback: ocrTelemetry.fallback,
      mimeType: ocrTelemetry.mimeType,
      model: ocrTelemetry.model,
    });

    return NextResponse.json({
      success: true,
      text: trimmedText,
      fields,
      ocr: ocrTelemetry,
      message:
        fields.confidence >= 0.3
          ? "Fields extracted successfully"
          : "Low confidence - some fields may need manual entry",
    });
  } catch (err) {
    console.warn("OCR parsing error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = err instanceof OCRTimeoutError
      ? 504
      : err instanceof MistralOCRUnsupportedFileError
        ? 400
        : err instanceof OCRServiceConfigurationError
          ? 503
          : message.includes("GOOGLE_CLOUD_VISION_API_KEY") || message.includes("MISTRAL_API_KEY")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    status: "OCR parsing endpoint active",
    usage: "POST with { text: 'extracted OCR text' } or { image: 'data:image/png;base64,...' | 'data:application/pdf;base64,...' }",
    engines: ["mistral_ocr", "google_vision_fallback", "pdfjs_local", "tesseract_dev_fallback"],
    note: "Warrantee prefers Mistral OCR when MISTRAL_API_KEY is configured, keeps embedded-text PDFs local, falls back to Google Vision when available, and uses in-house Tesseract as an emergency availability fallback. Successful POST responses include ocr.provider and ocr.engine.",
    max_text_length: MAX_OCR_TEXT_LENGTH,
    fields: [
      "product_name",
      "serial_number",
      "start_date",
      "end_date",
      "warranty_duration",
      "supplier",
      "purchase_price",
      "category",
      "invoice_reference",
    ],
  });
}
