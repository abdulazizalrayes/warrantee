"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

const content = {
  en: {
    title: "Terms of Service",
    lastUpdated: "Last updated: March 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "By accessing and using Warrantee, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform."
      },
      {
        heading: "2. Description of Service",
        body: "Warrantee provides a digital warranty management platform that allows users to register, track, and manage product warranties. Our services include warranty registration, expiry notifications, claims management, and seller integration."
      },
      {
        heading: "3. User Accounts",
        body: "You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account."
      },
      {
        heading: "4. User Responsibilities",
        body: "Users are responsible for the accuracy of warranty information they submit. Warrantee is not liable for any losses resulting from inaccurate or incomplete warranty data provided by users."
      },
      {
        heading: "5. Intellectual Property",
        body: "All content, features, and functionality of the Warrantee platform are owned by Warrantee and are protected by international copyright, trademark, and other intellectual property laws."
      },
      {
        heading: "6. Limitation of Liability",
        body: "Warrantee shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service."
      },
      {
        heading: "7. Governing Law",
        body: "These terms shall be governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia."
      },
      {
        heading: "8. Contact",
        body: "For questions about these Terms, please contact us at support@warrantee.sa"
      }
    ]
  },
  ar: {
    title: "\u0634\u0631\u0648\u0637 \u0627\u0644\u062E\u062F\u0645\u0629",
    lastUpdated: "\u0622\u062E\u0631 \u062A\u062D\u062F\u064A\u062B: \u0645\u0627\u0631\u0633 2026",
    sections: [
      {
        heading: "1. \u0642\u0628\u0648\u0644 \u0627\u0644\u0634\u0631\u0648\u0637",
        body: "\u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0643 \u0644\u0645\u0646\u0635\u0629 \u0636\u0645\u0627\u0646\u062A\u064A\u060C \u0641\u0625\u0646\u0643 \u062A\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u0634\u0631\u0648\u0637 \u0627\u0644\u062E\u062F\u0645\u0629 \u0647\u0630\u0647. \u0625\u0630\u0627 \u0644\u0645 \u062A\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637\u060C \u064A\u0631\u062C\u0649 \u0639\u062F\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u0646\u0635\u0629."
      },
      {
        heading: "2. \u0648\u0635\u0641 \u0627\u0644\u062E\u062F\u0645\u0629",
        body: "\u062A\u0648\u0641\u0631 \u0636\u0645\u0627\u0646\u062A\u064A \u0645\u0646\u0635\u0629 \u0631\u0642\u0645\u064A\u0629 \u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A \u062A\u062A\u064A\u062D \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u062A\u0633\u062C\u064A\u0644 \u0648\u062A\u062A\u0628\u0639 \u0648\u0625\u062F\u0627\u0631\u0629 \u0636\u0645\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A. \u062A\u0634\u0645\u0644 \u062E\u062F\u0645\u0627\u062A\u0646\u0627 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0636\u0645\u0627\u0646\u060C \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629\u060C \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A\u060C \u0648\u062A\u0643\u0627\u0645\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u064A\u0646."
      },
      {
        heading: "3. \u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646",
        body: "\u064A\u062C\u0628 \u062A\u0642\u062F\u064A\u0645 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u062F\u0642\u064A\u0642\u0629 \u0648\u0643\u0627\u0645\u0644\u0629 \u0639\u0646\u062F \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628. \u0623\u0646\u062A \u0645\u0633\u0624\u0648\u0644 \u0639\u0646 \u0627\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0633\u0631\u064A\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0633\u0627\u0628\u0643 \u0648\u0639\u0646 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u062A\u064A \u062A\u062A\u0645 \u062A\u062D\u062A \u062D\u0633\u0627\u0628\u0643."
      },
      {
        heading: "4. \u0645\u0633\u0624\u0648\u0644\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645",
        body: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 \u0645\u0633\u0624\u0648\u0644\u0648\u0646 \u0639\u0646 \u062F\u0642\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u062A\u064A \u064A\u0642\u062F\u0645\u0648\u0646\u0647\u0627. \u0636\u0645\u0627\u0646\u062A\u064A \u063A\u064A\u0631 \u0645\u0633\u0624\u0648\u0644\u0629 \u0639\u0646 \u0623\u064A \u062E\u0633\u0627\u0626\u0631 \u0646\u0627\u062A\u062C\u0629 \u0639\u0646 \u0628\u064A\u0627\u0646\u0627\u062A \u0636\u0645\u0627\u0646 \u063A\u064A\u0631 \u062F\u0642\u064A\u0642\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629."
      },
      {
        heading: "5. \u0627\u0644\u0645\u0644\u0643\u064A\u0629 \u0627\u0644\u0641\u0643\u0631\u064A\u0629",
        body: "\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u062D\u062A\u0648\u064A\u0627\u062A \u0648\u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0648\u0627\u0644\u0648\u0638\u0627\u0626\u0641 \u0641\u064A \u0645\u0646\u0635\u0629 \u0636\u0645\u0627\u0646\u062A\u064A \u0645\u0645\u0644\u0648\u0643\u0629 \u0644\u0636\u0645\u0627\u0646\u062A\u064A \u0648\u0645\u062D\u0645\u064A\u0629 \u0628\u0645\u0648\u062C\u0628 \u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0645\u0644\u0643\u064A\u0629 \u0627\u0644\u0641\u0643\u0631\u064A\u0629 \u0627\u0644\u062F\u0648\u0644\u064A\u0629."
      },
      {
        heading: "6. \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064A\u0629",
        body: "\u0644\u0627 \u062A\u062A\u062D\u0645\u0644 \u0636\u0645\u0627\u0646\u062A\u064A \u0623\u064A \u0645\u0633\u0624\u0648\u0644\u064A\u0629 \u0639\u0646 \u0623\u064A \u0623\u0636\u0631\u0627\u0631 \u063A\u064A\u0631 \u0645\u0628\u0627\u0634\u0631\u0629 \u0623\u0648 \u0639\u0631\u0636\u064A\u0629 \u0623\u0648 \u062E\u0627\u0635\u0629 \u0623\u0648 \u062A\u0628\u0639\u064A\u0629 \u0646\u0627\u062A\u062C\u0629 \u0639\u0646 \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0643 \u0644\u0644\u062E\u062F\u0645\u0629."
      },
      {
        heading: "7. \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u062D\u0627\u0643\u0645",
        body: "\u062A\u062E\u0636\u0639 \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637 \u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u0648\u064A\u062A\u0645 \u062A\u0641\u0633\u064A\u0631\u0647\u0627 \u0648\u0641\u0642\u064B\u0627 \u0644\u0647\u0627."
      },
      {
        heading: "8. \u0627\u0644\u062A\u0648\u0627\u0635\u0644",
        body: "\u0644\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631\u0627\u062A \u062D\u0648\u0644 \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0628\u0631 support@warrantee.sa"
      }
    ]
  }
};

export default function TermsPage() {
  const params = useParams();
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
