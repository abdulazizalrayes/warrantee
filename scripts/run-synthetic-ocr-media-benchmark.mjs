import fs from "node:fs";
import path from "node:path";
import { createWorker } from "tesseract.js";

const corpusDir = path.resolve("tests/fixtures/ocr-corpus/synthetic");
const manifest = JSON.parse(fs.readFileSync(path.join(corpusDir, "manifest.json"), "utf8"));
const entries = manifest.entries.filter((entry) => entry.file && entry.syntheticMediaCheck);

function normalize(value) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function assertTokens(entry, text) {
  const normalizedText = normalize(text);
  const missing = (entry.ocrContains || []).filter((token) => !normalizedText.includes(normalize(token)));
  if (missing.length > 0) {
    throw new Error(`${entry.id} OCR output missed required tokens: ${missing.join(", ")}`);
  }
}

async function extractPdfText(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFontDataUrl = `${path.resolve("node_modules/pdfjs-dist/standard_fonts")}${path.sep}`;
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    standardFontDataUrl,
  }).promise;
  const lines = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    lines.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return lines.join("\n");
}

const imageEntries = entries.filter((entry) => entry.syntheticMediaCheck === "tesseract");
const pdfEntries = entries.filter((entry) => entry.syntheticMediaCheck === "pdfjs");
const rejectedEntries = entries.filter((entry) => entry.syntheticMediaCheck === "reject");
const results = [];

if (imageEntries.length > 0) {
  const worker = await createWorker("eng+ara", 1, { logger: () => undefined });
  try {
    for (const entry of imageEntries) {
      const startedAt = Date.now();
      const filePath = path.join(corpusDir, entry.file);
      const result = await worker.recognize(fs.readFileSync(filePath));
      assertTokens(entry, result.data.text || "");
      results.push({ id: entry.id, engine: "tesseract", passed: true, durationMs: Date.now() - startedAt });
    }
  } finally {
    await worker.terminate();
  }
}

for (const entry of pdfEntries) {
  const startedAt = Date.now();
  const text = await extractPdfText(fs.readFileSync(path.join(corpusDir, entry.file)));
  assertTokens(entry, text);
  results.push({ id: entry.id, engine: "pdfjs", passed: true, durationMs: Date.now() - startedAt });
}

for (const entry of rejectedEntries) {
  const startedAt = Date.now();
  let rejected = false;
  try {
    await extractPdfText(fs.readFileSync(path.join(corpusDir, entry.file)));
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error(`${entry.id} was expected to be rejected as corrupt.`);
  results.push({ id: entry.id, engine: "pdfjs", passed: true, expectedRejection: true, durationMs: Date.now() - startedAt });
}

console.log(JSON.stringify({
  ok: true,
  scope: "synthetic non-customer media only",
  caveat: "This validates deterministic transport and extraction regressions; it does not prove real-world OCR accuracy.",
  results,
}, null, 2));
