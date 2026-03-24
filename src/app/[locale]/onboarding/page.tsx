'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type UserRole = 'buyer' | 'seller' | 'both';

interface OnboardingData {
  fullName: string;
  phone: string;
  role: UserRole;
  companyName: string;
  companyCR: string;
}

export default function OnboardingPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const router = useRouter();
  const isRTL = locale === 'ar';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    fullName: '', phone: '', role: 'buyer', companyName: '', companyCR: '',
  });

  const t = {
    en: {
      welcome: 'Welcome to Warrantee!',
      subtitle: "Let's set up your account in a few quick steps.",
      step1: 'Personal Info',
      step2: 'Your Role',
      step3: 'Company Details',
      fullName: 'Full Name',
      phone: 'Phone Number',
      buyer: 'Buyer',
      buyerDesc: 'I purchase products and want to manage my warranties.',
      seller: 'Seller',
      sellerDesc: 'I sell products and want to issue digital warranties.',
      both: 'Both',
      bothDesc: 'I buy and sell products.',
      companyName: 'Company Name',
      companyCR: 'Commercial Registration (CR) Number',
      optional: 'Optional',
      next: 'Next',
      back: 'Back',
      finish: 'Get Started',
      skipCompany: 'Skip for now',
    },
    ar: {
      welcome: '\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643 \u0641\u064A Warrantee!',
      subtitle: '\u062F\u0639\u0646\u0627 \u0646\u0639\u062F \u062D\u0633\u0627\u0628\u0643 \u0641\u064A \u062E\u0637\u0648\u0627\u062A \u0633\u0631\u064A\u0639\u0629.',
      step1: '\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0634\u062E\u0635\u064A\u0629',
      step2: '\u062F\u0648\u0631\u0643',
      step3: '\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0634\u0631\u0643\u0629',
      fullName: '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644',
      phone: '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641',
      buyer: '\u0645\u0634\u062A\u0631\u064A',
      buyerDesc: '\u0623\u0634\u062A\u0631\u064A \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0623\u0631\u064A\u062F \u0625\u062F\u0627\u0631\u0629 \u0636\u0645\u0627\u0646\u0627\u062A\u064A.',
      seller: '\u0628\u0627\u0626\u0639',
      sellerDesc: '\u0623\u0628\u064A\u0639 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0623\u0631\u064A\u062F \u0625\u0635\u062F\u0627\u0631 \u0636\u0645\u0627\u0646\u0627\u062A \u0631\u0642\u0645\u064A\u0629.',
      both: '\u0643\u0644\u0627\u0647\u0645\u0627',
      bothDesc: '\u0623\u0634\u062A\u0631\u064A \u0648\u0623\u0628\u064A\u0639 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A.',
      companyName: '\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629',
      companyCR: '\u0631\u0642\u0645 \u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u062A\u062C\u0627\u0631\u064A',
      optional: '\u0627\u062E\u062A\u064A\u0627\u0631\u064A',
      next: '\u0627\u0644\u062A\u0627\u0644\u064A',
      back: '\u0627\u0644\u0633\u0627\u0628\u0642',
      finish: '\u0627\u0628\u062F\u0623 \u0627\u0644\u0622\u0646',
      skipCompany: '\u062A\u062E\u0637\u064A \u0627\u0644\u0622\u0646',
    },
  };

  const text = t[locale as keyof typeof t] || t.en;

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: data.fullName,
        phone: data.phone,
        role: data.role,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      if ((data.role === 'seller' || data.role === 'both') && data.companyName) {
        const { data: company } = await supabase.from('companies').insert({
          name: data.companyName,
          cr_number: data.companyCR || null,
          owner_id: user.id,
        }).select().single();

        if (company) {
          await supabase.from('company_members').insert({
            company_id: company.id,
            user_id: user.id,
            role: 'owner',
          });
        }
      }

      router.push(`/${locale}/dashboard`);
    } catch (err) {
      console.error('Onboarding error:', err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [text.step1, text.step2, text.step3];
  const totalSteps = data.role === 'buyer' ? 2 : 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{text.welcome}</h1>
          <p className="text-gray-600 mt-2">{text.subtitle}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.slice(0, totalSteps).map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' : 'bg-gray-100 text-gray-400'
              }`}>{step > i + 1 ? '\u2713' : i + 1}</div>
              {i < totalSteps - 1 && <div className={`w-12 h-0.5 ${step > i + 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{text.fullName}</label>
                <input type="text" value={data.fullName} onChange={e => setData(p => ({ ...p, fullName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{text.phone}</label>
                <input type="tel" value={data.phone} onChange={e => setData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="+966" dir="ltr" />
              </div>
              <button onClick={() => setStep(2)} disabled={!data.fullName}
                className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                {text.next}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {(['buyer', 'seller', 'both'] as UserRole[]).map(role => (
                <button key={role} onClick={() => setData(p => ({ ...p, role }))}
                  className={`w-full p-4 border-2 rounded-xl text-left transition ${
                    data.role === role ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <p className={`font-medium ${data.role === role ? 'text-emerald-700' : 'text-gray-900'}`}>
                    {text[role as keyof typeof text]}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{text[(role + 'Desc') as keyof typeof text]}</p>
                </button>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition">
                  {text.back}
                </button>
                <button onClick={() => data.role === 'buyer' ? handleFinish() : setStep(3)}
                  className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition">
                  {data.role === 'buyer' ? text.finish : text.next}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{text.companyName}</label>
                <input type="text" value={data.companyName} onChange={e => setData(p => ({ ...p, companyName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {text.companyCR} <span className="text-gray-400 text-xs">({text.optional})</span>
                </label>
                <input type="text" value={data.companyCR} onChange={e => setData(p => ({ ...p, companyCR: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" dir="ltr" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition">
                  {text.back}
                </button>
                <button onClick={handleFinish} disabled={loading || !data.companyName}
                  className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition">
                  {loading ? '...' : text.finish}
                </button>
              </div>
              <button onClick={handleFinish} className="w-full text-sm text-gray-500 hover:text-gray-700 transition">
                {text.skipCompany}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}