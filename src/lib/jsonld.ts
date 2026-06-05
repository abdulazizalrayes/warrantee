const BASE_URL = "https://warrantee.io";

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "Warrantee",
        url: BASE_URL,
        email: "hello@warrantee.io",
        logo: `${BASE_URL}/icon`,
        image: `${BASE_URL}/opengraph-image`,
        slogan: "Trust the Terms",
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
        name: "Warrantee",
        url: BASE_URL,
        inLanguage: ["en", "ar"],
        publisher: { "@id": `${BASE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${BASE_URL}/#software`,
        name: "Warrantee",
        alternateName: "Warrantee \u2014 Trust the Terms\u2122",
        description: "Warranty management software and platform for businesses and consumers. Track, approve, extend, and claim warranties with confidence.",
        url: BASE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: ["en", "ar"],
        author: { "@id": `${BASE_URL}/#organization` },
        publisher: { "@id": `${BASE_URL}/#organization` },
        offers: [
          {
            "@type": "Offer",
            name: "Free",
            price: "0",
            priceCurrency: "USD",
            description: "Up to 10 warranties, basic dashboard, email support, single user.",
          },
          {
            "@type": "Offer",
            name: "Professional",
            price: "1",
            priceCurrency: "USD",
            description: "Unlimited warranties, advanced analytics, priority support, up to 5 team members, custom workflows, bilingual certificates, and first month free.",
          },
          {
            "@type": "Offer",
            name: "Enterprise",
            description: "Custom pricing for large organizations with unlimited team members, dedicated account management, custom integrations, and SLA support.",
          },
        ],
      },
      {
        "@type": "Service",
        "@id": `${BASE_URL}/#warranty-management-service`,
        name: "Warranty management services",
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
            ? "Warrantee \u0647\u0648 \u0645\u0646\u0635\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A \u062B\u0646\u0627\u0626\u064A\u0629 \u0627\u0644\u0644\u063A\u0629 \u0645\u0635\u0645\u0645\u0629 \u0644\u0642\u0637\u0627\u0639 \u0627\u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u0633\u0639\u0648\u062F\u064A. \u062A\u0633\u0627\u0639\u062F \u0627\u0644\u0645\u0642\u0627\u0648\u0644\u064A\u0646 \u0648\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0648\u0645\u0644\u0627\u0643 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0639\u0644\u0649 \u062A\u062A\u0628\u0639 \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0627\u0644\u0636\u0645\u0627\u0646 \u0631\u0642\u0645\u064A\u064B\u0627."
            : "Warrantee is a bilingual warranty management platform designed for the Saudi construction sector. It helps contractors, suppliers, and project owners track, manage, and enforce warranty obligations digitally.",
        },
      },
      {
        "@type": "Question",
        name: isAr ? "\u0643\u0645 \u062A\u0643\u0644\u0641\u0629 Warrantee\u061F" : "How much does Warrantee cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isAr
            ? "\u064A\u0642\u062F\u0645 Warrantee \u062E\u0637\u0629 \u0645\u062C\u0627\u0646\u064A\u0629 \u0644\u0644\u0623\u0641\u0631\u0627\u062F\u060C \u0648\u062E\u0637\u0629 \u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 \u0628\u062F\u0648\u0644\u0627\u0631 \u0648\u0627\u062D\u062F \u0634\u0647\u0631\u064A\u064B\u0627 \u0644\u0644\u0634\u0631\u0643\u0627\u062A\u060C \u0648\u062E\u0637\u0629 \u0645\u0624\u0633\u0633\u064A\u0629 \u0628\u0623\u0633\u0639\u0627\u0631 \u0645\u062E\u0635\u0635\u0629."
            : "Warrantee offers a Free plan for individuals, a Professional plan at $1/month for businesses, and an Enterprise plan with custom pricing. Visit our pricing page for full details.",
        },
      },
    ],
  };
}
