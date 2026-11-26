import { PUBLIC_WARRANTY_STATUSES } from "./public-warranty";

export const ISSUED_CERTIFICATE_QUERY_FILTER = "status.neq.cancelled,approved_at.not.is.null";

export function canRenderIssuedCertificate(warranty: { status?: unknown; approved_at?: unknown }) {
  if (!PUBLIC_WARRANTY_STATUSES.some((status) => status === warranty.status)) return false;
  // Rejection also uses cancelled, so that state alone does not prove issuance.
  return warranty.status !== "cancelled"
    || (typeof warranty.approved_at === "string" && Number.isFinite(Date.parse(warranty.approved_at)));
}
