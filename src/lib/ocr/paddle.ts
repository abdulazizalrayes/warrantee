const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 20_000;

type PaddleOCRPayload = {
  text?: unknown;
  confidence?: unknown;
  page_count?: unknown;
  model?: unknown;
};

export class PaddleOCRConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaddleOCRConfigurationError";
  }
}

export function hasPaddleOCRConfig() {
  return Boolean(
    process.env.PADDLE_OCR_URL?.trim() && process.env.PADDLE_OCR_TOKEN?.trim(),
  );
}

function getPaddleOCRConfig() {
  const rawUrl = process.env.PADDLE_OCR_URL?.trim();
  const token = process.env.PADDLE_OCR_TOKEN?.trim();
  if (!rawUrl || !token) {
    throw new PaddleOCRConfigurationError(
      "PaddleOCR requires PADDLE_OCR_URL and PADDLE_OCR_TOKEN.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new PaddleOCRConfigurationError("PADDLE_OCR_URL is invalid.");
  }

  const localDevelopment =
    process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== "https:" && !localDevelopment)) {
    throw new PaddleOCRConfigurationError(
      "PADDLE_OCR_URL must use HTTPS, except for loopback development.",
    );
  }

  return { url: url.toString(), token };
}

function boundedConfidence(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

export async function recognizeBase64WithPaddle(
  imageBase64: string,
  mimeType: string,
  options: { timeoutMs?: number } = {},
) {
  const { url, token } = getPaddleOCRConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    redirect: "error",
    signal: AbortSignal.timeout(options.timeoutMs || DEFAULT_TIMEOUT_MS),
    body: JSON.stringify({
      data_base64: imageBase64,
      mime_type: mimeType,
      languages: ["ar", "en"],
    }),
  });

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("PaddleOCR response exceeded the allowed size.");
  }

  const raw = await response.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("PaddleOCR response exceeded the allowed size.");
  }
  if (!response.ok) {
    throw new Error(`PaddleOCR service unavailable with status ${response.status}.`);
  }

  let payload: PaddleOCRPayload;
  try {
    payload = JSON.parse(raw) as PaddleOCRPayload;
  } catch {
    throw new Error("PaddleOCR returned invalid JSON.");
  }

  const text = typeof payload.text === "string" ? payload.text.slice(0, 200_000) : "";
  const pageCount = Number(payload.page_count);
  return {
    text,
    confidence: boundedConfidence(payload.confidence),
    pageCount: Number.isInteger(pageCount) && pageCount > 0 ? pageCount : undefined,
    model:
      typeof payload.model === "string" && payload.model.length <= 100
        ? payload.model
        : "pp-ocrv5-arabic",
  };
}
