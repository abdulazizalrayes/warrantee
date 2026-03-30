'use client';

// @ts-nocheck
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SellerData {
  companyName: string;
  crNumber: string;
  industry: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  warrantyPolicy: string;
}

export default function SellerRegisterPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const isRTL = locale === 'ar';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [data, setData] = useState<SellerData>({
    companyName: '', crNumber: '', industry: '', website: '',
    contactName: '', contactEmail: '', contactPhone: '',
    address: '', city: '', warrantyPolicy: '',
  });

  const t = locale === 'ar' ? {
    title: '\u062a\u0633\u062c\u064a\u0644 \u0643\u0628\u0627\u0626\u0639',
    subtitle: '\u0627\u0646\u0636\u0645 \u0625\u0644\u0649 Warrantee \u0648\u0623\u0635\u062f\u0631 \u0636\u0645\u0627\u0646\u0627\u062a \u0631\u0642\u0645\u064a\u0629 \u0644\u0639\u0645\u0644\u0627\u0626\u0643',
    step1: '\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629',
    step2: '\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644',
    step3: '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u0636\u0645\u0627\u0646',
    companyName: '\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629',
    crNumber: '\u0631\u0642\u0645 \u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u062a\u062c\u0627\u0631\u064a',
    industry: '\u0627\u0644\u0642\u0637\u0627\u0639',
    website: '\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
    contactName: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u0624\u0648\u0644',
    contactEmail: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
    contactPhone: '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641',
    address: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646',
    city: '\u0627\u0644\u0645\u062f\u064a\u0646\u0629',
    warrantyPolicy: '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629',
    policyHint: '\u0635\u0641 \u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629 \u0644\u0645\u0646\u062a\u062c\u0627\u062a\u0643',
    industries: ['\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0627\u062b', '\u0623\u062c\u0647\u0632\u0629 \u0645\u0646\u0632\u0644\u064a\u0629', '\u0633\u064a\u0627\u0631\u0627\u062b', '\u0623\u062b\u0627\u062b', '\u0645\u062c\u0648\u0647\u0631\u0627\u062a', '\u0623\u062e\u0631\u0649'],
    next: '\u0627\u0644\u062a\u0627\u0644\u064a',
    back: '\u0627\u0644\u0633\u0627\u0628\u0642',
    submit: '\u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0637\u0644\u0628',
    successTitle: '\u062a\u0645 \u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0637\u0644\u0628!',
    successDesc: '\u0633\u0646\u0631\u0627\u062c\u0639 \u0637\u0644\u0628\u0643 \u0648\u0646\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0642\u0631\u064a\u0628\u064b\u0627.',
    home: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    optional: '\u0627\u062e\u062a\u064a\u0627\u0631\u064a',
  } : {
    title: 'Seller Registration',
    subtitle: 'Join Warrantee and issue digital warranties for your customers',
    step1: 'Company Info',
    step2: 'Contact Details',
    step3: 'Warranty Policy',
    companyName: 'Company Name',
    crNumber: 'Commercial Registration (CR) Number',
    industry: 'Industry',
    website: 'Website',
    contactName: 'Contact Person',
    contactEmail: 'Email Address',
    contactPhone: 'Phone Number',
    address: 'Address',
    city: 'City',
    warrantyPolicy: 'Default Warranty Policy',
    policyHint: 'Describe your default warranty terms for products',
    industries: ['Electronics', 'Home Appliances', 'Automotive', 'Furniture', 'Jewelry', 'Other'],
    next: 'Next',
    back: 'Back',
    submit: 'Submit Application',
    successTitle: 'Application Submitted!',
    successDesc: 'We will review your application and get in touch shortly.',
    home: 'Back to Home',
    optional: 'Optional',
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('seller_invitations').insert({
        company_name: data.companyName,
        cr_number: data.crNumber,
        industry: data.industry,
        website: data.website || null,
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone,
        address: data.address || null,
        city: data.city || null,
        warranty_policy: data.warrantyPolicy || null,
        user_id: user?.id || null,
        status: 'pending',
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof SellerData, value: string) => setData(prev => ({ ...prev, [key]: value }));

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition';

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t.successTitle}</h2>
        <p className="text-gray-600 mb-6">{t.successDesc}</p>
        <a href={`/${locale}`} className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition">{t.home}</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-600 mt-2">{t.subtitle}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[t.step1, t.step2, t.step3].map((_s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' : 'bg-gray-100 text-gray-400'}`}>{step > i + 1 ? '\u2713' : i + 1}</div>
              {i < 2 && <div className={`w-12 h-0.5 ${step > i + 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {step === 1 && <div className="space-y-5">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t.companyName}</label><input type="text" value={data.companyName} onChange={e => update('companyName', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t.crNumber}</label><input type="text" value={data.crNumber} onChange={e => update('crNumber', e.target.value)} className={inputClass} dir="ltr" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t.industry}</label><select value={data.industry} onChange={e => update('industry', e.target.value)} className={inputClass}><option value="">---</option>{t.industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t.website} <span className="text-gray-400 text-xs">({t.optional})</span></label><input type="url" value={data.website} onChange={e => update('website', e.target.value)} className={inputClass} dir="ltr" placeholder="https://" /></div>
            <button onClick={() => setStep(2)} disabled={!data.companyName || !data.crNumber || !data.industry} className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition">{t.next}</button>
          </div>}

          {step === 2 && <div className="space-y-5">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contactName}</label><input type="text" value={data.contactName} onChange={e => update('contactName', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contactEmail}</label><input type="email" value={data.contactEmail} onChange={e => update('contactEmail', e.target.value)} className={inputClass} dir="ltr" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contactPhone}</label><input type="tel" value={data.contactPhone} onChange={e => update('contactPhone', e.target.value)} className={inputClass} dir="ltr" placeholder="+966" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t.city} <span className="text-gray-400 text-xs">({t.optional})</span></label><input type="text" value={data.city} onChange={e => update('city', e.target.value)} className={inputClass} /></div>
            <div className="flex gap-3"><button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition">{t.back}</button><button onClick={() => setStep(3)} disabled={!data.contactName || !data.contactEmail || !data.contactPhone} className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition">{t.next}</button></div>
          </div>}

          {step === 3 && <div className="space-y-5">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t.warrantyPolicy}</label><textarea value={data.warrantyPolicy} onChange={e => update('warrantyPolicy', e.target.value)} className={inputClass + ' min-h-[120px]'} placeholder={t.policyHint} /></div>
            <div className="flex gap-3"><button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition">{t.back}</button><button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition">{loading ? '...' : t.submit}</button></div>
          </div>}
        </div>
      </div>
    </div>
  );
}
