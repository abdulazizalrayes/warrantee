import fs from "fs";
import path from "path";
import { tmpdir } from "node:os";

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
  const language = normalizeLanguageHint(languages);
  // Bundle approved models: serverless cold starts must not depend on a CDN.
  const codes = language.split("+");
  for (const code of codes) {
    if (code !== "eng" && code !== "ara") throw new Error("Unsupported local OCR language.");
  }
  const modelDirectory = fs.mkdtempSync(path.join(tmpdir(), "warrantee-ocr-"));
  let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | undefined;
  try {
    for (const code of codes) {
      fs.copyFileSync(path.join(
        process.cwd(), "node_modules", "@tesseract.js-data", code,
        "4.0.0_best_int", `${code}.traineddata.gz`,
      ), path.join(modelDirectory, `${code}.traineddata.gz`));
    }
    worker = await Tesseract.createWorker(language, 1, {
      logger: () => undefined,
      langPath: modelDirectory,
      cacheMethod: "none",
      ...(workerPath ? { workerPath } : {}),
    });
    const result = await worker.recognize(image);
    const text = result?.data?.text?.trim() || "";
    const confidence = Number(result?.data?.confidence ?? 0) / 100;
    return {
      text,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
      engine: "tesseract",
      language,
    };
  } finally {
    try {
      await worker?.terminate();
    } finally {
      fs.rmSync(modelDirectory, { recursive: true, force: true });
    }
  }
}

export async function recognizeImageDataUriWithTesseract(
  dataUri: string,
  languages?: string[],
): Promise<TesseractResult> {
  const base64 = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
  return recognizeImageBufferWithTesseract(Buffer.from(base64, "base64"), languages);
}
