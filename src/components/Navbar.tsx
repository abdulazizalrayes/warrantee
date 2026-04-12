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
    { href: '#how-it-works', label: dictionary.how_it_works.title },
    { href: '#pricing', label: dictionary.nav.pricing },
    { href: '#contact', label: dictionary.nav.contact },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-warm-white/80 backdrop-blur-md border-b border-navy/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 font-bold text-xl text-navy hover:opacity-80 transition-opacity"
          >
            <span>Warrantee</span>
            <span className="text-gold">.</span>
          </Link>

          <div className={`hidden md:flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-navy hover:text-gold transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className={`hidden md:flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LanguageToggle currentLocale={locale} variant="text" />
            <Link
              href={`/${locale}/login`}
              className="px-4 py-2 text-sm font-medium text-navy hover:text-gold transition-colors"
            >
              {dictionary.nav.login}
            </Link>
            <Link
              href={`/${locale}/signup`}
              className="px-4 py-2 rounded-lg text-sm font-medium text-warm-white bg-gold hover:bg-gold/90 transition-colors"
            >
              {dictionary.nav.signup}
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LanguageToggle currentLocale={locale} variant="icon" />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-navy hover:bg-navy/5 transition-colors"
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
                className="block px-4 py-2 text-sm font-medium text-navy hover:text-gold transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-navy/10 space-y-2">
              <Link
                href={`/${locale}/login`}
                className="block px-4 py-2 text-sm font-medium text-navy hover:text-gold transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {dictionary.nav.login}
              </Link>
              <Link
                href={`/${locale}/signup`}
                className="block px-4 py-2 rounded-lg text-sm font-medium text-warm-white bg-gold hover:bg-gold/90 transition-colors text-center"
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
