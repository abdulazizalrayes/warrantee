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

export function buildWarrantyAccessOrClause(userId: string) {
  return WARRANTY_ACCESS_FIELDS.map((field) => `${field}.eq.${userId}`).join(",");
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

export function buildWarrantyMutationOrClause(userId: string) {
  return WARRANTY_MUTATION_FIELDS.map((field) => `${field}.eq.${userId}`).join(",");
}

export function canMutateWarranty(
  warranty: Record<string, unknown> | null | undefined,
  userId: string
) {
  if (!warranty) return false;
  return WARRANTY_MUTATION_FIELDS.some((field) => warranty[field] === userId);
}

export function canViewWarranty(
  warranty: Record<string, unknown> | null | undefined,
  userId: string
) {
  if (!warranty) return false;
  return WARRANTY_ACCESS_FIELDS.some((field) => warranty[field] === userId);
}

export function buildWarrantyOwnershipInsert(userId: string) {
  return {
    user_id: userId,
    created_by: userId,
    issuer_user_id: userId,
  };
}
