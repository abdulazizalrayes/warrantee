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
            name: "Free",
            price: "0",
            priceCurrency: "SAR",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/en/pricing`,
            description: "Free plan available with no credit card required. Includes up to 10 warranties, a basic dashboard, email support, one user, and retained warranty history.",
          },
          {
            "@type": "Offer",
            name: "Professional",
            price: "149",
            priceCurrency: "SAR",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/en/pricing`,
            description: "Professional launch offer: SAR 149/month. Includes unlimited warranties, advanced analytics, priority support, up to 5 team members, full warranty history, custom workflows, and bilingual certificates. Warranty-extension transaction fees are separate.",
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
            description: "Custom pricing for large organizations with unlimited team members, dedicated account management, custom integrations, and SLA support.",
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
            ? "\u064A\u0642\u062F\u0645 Warrantee.io \u062E\u0637\u0629 \u0645\u062C\u0627\u0646\u064A\u0629 \u0628\u062F\u0648\u0646 \u062D\u0627\u062C\u0629 \u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062A\u0645\u0627\u0646\u064A\u0629\u060C \u0648\u0639\u0631\u0636 \u0625\u0637\u0644\u0627\u0642 \u0644\u0644\u062E\u0637\u0629 \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 \u0628\u0627\u0644\u0631\u064A\u0627\u0644 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u060C \u0648\u062E\u0637\u0629 \u0645\u0624\u0633\u0633\u064A\u0629 \u0628\u0623\u0633\u0639\u0627\u0631 \u0645\u062E\u0635\u0635\u0629. \u0631\u0633\u0648\u0645 \u0645\u0639\u0627\u0645\u0644\u0627\u062A \u062A\u0645\u062F\u064A\u062F \u0627\u0644\u0636\u0645\u0627\u0646 \u0645\u0646\u0641\u0635\u0644\u0629."
            : "Warrantee.io offers a Free plan with no credit card required, a Professional launch offer at SAR 149/month, and Enterprise plans with custom pricing. Warranty-extension transaction fees are separate.",
        },
      },
    ],
  };
}
