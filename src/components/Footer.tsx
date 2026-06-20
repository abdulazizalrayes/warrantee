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
  const isArabic = locale === 'ar';
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: dictionary.footer.product,
      links: [
        { label: dictionary.nav.features, href: `/${locale}#features` },
        { label: dictionary.how_it_works.title, href: `/${locale}#how-it-works` },
        { label: dictionary.nav.pricing, href: `/${locale}#pricing` },
        { label: isArabic ? 'الأمان والثقة' : 'Security & Trust', href: `/${locale}/security` },
        { label: isArabic ? 'المدونة والأدلة' : 'Blog & Guides', href: `/${locale}/blog` },
        { label: isArabic ? 'برنامج إدارة الضمانات' : 'Warranty Management Software', href: `/${locale}/resources/warranty-management-software` },
        { label: isArabic ? 'Warrantee مقابل الجداول' : 'Warrantee vs Spreadsheets', href: `/${locale}/compare/spreadsheets` },
        { label: isArabic ? 'API / CLI / MCP' : 'API / CLI / MCP', href: `/${locale}/api-docs` },
      ],
    },
    {
      title: dictionary.footer.company,
      links: [
        { label: isArabic ? 'عن وارنتي' : 'About', href: `/${locale}/about` },
        { label: dictionary.nav.contact, href: `/${locale}#contact` },
      ],
    },
    {
      title: dictionary.footer.legal,
      links: [
        { label: isArabic ? 'سياسة الخصوصية' : 'Privacy Policy', href: `/${locale}/privacy` },
        { label: isArabic ? 'شروط الخدمة' : 'Terms of Service', href: `/${locale}/terms` },
        { label: isArabic ? 'سياسة ملفات تعريف الارتباط' : 'Cookie Policy', href: `/${locale}/cookies` },
      ],
    },
  ];

  return (
    <footer
      className="border-t border-black/[0.06] bg-[#fbfbfd] text-[#1d1d1f]"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          className={`grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 ${
            isRTL ? 'md:grid-flow-col-dense' : ''
          }`}
        >
          <div className={isRTL ? 'md:col-start-4' : ''}>
            <Link href={`/${locale}`} dir="ltr" className="inline-flex items-center gap-2 mb-4">
              <span className="font-bold text-lg">Warrantee</span>
              <span className="text-[#0071e3]">.</span>
            </Link>
            <p className="text-sm text-[#6e6e73] mb-4">
              {isArabic
                ? 'ثق بالشروط™. تتبع كل ضمان بثقة.'
                : 'Trust the Terms™. Track every warranty with confidence.'}
            </p>
            <div className="flex gap-3 items-center">
              <LanguageToggle
                currentLocale={locale}
                variant="icon"
                className="text-[#1d1d1f] hover:text-[#0071e3]"
              />
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title} className={isRTL ? 'text-right' : ''}>
              <h3 className="font-semibold text-[#1d1d1f] mb-4 text-sm uppercase tracking-wide">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#6e6e73] transition-colors hover:text-[#0071e3]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-black/[0.06] pt-8">
          <div
            className={`flex flex-col md:flex-row justify-between items-center gap-4 ${
              isRTL ? 'md:flex-row-reverse' : ''
            }`}
          >
            <p className="text-sm text-[#6e6e73]">
              {isArabic
                ? `© ${currentYear} Warrantee. جميع الحقوق محفوظة.`
                : `© ${currentYear} Warrantee. All rights reserved.`}
            </p>
            <p className="text-sm font-medium text-[#0071e3]">Trust the Terms™</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
