// Currency formatting utilities for SAR and multi-currency support

export type CurrencyCode = "SAR" | "USD" | "EUR" | "GBP";

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; symbol: string }> = {
  SAR: { locale: "ar-SA", symbol: "ر.س" },
  USD: { locale: "en-US", symbol: "$" },
  EUR: { locale: "de-DE", symbol: "€" },
  GBP: { locale: "en-GB", symbol: "£" },
};

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - Currency code (default: SAR)
 * @param locale - Override locale (optional)
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "SAR",
  locale?: string
): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.SAR;
  const displayLocale = locale || config.locale;

  try {
    return new Intl.NumberFormat(displayLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported locales
    return `${config.symbol} ${amount.toFixed(2)}`;
  }
}

/**
 * Format SAR specifically with bilingual support
 */
export function formatSAR(amount: number, locale: string = "ar-SA"): string {
  return formatCurrency(amount, "SAR", locale);
}

/**
 * Format for display in either EN or AR context
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode = "SAR",
  uiLocale: string = "en"
): string {
  const locale = uiLocale === "ar" ? "ar-SA" : "en-US";
  return formatCurrency(amount, currency, locale);
}

/**
 * Parse a price string back to number
 */
export function parseCurrencyString(value: string): number | null {
  // Remove currency symbols, spaces, and commas
  const cleaned = value.replace(/[^\d.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Format compact price (e.g., 1.2K, 3.5M)
 */
export function formatCompactPrice(
  amount: number,
  currency: CurrencyCode = "SAR",
  locale: string = "en"
): string {
  const displayLocale = locale === "ar" ? "ar-SA" : "en-US";
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.SAR;

  try {
    const formatted = new Intl.NumberFormat(displayLocale, {
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount);
    return `${config.symbol} ${formatted}`;
  } catch {
    return `${config.symbol} ${amount}`;
  }
}
