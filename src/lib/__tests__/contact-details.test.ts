import { describe, expect, it } from "vitest";
import {
  WARRANTEE_PHONE_DISPLAY,
  WARRANTEE_PHONE_E164,
  WARRANTEE_PHONE_TEL_URL,
  getWarranteeWhatsAppMessage,
  getWarranteeWhatsAppUrl,
} from "@/lib/contact-details";

describe("Warrantee public contact details", () => {
  it("keeps the published phone number consistent", () => {
    expect(WARRANTEE_PHONE_DISPLAY).toBe("+966500067865");
    expect(WARRANTEE_PHONE_E164).toBe("+966500067865");
    expect(WARRANTEE_PHONE_TEL_URL).toBe("tel:+966500067865");
  });

  it("attributes WhatsApp conversations to Warrantee", () => {
    expect(getWarranteeWhatsAppMessage("en")).toBe(
      "Hello Warrantee, i need an inquiry?",
    );
    expect(getWarranteeWhatsAppMessage("ar")).toBe(
      "مرحبًا Warrantee، لدي استفسار",
    );

    for (const locale of ["en", "ar"] as const) {
      const message = getWarranteeWhatsAppMessage(locale);
      const url = new URL(getWarranteeWhatsAppUrl(locale));

      expect(url.origin).toBe("https://wa.me");
      expect(url.pathname).toBe("/966500067865");
      expect(url.searchParams.get("text")).toBe(message);
      expect(message).toContain("Warrantee");
      expect(message.toLowerCase()).not.toContain("eijarat");
    }
  });
});
