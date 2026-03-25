'use client';

// @ts-nocheck
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function CookiePolicyPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const isRTL = locale === 'ar';

  const content = locale === 'ar' ? {
    title: '\u0633\u064a\u0627\u0633\u0629 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637',
    lastUpdated: '\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b: 24 \u0645\u0627\u0631\u0633 2026',
    sections: [
      { heading: '\u0645\u0627 \u0647\u064a \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637\u061f', body: '\u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637 \u0647\u064a \u0645\u0644\u0641\u0627\u062a \u0646\u0635\u064a\u0629 \u0635\u063a\u064a\u0631\u0629 \u064a\u062a\u0645 \u062a\u062e\u0632\u064a\u0646\u0647\u0627 \u0639\u0644\u0649 \u062c\u0647\u0627\u0632\u0643 \u0639\u0646\u062f \u0632\u064a\u0627\u0631\u0629 \u0645\u0648\u0642\u0639\u0646\u0627. \u0646\u0633\u062a\u062e\u062f\u0645\u0647\u0627 \u0644\u062a\u062d\u0633\u064a\u0646 \u062a\u062c\u0631\u0628\u062a\u0643 \u0648\u0641\u0647\u0645 \u0643\u064a\u0641\u064a\u0629 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0645\u0648\u0642\u0639\u0646\u0627.' },
      { heading: '\u0623\u0646\u0648\u0627\u0639 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637', body: '\u0636\u0631\u0648\u0631\u064a\u0629: \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u0648\u0642\u0639 \u0628\u0634\u0643\u0644 \u0635\u062d\u064a\u062d \u0645\u062b\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0648\u0627\u0644\u0623\u0645\u0627\u0646. \u062a\u062d\u0644\u064a\u0644\u064a\u0629: \u062a\u0633\u0627\u0639\u062f\u0646\u0627 \u0641\u064a \u0641\u0647\u0645 \u0643\u064a\u0641\u064a\u0629 \u062a\u0641\u0627\u0639\u0644 \u0627\u0644\u0632\u0648\u0627\u0631 \u0645\u0639 \u0645\u0648\u0642\u0639\u0646\u0627. \u062a\u0633\u0648\u064a\u0642\u064a\u0629: \u062a\u0633\u062a\u062e\u062f\u0645 \u0644\u062a\u0642\u062f\u064a\u0645 \u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0630\u0627\u062a \u0635\u0644\u0629.' },
      { heading: '\u0646\u0638\u0627\u0645 \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 (PDPL)', body: '\u0648\u0641\u0642\u064b\u0627 \u0644\u0646\u0638\u0627\u0645 \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0641\u064a \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629\u060c \u0646\u062d\u0635\u0644 \u0639\u0644\u0649 \u0645\u0648\u0627\u0641\u0642\u062a\u0643 \u0642\u0628\u0644 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637 \u063a\u064a\u0631 \u0627\u0644\u0636\u0631\u0648\u0631\u064a\u0629. \u064a\u0645\u0643\u0646\u0643 \u0625\u062f\u0627\u0631\u0629 \u062a\u0641\u0636\u064a\u0644\u0627\u062a\u0643 \u0641\u064a \u0623\u064a \u0648\u0642\u062a.' },
      { heading: '\u0627\u062a\u0635\u0644 \u0628\u0646\u0627', body: '\u0625\u0630\u0627 \u0643\u0627\u0646 \u0644\u062f\u064a\u0643 \u0623\u064a \u0623\u0633\u0626\u0644\u0629 \u062d\u0648\u0644 \u0633\u064a\u0627\u0633\u0629 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637\u060c \u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0628\u0631 hello@warrantee.io' },
    ],
    back: '\u0627\u0644\u0639\u0648\u062f\u0629',
  } : {
    title: 'Cookie Policy',
    lastUpdated: 'Last updated: March 24, 2026',
    sections: [
      { heading: 'What Are Cookies?', body: 'Cookies are small text files stored on your device when you visit our website. We use them to improve your experience and understand how our site is used.' },
      { heading: 'Types of Cookies We Use', body: 'Necessary: Required for the website to function properly, such as login and security. Analytics: Help us understand how visitors interact with our website. Marketing: Used to deliver relevant advertisements.' },
      { heading: 'Saudi PDPL Compliance', body: 'In compliance with Saudi Arabia\'s Personal Data Protection Law (PDPL), we obtain your consent before using non-essential cookies. You can manage your preferences at any time through our cookie consent banner.' },
      { heading: 'Contact Us', body: 'If you have any questions about our cookie policy, please contact us at hello@warrantee.io' },
    ],
    back: 'Back',
  };

  return (
    <div className="min-h-screen bg-white py-16 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto">
        <Link href={`/${locale}`} className="text-emerald-600 hover:underline text-sm mb-6 inline-block">{content.back}</Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{content.title}</h1>
        <p className="text-sm text-gray-500 mb-8">{content.lastUpdated}</p>
        {content.sections.map((section, i) => (
          <div key={i} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{section.heading}</h2>
            <p className="text-gray-600 leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
