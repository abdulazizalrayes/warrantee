'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function WarrantyExtendRedirectPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const warrantyId = searchParams?.get('id') || '';

  useEffect(() => {
    const target = warrantyId
      ? `/${locale}/warranties/${warrantyId}/extend`
      : `/${locale}/warranties`;

    router.replace(target);
  }, [locale, router, warrantyId]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 text-center">
      <div>
        <p className="text-base font-medium text-[#1A1A2E]">
          {locale === 'ar' ? 'جارٍ تحويلك إلى صفحة التمديد الصحيحة...' : 'Redirecting you to the correct extension page...'}
        </p>
      </div>
    </div>
  );
}
