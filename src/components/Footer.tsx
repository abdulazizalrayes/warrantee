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
        { label: 'How It Works', href: '#how-it-works' },
        { label: dictionary.nav.pricing, href: '#pricing' },
      ],
    },
    {
      title: dictionary.footer.company,
      links: [
        { label: 'About', href: '#about' },
        { label: dictionary.nav.contact, href: '#contact' },
        { label: 'Blog', href: '#blog' },
      ],
    },
    {
      title: dictionary.footer.legal,
      links: [
        { label: 'Privacy Policy', href: '#privacy' },
        { label: 'Terms of Service', href: '#terms' },
        { label: 'Cookie Policy', href: '#cookies' },
      ],
    },
  ];

  return (
    <footer className="bg-navy text-warm-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          className={`grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 ${
            isRTL ? 'md:grid-flow-col-dense' : ''
          }`}
        >
          <div className={isRTL ? 'md:col-start-4' : ''}>
            <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-4">
              <span className="font-bold text-lg">Warrantee</span>
              <span className="text-gold">.</span>
            </Link>
            <p className="text-sm text-warm-white/60 mb-4">
              {locale === 'en'
                ? 'Trust the Terms\u2122. Track every warranty with confidence.'
                : '\u062B\u0642 \u0628\u0627\u0644\u0634\u0631\u0648\u0637\u2122. \u062A\u062A\u0628\u0639 \u0643\u0644 \u0636\u0645\u0627\u0646 \u0628\u062B\u0642\u0629.'}
            </p>
            <div className="flex gap-3 items-center">
              <LanguageToggle
                currentLocale={locale}
                variant="icon"
                className="text-warm-white hover:text-gold"
              />
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title} className={isRTL ? 'text-right' : ''}>
              <h3 className="font-semibold text-warm-white mb-4 text-sm uppercase tracking-wide">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-warm-white/60 hover:text-gold transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-warm-white/10 pt-8">
          <div
            className={`flex flex-col md:flex-row justify-between items-center gap-4 ${
              isRTL ? 'md:flex-row-reverse' : ''
            }`}
          >
            <p className="text-sm text-warm-white/60">
              {locale === 'en'
                ? `\u00A9 ${currentYear} Warrantee. All rights reserved.`
                : `\u00A9 ${currentYear} Warrantee. \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629.`}
            </p>
            <p className="text-sm font-medium text-gold">Trust the Terms\u2122</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
