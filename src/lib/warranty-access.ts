const WARRANTY_ACCESS_FIELDS = [
  "user_id",
  "created_by",
  "recipient_user_id",
  "buyer_id",
  "seller_id",
  "issuer_user_id",
] as const;

export function buildWarrantyAccessOrClause(userId: string) {
  return WARRANTY_ACCESS_FIELDS.map((field) => `${field}.eq.${userId}`).join(",");
}

export function buildWarrantyOwnershipInsert(userId: string) {
  return {
    user_id: userId,
    created_by: userId,
    issuer_user_id: userId,
  };
}
