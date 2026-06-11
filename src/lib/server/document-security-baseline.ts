import crypto from "crypto";
import {
  WARRANTY_DOCUMENT_ALLOWED_TYPES,
  WARRANTY_DOCUMENT_MAX_SIZE,
} from "@/lib/documents";

export type BaselineScanInput = {
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  fileHash?: string | null;
  bytes: Buffer;
};

export type BaselineScanResult = {
  verdict: "clean" | "blocked";
  engine: "warrantee_baseline_document_scanner";
  signature: string;
  reason: string | null;
  details: Record<string, unknown>;
};

const BLOCKED_EXTENSIONS = new Set([
  "app",
  "bat",
  "cmd",
  "com",
  "dll",
  "dmg",
  "exe",
  "hta",
  "jar",
  "js",
  "jse",
  "lnk",
  "msi",
  "ps1",
  "scr",
  "sh",
  "vbs",
  "wsf",
]);

const PDF_RISK_PATTERNS = [
  { pattern: /\/JavaScript\b/i, reason: "pdf_javascript_action" },
  { pattern: /\/JS\b/i, reason: "pdf_js_action" },
  { pattern: /\/OpenAction\b/i, reason: "pdf_open_action" },
  { pattern: /\/AA\b/i, reason: "pdf_additional_action" },
  { pattern: /\/Launch\b/i, reason: "pdf_launch_action" },
  { pattern: /\/EmbeddedFile\b/i, reason: "pdf_embedded_file" },
  { pattern: /\/RichMedia\b/i, reason: "pdf_rich_media" },
];

function getExtension(fileName: string | null | undefined) {
  const extension = String(fileName || "").split(".").pop()?.toLowerCase() || "";
  return /^[a-z0-9]{1,12}$/.test(extension) ? extension : "";
}

function hasMagic(bytes: Buffer, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function detectMagicType(bytes: Buffer) {
  if (bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (hasMagic(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasMagic(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (hasMagic(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "application/msword";
  if (hasMagic(bytes, [0x50, 0x4b, 0x03, 0x04]) || hasMagic(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "unknown";
}

function expectedMagicTypes(fileType: string) {
  if (fileType === "image/jpg") return ["image/jpeg"];
  return [fileType];
}

function block(reason: string, details: Record<string, unknown>): BaselineScanResult {
  return {
    verdict: "blocked",
    engine: "warrantee_baseline_document_scanner",
    signature: "baseline-2026-06-11",
    reason,
    details,
  };
}

export function scanDocumentBaseline(input: BaselineScanInput): BaselineScanResult {
  const fileType = String(input.fileType || "").toLowerCase();
  const fileSize = Number(input.fileSize || input.bytes.length);
  const extension = getExtension(input.fileName);
  const magicType = detectMagicType(input.bytes);
  const actualHash = crypto.createHash("sha256").update(input.bytes).digest("hex");

  const details = {
    fileType,
    fileSize,
    extension,
    magicType,
    hashMatched: !input.fileHash || input.fileHash.toLowerCase() === actualHash,
  };

  if (!WARRANTY_DOCUMENT_ALLOWED_TYPES.includes(fileType)) {
    return block("unsupported_file_type", details);
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > WARRANTY_DOCUMENT_MAX_SIZE) {
    return block("invalid_file_size", details);
  }

  if (input.bytes.length !== fileSize) {
    return block("file_size_mismatch", details);
  }

  if (extension && BLOCKED_EXTENSIONS.has(extension)) {
    return block("blocked_extension", details);
  }

  if (input.fileHash && input.fileHash.toLowerCase() !== actualHash) {
    return block("file_hash_mismatch", details);
  }

  if (!expectedMagicTypes(fileType).includes(magicType)) {
    return block("file_magic_mismatch", details);
  }

  if (fileType === "application/pdf") {
    const sample = input.bytes.subarray(0, Math.min(input.bytes.length, 2_000_000)).toString("latin1");
    const risk = PDF_RISK_PATTERNS.find((item) => item.pattern.test(sample));
    if (risk) {
      return block(risk.reason, details);
    }
  }

  return {
    verdict: "clean",
    engine: "warrantee_baseline_document_scanner",
    signature: "baseline-2026-06-11",
    reason: null,
    details,
  };
}
