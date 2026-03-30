'use client';

// @ts-nocheck
import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ExtensionPlan {
  id: string;
  months: number;
  price: number;
  currency: string;
  popular?: boolean;
}

export default function WarrantyExtendPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const isRTL = locale === 'ar';
  const warrantyId = searchParams?.get('id') || '';
  const [warranty, setWarranty] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const plans: ExtensionPlan[] = [
    { id: '6m', months: 6, price: 49, currency: 'SAR' },
    { id: '12m', months: 12, price: 89, currency: 'SAR', popular: true },
    { id: '24m', months: 24, price: 159, currency: 'SAR' },
  ];

  const t = {
    en: {
      title: 'Extend Your Warranty',
      subtitle: 'Keep your product protected with an extended warranty plan.',
      product: 'Product',
      currentExpiry: 'Current Expiry',
      newExpiry: 'New Expiry',
      months: 'months',
      popular: 'Most Popular',
      perMonth: '/month',
      total: 'Total',
      selectPlan: 'Select a plan',
      proceed: 'Proceed to Payment',
      processing: 'Processing...',
      success: 'Warranty extended successfully!',
      successDesc: 'Your warranty has been extended. You will receive a confirmation email shortly.',
      backToDashboard: 'Back to Dashboard',
      notFound: 'Warranty not found',
    },
    ar: {
      title: '\u062A\u0645\u062F\u064A\u062F \u0627\u0644\u0636\u0645\u0627\u0646',
      subtitle: '\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u062D\u0645\u0627\u064A\u0629 \u0645\u0646\u062A\u062C\u0643 \u0645\u0639 \u062E\u0637\u0629 \u0636\u0645\u0627\u0646 \u0645\u0645\u062A\u062F\u0629.',
      product: '\u0627\u0644\u0645\u0646\u062A\u062C',
      currentExpiry: '\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u062D\u0627\u0644\u064A',
      newExpiry: '\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u062C\u062f\u064A\u062d',
      months: '\u0634\u0647\u0631',
      popular: '\u0627\u0644\u0623\u0643\u062B\u0631 \u0634\u0639\u0628\u064A\u0629',
      perMonth: '/\u0634\u0647\u0631',
      total: '\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A',
      selectPlan: '\u0627\u062E\u062A\u0631 \u062E\u0637\u0629',
      proceed: '\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062F\u0641\u0639',
      processing: '\u062C\u0627\u0631\u064A \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629...',
      success: '\u062A\u0645 \u062A\u0645\u062F\u064A\u062D \u0627\u0644\u0636\u0645\u0627\u0646 \u0628\u0646\u062C\u0627\u062D!',
      successDesc: '\u062A\u0645 \u062A\u0645\u062F\u064A\u062D \u0636\u0645\u0627\u0646\u0643. \u0633\u062A\u062A\u0644\u0642\u0649 \u0628\u0631\u064A\u062F\u064B\u0627 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u064B\u0627 \u0644\u0644\u062A\u0623\u0643\u064A\u062f \u0642\u0631\u064A\u0628\u064B\u0627.',
      backToDashboard: '\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645',
      notFound: '\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646',
    },
  };
  const text = t[locale as keyof typeof t] || t.en;

  useEffect(() => {
    if (warrantyId) loadWarranty();
    else setLoading(false);
  }, [warrantyId]);

  const loadWarranty = async () => {
    const { data } = await supabase.from('warranties').select('*').eq('id', warrantyId).single();
    setWarranty(data);
    setLoading(false);
  };

  const getNewExpiry = (plan: ExtensionPlan) => {
    if (!warranty?.expiry_date) return '';
    const d = new Date(warranty.expiry_date);
    d.setMonth(d.getMonth() + plan.months);
    return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleExtend = async () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan || !warranty) return;
    setProcessing(true);
    try {
      const newExpiry = new Date(warranty.expiry_date);
      newExpiry.setMonth(newExpiry.getMonth() + plan.months);

      await supabase.from('warranty_extensions').insert({
        warranty_id: warranty.id,
        months: plan.months,
        price: plan.price,
        currency: plan.currency,
        new_expiry_date: newExpiry.toISOString(),
        status: 'completed',
      });

      await supabase.from('warranties').update({
        expiry_date: newExpiry.toISOString(),
      }).eq('id', warranty.id);

      setSuccess(true);
    } catch (err) {
      console.error('Extension error:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{text.success}</h2>
        <p className="text-gray-600 mb-6">{text.successDesc}</p>
        <a href={`/${locale}/dashboard`} className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition">{text.backToDashboard}</a>
      </div>
    </div>
  );

  if (!warranty) return (
    <div className="min-h-screen flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <p className="text-gray-600">{text.notFound}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{text.title}</h1>
          <p className="text-gray-600 mt-2">{text.subtitle}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{text.product}</span>
            <span className="font-medium text-gray-900">{warranty.product_name}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-500">{text.currentExpiry}</span>
            <span className="font-medium text-gray-900">{new Date(warranty.expiry_date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}</span>
          </div>
        </div>

        <div className="grid gap-4 mb-8">
          {plans.map(plan => (
            <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
              className={`relative p-5 border-2 rounded-xl text-left transition ${
                selectedPlan === plan.id ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">{text.popular}</span>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{plan.months} {text.months}</p>
                  <p className="text-sm text-gray-500">{text.newExpiry}: {getNewExpiry(plan)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{plan.price} <span className="text-sm font-normal text-gray-500">{plan.currency}</span></p>
                  <p className="text-xs text-gray-400">{(plan.price / plan.months).toFixed(0)} {plan.currency}{text.perMonth}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button onClick={handleExtend} disabled={!selectedPlan || processing}
          className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-lg">
          {processing ? text.processing : text.proceed}
        </button>
      </div>
    </div>
  );
}
