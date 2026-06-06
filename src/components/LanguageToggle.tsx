'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { LOCALES, LOCALE_LABELS, LOCALE_PREFIX_PATTERN, type Locale } from '@/lib/i18n';

interface LanguageToggleProps {
  currentLocale: Locale;
  className?: string;
  variant?: 'text' | 'icon';
}

export function LanguageToggle({
  currentLocale,
  className = '',
  variant = 'text',
}: LanguageToggleProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getLocalizedHref = (nextLocale: Locale) => {
    const pathWithoutLocale = (pathname ?? '').replace(
      new RegExp(`^/(${LOCALE_PREFIX_PATTERN})(?=/|$)`),
      '',
    );
    return `/${nextLocale}${pathWithoutLocale || ''}`;
  };

  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(getLocalizedHref(event.target.value as Locale));
  };

  if (variant === 'icon') {
    return (
      <label className={`inline-flex items-center gap-1 text-[#1d1d1f] ${className}`}>
        <Globe className="w-5 h-5" />
        <span className="sr-only">Language</span>
        <select
          aria-label="Language"
          value={currentLocale}
          onChange={onChange}
          className="max-w-[4.5rem] bg-transparent text-xs font-semibold outline-none"
        >
          {LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {LOCALE_LABELS[locale].short}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[#f5f5f7] hover:text-[#0071e3] ${className}`}>
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        value={currentLocale}
        onChange={onChange}
        className="max-w-[10rem] bg-transparent outline-none"
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale].native}
          </option>
        ))}
      </select>
    </label>
  );
}
