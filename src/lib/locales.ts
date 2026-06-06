export const DEFAULT_LOCALE = "en";

export const INDEXED_LOCALES = ["en", "ar"] as const;

export const BETA_LOCALES = [
  "hi",
  "ur",
  "fil",
  "ml",
  "ta",
  "bn",
  "fr",
  "id",
  "tr",
  "es",
  "ru",
  "de",
  "it",
  "zh",
  "ja",
] as const;

export const LOCALES = [...INDEXED_LOCALES, ...BETA_LOCALES] as const;

export type IndexedLocale = (typeof INDEXED_LOCALES)[number];
export type BetaLocale = (typeof BETA_LOCALES)[number];
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LANGUAGE_TAGS: Record<Locale, string> = {
  en: "en-US",
  ar: "ar-SA",
  hi: "hi-IN",
  ur: "ur-PK",
  fil: "fil-PH",
  ml: "ml-IN",
  ta: "ta-IN",
  bn: "bn-BD",
  fr: "fr-FR",
  id: "id-ID",
  tr: "tr-TR",
  es: "es-ES",
  ru: "ru-RU",
  de: "de-DE",
  it: "it-IT",
  zh: "zh-CN",
  ja: "ja-JP",
};

export const LOCALE_LABELS: Record<
  Locale,
  { english: string; native: string; short: string }
> = {
  en: { english: "English", native: "English", short: "EN" },
  ar: { english: "Arabic", native: "العربية", short: "AR" },
  hi: { english: "Hindi", native: "हिन्दी", short: "HI" },
  ur: { english: "Urdu", native: "اردو", short: "UR" },
  fil: { english: "Filipino", native: "Filipino", short: "FIL" },
  ml: { english: "Malayalam", native: "മലയാളം", short: "ML" },
  ta: { english: "Tamil", native: "தமிழ்", short: "TA" },
  bn: { english: "Bengali", native: "বাংলা", short: "BN" },
  fr: { english: "French", native: "Français", short: "FR" },
  id: { english: "Indonesian", native: "Bahasa Indonesia", short: "ID" },
  tr: { english: "Turkish", native: "Türkçe", short: "TR" },
  es: { english: "Spanish", native: "Español", short: "ES" },
  ru: { english: "Russian", native: "Русский", short: "RU" },
  de: { english: "German", native: "Deutsch", short: "DE" },
  it: { english: "Italian", native: "Italiano", short: "IT" },
  zh: { english: "Chinese", native: "简体中文", short: "ZH" },
  ja: { english: "Japanese", native: "日本語", short: "JA" },
};

export const DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
  hi: "ltr",
  ur: "ltr",
  fil: "ltr",
  ml: "ltr",
  ta: "ltr",
  bn: "ltr",
  fr: "ltr",
  id: "ltr",
  tr: "ltr",
  es: "ltr",
  ru: "ltr",
  de: "ltr",
  it: "ltr",
  zh: "ltr",
  ja: "ltr",
};

export const LOCALE_PREFIX_PATTERN = LOCALES.join("|");

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}

export function isIndexedLocale(locale: string): locale is IndexedLocale {
  return INDEXED_LOCALES.includes(locale as IndexedLocale);
}

export function normalizeLocale(locale: string | null | undefined): Locale {
  const normalized = (locale || "").toLowerCase();
  return isValidLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

export function getContentLocale(locale: string): IndexedLocale {
  return locale === "ar" ? "ar" : "en";
}

export function getLocaleLanguageTag(locale: string): string {
  return LOCALE_LANGUAGE_TAGS[normalizeLocale(locale)];
}
