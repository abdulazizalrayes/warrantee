import { createCanvas } from "@napi-rs/canvas";
import { recognizeImageBufferWithTesseract } from "@/lib/ocr/tesseract";

type PdfExtractionResult = {
  text: string;
  confidence: number;
  engine: "pdf_text" | "pdf_tesseract";
  pageCount: number;
};

async function loadPdfJs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

export async function extractTextFromPdfBuffer(
  pdfBuffer: Buffer,
  maxPages = 5,
): Promise<PdfExtractionResult> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  } as any);

  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const textPages: string[] = [];

  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) textPages.push(text);
  }

  const extracted = textPages.join("\n\n").trim();
  if (extracted.length > 40) {
    return {
      text: extracted,
      confidence: 0.85,
      engine: "pdf_text",
      pageCount,
    };
  }

  const ocrPages: string[] = [];
  let totalConfidence = 0;
  let ocrPageCount = 0;

  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as any,
      viewport,
    } as any).promise;

    const imageBuffer = canvas.toBuffer("image/png");
    const result = await recognizeImageBufferWithTesseract(imageBuffer, ["eng", "ara"]);
    if (result.text) {
      ocrPages.push(result.text);
      totalConfidence += result.confidence;
      ocrPageCount += 1;
    }
  }

  return {
    text: ocrPages.join("\n\n").trim(),
    confidence: ocrPageCount > 0 ? totalConfidence / ocrPageCount : 0,
    engine: "pdf_tesseract",
    pageCount,
  };
}
