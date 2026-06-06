'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { normalizeLocale } from '@/lib/i18n';

export default function ClaimsRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = normalizeLocale(pathname?.split('/').filter(Boolean)[0]);

  useEffect(() => {
    router.replace('/' + locale + '/dashboard/claims');
  }, [locale, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-4 border-[#4169E1] border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">
          {locale === 'ar' ? 'جاري فتح المطالبات...' : 'Opening claims...'}
        </p>
      </div>
    </div>
  );
}
