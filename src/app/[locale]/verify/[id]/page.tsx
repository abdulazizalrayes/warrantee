'use client';

import { useState, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function VerifyWarrantyPage() {
  const pathname = usePathname();
  const params = useParams();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const isRTL = locale === 'ar';
  const warrantyId = params?.id as string;
  const [warranty, setWarranty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (warrantyId) verify();
  }, [warrantyId]);

  const verify = async () => {
    const { data } = await supabase.from('warranties').select('*, companies(name)').eq('id', warrantyId).single();
    if (data) {
      setWarranty(data);
      const now = new Date();
      const expiry = new Date(data.expiry_date);
      setValid(expiry > now && data.status === 'active');
    }
    setLoading(false);
  };

  const getDaysRemaining = () => {
    if (!warranty?.expiry_date) return 0;
    const diff = new Date(warranty.expiry_date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const t = locale === 'ar' ? {
    title: '\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0636\u0645\u0627\u0646',
    valid: '\u0636\u0645\u0627\u0646 \u0633\u0627\u0631\u064a',
    expired: '\u0636\u0645\u0627\u0646 \u0645\u0646\u062a\u0647\u064a',
    notFound: '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646',
    product: '\u0627\u0644\u0645\u0646\u062a\u062c',
    purchaseDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0634\u0631\u0627\u0621',
    expiryDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621',
    status: '\u0627\u0644\u062d\u0627\u0644\u0629',
    active: '\u0646\u0634\u0637',
    expiredStatus: '\u0645\u0646\u062a\u0647\u064a',
    daysLeft: '\u064a\u0648\u0645 \u0645\u062a\u0628\u0642\u064a',
    verified: '\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0628\u0648\u0627\u0633\u0637\u0629 Warrantee',
    issuedBy: '\u0635\u0627\u062f\u0631 \u0639\u0646',
  } : {
    title: 'Warranty Verification',
    valid: 'Valid Warranty',
    expired: 'Expired Warranty',
    notFound: 'Warranty Not Found',
    product: 'Product',
    purchaseDate: 'Purchase Date',
    expiryDate: 'Expiry Date',
    status: 'Status',
    active: 'Active',
    expiredStatus: 'Expired',
    daysLeft: 'days remaining',
    verified: 'Verified by Warrantee',
    issuedBy: 'Issued by',
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;

  if (!warranty) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t.notFound}</h2>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        <div className={`rounded-2xl overflow-hidden shadow-xl border ${valid ? 'border-emerald-200' : 'border-red-200'}`}>
          <div className={`p-6 text-center ${valid ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-orange-600'}`}>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              {valid ? <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            </div>
            <h1 className="text-xl font-bold text-white">{valid ? t.valid : t.expired}</h1>
            {valid && <p className="text-emerald-100 text-sm mt-1">{getDaysRemaining()} {t.daysLeft}</p>}
          </div>
          <div className="bg-white p-6 space-y-4">
            <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">{t.product}</span><span className="text-sm font-medium text-gray-900">{warranty.product_name}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">{t.purchaseDate}</span><span className="text-sm font-medium text-gray-900">{fmtDate(warranty.purchase_date)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">{t.expiryDate}</span><span className="text-sm font-medium text-gray-900">{fmtDate(warranty.expiry_date)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-sm text-gray-500">{t.status}</span><span className={`text-sm font-medium px-2 py-0.5 rounded-full ${valid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{valid ? t.active : t.expiredStatus}</span></div>
            {warranty.companies?.name && <div className="flex justify-between py-2"><span className="text-sm text-gray-500">{t.issuedBy}</span><span className="text-sm font-medium text-gray-900">{warranty.companies.name}</span></div>}
          </div>
          <div className="bg-gray-50 p-4 text-center border-t border-gray-100"><p className="text-xs text-gray-400">{t.verified}</p></div>
        </div>
      </div>
    </div>
  );
}
