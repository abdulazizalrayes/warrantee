export type OCRProviderId = "submitted_text" | "mistral" | "google_vision" | "pdfjs" | "tesseract";

export type OCREngineId =
  | "submitted_text"
  | "mistral_ocr"
  | "google_document_text_detection"
  | "pdf_text"
  | "pdf_tesseract"
  | "tesseract";

export type OCRExecutionMode = "input" | "hosted" | "local" | "fallback";

export type OCRProviderTelemetry = {
  provider: OCRProviderId;
  engine: OCREngineId;
  mode: OCRExecutionMode;
  providerPreference: string;
  fallback: boolean;
  mimeType?: string;
  model?: string;
  confidence?: number;
  pageCount?: number;
};

export function cleanOCRTelemetry(input: OCRProviderTelemetry): OCRProviderTelemetry {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as OCRProviderTelemetry;
}
