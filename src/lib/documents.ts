export const WARRANTY_DOCUMENTS_BUCKET = "warranty-documents";

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
