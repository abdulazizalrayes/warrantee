export const PERSONAL_FREE_WARRANTY_LIMIT = 10;
export const BUSINESS_FREE_WARRANTY_LIMIT = 100;
export const PROFESSIONAL_WARRANTY_LIMIT = 1_000;
export const PROFESSIONAL_TEAM_LIMIT = 3;
export const PROFESSIONAL_PRICE_SAR = 15;
export const PROFESSIONAL_PRICE_USD = 4;

export const PROFESSIONAL_PRICE_SAR_LABEL = "SAR 15";
export const PROFESSIONAL_PRICE_USD_LABEL = "USD 4";

export type WarranteeAccountType = "consumer" | "business";

export function getFreeWarrantyLimit(accountType?: string | null) {
  return accountType === "business"
    ? BUSINESS_FREE_WARRANTY_LIMIT
    : PERSONAL_FREE_WARRANTY_LIMIT;
}
