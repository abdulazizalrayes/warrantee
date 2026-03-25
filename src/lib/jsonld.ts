export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Warrantee",
    alternateName: "Warrantee \u2014 Trust the Terms\u2122",
    description: "Warranty management platform for businesses and consumers. Track, approve, and extend warranties with confidence.",
    url: "https://warrantee.io",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD", description: "Up to 10 warranties, basic dashboard" },
      { "@type": "Offer", name: "Professional", price: "99", priceCurrency: "USD", description: "Unlimited warranties, advanced features, first year free" },
    ],
    inLanguage: ["en", "ar"],
    author: { "@type": "Organization", name: "Warrantee", url: "https://warrantee.io", email: "hello@warrantee.io" },
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
            ? "Warrantee \u0647\u0648 \u0645\u0646\u0635\u0629 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0628\u0646\u064a\u0629 \u0644\u0644\u0634\u0631\u0643\u0627\u062a \u0648\u0627\u0644\u0645\u0633\u062a\u0647\u0644\u0643\u064a\u0646."
            : "Warrantee is a warranty management platform built for businesses and consumers. Track, approve, and extend warranties with confidence.",
        },
      },
      {
        "@type": "Question",
        name: isAr ? "\u0643\u0645 \u064a\u0643\u0644\u0641 Warrantee\u061f" : "How much does Warrantee cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: isAr
            ? "\u064a\u0642\u062f\u0645 Warrantee \u062e\u0637\u0629 \u0645\u062c\u0627\u0646\u064a\u0629 \u0648\u062e\u0637\u0629 \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629 \u0648\u062e\u0637\u0629 \u0645\u0624\u0633\u0633\u064a\u0629."
            : "Warrantee offers a Free plan (up to 10 warranties), Professional plan ($99/month with first year free), and Enterprise plan with custom pricing.",
        },
      },
    ],
  };
}
