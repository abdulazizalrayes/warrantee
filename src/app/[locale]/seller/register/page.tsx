'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, ShieldCheck } from 'lucide-react';
import { PageViewTracker } from '@/components/PageViewTracker';
import { trackSellerApplication } from '@/lib/ga4-events';
import { DIRECTION, getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { PublicBreadcrumbs } from '@/components/PublicBreadcrumbs';
import { useState } from 'react';

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
  const locale = (pathname?.startsWith('/ar') ? 'ar' : 'en') as Locale;
  const isRTL = locale === 'ar';
  const dictionary = getDictionary(locale);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SellerData>({
    companyName: '',
    crNumber: '',
    industry: '',
    website: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    warrantyPolicy: '',
  });

  const t = locale === 'ar' ? {
    title: '\u0623\u0635\u062f\u0631 \u0636\u0645\u0627\u0646\u0627\u062a \u0631\u0642\u0645\u064a\u0629 \u0628\u0637\u0631\u064a\u0642\u0629 \u0623\u0633\u0631\u0639',
    subtitle: '\u062a\u0642\u062f\u0645 \u0645\u0631\u0629 \u0648\u0627\u062d\u062f\u0629 \u0644\u062a\u0641\u0639\u064a\u0644 \u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a\u060c \u0639\u0631\u0648\u0636 \u0627\u0644\u062a\u0645\u062f\u064a\u062f\u060c \u0648\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0644\u0639\u0645\u0644\u0627\u0626\u0643.',
    eyebrow: '\u062a\u0623\u0647\u064a\u0644 \u0627\u0644\u0628\u0627\u0626\u0639',
    proofOne: '\u0645\u0631\u0627\u062c\u0639\u0629 \u064a\u062f\u0648\u064a\u0629 \u0645\u0646 \u0641\u0631\u064a\u0642 Warrantee',
    proofTwo: '\u0628\u062f\u0648\u0646 \u0631\u0633\u0648\u0645 \u0625\u0639\u062f\u0627\u062f \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0625\u0637\u0644\u0627\u0642',
    proofThree: '\u062a\u062c\u0627\u0631\u0628 \u0636\u0645\u0627\u0646 \u0639\u0631\u0628\u064a\u0629 \u0648\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629',
    launchTitle: '\u0645\u0633\u0627\u0631 \u0625\u0637\u0644\u0627\u0642 \u0633\u0631\u064a\u0639',
    launchSubtitle: '\u0627\u0644\u0647\u062f\u0641 \u0623\u0646 \u062a\u0635\u0644 \u0625\u0644\u0649 \u0623\u0648\u0644 \u0636\u0645\u0627\u0646 \u0645\u0648\u062b\u0642 \u0628\u0623\u0633\u0631\u0639 \u0648\u0642\u062a.',
    launchSteps: ['\u062a\u0642\u062f\u064a\u0645 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0628\u0627\u0626\u0639', '\u0625\u0635\u062f\u0627\u0631 \u0623\u0648\u0644 \u0636\u0645\u0627\u0646', '\u0645\u0634\u0627\u0631\u0643\u0629 QR \u0648\u0627\u0644\u0634\u0647\u0627\u062f\u0629', '\u0631\u0628\u0637 API \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629'],
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
    policyHint: '\u0635\u0641 \u0627\u0644\u0645\u062f\u0629\u060c \u0627\u0644\u0627\u0633\u062a\u062b\u0646\u0627\u0621\u0627\u062a\u060c \u0648\u062e\u0637\u0648\u0627\u062a \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u0639\u062a\u0627\u062f\u0629.',
    industries: ['\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0627\u062a', '\u0623\u062c\u0647\u0632\u0629 \u0645\u0646\u0632\u0644\u064a\u0629', '\u0633\u064a\u0627\u0631\u0627\u062a', '\u0623\u062b\u0627\u062b', '\u0645\u062c\u0648\u0647\u0631\u0627\u062a', '\u0623\u062e\u0631\u0649'],
    next: '\u0627\u0644\u062a\u0627\u0644\u064a',
    back: '\u0627\u0644\u0633\u0627\u0628\u0642',
    submit: '\u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0637\u0644\u0628',
    successTitle: '\u062a\u0645 \u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0637\u0644\u0628',
    successDesc: '\u0633\u0646\u0631\u0627\u062c\u0639 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0648\u0646\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0642\u0631\u064a\u0628\u0627.',
    home: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    optional: '\u0627\u062e\u062a\u064a\u0627\u0631\u064a',
  } : {
    title: 'Issue digital warranties faster',
    subtitle: 'Apply once to activate warranty issuing, extension offers, and claim visibility for your customers.',
    eyebrow: 'Seller onboarding',
    proofOne: 'Reviewed by the Warrantee team',
    proofTwo: 'No setup fee during launch pilot',
    proofThree: 'Arabic and English warranty flows',
    launchTitle: 'Fast launch path',
    launchSubtitle: 'The goal is to get you to your first verified warranty without a long setup cycle.',
    launchSteps: ['Submit seller details', 'Issue first warranty', 'Share QR and certificate', 'Connect API when ready'],
    step1: 'Company Info',
    step2: 'Contact Details',
    step3: 'Warranty Policy',
    companyName: 'Company Name',
    crNumber: 'Commercial Registration Number',
    industry: 'Industry',
    website: 'Website',
    contactName: 'Contact Person',
    contactEmail: 'Email Address',
    contactPhone: 'Phone Number',
    address: 'Address',
    city: 'City',
    warrantyPolicy: 'Default Warranty Policy',
    policyHint: 'Describe the duration, exclusions, and normal claim process.',
    industries: ['Electronics', 'Home Appliances', 'Automotive', 'Furniture', 'Jewelry', 'Other'],
    next: 'Next',
    back: 'Back',
    submit: 'Submit Application',
    successTitle: 'Application submitted',
    successDesc: 'We will review your details and get in touch shortly.',
    home: 'Back to Home',
    optional: 'Optional',
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const applicationResponse = await fetch('/api/seller/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!applicationResponse.ok) {
        throw new Error('Seller application submission failed');
      }

      const leadResponse = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.contactName,
          email: data.contactEmail,
          phone: data.contactPhone,
          company: data.companyName,
          subject: 'Seller registration',
          message: [
            `Company: ${data.companyName}`,
            `CR Number: ${data.crNumber}`,
            `Industry: ${data.industry}`,
            `Website: ${data.website || '-'}`,
            `City: ${data.city || '-'}`,
            `Address: ${data.address || '-'}`,
            '',
            `Warranty policy: ${data.warrantyPolicy || '-'}`,
          ].join('\n'),
          kind: 'seller_application',
        }),
      });
      if (!leadResponse.ok) {
        console.warn('Seller lead sync failed');
      }

      trackSellerApplication({
        locale,
        industry: data.industry,
        has_website: Boolean(data.website),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(locale === 'ar'
        ? '\u062a\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628 \u062d\u0627\u0644\u064a\u0627. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'
        : 'We could not submit your application right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof SellerData, value: string) => setData((prev) => ({ ...prev, [key]: value }));
  const inputClass = 'w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20';
  const direction = DIRECTION[locale];

  const pageShell = (children: React.ReactNode) => (
    <div dir={direction} className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <Navbar locale={locale} dictionary={dictionary} />
      <PublicBreadcrumbs locale={locale} includeJsonLd={false} />
      {children}
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );

  if (submitted) {
    return pageShell(
      <main className="mx-auto flex min-h-[62vh] max-w-3xl items-center justify-center px-6 py-20">
        <PageViewTracker pageName="seller_application_submitted" pageType="conversion" locale={locale} />
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0071e3]/10">
            <Check className="h-8 w-8 text-[#0071e3]" aria-hidden="true" />
          </div>
          <h1 className="text-[32px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[40px]">
            {t.successTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[17px] leading-7 text-[#6e6e73]">{t.successDesc}</p>
          <Link
            href={`/${locale}`}
            className="mt-8 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0077ed]"
          >
            {t.home}
          </Link>
        </div>
      </main>
    );
  }

  return pageShell(
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <PageViewTracker pageName="seller_registration" pageType="seller_onboarding" locale={locale} extra={{ step }} />
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className={isRTL ? 'text-right' : ''}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0071e3]">{t.eyebrow}</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[52px]">
            {t.title}
          </h1>
          <p className="mt-5 max-w-xl text-[19px] leading-8 text-[#6e6e73]">{t.subtitle}</p>
          <div className="mt-8 grid gap-3">
            {[t.proofOne, t.proofTwo, t.proofThree].map((proof) => (
              <div
                key={proof}
                className="flex items-start gap-3 rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm font-medium text-[#1d1d1f] shadow-sm"
              >
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-[#0071e3]" aria-hidden="true" />
                <span>{proof}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">{t.launchTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">{t.launchSubtitle}</p>
            <div className="mt-5 grid gap-3">
              {t.launchSteps.map((launchStep, index) => (
                <div key={launchStep} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0071e3]/10 text-xs font-semibold text-[#0071e3]">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium text-[#1d1d1f]">{launchStep}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-center justify-center gap-2">
            {[t.step1, t.step2, t.step3].map((_label, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    step > index + 1
                      ? 'bg-[#0071e3] text-white'
                      : step === index + 1
                        ? 'bg-[#0071e3]/10 text-[#0071e3] ring-2 ring-[#0071e3]'
                        : 'bg-[#f5f5f7] text-[#86868b]'
                  }`}
                >
                  {step > index + 1 ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </div>
                {index < 2 && <div className={`h-px w-10 ${step > index + 1 ? 'bg-[#0071e3]' : 'bg-[#d2d2d7]'}`} />}
              </div>
            ))}
          </div>

          {error ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {step === 1 && (
            <div className="space-y-5">
              <Field label={t.companyName}><input type="text" value={data.companyName} onChange={(event) => update('companyName', event.target.value)} className={inputClass} /></Field>
              <Field label={t.crNumber}><input type="text" value={data.crNumber} onChange={(event) => update('crNumber', event.target.value)} className={inputClass} dir="ltr" /></Field>
              <Field label={t.industry}>
                <select value={data.industry} onChange={(event) => update('industry', event.target.value)} className={inputClass}>
                  <option value="">---</option>
                  {t.industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
                </select>
              </Field>
              <Field label={`${t.website} (${t.optional})`} mutedSuffix>
                <input type="url" value={data.website} onChange={(event) => update('website', event.target.value)} className={inputClass} dir="ltr" placeholder="https://" />
              </Field>
              <button onClick={() => setStep(2)} disabled={!data.companyName || !data.crNumber || !data.industry} className="w-full rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50">{t.next}</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <Field label={t.contactName}><input type="text" value={data.contactName} onChange={(event) => update('contactName', event.target.value)} className={inputClass} /></Field>
              <Field label={t.contactEmail}><input type="email" value={data.contactEmail} onChange={(event) => update('contactEmail', event.target.value)} className={inputClass} dir="ltr" /></Field>
              <Field label={t.contactPhone}><input type="tel" value={data.contactPhone} onChange={(event) => update('contactPhone', event.target.value)} className={inputClass} dir="ltr" placeholder="+966" /></Field>
              <Field label={`${t.city} (${t.optional})`} mutedSuffix><input type="text" value={data.city} onChange={(event) => update('city', event.target.value)} className={inputClass} /></Field>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 rounded-full border border-[#d2d2d7] px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]">{t.back}</button>
                <button onClick={() => setStep(3)} disabled={!data.contactName || !data.contactEmail || !data.contactPhone} className="flex-1 rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50">{t.next}</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <Field label={t.warrantyPolicy}>
                <textarea value={data.warrantyPolicy} onChange={(event) => update('warrantyPolicy', event.target.value)} className={`${inputClass} min-h-[132px]`} placeholder={t.policyHint} />
              </Field>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 rounded-full border border-[#d2d2d7] px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]">{t.back}</button>
                <button onClick={handleSubmit} disabled={loading} className="flex-1 rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50">{loading ? '...' : t.submit}</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
  mutedSuffix?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#1d1d1f]">{label}</span>
      {children}
    </label>
  );
}
