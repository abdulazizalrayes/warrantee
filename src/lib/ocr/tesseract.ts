import fs from "fs";
import path from "path";

type TesseractResult = {
  text: string;
  confidence: number;
  engine: "tesseract";
  language: string;
};

function resolveTesseractWorkerPath() {
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "tesseract.js",
    "src",
    "worker-script",
    "node",
    "index.js",
  );
  return fs.existsSync(workerPath) ? workerPath : undefined;
}

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
  const workerPath = resolveTesseractWorkerPath();
  const worker = await Tesseract.createWorker(normalizeLanguageHint(languages), 1, {
    logger: () => undefined,
    ...(workerPath ? { workerPath } : {}),
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
