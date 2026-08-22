import type { Locale } from "@/lib/i18n";

export const WARRANTEE_PHONE_E164 = "+966500067865";
export const WARRANTEE_PHONE_DISPLAY = "+966500067865";
export const WARRANTEE_PHONE_TEL_URL = `tel:${WARRANTEE_PHONE_E164}`;
export const WARRANTEE_WHATSAPP_NUMBER = "966500067865";

const WHATSAPP_MESSAGES = {
  en: "Hello Warrantee, i need an inquiry?",
  ar: "مرحبًا Warrantee، لدي استفسار",
} as const;

export function getWarranteeWhatsAppMessage(locale: Locale) {
  return locale === "ar" ? WHATSAPP_MESSAGES.ar : WHATSAPP_MESSAGES.en;
}

export function getWarranteeWhatsAppUrl(locale: Locale) {
  return `https://wa.me/${WARRANTEE_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    getWarranteeWhatsAppMessage(locale),
  )}`;
}
