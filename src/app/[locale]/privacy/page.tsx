"use client";

// @ts-nocheck
import { useParams } from "next/navigation";
import Link from "next/link";

const content = {
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: March 2026",
    sections: [
      {
        heading: "1. Information We Collect",
        body: "We collect information you provide directly, including your name, email address, and warranty details. We also collect usage data such as device information, IP address, and browsing patterns to improve our services."
      },
      {
        heading: "2. How We Use Your Information",
        body: "We use your information to provide and maintain the Warrantee service, send warranty expiry notifications, process claims, improve our platform, and communicate with you about service updates."
      },
      {
        heading: "3. Data Storage and Security",
        body: "Your data is stored securely using industry-standard encryption. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction."
      },
      {
        heading: "4. Data Sharing",
        body: "We do not sell your personal information. We may share data with sellers when you initiate a warranty claim, and with service providers who assist in operating our platform, subject to confidentiality agreements."
      },
      {
        heading: "5. Your Rights",
        body: "You have the right to access, correct, or delete your personal data. You may request a copy of your data or ask us to stop processing it. Contact us at hello@warrantee.io to exercise these rights."
      },
      {
        heading: "6. Cookies and Tracking",
        body: "We use cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts. You can manage cookie preferences through your browser settings."
      },
      {
        heading: "7. Data Retention",
        body: "We retain your personal data for as long as your account is active or as needed to provide services. Warranty records are kept for the duration of the warranty period plus an additional 2 years."
      },
      {
        heading: "8. Contact Us",
        body: "For privacy-related inquiries, contact our Data Protection Officer at hello@warrantee.io"
      }
    ]
  },
  ar: {
    title: "\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629",
    lastUpdated: "\u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B: \u0645\u0627\u0631\u0633 2026",
    sections: [
      {
        heading: "1. \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062A\u064A \u0646\u062C\u0645\u0639\u0647\u0627",
        body: "\u0646\u062C\u0645\u0639 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062A\u064A \u062A\u0642\u062F\u0645\u0647\u0627 \u0645\u0628\u0627\u0634\u0631\u0629\u060C \u0628\u0645\u0627 \u0641\u064A \u0630\u0644\u0643 \u0627\u0633\u0645\u0643 \u0648\u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0648\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0636\u0645\u0627\u0646. \u0646\u062C\u0645\u0639 \u0623\u064A\u0636\u064B\u0627 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0644\u062A\u062D\u0633\u064A\u0646 \u062E\u062F\u0645\u0627\u062A\u0646\u0627."
      },
      {
        heading: "2. \u0643\u064A\u0641 \u0646\u0633\u062A\u062E\u062F\u0645 \u0645\u0639\u0644\u0648\u0645\u0627\u062A\u0643",
        body: "\u0646\u0633\u062A\u062E\u062F\u0645 \u0645\u0639\u0644\u0648\u0645\u0627\u062A\u0643 \u0644\u062A\u0642\u062F\u064A\u0645 \u062E\u062F\u0645\u0629 \u0636\u0645\u0627\u0646\u062A\u064A \u0648\u0635\u064A\u0627\u0646\u062A\u0647\u0627\u060C \u0648\u0625\u0631\u0633\u0627\u0644 \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646\u060C \u0648\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A\u060C \u0648\u062A\u062D\u0633\u064A\u0646 \u0627\u0644\u0645\u0646\u0635\u0629."
      },
      {
        heading: "3. \u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0623\u0645\u0627\u0646\u0647\u0627",
        body: "\u064A\u062A\u0645 \u062A\u062E\u0632\u064A\u0646 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0628\u0634\u0643\u0644 \u0622\u0645\u0646 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062A\u0634\u0641\u064A\u0631 \u0645\u0639\u064A\u0627\u0631\u064A. \u0646\u0637\u0628\u0642 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u062A\u0642\u0646\u064A\u0629 \u0648\u062A\u0646\u0638\u064A\u0645\u064A\u0629 \u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u062D\u0645\u0627\u064A\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062A\u0643 \u0627\u0644\u0634\u062E\u0635\u064A\u0629."
      },
      {
        heading: "4. \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
        body: "\u0644\u0627 \u0646\u0628\u064A\u0639 \u0645\u0639\u0644\u0648\u0645\u0627\u062A\u0643 \u0627\u0644\u0634\u062E\u0635\u064A\u0629. \u0642\u062F \u0646\u0634\u0627\u0631\u0643 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0639 \u0627\u0644\u0628\u0627\u0626\u0639\u064A\u0646 \u0639\u0646\u062F \u062A\u0642\u062F\u064A\u0645 \u0645\u0637\u0627\u0644\u0628\u0629 \u0636\u0645\u0627\u0646\u060C \u0648\u0645\u0639 \u0645\u0632\u0648\u062F\u064A \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0630\u064A\u0646 \u064A\u0633\u0627\u0639\u062F\u0648\u0646 \u0641\u064A \u062A\u0634\u063A\u064A\u0644 \u0645\u0646\u0635\u062A\u0646\u0627."
      },
      {
        heading: "5. \u062D\u0642\u0648\u0642\u0643",
        body: "\u0644\u0643 \u0627\u0644\u062D\u0642 \u0641\u064A \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0627\u0644\u0634\u062E\u0635\u064A\u0629 \u0623\u0648 \u062A\u0635\u062D\u064A\u062D\u0647\u0627 \u0623\u0648 \u062D\u0630\u0641\u0647\u0627. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0628\u0631 hello@warrantee.io \u0644\u0645\u0645\u0627\u0631\u0633\u0629 \u0647\u0630\u0647 \u0627\u0644\u062D\u0642\u0648\u0642."
      },
      {
        heading: "6. \u0645\u0644\u0641\u0627\u062A \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637 \u0648\u0627\u0644\u062A\u062A\u0628\u0639",
        body: "\u0646\u0633\u062A\u062E\u062F\u0645 \u0645\u0644\u0641\u0627\u062A \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637 \u0648\u0627\u0644\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u0645\u0645\u0627\u062B\u0644\u0629 \u0644\u062A\u062D\u0633\u064A\u0646 \u062A\u062C\u0631\u0628\u062A\u0643 \u0648\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645. \u064A\u0645\u0643\u0646\u0643 \u0625\u062F\u0627\u0631\u0629 \u062A\u0641\u0636\u064A\u0644\u0627\u062A \u0645\u0644\u0641\u0627\u062A \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637 \u0645\u0646 \u062E\u0644\u0627\u0644 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u062A\u0635\u0641\u062D."
      },
      {
        heading: "7. \u0627\u0644\u0627\u062D\u062A\u0641\u0627\u0638 \u0628\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
        body: "\u0646\u062D\u062A\u0641\u0638 \u0628\u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0627\u0644\u0634\u062E\u0635\u064A\u0629 \u0637\u0627\u0644\u0645\u0627 \u062D\u0633\u0627\u0628\u0643 \u0646\u0634\u0637. \u064A\u062A\u0645 \u0627\u0644\u0627\u062D\u062A\u0641\u0627\u0638 \u0628\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0636\u0645\u0627\u0646 \u0644\u0645\u062F\u0629 \u0641\u062A\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646 \u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0633\u0646\u062A\u064A\u0646 \u0625\u0636\u0627\u0641\u064A\u062A\u064A\u0646."
      },
      {
        heading: "8. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627",
        body: "\u0644\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u0639\u0644\u0642\u0629 \u0628\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629\u060C \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0645\u0633\u0624\u0648\u0644 \u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0639\u0628\u0631 hello@warrantee.io"
      }
    ]
  }
};

export default function PrivacyPage() {
  const params = useParams() ?? {};
  const locale = (params.locale as string) || "en";
  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href={`/${locale}`} className="text-[#4169E1] hover:underline mb-8 inline-block">
          {locale === "ar" ? "\u2190 \u0627\u0644\u0631\u062C\u0648\u0639 \u0644\u0644\u0631\u0626\u064A\u0633\u064A\u0629" : "\u2190 Back to Home"}
        </Link>
        <h1 className="text-4xl font-bold text-[#1A1A2E] mb-4">{t.title}</h1>
        <p className="text-gray-500 mb-12">{t.lastUpdated}</p>
        <div className="space-y-8">
          {t.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-xl font-semibold text-[#1A1A2E] mb-3">{section.heading}</h2>
              <p className="text-gray-700 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
