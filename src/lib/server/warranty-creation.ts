import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyTrafficUserAgent } from "@/lib/traffic-classification";

const ISSUER_ROLES = ["creator", "approver", "company_admin", "platform_admin"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class WarrantyCreationError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
  }
}

export function validateManualIdempotencyKey(value: string | null) {
  if (value === null) return null;
  if (!/^[\x21-\x7e]{8,200}$/.test(value)) {
    throw new WarrantyCreationError("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must contain 8 to 200 printable non-space ASCII characters.", 400);
  }
  return value;
}

export async function resolveManualWarrantyBinding(
  supabase: SupabaseClient,
  userId: string,
  requestedCompany: unknown,
) {
  if (requestedCompany != null && (typeof requestedCompany !== "string" || !UUID.test(requestedCompany))) {
    throw new WarrantyCreationError("INVALID_ISSUER_COMPANY", "issuer_company_id must be a valid company ID.", 400);
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("account_type").eq("id", userId).single();
  if (profileError || !profile || !["consumer", "business"].includes(profile.account_type)) {
    throw new WarrantyCreationError("ACCOUNT_CONTEXT_UNAVAILABLE", "Could not verify your account. Please retry.", 503);
  }
  if (profile.account_type === "consumer") {
    if (requestedCompany != null) {
      throw new WarrantyCreationError("PERSONAL_COMPANY_NOT_ALLOWED", "Personal warranties cannot be issued on behalf of a company.", 403);
    }
    return { accountType: "consumer" as const, companyId: null };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("company_members").select("company_id")
    .eq("user_id", userId).eq("is_active", true).in("role", ISSUER_ROLES);
  if (membershipError) {
    throw new WarrantyCreationError("COMPANY_CONTEXT_UNAVAILABLE", "Could not verify your company membership. Please retry.", 503);
  }
  const memberIds = [...new Set((memberships || []).map((row) => row.company_id as string))];
  if (!memberIds.length || (requestedCompany && !memberIds.includes(requestedCompany))) {
    throw new WarrantyCreationError("ISSUER_MEMBERSHIP_REQUIRED", "An active issuer membership is required. Ask your company administrator for access.", 403);
  }
  const { data: companies, error: companyError } = await supabase
    .from("companies").select("id").in("id", requestedCompany ? [requestedCompany] : memberIds)
    .in("company_role", ["vendor", "both"])
    .or("is_archived.is.null,is_archived.eq.false");
  if (companyError) {
    throw new WarrantyCreationError("COMPANY_CONTEXT_UNAVAILABLE", "Could not verify your issuer company. Please retry.", 503);
  }
  if (!companies?.length) {
    throw new WarrantyCreationError("ISSUER_MEMBERSHIP_REQUIRED", "An active issuer company is required. Ask your company administrator for access.", 403);
  }
  if (companies.length !== 1) {
    throw new WarrantyCreationError("COMPANY_SELECTION_REQUIRED", "Select an issuer company and retry with issuer_company_id. More than one company is authorized.", 409);
  }
  return { accountType: "business" as const, companyId: companies[0].id as string };
}

// The canonical migration is a release prerequisite. No service-role fallback:
// reservation, warranty, audit, and durable replay must commit in one transaction.
export async function createManualWarranty(
  supabase: SupabaseClient,
  input: { warranty: Record<string, unknown>; idempotencyKey: string | null; userAgent: string | null },
) {
  const { data, error } = await supabase.rpc("create_manual_warranty", {
    p_warranty: input.warranty,
    p_idempotency_key: input.idempotencyKey,
    p_traffic_class: classifyTrafficUserAgent(input.userAgent),
  });
  if (error) {
    if (["22P02", "22007", "22008", "23514"].includes(error.code)) {
      throw new WarrantyCreationError("INVALID_CREATION_INPUT", "Warranty fields are invalid or exceed the allowed limits.", 400);
    }
    if (["PGRST202", "42883", "42501"].includes(error.code)) {
      throw new WarrantyCreationError("WARRANTY_CREATION_UNAVAILABLE", "Warranty creation is temporarily unavailable. Retry with the same Idempotency-Key; do not start a new submission.", 503);
    }
    const conflicts: Record<string, [string, number]> = {
      IDEMPOTENCY_BODY_MISMATCH: ["Idempotency-Key was already used with a different request body.", 409],
      IDEMPOTENCY_IN_PROGRESS: ["This submission is still processing. Retry with the same Idempotency-Key.", 409],
      ISSUER_MEMBERSHIP_REQUIRED: ["An active issuer company membership is required.", 403],
      PERSONAL_COMPANY_NOT_ALLOWED: ["Personal warranties cannot be issued on behalf of a company.", 403],
      ACCOUNT_CONTEXT_UNAVAILABLE: ["Could not verify your account. Please retry.", 503],
      INVALID_CREATION_STATUS: ["New warranties must be active, draft, or pending_approval.", 400],
      INVALID_CREATION_INPUT: ["Warranty fields are invalid or exceed the allowed limits.", 400],
    };
    const conflict = conflicts[error.message];
    if (conflict) throw new WarrantyCreationError(error.message, conflict[0], conflict[1]);
    throw error;
  }
  if (!data || typeof data !== "object" || !data.data || typeof data.data.id !== "string" || typeof data.idempotent_replay !== "boolean") {
    throw new WarrantyCreationError("INVALID_CREATION_OUTCOME", "Could not confirm the submission outcome. Retry with the same Idempotency-Key.", 503);
  }
  return data as { data: Record<string, unknown> & { id: string }; idempotent_replay: boolean };
}
