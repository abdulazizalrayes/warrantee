const MISTRAL_OCR_API_URL = "https://api.mistral.ai/v1/ocr";
const DEFAULT_MISTRAL_OCR_MODEL = "mistral-ocr-latest";
const DEFAULT_MISTRAL_OCR_TIMEOUT_MS = 15000;

type MistralOCRPage = {
  markdown?: string;
  header?: string | null;
  footer?: string | null;
  confidence_scores?: {
    average_page_confidence_score?: number;
    minimum_page_confidence_score?: number;
    word_confidence_scores?: unknown[];
  } | null;
};

type MistralOCRResponse = {
  pages?: MistralOCRPage[];
  model?: string;
  usage_info?: unknown;
  message?: string;
  error?: { message?: string };
};

export type MistralOCRResult = {
  text: string;
  confidence: number;
  engine: "mistral";
  model: string;
  pageCount: number;
  usageInfo?: unknown;
};

export class MistralOCRConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MistralOCRConfigurationError";
  }
}

export class MistralOCRUnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MistralOCRUnsupportedFileError";
  }
}

export function hasMistralOCRConfig() {
  return Boolean(process.env.MISTRAL_API_KEY);
}

export function getMistralOCRModel() {
  return process.env.MISTRAL_OCR_MODEL || DEFAULT_MISTRAL_OCR_MODEL;
}

function normalizeMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  if (normalized === "application/pdf") return "application/pdf";
  if (normalized === "image/jpg") return "image/jpeg";

  const supportedImages = new Set([
    "image/png",
    "image/jpeg",
    "image/tiff",
    "image/bmp",
    "image/gif",
    "image/webp",
  ]);

  if (supportedImages.has(normalized)) return normalized;

  throw new MistralOCRUnsupportedFileError(
    `Mistral OCR does not support ${mimeType || "this file type"}. Supported launch formats are PDF, PNG, JPEG, TIFF, BMP, GIF, and WEBP.`
  );
}

function getDataUriMeta(dataUri: string) {
  const header = dataUri.split(",")[0] || "";
  const mimeType = header.startsWith("data:")
    ? header.slice(5).split(";")[0] || "application/octet-stream"
    : "application/octet-stream";
  const base64 = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
  return { mimeType, base64 };
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, normalized));
}

function averagePageConfidence(pages: MistralOCRPage[]) {
  const values = pages
    .map((page) => page.confidence_scores?.average_page_confidence_score)
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) return 0;
  return clampConfidence(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function extractMarkdownText(pages: MistralOCRPage[]) {
  return pages
    .map((page) => [page.header, page.markdown, page.footer].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function parseMistralPayload(payloadText: string): MistralOCRResponse {
  if (!payloadText) return {};
  try {
    return JSON.parse(payloadText) as MistralOCRResponse;
  } catch {
    return {};
  }
}

export async function recognizeBase64WithMistral(
  base64: string,
  mimeType: string,
  options: { timeoutMs?: number } = {},
): Promise<MistralOCRResult> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new MistralOCRConfigurationError("Mistral OCR requires MISTRAL_API_KEY.");
  }

  const normalizedMimeType = normalizeMimeType(mimeType);
  const dataUrl = `data:${normalizedMimeType};base64,${base64}`;
  const isPdf = normalizedMimeType === "application/pdf";
  const model = getMistralOCRModel();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_MISTRAL_OCR_TIMEOUT_MS,
  );

  try {
    const response = await fetch(MISTRAL_OCR_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        document: isPdf
          ? { type: "document_url", document_url: dataUrl }
          : { type: "image_url", image_url: dataUrl },
        table_format: "markdown",
        include_image_base64: false,
        confidence_scores_granularity: "page",
      }),
    });

    const payloadText = await response.text();
    const payload = parseMistralPayload(payloadText);

    if (!response.ok) {
      const detail = payload.error?.message || payload.message || payloadText || response.statusText;
      if ([400, 401, 403].includes(response.status)) {
        throw new MistralOCRConfigurationError(`Mistral OCR configuration/auth error: ${detail}`);
      }
      throw new Error(`Mistral OCR failed with ${response.status}: ${detail}`);
    }

    const pages = Array.isArray(payload.pages) ? payload.pages : [];
    return {
      text: extractMarkdownText(pages),
      confidence: averagePageConfidence(pages),
      engine: "mistral",
      model: payload.model || model,
      pageCount: pages.length,
      usageInfo: payload.usage_info,
    };
  } catch (error) {
    if (error instanceof MistralOCRConfigurationError || error instanceof MistralOCRUnsupportedFileError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Mistral OCR timed out. Please try a clearer or smaller document.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function recognizeDataUriWithMistral(
  dataUri: string,
  options: { timeoutMs?: number } = {},
) {
  const { mimeType, base64 } = getDataUriMeta(dataUri);
  return recognizeBase64WithMistral(base64, mimeType, options);
}
