import { describe, expect, it } from "vitest";
import { getOnboardingWarrantyTemplates, getWarrantyTemplate } from "@/lib/warranty-templates";

describe("onboarding warranty templates", () => {
  it.each(["consumer", null, undefined, "unknown"])("%s uses a personal purchase, never a dealer workflow", (accountType) => {
    expect(getOnboardingWarrantyTemplates(accountType).map(({ id }) => id)).toEqual(["personal_purchase"]);
  });

  it("preserves the five business workflows and their defaults", () => {
    expect(getOnboardingWarrantyTemplates("business").map(({ id, category, defaultDurationMonths }) => ({ id, category, defaultDurationMonths }))).toEqual([
      { id: "equipment_service", category: "machinery", defaultDurationMonths: 12 },
      { id: "contractor_handover", category: "construction", defaultDurationMonths: 12 },
      { id: "electronics_retail", category: "electronics", defaultDurationMonths: 12 },
      { id: "appliance_retail", category: "appliances", defaultDurationMonths: 24 },
      { id: "manufacturer", category: "other", defaultDurationMonths: 12 },
    ]);
  });

  it("resolves the personal template for the existing warranty creation route in both languages", () => {
    const template = getWarrantyTemplate("personal_purchase");
    expect(template).toMatchObject({ category: "other", defaultDurationMonths: 12 });
    expect(template?.label.en).toBe("My personal purchase");
    expect(template?.label.ar).toBe("مشترياتي الشخصية");
    expect(template?.description.en).toBeTruthy();
    expect(template?.description.ar).toBeTruthy();
    expect(template?.suggestedFields).not.toContain("buyer_contact");
    expect(getWarrantyTemplate("not-a-template")).toBeNull();
  });
});
