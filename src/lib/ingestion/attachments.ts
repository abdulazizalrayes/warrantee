const FALLBACK_ATTACHMENT_NAME = "attachment";

export function sanitizeInboundAttachmentFilename(filename: unknown) {
  const rawName = typeof filename === "string" ? filename.trim() : "";
  const basename = rawName.split(/[\\/]+/).filter(Boolean).pop() || FALLBACK_ATTACHMENT_NAME;
  const withoutControlChars = basename.replace(/[\u0000-\u001f\u007f]/g, "");
  const normalized = withoutControlChars
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._() -]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);

  return normalized || FALLBACK_ATTACHMENT_NAME;
}
