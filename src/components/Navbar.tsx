'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Dictionary, Locale, DIRECTION } from '@/lib/i18n';
import { LanguageToggle } from './LanguageToggle';

interface NavbarProps {
  locale: Locale;
  dictionary: Dictionary;
}

export function Navbar({ locale, dictionary }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isRTL = DIRECTION[locale] === 'rtl';

  const navLinks = [
    { href: `/${locale}#features`, label: dictionary.nav.features },
    { href: `/${locale}#how-it-works`, label: dictionary.how_it_works.title },
    { href: `/${locale}/pricing`, label: dictionary.nav.pricing },
    { href: `/${locale}/contact`, label: dictionary.nav.contact },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-black/[0.04] bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href={`/${locale}`}
            dir="ltr"
            className="flex items-center gap-2 text-xl font-bold text-[#1d1d1f] transition-opacity hover:opacity-80"
          >
            <span>Warrantee</span>
            <span className="text-[#0071e3]">.</span>
          </Link>

          <div className={`hidden md:flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-[#1d1d1f] transition-colors hover:text-[#0071e3]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className={`hidden md:flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LanguageToggle currentLocale={locale} variant="text" />
            <Link
              href={`/${locale}/login`}
              className="px-4 py-2 text-sm font-medium text-[#1d1d1f] transition-colors hover:text-[#0071e3]"
            >
              {dictionary.nav.login}
            </Link>
            <Link
              href={`/${locale}/auth?tab=signup`}
              className="rounded-full bg-[#0071e3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077ED]"
            >
              {dictionary.nav.signup}
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LanguageToggle currentLocale={locale} variant="icon" />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className={`md:hidden pb-4 space-y-2 ${isRTL ? 'text-right' : ''}`}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-2 text-sm font-medium text-[#1d1d1f] transition-colors hover:text-[#0071e3]"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="space-y-2 border-t border-black/[0.06] pt-2">
              <Link
                href={`/${locale}/login`}
                className="block px-4 py-2 text-sm font-medium text-[#1d1d1f] transition-colors hover:text-[#0071e3]"
                onClick={() => setIsOpen(false)}
              >
                {dictionary.nav.login}
              </Link>
              <Link
                href={`/${locale}/auth?tab=signup`}
                className="block rounded-full bg-[#0071e3] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[#0077ED]"
                onClick={() => setIsOpen(false)}
              >
                {dictionary.nav.signup}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
