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
        { label: dictionary.nav.features, href: `/${locale}#features` },
        { label: locale === 'en' ? 'How It Works' : 'كيف يعمل', href: `/${locale}#how-it-works` },
        { label: dictionary.nav.pricing, href: `/${locale}#pricing` },
      ],
    },
    {
      title: dictionary.footer.company,
      links: [
        { label: locale === 'en' ? 'About' : 'عن الشركة', href: `/${locale}#about` },
        { label: dictionary.nav.contact, href: `/${locale}#contact` },
        { label: locale === 'en' ? 'Blog' : 'المدونة', href: `/${locale}#blog` },
      ],
    },
    {
      title: dictionary.footer.legal,
      links: [
        { label: locale === 'en' ? 'Privacy Policy' : 'سياسة الخصوصية', href: `/${locale}/privacy` },
        { label: locale === 'en' ? 'Terms of Service' : 'شروط الخدمة', href: `/${locale}/terms` },
        { label: locale === 'en' ? 'Cookie Policy' : 'سياسة ملفات تعريف الارتباط', href: `/${locale}/cookies` },
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
                ? 'Trust the Terms™. Track every warranty with confidence.'
                : 'ثق بالشروط™. تتبع كل ضمان بثقة.'}
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
                ? `© ${currentYear} Warrantee. All rights reserved.`
                : `© ${currentYear} Warrantee. جميع الحقوق محفوظة.`}
            </p>
            <p className="text-sm font-medium text-gold">Trust the Terms™</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
