'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function ClaimsRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';

  useEffect(() => {
    router.replace('/' + locale + '/dashboard/claims');
  }, [locale, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#4169E1] border-t-transparent rounded-full" />
    </div>
  );
}
