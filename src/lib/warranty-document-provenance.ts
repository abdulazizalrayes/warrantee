export const WARRANTY_DOCUMENT_KINDS = [
  "original_proof",
  "certificate",
  "claim_support",
  "reference",
  "other",
] as const;

export type WarrantyDocumentKind = (typeof WARRANTY_DOCUMENT_KINDS)[number];

export interface WarrantyDocumentAuditMetadata {
  warranty_id: string;
  document_id?: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  file_hash: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  document_kind: WarrantyDocumentKind;
  provenance_status: "recorded" | "legacy";
  source_context: string;
}

export function inferWarrantyDocumentKind(
  fileName: string,
  declaredKind?: string | null
): WarrantyDocumentKind {
  const normalizedDeclared = (declaredKind || "").trim().toLowerCase();
  if (
    WARRANTY_DOCUMENT_KINDS.includes(
      normalizedDeclared as WarrantyDocumentKind
    )
  ) {
    return normalizedDeclared as WarrantyDocumentKind;
  }

  const normalizedName = fileName.toLowerCase();
  if (normalizedName.includes("certificate")) return "certificate";
  if (normalizedName.includes("claim")) return "claim_support";
  if (
    normalizedName.includes("invoice") ||
    normalizedName.includes("receipt") ||
    normalizedName.includes("warranty") ||
    normalizedName.includes("proof")
  ) {
    return "original_proof";
  }
  return "reference";
}

export function shortDocumentHash(hash?: string | null) {
  if (!hash) return null;
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 12)}...${hash.slice(-6)}`;
}

export function getDocumentKindLabel(
  kind: string | null | undefined,
  isRTL: boolean
) {
  const labels: Record<string, { en: string; ar: string }> = {
    original_proof: { en: "Original proof", ar: "إثبات أصلي" },
    certificate: { en: "Certificate", ar: "شهادة" },
    claim_support: { en: "Claim support", ar: "مستند مطالبة" },
    reference: { en: "Reference", ar: "مرجع" },
    other: { en: "Other", ar: "أخرى" },
  };

  const resolved = labels[kind || ""] || labels.reference;
  return isRTL ? resolved.ar : resolved.en;
}

export function getProvenanceStatusLabel(
  status: string | null | undefined,
  isRTL: boolean
) {
  const labels: Record<string, { en: string; ar: string }> = {
    recorded: { en: "Recorded", ar: "موثق" },
    legacy: { en: "Legacy file", ar: "ملف قديم" },
    verified: { en: "Verified", ar: "تم التحقق" },
  };

  const resolved = labels[status || ""] || labels.recorded;
  return isRTL ? resolved.ar : resolved.en;
}

export function isSchemaColumnError(message: string | undefined) {
  if (!message) return false;
  return (
    /column .* does not exist/i.test(message) ||
    /schema cache/i.test(message) ||
    /could not find the .* column/i.test(message)
  );
}
