'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  currentLocale: 'en' | 'ar';
  className?: string;
  variant?: 'text' | 'icon';
}

export function LanguageToggle({
  currentLocale,
  className = '',
  variant = 'text',
}: LanguageToggleProps) {
  const pathname = usePathname();

  const getToggleHref = () => {
    const newLocale = currentLocale === 'en' ? 'ar' : 'en';
    const pathWithoutLocale = (pathname ?? '').replace(`/${currentLocale}`, '');
    return `/${newLocale}${pathWithoutLocale || ''}`;
  };

  if (variant === 'icon') {
    return (
      <Link
        href={getToggleHref()}
        className={`inline-flex items-center justify-center transition-colors hover:text-gold ${className}`}
        aria-label="Toggle language"
        title={currentLocale === 'en' ? 'العربية' : 'English'}
      >
        <Globe className="w-5 h-5" />
      </Link>
    );
  }

  return (
    <Link
      href={getToggleHref()}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-navy hover:text-warm-white ${className}`}
    >
      {currentLocale === 'en' ? 'العربية' : 'English'}
    </Link>
  );
}
