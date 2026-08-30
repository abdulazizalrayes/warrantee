import { getFAQJsonLd } from "@/lib/jsonld";
import { getContentLocale, normalizeLocale } from "@/lib/i18n";

type FAQPageProps = {
  params: Promise<{ locale: string }>;
};

const faqs = {
  en: [
    {
      q: "What is Warrantee?",
      a: "Warrantee.io is a bilingual warranty management platform for businesses and sellers in Saudi Arabia and the GCC. It helps teams track, extend, verify, and manage warranty claims digitally."
    },
    {
      q: "How much does Warrantee cost?",
      a: "Personal Free includes up to 10 personal warranties. Business Free includes the first 100 issued customer warranties. The planned Professional launch price is SAR 15 / USD 4 per month and currently requires access confirmation. Enterprise pricing is custom by agreement."
    },
    {
      q: "Is Warrantee available in Arabic?",
      a: "Yes. Core public and account workflows are available in English and Arabic, with right-to-left layout support where applicable."
    },
    {
      q: "How do I add a warranty?",
      a: "After signing up and logging into your dashboard, click 'Add Warranty' and enter the product details, supplier information, start date, and duration. Supported warranty emails can also be forwarded through the configured ingestion flow for review."
    },
    {
      q: "Can I import warranties via email?",
      a: "Yes, for supported messages. The email-ingestion flow prepares extracted warranty fields and keeps supported attachments connected. Review the prepared record before confirming it."
    },
    {
      q: "How do I file a warranty claim?",
      a: "Navigate to the warranty in your dashboard, click 'File Claim', describe the issue, and attach any supporting photos or documents. The claim will be tracked through resolution."
    },
    {
      q: "Is my data secure?",
      a: "Warrantee uses Supabase Row Level Security (RLS), company-scoped authorization, TLS, and security headers to protect customer data and reduce cross-account access risk."
    },
    {
      q: "Can I invite my team?",
      a: "Team collaboration is included in the proposed Professional terms and can be configured for Enterprise customers by agreement. Access and limits are confirmed before activation."
    },
    {
      q: "What happens when a warranty is about to expire?",
      a: "Warrantee sends automated notifications before warranties expire, giving you time to file claims or request extensions."
    },
    {
      q: "How do I contact support?",
      a: "Visit the Contact page or email hello@warrantee.io. Enterprise support terms are confirmed by agreement."
    }
  ],
  ar: [
    {
      q: "\u0645\u0627 \u0647\u0648 Warrantee\u061F",
      a: "Warrantee.io \u0647\u0648 \u0645\u0646\u0635\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A \u062B\u0646\u0627\u0626\u064A\u0629 \u0627\u0644\u0644\u063A\u0629 \u0644\u0644\u0634\u0631\u0643\u0627\u062A \u0648\u0627\u0644\u0628\u0627\u0626\u0639\u064A\u0646 \u0641\u064A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0648\u062F\u0648\u0644 \u0627\u0644\u062E\u0644\u064A\u062C. \u062A\u0633\u0627\u0639\u062F \u0639\u0644\u0649 \u062A\u062A\u0628\u0639 \u0648\u062A\u0645\u062F\u064A\u062F \u0648\u062A\u0648\u062B\u064A\u0642 \u0648\u0625\u062F\u0627\u0631\u0629 \u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0627\u0644\u0636\u0645\u0627\u0646 \u0631\u0642\u0645\u064A\u064B\u0627."
    },
    {
      q: "\u0643\u0645 \u062A\u0643\u0644\u0641\u0629 Warrantee\u061F",
      a: "تشمل الخطة المجانية للأفراد حتى 10 ضمانات شخصية، وتشمل المجانية للأعمال أول 100 ضمان مُصدر للعملاء. سعر الإطلاق المخطط للاحترافية هو 15 ريالًا / 4 دولارات شهريًا، ويتطلب التفعيل حاليًا تأكيدًا من Warrantee. أسعار المؤسسات مخصصة حسب الاتفاق."
    },
    {
      q: "\u0647\u0644 Warrantee \u0645\u062A\u0627\u062D \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629\u061F",
      a: "نعم. تتوفر مسارات العمل العامة والأساسية داخل الحساب بالإنجليزية والعربية، مع دعم اتجاه الكتابة من اليمين إلى اليسار حيث ينطبق."
    },
    {
      q: "\u0643\u064A\u0641 \u0623\u0636\u064A\u0641 \u0636\u0645\u0627\u0646\u061F",
      a: "\u0628\u0639\u062F \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0648\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644\u060C \u0627\u0646\u0642\u0631 \u0639\u0644\u0649 '\u0625\u0636\u0627\u0641\u0629 \u0636\u0645\u0627\u0646' \u0648\u0623\u062F\u062E\u0644 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0646\u062A\u062C \u0648\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F. \u064A\u0645\u0643\u0646\u0643 \u0623\u064A\u0636\u064B\u0627 \u0625\u0639\u0627\u062F\u0629 \u062A\u0648\u062C\u064A\u0647 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0636\u0645\u0627\u0646 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A."
    },
    {
      q: "\u0647\u0644 \u0628\u064A\u0627\u0646\u0627\u062A\u064A \u0622\u0645\u0646\u0629\u061F",
      a: "يستخدم Warrantee أمان مستوى الصف في Supabase، وصلاحيات مرتبطة بالشركة، واتصالات TLS، وترويسات أمنية لحماية بيانات العملاء وتقليل مخاطر الوصول بين الحسابات."
    },
    {
      q: "\u0643\u064A\u0641 \u0623\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645\u061F",
      a: "زر صفحة الاتصال أو راسلنا عبر hello@warrantee.io. تُؤكد شروط دعم المؤسسات حسب الاتفاق."
    }
  ]
};

export default async function FAQPage({ params }: FAQPageProps) {
  const { locale: routeLocale } = await params;
  const locale = normalizeLocale(String(routeLocale || "en"));
  const contentLocale = getContentLocale(locale);
  const isRTL = locale === "ar";
  const items = faqs[contentLocale] || faqs.en;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getFAQJsonLd(locale)) }}
      />
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
