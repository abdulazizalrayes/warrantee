'use client';

import Link from 'next/link';
import { Dictionary, Locale, DIRECTION } from '@/lib/i18n';
import { LanguageToggle } from './LanguageToggle';

interface FooterProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function Footer({ locale, dictionary }: FooterProps) {
  const isRTL = DIRECTION[locale] === 'rtl';
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: dictionary.footer.product,
      links: [
        { label: dictionary.nav.features, href: '#features' },
        { label: locale === 'en' ? 'How It Works' : '\u0643\u064a\u0641 \u064a\u0639\u0645\u0644', href: '#how-it-works' },
        { label: dictionary.nav.pricing, href: '#pricing' },
      ],
    },
    {
      title: dictionary.footer.company,
      links: [
        { label: locale === 'en' ? 'About' : '\u0639\u0646\u0627', href: '#about' },
        { label: dictionary.nav.contact, href: '#contact' },
      ],
    },
    {
      title: dictionary.footer.legal,
      links: [
        { label: locale === 'en' ? 'Privacy Policy' : '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629', href: `/${locale}/privacy` },
        { label: locale === 'en' ? 'Terms of Service' : '\u0634\u0631\u0648\u0637 \u0627\u0644\u062e\u062f\u0645\u0629', href: `/${locale}/terms` },
        { label: locale === 'en' ? 'Cookie Policy' : '\u0633\u064a\u0627\u0633\u0629 \u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637', href: `/${locale}/cookies` },
      ],
    },
  ];

  return (
    <footer className="bg-[#f5f5f7] border-t border-[#d2d2d7]/40">
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-16">
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 ${isRTL ? 'md:grid-flow-col-dense' : ''}`}>
          <div className={isRTL ? 'md:col-start-4' : ''}>
            <Link href={`/${locale}`} className="inline-flex items-center gap-1.5 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="font-semibold text-[15px] text-[#1d1d1f]">Warrantee</span>
            </Link>
            <p className="text-xs text-[#86868b] leading-relaxed mb-4">
              {locale === 'en'
                ? 'Trust the Terms\u2122. Track every warranty with confidence.'
                : '\u062b\u0642 \u0628\u0627\u0644\u0634\u0631\u0648\u0637\u2122. \u062a\u062a\u0628\u0639 \u0643\u0644 \u0636\u0645\u0627\u0646 \u0628\u062b\u0642\u0629.'}
            </p>
            <LanguageToggle
              currentLocale={locale}
              variant="icon"
              className="text-[#86868b] hover:text-[#0071e3]"
            />
          </div>

          {footerSections.map((section) => (
            <div key={section.title} className={isRTL ? 'text-right' : ''}>
              <h3 className="font-semibold text-xs text-[#1d1d1f] mb-4 uppercase tracking-wide">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-[#86868b] hover:text-[#0071e3] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#d2d2d7]/40 pt-6">
          <div className={`flex flex-col md:flex-row justify-between items-center gap-3 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <p className="text-xs text-[#86868b]">
              {locale === 'en'
                ? `\u00A9 ${currentYear} Warrantee. All rights reserved.`
                : `\u00A9 ${currentYear} Warrantee. \u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629.`}
            </p>
            <p className="text-xs text-[#86868b]">
              Trust the Terms\u2122
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}