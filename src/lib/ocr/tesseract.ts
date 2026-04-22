type TesseractResult = {
  text: string;
  confidence: number;
  engine: "tesseract";
  language: string;
};

function normalizeLanguageHint(languages?: string[]) {
  if (!languages || languages.length === 0) return "eng+ara";
  const normalized = Array.from(new Set(languages.filter(Boolean))).join("+");
  return normalized || "eng+ara";
}

export async function recognizeImageBufferWithTesseract(
  image: Buffer,
  languages?: string[],
): Promise<TesseractResult> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker(normalizeLanguageHint(languages), 1, {
    logger: () => undefined,
  });

  try {
    const result = await worker.recognize(image);
    const text = result?.data?.text?.trim() || "";
    const confidence = Number(result?.data?.confidence ?? 0) / 100;
    return {
      text,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
      engine: "tesseract",
      language: normalizeLanguageHint(languages),
    };
  } finally {
    await worker.terminate();
  }
}

export async function recognizeImageDataUriWithTesseract(
  dataUri: string,
  languages?: string[],
): Promise<TesseractResult> {
  const base64 = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
  return recognizeImageBufferWithTesseract(Buffer.from(base64, "base64"), languages);
}
