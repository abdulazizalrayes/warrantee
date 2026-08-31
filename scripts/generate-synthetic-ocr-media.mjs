import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import PDFDocument from "pdfkit";

const outputDir = path.resolve("tests/fixtures/ocr-corpus/synthetic/media");
fs.mkdirSync(outputDir, { recursive: true });

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function writeReceipt({ fileName, title, lines, direction = "ltr", degraded = false, seed = 1 }) {
  const width = 1200;
  const height = 1500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const random = seededRandom(seed);

  ctx.fillStyle = degraded ? "#e7e5df" : "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  if (degraded) {
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-0.012);
    ctx.translate(-width / 2, -height / 2);
    ctx.globalAlpha = 0.78;
  }

  ctx.textAlign = direction === "rtl" ? "right" : "left";
  ctx.direction = direction;
  const x = direction === "rtl" ? width - 110 : 110;

  ctx.fillStyle = "#111827";
  ctx.font = "bold 54px sans-serif";
  ctx.fillText(title, x, 130);

  ctx.font = "32px sans-serif";
  let y = 245;
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += 92;
  }

  ctx.font = "bold 25px sans-serif";
  ctx.fillStyle = "#9b1c1c";
  ctx.fillText(
    direction === "rtl" ? "مستند تجريبي - ليس فاتورة حقيقية" : "SYNTHETIC TEST DOCUMENT - NOT A REAL INVOICE",
    x,
    height - 105,
  );
  ctx.restore();

  if (degraded) {
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = "#111827";
    for (let index = 0; index < 140; index += 1) {
      const x1 = random() * width;
      const y1 = random() * height;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + random() * 100, y1 + random() * 15);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
  return outputPath;
}

function writePdf() {
  const outputPath = path.join(outputDir, "synthetic-multipage-warranty.pdf");
  const doc = new PDFDocument({ autoFirstPage: false, compress: false, info: { Title: "Synthetic Warranty Test" } });
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      fs.writeFileSync(outputPath, Buffer.concat(chunks));
      resolve(outputPath);
    });
    doc.on("error", reject);

    doc.addPage({ size: "A4", margin: 64 });
    doc.font("Helvetica-Bold").fontSize(22).text("Synthetic Warranty Certificate");
    doc.moveDown().font("Helvetica").fontSize(14);
    doc.text("Certificate No: SYN-WC-2026-444");
    doc.text("Issuer: Example Equipment Services");
    doc.text("Covered Product: Commercial Refrigerator 900L");
    doc.text("Serial Number: SYN-FRIDGE-900-SA");
    doc.text("Coverage Start: 2026-04-15");
    doc.text("Coverage End: 2028-04-14");
    doc.moveDown(4).fillColor("#9b1c1c").text("SYNTHETIC TEST DOCUMENT - NOT A REAL WARRANTY");

    doc.addPage({ size: "A4", margin: 64 });
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(18).text("Coverage Terms");
    doc.moveDown().font("Helvetica").fontSize(13);
    doc.text("Compressor coverage: 24 months.");
    doc.text("Labour coverage: 12 months.");
    doc.text("Synthetic reference: SYN-WC-2026-444.");
    doc.end();
  });
}

const files = [
  writeReceipt({
    fileName: "synthetic-en-receipt-clean.png",
    title: "Synthetic Sales Receipt",
    lines: [
      "Invoice No: SYN-INV-2026-001",
      "Seller: Example Riyadh Electronics",
      "Product: Laptop Pro 14",
      "Serial Number: SYN-LAP-2026-0001",
      "Purchase Date: 2026-06-01",
      "Warranty: 24 months",
      "Total: SAR 4299",
    ],
  }),
  writeReceipt({
    fileName: "synthetic-en-poor-scan.png",
    title: "Synthetic Invoice",
    degraded: true,
    seed: 4421,
    lines: [
      "Invoice No: SYN-BLUR-4421",
      "Sold By: Example Appliance Services",
      "Product: Washer 9kg",
      "Serial Number: SYN-WS-4421-KSA",
      "Purchase Date: 2026-03-18",
      "Warranty: 24 months",
      "Total: SAR 1899",
    ],
  }),
  writeReceipt({
    fileName: "synthetic-ar-receipt-clean.png",
    title: "فاتورة تجريبية",
    direction: "rtl",
    seed: 55,
    lines: [
      "رقم الفاتورة: SYN-ARINV-55",
      "البائع: متجر تجريبي بالرياض",
      "المنتج: غسالة ذكية",
      "الرقم التسلسلي: SYN-AR-123456",
      "تاريخ الشراء: 2026-05-10",
      "الضمان: 24 شهر",
      "الإجمالي: 1999 ريال",
    ],
  }),
  writeReceipt({
    fileName: "synthetic-mixed-invoice.png",
    title: "فاتورة تجريبية / Synthetic Invoice",
    direction: "rtl",
    seed: 7788,
    lines: [
      "Invoice No: SYN-MIX-7788",
      "Store: Example Gulf Warranty Store",
      "Product: مكيف Smart AC 2 Ton",
      "Serial Number: SYN-AC-7788-KSA",
      "Date: 2026-05-10",
      "Coverage: 2 years",
      "Amount: SAR 2500",
    ],
  }),
];

files.push(await writePdf());
const corruptedPath = path.join(outputDir, "synthetic-corrupted.pdf");
fs.writeFileSync(corruptedPath, Buffer.from("%PDF-1.7\nsynthetic broken stream\nxref missing\n%%EOF truncated", "utf8"));
files.push(corruptedPath);

const output = files.map((filePath) => {
  const contents = fs.readFileSync(filePath);
  return {
    file: path.relative(process.cwd(), filePath),
    bytes: contents.length,
    sha256: crypto.createHash("sha256").update(contents).digest("hex"),
  };
});

console.log(JSON.stringify({ ok: true, generated: output }, null, 2));
