const WARRANTY_ACCESS_FIELDS = [
  "user_id",
  "created_by",
  "recipient_user_id",
  "buyer_id",
  "seller_id",
  "issuer_user_id",
] as const;

const PRIMARY_WARRANTY_ACCESS_FIELDS = [
  "user_id",
  "created_by",
  "recipient_user_id",
  "issuer_user_id",
] as const;

const SELLER_WARRANTY_ACCESS_FIELDS = [
  "created_by",
  "issuer_user_id",
  "seller_id",
] as const;

const BUYER_WARRANTY_ACCESS_FIELDS = [
  "user_id",
  "recipient_user_id",
  "buyer_id",
] as const;

const WARRANTY_MUTATION_FIELDS = [
  "user_id",
  "created_by",
  "seller_id",
  "issuer_user_id",
] as const;

function uniqueIds(ids: readonly string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function companyAccessClauses(companyIds: readonly string[]) {
  const ids = uniqueIds(companyIds);
  if (!ids.length) return [];
  const values = ids.join(",");
  return [
    `issuer_company_id.in.(${values})`,
    `recipient_company_id.in.(${values})`,
  ];
}

export type WarrantyCompanyAccess = {
  viewCompanyIds: string[];
  mutateCompanyIds: string[];
  administerCompanyIds: string[];
};

export async function getWarrantyCompanyAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<WarrantyCompanyAccess> {
  const { data, error } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error("Could not resolve company warranty access");
  }

  const memberships = data || [];
  return {
    viewCompanyIds: uniqueIds(memberships.map((membership) => membership.company_id)),
    mutateCompanyIds: uniqueIds(
      memberships
        .filter((membership) =>
          ["creator", "approver", "company_admin", "platform_admin"].includes(membership.role)
        )
        .map((membership) => membership.company_id)
    ),
    administerCompanyIds: uniqueIds(
      memberships
        .filter((membership) => ["company_admin", "platform_admin"].includes(membership.role))
        .map((membership) => membership.company_id)
    ),
  };
}

export function buildWarrantyAccessOrClause(
  userId: string,
  companyIds: readonly string[] = []
) {
  return [
    ...WARRANTY_ACCESS_FIELDS.map((field) => `${field}.eq.${userId}`),
    ...companyAccessClauses(companyIds),
  ].join(",");
}

export async function resolveWarrantyAccessOrClause(
  supabase: SupabaseClient,
  userId: string
) {
  const access = await getWarrantyCompanyAccess(supabase, userId);
  return buildWarrantyAccessOrClause(userId, access.viewCompanyIds);
}

export function buildPrimaryWarrantyAccessOrClause(userId: string) {
  return PRIMARY_WARRANTY_ACCESS_FIELDS.map((field) => `${field}.eq.${userId}`).join(",");
}

export function buildSellerWarrantyAccessOrClause(userId: string) {
  return SELLER_WARRANTY_ACCESS_FIELDS.map((field) => `${field}.eq.${userId}`).join(",");
}

export function buildBuyerWarrantyAccessOrClause(userId: string) {
  return BUYER_WARRANTY_ACCESS_FIELDS.map((field) => `${field}.eq.${userId}`).join(",");
}

export function buildWarrantyMutationOrClause(
  userId: string,
  issuerCompanyIds: readonly string[] = []
) {
  const companyIds = uniqueIds(issuerCompanyIds);
  return [
    ...WARRANTY_MUTATION_FIELDS.map((field) => `${field}.eq.${userId}`),
    ...(companyIds.length ? [`issuer_company_id.in.(${companyIds.join(",")})`] : []),
  ].join(",");
}

export async function resolveWarrantyMutationOrClause(
  supabase: SupabaseClient,
  userId: string
) {
  const access = await getWarrantyCompanyAccess(supabase, userId);
  return buildWarrantyMutationOrClause(userId, access.mutateCompanyIds);
}

export function canMutateWarranty(
  warranty: Record<string, unknown> | null | undefined,
  userId: string,
  issuerCompanyIds: readonly string[] = []
) {
  if (!warranty) return false;
  return (
    WARRANTY_MUTATION_FIELDS.some((field) => warranty[field] === userId) ||
    issuerCompanyIds.includes(String(warranty.issuer_company_id || ""))
  );
}

export function canViewWarranty(
  warranty: Record<string, unknown> | null | undefined,
  userId: string,
  companyIds: readonly string[] = []
) {
  if (!warranty) return false;
  return (
    WARRANTY_ACCESS_FIELDS.some((field) => warranty[field] === userId) ||
    companyIds.includes(String(warranty.issuer_company_id || "")) ||
    companyIds.includes(String(warranty.recipient_company_id || ""))
  );
}

export async function canViewWarrantyForUser(
  supabase: SupabaseClient,
  warranty: Record<string, unknown> | null | undefined,
  userId: string
) {
  const access = await getWarrantyCompanyAccess(supabase, userId);
  return canViewWarranty(warranty, userId, access.viewCompanyIds);
}

export async function canMutateWarrantyForUser(
  supabase: SupabaseClient,
  warranty: Record<string, unknown> | null | undefined,
  userId: string
) {
  const access = await getWarrantyCompanyAccess(supabase, userId);
  return canMutateWarranty(warranty, userId, access.mutateCompanyIds);
}

export function buildWarrantyOwnershipInsert(userId: string) {
  return {
    user_id: userId,
    created_by: userId,
    issuer_user_id: userId,
  };
}
import type { SupabaseClient } from "@supabase/supabase-js";
