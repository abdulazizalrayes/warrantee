export const PERSONAL_FREE_WARRANTY_LIMIT = 10;
export const BUSINESS_FREE_WARRANTY_LIMIT = 100;
export const PROFESSIONAL_WARRANTY_LIMIT = 1_000;
export const PROFESSIONAL_TEAM_LIMIT = 3;
export const PROFESSIONAL_PRICE_SAR = 14.9;
export const PROFESSIONAL_PRICE_USD = 3.99;

export const PROFESSIONAL_PRICE_SAR_LABEL = "SAR 14.90";
export const PROFESSIONAL_PRICE_USD_LABEL = "USD 3.99";

export type WarranteeAccountType = "consumer" | "business";

export function getFreeWarrantyLimit(accountType?: string | null) {
  return accountType === "business"
    ? BUSINESS_FREE_WARRANTY_LIMIT
    : PERSONAL_FREE_WARRANTY_LIMIT;
}
