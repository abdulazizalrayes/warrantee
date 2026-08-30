import { WARRANTEE_PHONE_E164 } from "@/lib/contact-details";

const BASE_URL = "https://warrantee.io";

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "Warrantee.io",
        alternateName: ["Warrantee", "Warrantee warranty management platform"],
        url: BASE_URL,
        sameAs: [
          "https://www.linkedin.com/company/warrantee-io",
          "https://www.crunchbase.com/organization/warrantee-io",
        ],
        email: "hello@warrantee.io",
        telephone: WARRANTEE_PHONE_E164,
        logo: `${BASE_URL}/icon`,
        image: `${BASE_URL}/opengraph-image`,
        slogan: "Trust the Terms",
        description: "Warrantee.io is a bilingual warranty management software platform for businesses and sellers in Saudi Arabia and the GCC.",
        disambiguatingDescription: "Warrantee.io is the warranty management SaaS at warrantee.io, distinct from the generic word warrantee and unrelated warrantee.com entities.",
        areaServed: ["Saudi Arabia", "GCC", "Middle East"],
        knowsAbout: [
          "Warranty management",
          "Digital warranty certificates",
          "Warranty claims",
          "Warranty extensions",
          "Seller warranty workflows",
          "Arabic and English warranty operations",
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "hello@warrantee.io",
            telephone: WARRANTEE_PHONE_E164,
            availableLanguage: ["English", "Arabic"],
            areaServed: ["Saudi Arabia", "GCC", "Middle East"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        name: "Warrantee.io",
        url: BASE_URL,
        inLanguage: ["en", "ar"],
        publisher: { "@id": `${BASE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${BASE_URL}/#software`,
        name: "Warrantee.io",
        alternateName: ["Warrantee", "Warrantee warranty management platform"],
        description: "Warranty management software and platform for businesses and sellers. Track, approve, extend, verify, and claim warranties with bilingual Arabic and English workflows.",
        url: BASE_URL,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Warranty management software",
        operatingSystem: "Web",
        inLanguage: ["en", "ar"],
        areaServed: ["Saudi Arabia", "GCC", "Middle East"],
        author: { "@id": `${BASE_URL}/#organization` },
        publisher: { "@id": `${BASE_URL}/#organization` },
        offers: [
          {
            "@type": "Offer",
            name: "Personal Free",
            price: "0",
            priceCurrency: "SAR",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/en/pricing`,
            description: "Free personal plan with no credit card required. Includes up to 10 personal warranty records, expiry reminders, one user, and retained warranty history.",
          },
          {
            "@type": "Offer",
            name: "Business Free",
            price: "0",
            priceCurrency: "SAR",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/en/pricing`,
            description: "Free business plan with no credit card required. Includes the first 100 issued customer warranties, certificates, QR product passports, a basic claims workflow, one business user, and retained warranty history.",
          },
          {
            "@type": "Offer",
            name: "Professional GCC",
            price: "14.90",
            priceCurrency: "SAR",
            availability: "https://schema.org/PreOrder",
            url: `${BASE_URL}/en/contact?intent=professional-access`,
            description: "Planned GCC Professional launch price: SAR 14.90/month. Self-serve checkout is not yet generally active, so access currently requires confirmation from Warrantee. Proposed terms include up to 1,000 issued warranties, advanced analytics, priority email support, up to 3 team members, full warranty history, custom workflows, and bilingual certificates.",
          },
          {
            "@type": "Offer",
            name: "Professional International",
            price: "3.99",
            priceCurrency: "USD",
            availability: "https://schema.org/PreOrder",
            url: `${BASE_URL}/en/contact?intent=professional-access`,
            description: "Planned Professional launch price outside the GCC: USD 3.99/month. Self-serve checkout is not yet generally active, and the proposed capacity is up to 1,000 issued warranties and 3 team members.",
          },
          {
            "@type": "Offer",
            name: "Enterprise",
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: "SAR",
              description: "Custom enterprise pricing",
            },
            url: `${BASE_URL}/en/contact?intent=enterprise`,
            description: "Custom pricing for large organizations. Team limits, onboarding, integrations, security requirements, service levels, and commercial terms are confirmed by agreement.",
          },
        ],
      },
      {
        "@type": "Service",
        "@id": `${BASE_URL}/#warranty-management-service`,
        name: "Warrantee.io warranty management services",
        serviceType: "Warranty management platform",
        provider: { "@id": `${BASE_URL}/#organization` },
        url: BASE_URL,
        areaServed: ["Saudi Arabia", "GCC", "Middle East"],
        audience: [
          { "@type": "BusinessAudience", audienceType: "Businesses and sellers" },
          { "@type": "PeopleAudience", audienceType: "Consumers" },
        ],
        inLanguage: ["en", "ar"],
      },
    ],
  };
}

export function getFAQJsonLd(locale: string = "en") {
  const isAr = locale === "ar";
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: isAr ? "\u0645\u0627 \u0647\u0648 Warrantee\u061f" : "What is Warrantee?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isAr
            ? "Warrantee.io \u0647\u0648 \u0645\u0646\u0635\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A \u062B\u0646\u0627\u0626\u064A\u0629 \u0627\u0644\u0644\u063A\u0629 \u0644\u0644\u0634\u0631\u0643\u0627\u062A \u0648\u0627\u0644\u0628\u0627\u0626\u0639\u064A\u0646 \u0641\u064A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0648\u062F\u0648\u0644 \u0627\u0644\u062E\u0644\u064A\u062C. \u062A\u0633\u0627\u0639\u062F \u0639\u0644\u0649 \u062A\u062A\u0628\u0639 \u0648\u062A\u0645\u062F\u064A\u062F \u0648\u062A\u0648\u062B\u064A\u0642 \u0648\u0625\u062F\u0627\u0631\u0629 \u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0627\u0644\u0636\u0645\u0627\u0646 \u0631\u0642\u0645\u064A\u064B\u0627."
            : "Warrantee.io is a bilingual warranty management platform for businesses and sellers in Saudi Arabia and the GCC. It helps teams track, extend, verify, and manage warranty claims digitally.",
        },
      },
      {
        "@type": "Question",
        name: isAr ? "\u0643\u0645 \u062A\u0643\u0644\u0641\u0629 Warrantee\u061F" : "How much does Warrantee cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isAr
            ? "يقدم Warrantee.io خطة مجانية للأفراد تشمل حتى 10 ضمانات شخصية، وخطة مجانية للأعمال تشمل أول 100 ضمان مُصدر، دون بطاقة ائتمانية. سعر الإطلاق المخطط للخطة الاحترافية هو 14.90 ريالًا شهريًا في دول الخليج أو 3.99 دولار شهريًا خارجها، ويتطلب التفعيل حاليًا تأكيدًا من Warrantee. أسعار المؤسسات مخصصة حسب الاتفاق."
            : "Warrantee.io offers Personal Free for up to 10 personal warranties and Business Free for the first 100 issued warranties, with no credit card required. The planned Professional launch price is SAR 14.90/month in the GCC or USD 3.99/month elsewhere and currently requires access confirmation. Enterprise pricing is custom by agreement.",
        },
      },
    ],
  };
}
