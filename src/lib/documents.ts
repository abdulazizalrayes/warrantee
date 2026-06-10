export const WARRANTY_DOCUMENTS_BUCKET = "warranty-documents";
export const WARRANTY_DOCUMENT_SECURITY_STATUSES = [
  "pending_scan",
  "clean",
  "blocked",
  "scan_failed",
] as const;
export type WarrantyDocumentSecurityStatus = (typeof WARRANTY_DOCUMENT_SECURITY_STATUSES)[number];
export const WARRANTY_DOCUMENT_BLOCKED_SECURITY_STATUSES: WarrantyDocumentSecurityStatus[] = ["blocked"];
export const WARRANTY_DOCUMENT_MAX_SIZE = 20 * 1024 * 1024;
export const WARRANTY_DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function getWarrantyDocumentSafeExtension(fileName: string, mimeType: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
  if (extension && /^[a-z0-9]{1,10}$/.test(extension)) return extension;

  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "application/msword") return "doc";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return "bin";
}

export function sanitizeWarrantyDocumentSourceContext(value: string | null) {
  const normalized = (value || "manual_upload").trim().toLowerCase();
  return normalized.replace(/[^a-z0-9_.-]+/g, "_").slice(0, 80) || "manual_upload";
}

function stripLeadingSlash(value: string) {
  return value.replace(/^\/+/, "");
}

export function isAbsoluteUrl(value: string | null | undefined) {
  return /^https?:\/\//i.test(String(value || ""));
}

export function normalizeWarrantyDocumentStoragePath(
  storagePath: string | null | undefined,
  fileUrl: string | null | undefined
) {
  const directPath = stripLeadingSlash(String(storagePath || "").trim());
  if (directPath) return directPath;

  const rawFileUrl = String(fileUrl || "").trim();
  if (!rawFileUrl) return "";

  const publicPrefix = `/storage/v1/object/public/${WARRANTY_DOCUMENTS_BUCKET}/`;
  const signedPrefix = `/storage/v1/object/sign/${WARRANTY_DOCUMENTS_BUCKET}/`;

  if (isAbsoluteUrl(rawFileUrl)) {
    try {
      const parsed = new URL(rawFileUrl);
      if (parsed.pathname.includes(publicPrefix)) {
        return stripLeadingSlash(parsed.pathname.split(publicPrefix)[1] || "");
      }
      if (parsed.pathname.includes(signedPrefix)) {
        return stripLeadingSlash(parsed.pathname.split(signedPrefix)[1] || "");
      }
      return "";
    } catch {
      return "";
    }
  }

  if (rawFileUrl.startsWith(`${WARRANTY_DOCUMENTS_BUCKET}/`)) {
    return stripLeadingSlash(rawFileUrl.slice(WARRANTY_DOCUMENTS_BUCKET.length + 1));
  }

  return stripLeadingSlash(rawFileUrl);
}

export function buildDocumentDownloadHref(documentId: string) {
  return `/api/documents/${documentId}/download`;
}
