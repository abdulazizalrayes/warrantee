"use client";

import { useParams } from "next/navigation";

const faqs = {
  en: [
    {
      q: "What is Warrantee?",
      a: "Warrantee is a bilingual warranty management platform designed for the Saudi construction sector. It helps contractors, suppliers, and project owners track, manage, and enforce warranty obligations digitally."
    },
    {
      q: "How much does Warrantee cost?",
      a: "Warrantee offers a Free plan for individuals, a Professional plan at $1/month for businesses, and an Enterprise plan with custom pricing. Visit our pricing page for full details."
    },
    {
      q: "Is Warrantee available in Arabic?",
      a: "Yes! Warrantee is fully bilingual, supporting both English and Arabic with complete RTL (right-to-left) layout support."
    },
    {
      q: "How do I add a warranty?",
      a: "After signing up and logging into your dashboard, click 'Add Warranty' and fill in the product details, supplier information, start date, and duration. You can also forward warranty emails to your Warrantee inbox for automatic extraction."
    },
    {
      q: "Can I import warranties via email?",
      a: "Yes. Warrantee supports email ingestion — forward warranty confirmations to your dedicated inbox address, and our system will automatically extract warranty details using AI."
    },
    {
      q: "How do I file a warranty claim?",
      a: "Navigate to the warranty in your dashboard, click 'File Claim', describe the issue, and attach any supporting photos or documents. The claim will be tracked through resolution."
    },
    {
      q: "Is my data secure?",
      a: "Absolutely. Warrantee uses Supabase with Row Level Security (RLS), ensuring your data is isolated and protected. All connections are encrypted with TLS, and we enforce strict security headers."
    },
    {
      q: "Can I invite my team?",
      a: "Yes. On the Professional and Enterprise plans, you can invite team members as sellers or administrators to collaborate on warranty management."
    },
    {
      q: "What happens when a warranty is about to expire?",
      a: "Warrantee sends automated notifications before warranties expire, giving you time to file claims or request extensions."
    },
    {
      q: "How do I contact support?",
      a: "Visit our Contact page or email us at support@warrantee.io. Enterprise customers have access to priority support."
    }
  ],
  ar: [
    {
      q: "\u0645\u0627 \u0647\u0648 Warrantee\u061F",
      a: "Warrantee \u0647\u0648 \u0645\u0646\u0635\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A \u062B\u0646\u0627\u0626\u064A\u0629 \u0627\u0644\u0644\u063A\u0629 \u0645\u0635\u0645\u0645\u0629 \u0644\u0642\u0637\u0627\u0639 \u0627\u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u0633\u0639\u0648\u062F\u064A. \u062A\u0633\u0627\u0639\u062F \u0627\u0644\u0645\u0642\u0627\u0648\u0644\u064A\u0646 \u0648\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0648\u0645\u0644\u0627\u0643 \u0627\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0639\u0644\u0649 \u062A\u062A\u0628\u0639 \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0627\u0644\u0636\u0645\u0627\u0646 \u0631\u0642\u0645\u064A\u064B\u0627."
    },
    {
      q: "\u0643\u0645 \u062A\u0643\u0644\u0641\u0629 Warrantee\u061F",
      a: "\u064A\u0642\u062F\u0645 Warrantee \u062E\u0637\u0629 \u0645\u062C\u0627\u0646\u064A\u0629 \u0644\u0644\u0623\u0641\u0631\u0627\u062F\u060C \u0648\u062E\u0637\u0629 \u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 \u0628\u062F\u0648\u0644\u0627\u0631 \u0648\u0627\u062D\u062F \u0634\u0647\u0631\u064A\u064B\u0627 \u0644\u0644\u0634\u0631\u0643\u0627\u062A\u060C \u0648\u062E\u0637\u0629 \u0645\u0624\u0633\u0633\u064A\u0629 \u0628\u0623\u0633\u0639\u0627\u0631 \u0645\u062E\u0635\u0635\u0629."
    },
    {
      q: "\u0647\u0644 Warrantee \u0645\u062A\u0627\u062D \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629\u061F",
      a: "\u0646\u0639\u0645! Warrantee \u062B\u0646\u0627\u0626\u064A \u0627\u0644\u0644\u063A\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644\u060C \u064A\u062F\u0639\u0645 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0648\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0645\u0639 \u062F\u0639\u0645 \u0643\u0627\u0645\u0644 \u0644\u0644\u062A\u0646\u0633\u064A\u0642 \u0645\u0646 \u0627\u0644\u064A\u0645\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u064A\u0633\u0627\u0631."
    },
    {
      q: "\u0643\u064A\u0641 \u0623\u0636\u064A\u0641 \u0636\u0645\u0627\u0646\u061F",
      a: "\u0628\u0639\u062F \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0648\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644\u060C \u0627\u0646\u0642\u0631 \u0639\u0644\u0649 '\u0625\u0636\u0627\u0641\u0629 \u0636\u0645\u0627\u0646' \u0648\u0623\u062F\u062E\u0644 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0646\u062A\u062C \u0648\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F. \u064A\u0645\u0643\u0646\u0643 \u0623\u064A\u0636\u064B\u0627 \u0625\u0639\u0627\u062F\u0629 \u062A\u0648\u062C\u064A\u0647 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0636\u0645\u0627\u0646 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A."
    },
    {
      q: "\u0647\u0644 \u0628\u064A\u0627\u0646\u0627\u062A\u064A \u0622\u0645\u0646\u0629\u061F",
      a: "\u0628\u0627\u0644\u062A\u0623\u0643\u064A\u062F. \u064A\u0633\u062A\u062E\u062F\u0645 Warrantee \u0623\u0645\u0627\u0646 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0635\u0641 \u0645\u0639 Supabase\u060C \u0648\u062C\u0645\u064A\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u0627\u062A \u0645\u0634\u0641\u0631\u0629."
    },
    {
      q: "\u0643\u064A\u0641 \u0623\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645\u061F",
      a: "\u0642\u0645 \u0628\u0632\u064A\u0627\u0631\u0629 \u0635\u0641\u062D\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0623\u0648 \u0631\u0627\u0633\u0644\u0646\u0627 \u0639\u0628\u0631 support@warrantee.io."
    }
  ]
};

export default function FAQPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const isRTL = locale === "ar";
  const items = faqs[locale as keyof typeof faqs] || faqs.en;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-2">
          {isRTL ? "\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629" : "Frequently Asked Questions"}
        </h1>
        <p className="text-center text-gray-500 mb-12">
          {isRTL
            ? "\u0625\u062C\u0627\u0628\u0627\u062A \u0639\u0644\u0649 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0623\u0643\u062B\u0631 \u0634\u064A\u0648\u0639\u064B\u0627 \u062D\u0648\u0644 Warrantee"
            : "Answers to the most common questions about Warrantee"}
        </p>

        <div className="space-y-4">
          {items.map((faq, i) => (
            <details
              key={i}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-lg font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                <span>{faq.q}</span>
                <span className="ml-4 shrink-0 text-gray-400 group-open:rotate-180 transition-transform">
                  \u25BC
                </span>
              </summary>
              <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">
            {isRTL ? "\u0644\u0645 \u062A\u062C\u062F \u0625\u062C\u0627\u0628\u062A\u0643\u061F" : "Didn\u2019t find your answer?"}
          </p>
          <a
            href={`/${locale}/contact`}
            className="inline-flex items-center px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            {isRTL ? "\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627" : "Contact Us"}
          </a>
        </div>
      </div>
    </div>
  );
}
