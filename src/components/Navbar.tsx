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
    { href: '#features', label: dictionary.nav.features },
    { href: '#how-it-works', label: locale === 'en' ? 'How It Works' : '\u0643\u064a\u0641 \u064a\u0639\u0645\u0644' },
    { href: '#pricing', label: dictionary.nav.pricing },
    { href: '#contact', label: dictionary.nav.contact },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]/40">
      <div className="max-w-[980px] mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-12">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-1.5 font-semibold text-[17px] text-[#1d1d1f] hover:opacity-70 transition-opacity"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Warrantee</span>
          </Link>

          <div className={`hidden md:flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-normal text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className={`hidden md:flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LanguageToggle currentLocale={locale} variant="text" />
            <Link
              href={`/${locale}/auth`}
              className="text-xs font-normal text-[#0071e3] hover:underline transition-colors"
            >
              {dictionary.nav.login}
            </Link>
            <Link
              href={`/${locale}/auth`}
              className="px-3.5 py-1.5 rounded-full text-xs font-normal text-white bg-[#0071e3] hover:bg-[#0077ED] transition-colors"
            >
              {dictionary.nav.signup}
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LanguageToggle currentLocale={locale} variant="icon" />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-lg text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className={`md:hidden pb-4 space-y-1 ${isRTL ? 'text-right' : ''}`}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-sm text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#d2d2d7]/40 space-y-1">
              <Link
                href={`/${locale}/auth`}
                className="block px-3 py-2 text-sm text-[#0071e3] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {dictionary.nav.login}
              </Link>
              <Link
                href={`/${locale}/auth`}
                className="block mx-3 py-2 rounded-full text-sm text-white bg-[#0071e3] hover:bg-[#0077ED] transition-colors text-center"
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