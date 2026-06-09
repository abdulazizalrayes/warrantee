import { describe, expect, it } from "vitest";
import { getFAQJsonLd, getOrganizationJsonLd } from "@/lib/jsonld";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getBreadcrumbJsonLd, getPublicBreadcrumb } from "@/lib/public-breadcrumbs";
import { BETA_LOCALES, LOCALES, getDictionary } from "@/lib/i18n";
import sitemap from "@/app/sitemap";

type SchemaNode = {
  "@type"?: string;
  name?: string;
  description?: string;
  disambiguatingDescription?: string;
  contactPoint?: Array<Record<string, unknown>>;
  offers?: Array<{ name: string; description?: string }>;
  sameAs?: string[];
};

describe("SEO and AI-search readiness metadata", () => {
  it("keeps organization and software schema aligned with public pricing", () => {
    const jsonLd = getOrganizationJsonLd();
    const graph = jsonLd["@graph"] as SchemaNode[];
    const serialized = JSON.stringify(jsonLd);

    const organization = graph.find((node) => node["@type"] === "Organization");
    expect(organization).toBeDefined();
    if (!organization) throw new Error("Organization schema is missing");

    expect(organization).toMatchObject({
      name: "Warrantee.io",
      email: "hello@warrantee.io",
      url: "https://warrantee.io",
    });
    expect(organization.disambiguatingDescription).toContain("warrantee.io");
    expect(organization.disambiguatingDescription).toContain("warrantee.com");
    expect(organization.sameAs).toContain("https://www.linkedin.com/company/warrantee-io");
    expect(organization.contactPoint).toBeDefined();
    if (!organization.contactPoint) {
      throw new Error("Organization contactPoint schema is missing");
    }

    expect(organization.contactPoint[0]).toMatchObject({
      contactType: "customer support",
      email: "hello@warrantee.io",
    });

    const software = graph.find((node) => node["@type"] === "SoftwareApplication");
    expect(software).toBeDefined();
    if (!software) throw new Error("SoftwareApplication schema is missing");
    expect(software.offers).toBeDefined();
    if (!software.offers) throw new Error("SoftwareApplication offers are missing");

    expect(software.offers.map((offer: { name: string }) => offer.name)).toEqual([
      "Free",
      "Professional",
      "Enterprise",
    ]);
    expect(software.description).toContain("Warranty management software");
    expect(serialized).not.toContain("\"@type\":\"Product\"");
    expect(serialized).toContain("Professional launch offer");
    expect(serialized).toContain("first month free");
    expect(serialized).not.toContain("first year free");
    expect(serialized).not.toContain("Business plan");
  });

  it("uses FAQ structured data that matches visible FAQ copy", () => {
    const englishFaq = getFAQJsonLd("en");
    expect(englishFaq.mainEntity[0].acceptedAnswer.text).toContain(
      "Saudi Arabia and the GCC",
    );
    expect(englishFaq.mainEntity[1].acceptedAnswer.text).toContain(
      "Professional launch offer at $1/month",
    );
  });

  it("describes pricing with the current Professional plan", () => {
    const metadata = buildPageMetadata("pricing", "en");
    expect(metadata.description).toContain("Professional");
    expect(metadata.description).toContain("launch offer");
    expect(metadata.description).toContain("first month free");
    expect(metadata.description).not.toContain("first year free");
  });

  it("publishes reciprocal localized metadata for Arabic, English, and x-default", () => {
    const metadata = buildPageMetadata("pricing", "en");
    expect(metadata.alternates?.languages).toMatchObject({
      en: "https://warrantee.io/en/pricing",
      "en-US": "https://warrantee.io/en/pricing",
      ar: "https://warrantee.io/ar/pricing",
      "ar-SA": "https://warrantee.io/ar/pricing",
      "x-default": "https://warrantee.io/en/pricing",
    });
  });

  it("keeps homepage pricing copy aligned with live plans", () => {
    const englishPricing = JSON.stringify(getDictionary("en").pricing);
    const arabicPricing = JSON.stringify(getDictionary("ar").pricing);

    expect(englishPricing).toContain("Professional");
    expect(englishPricing).toContain("Up to 10 warranties");
    expect(englishPricing).toContain("Launch offer");
    expect(englishPricing).toContain("First month free");
    expect(englishPricing).not.toContain("Business");
    expect(englishPricing).not.toContain("first year free");
    expect(englishPricing).not.toContain("Up to 50 warranties");

    expect(arabicPricing).toContain("احترافي");
    expect(arabicPricing).toContain("حتى 10 ضمانات");
    expect(arabicPricing).toContain("عرض إطلاق");
    expect(arabicPricing).toContain("الشهر الأول مجاني");
  });

  it("registers beta language routes without indexing fallback translations", () => {
    expect(LOCALES).toEqual(
      expect.arrayContaining([
        "en",
        "ar",
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
      ]),
    );

    expect(BETA_LOCALES).toEqual(
      expect.arrayContaining([
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
      ]),
    );

    const metadata = buildPageMetadata("pricing", "fr");
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });
    expect(metadata.alternates?.canonical).toBe("https://warrantee.io/en/pricing");
    expect(metadata.openGraph?.url).toBe("https://warrantee.io/en/pricing");
    expect(getDictionary("fr").pricing.title).toBe(getDictionary("en").pricing.title);
  });

  it("adds breadcrumbs only to public information pages", () => {
    const pricingBreadcrumb = getPublicBreadcrumb("en", "/en/pricing");
    expect(pricingBreadcrumb?.items).toEqual([
      { name: "Home", href: "/en" },
      { name: "Pricing", href: "/en/pricing" },
    ]);

    const arabicSupportBreadcrumb = getPublicBreadcrumb("ar", "/ar/support");
    expect(arabicSupportBreadcrumb?.items[0]).toEqual({
      name: "الرئيسية",
      href: "/ar",
    });
    expect(arabicSupportBreadcrumb?.items[1]).toEqual({
      name: "الدعم",
      href: "/ar/support",
    });

    expect(getPublicBreadcrumb("en", "/en")).toBeNull();
    expect(getPublicBreadcrumb("en", "/en/dashboard")).toBeNull();
    expect(getPublicBreadcrumb("en", "/en/auth")).toBeNull();
  });

  it("emits breadcrumb structured data for public pages", () => {
    const jsonLd = getBreadcrumbJsonLd("en", "/en/verify/abc123");

    expect(jsonLd).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://warrantee.io/en",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Verify warranty",
          item: "https://warrantee.io/en/verify/abc123",
        },
      ],
    });
  });

  it("keeps the public sitemap localized without fake freshness dates", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://warrantee.io/en/support");
    expect(urls).toContain("https://warrantee.io/ar/support");
    expect(urls).toContain("https://warrantee.io/en/resources/warranty-management-software");
    expect(urls).toContain("https://warrantee.io/ar/resources/warranty-management-software");
    expect(urls).toContain("https://warrantee.io/en/compare/spreadsheets");
    expect(urls).toContain("https://warrantee.io/en/compare/build-with-ai");
    expect(urls).not.toContain("https://warrantee.io/fr/pricing");
    expect(urls).not.toContain("https://warrantee.io/fr/resources/warranty-management-software");
    expect(urls).not.toContain("https://warrantee.io/de/pricing");
    expect(urls).not.toContain("https://warrantee.io/en/dashboard");
    expect(entries.find((entry) => entry.url === "https://warrantee.io/en/pricing")?.alternates?.languages).toMatchObject({
      "en-US": "https://warrantee.io/en/pricing",
      "ar-SA": "https://warrantee.io/ar/pricing",
      "x-default": "https://warrantee.io/en/pricing",
    });
    expect(entries.every((entry) => !("lastModified" in entry))).toBe(true);
  });
});
