// @ts-nocheck
import { getDictionary, Locale, DIRECTION } from '@/lib/i18n';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Shield, Bell, FileCheck, BarChart3, Mail, Link2,
  Clock, CheckCircle, ArrowRight, Globe, ChevronRight,
} from 'lucide-react';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === 'rtl';

  const featureIcons: Record<string, React.ReactNode> = {
    approval_workflow: <FileCheck className="w-7 h-7" />,
    expiry_reminders: <Bell className="w-7 h-7" />,
    bilingual_certs: <Globe className="w-7 h-7" />,
    dashboard: <BarChart3 className="w-7 h-7" />,
    email_to_warranty: <Mail className="w-7 h-7" />,
    chain_tracking: <Link2 className="w-7 h-7" />,
  };

  return (
    <html lang={locale === 'ar' ? 'ar-SA' : 'en-US'} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="bg-white text-[#1d1d1f] font-sans">
        <Navbar locale={locale} dictionary={dictionary} />

        {/* Hero Section - Apple style: centered, clean, massive typography */}
        <section className="relative overflow-hidden pt-24 pb-20 px-4 sm:px-6">
          <div className="max-w-[980px] mx-auto text-center">
            <h1 className="text-[40px] sm:text-[56px] md:text-[64px] font-semibold leading-[1.05] tracking-tight mb-6 text-[#1d1d1f]">
              {dictionary.hero.title}
            </h1>
            <p className="text-[19px] sm:text-[21px] text-[#86868b] max-w-[680px] mx-auto mb-10 leading-relaxed">
              {dictionary.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href={`/${locale}/auth`}
                className="inline-flex items-center justify-center px-7 py-3 bg-[#0071e3] hover:bg-[#0077ED] text-white font-normal text-[17px] rounded-full transition-colors"
              >
                {dictionary.hero.cta_start}
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center justify-center px-7 py-3 text-[#0071e3] hover:text-[#0077ED] font-normal text-[17px] transition-colors"
              >
                {dictionary.hero.cta_demo}
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </a>
            </div>
            <p className="mt-8 text-[13px] text-[#86868b]">
              {locale === 'en'
                ? 'No credit card required. Free forever plan available.'
                : '\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u0627\u062c\u0629 \u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062a\u0645\u0627\u0646. \u062e\u0637\u0629 \u0645\u062c\u0627\u0646\u064a\u0629 \u062f\u0627\u0626\u0645\u0629 \u0645\u062a\u0627\u062d\u0629.'}
            </p>
          </div>
        </section>
        {/* Problem Section - Apple editorial style */}
        <section id="problem" className="py-20 px-4 sm:px-6 bg-[#f5f5f7]">
          <div className="max-w-[980px] mx-auto">
            <div className="max-w-[680px] mx-auto text-center mb-16">
              <h2 className="text-[32px] sm:text-[40px] font-semibold leading-tight tracking-tight mb-4 text-[#1d1d1f]">
                {locale === 'en'
                  ? 'Warranties shouldn\u2019t be this hard.'
                  : '\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0644\u0627 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0628\u0647\u0630\u0647 \u0627\u0644\u0635\u0639\u0648\u0628\u0629.'}
              </h2>
              <p className="text-[17px] text-[#86868b] leading-relaxed">
                {locale === 'en'
                  ? 'Managing warranties across your organization is complex. Track them with clarity and confidence.'
                  : '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0639\u0628\u0631 \u0645\u0624\u0633\u0633\u062a\u0643 \u0645\u0639\u0642\u062f\u0629. \u062a\u062a\u0628\u0639\u0647\u0627 \u0628\u0648\u0636\u0648\u062d \u0648\u062b\u0642\u0629.'}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { icon: Clock,
                  title: locale === 'en' ? 'Missing Deadlines' : '\u0641\u0642\u062f\u0627\u0646 \u0627\u0644\u0645\u0648\u0627\u0639\u064a\u062f',
                  desc: locale === 'en' ? 'Forget expiration dates and lose coverage when you need it most.' : '\u0646\u0633\u064a\u0627\u0646 \u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629 \u0648\u0641\u0642\u062f\u0627\u0646 \u0627\u0644\u062a\u063a\u0637\u064a\u0629 \u0639\u0646\u062f\u0645\u0627 \u062a\u062d\u062a\u0627\u062c\u0647\u0627 \u0623\u0643\u062b\u0631.' },
                { icon: FileCheck,
                  title: locale === 'en' ? 'Manual Approvals' : '\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a \u0627\u0644\u064a\u062f\u0648\u064a\u0629',
                  desc: locale === 'en' ? 'Back-and-forth emails and spreadsheets slow down your team.' : '\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0648\u0627\u0644\u062c\u062f\u0627\u0648\u0644 \u062a\u0628\u0637\u0626 \u0641\u0631\u064a\u0642\u0643.' },
                { icon: Shield,
                  title: locale === 'en' ? 'Unverified Claims' : '\u0627\u062f\u0639\u0627\u0621\u0627\u062a \u063a\u064a\u0631 \u0645\u062d\u0642\u0642\u0629',
                  desc: locale === 'en' ? 'Lack of audit trails and documentation lead to disputes.' : '\u063a\u064a\u0627\u0628 \u0645\u0633\u0627\u0631\u0627\u062a \u0627\u0644\u062a\u062f\u0642\u064a\u0642 \u0648\u0627\u0644\u062a\u0648\u062b\u064a\u0642 \u064a\u0624\u062f\u064a \u0625\u0644\u0649 \u0646\u0632\u0627\u0639\u0627\u062a.' },
                { icon: Globe,
                  title: locale === 'en' ? 'Language Barriers' : '\u062d\u0648\u0627\u062c\u0632 \u0627\u0644\u0644\u063a\u0629',
                  desc: locale === 'en' ? 'Managing warranties across Arabic and English adds translation overhead.' : '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0648\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u062a\u062a\u0637\u0644\u0628 \u062a\u0643\u0627\u0644\u064a\u0641 \u062a\u0631\u062c\u0645\u0629.' },
              ].map((pain, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 hover:shadow-md transition-shadow">
                  <pain.icon className="w-6 h-6 text-[#0071e3] mb-3" />
                  <h3 className="font-semibold text-[17px] text-[#1d1d1f] mb-2">{pain.title}</h3>
                  <p className="text-[15px] text-[#86868b] leading-relaxed">{pain.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 sm:px-6">
          <div className="max-w-[980px] mx-auto">
            <div className="max-w-[680px] mx-auto text-center mb-16">
              <h2 className="text-[32px] sm:text-[40px] font-semibold leading-tight tracking-tight mb-4 text-[#1d1d1f]">
                {dictionary.features.title}
              </h2>
              <p className="text-[17px] text-[#86868b] leading-relaxed">
                {locale === 'en'
                  ? 'All the tools you need to manage warranties at scale.'
                  : '\u062c\u0645\u064a\u0639 \u0627\u0644\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u062a\u064a \u062a\u062d\u062a\u0627\u062c\u0647\u0627 \u0644\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0628\u062d\u062c\u0645 \u0643\u0628\u064a\u0631.'}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {dictionary.features.items.map((feature) => (
                <div
                  key={feature.id}
                  className="group p-6 bg-[#f5f5f7] rounded-2xl hover:bg-white hover:shadow-lg transition-all duration-300"
                >
                  <div className="mb-4 text-[#0071e3]">
                    {featureIcons[feature.id as keyof typeof featureIcons] || <Shield className="w-7 h-7" />}
                  </div>
                  <h3 className="font-semibold text-[17px] text-[#1d1d1f] mb-2">{feature.title}</h3>
                  <p className="text-[15px] text-[#86868b] leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* How It Works */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-[#f5f5f7]">
          <div className="max-w-[980px] mx-auto">
            <div className="max-w-[680px] mx-auto text-center mb-16">
              <h2 className="text-[32px] sm:text-[40px] font-semibold leading-tight tracking-tight mb-4 text-[#1d1d1f]">
                {dictionary.how_it_works.title}
              </h2>
              <p className="text-[17px] text-[#86868b] leading-relaxed">
                {locale === 'en'
                  ? 'Get started in minutes with our intuitive workflow.'
                  : '\u0627\u0628\u062f\u0623 \u0641\u064a \u062f\u0642\u0627\u0626\u0642 \u0645\u0639 \u0633\u064a\u0631 \u0639\u0645\u0644\u0646\u0627 \u0627\u0644\u0628\u062f\u064a\u0647\u064a.'}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {dictionary.how_it_works.steps.map((step, idx) => (
                <div key={step.id} className="text-center">
                  <div className="mx-auto mb-5 w-12 h-12 bg-[#0071e3] text-white font-semibold text-[17px] rounded-full flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <h3 className="font-semibold text-[17px] text-[#1d1d1f] mb-2">{step.title}</h3>
                  <p className="text-[15px] text-[#86868b] leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Warranty Extension */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-[980px] mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className={isRTL ? 'md:order-2' : ''}>
                <h2 className="text-[32px] sm:text-[40px] font-semibold leading-tight tracking-tight mb-4 text-[#1d1d1f]">
                  {locale === 'en' ? 'Never Lose Coverage Again' : '\u0644\u0627 \u062a\u0641\u0642\u062f \u0627\u0644\u062a\u063a\u0637\u064a\u0629 \u0623\u0628\u062f\u0627\u064b \u0645\u0631\u0629 \u0623\u062e\u0631\u0649'}
                </h2>
                <p className="text-[17px] text-[#86868b] mb-8 leading-relaxed">
                  {locale === 'en'
                    ? 'Extend warranties before expiration. Sellers offer extensions directly through Warrantee, and buyers purchase them instantly.'
                    : '\u0645\u062f \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0642\u0628\u0644 \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629. \u064a\u0642\u062f\u0645 \u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646 \u0627\u0644\u062a\u0645\u062f\u064a\u062f\u0627\u062a \u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0628\u0631 Warrantee.'}
                </p>
                <ul className="space-y-4">
                  {[
                    locale === 'en' ? 'Flexible extension terms' : '\u0634\u0631\u0648\u0637 \u062a\u0645\u062f\u064a\u062f \u0645\u0631\u0646\u0629',
                    locale === 'en' ? 'Instant approval process' : '\u0639\u0645\u0644\u064a\u0629 \u0645\u0648\u0627\u0641\u0642\u0629 \u0641\u0648\u0631\u064a\u0629',
                    locale === 'en' ? 'Transparent pricing' : '\u062a\u0633\u0639\u064a\u0631 \u0634\u0641\u0627\u0641',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#30d158] flex-shrink-0" />
                      <span className="text-[15px] text-[#1d1d1f]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={isRTL ? 'md:order-1' : ''}>
                <div className="bg-[#f5f5f7] rounded-3xl p-8 space-y-4">
                  {[
                    { label: locale === 'en' ? 'Seller' : '\u0627\u0644\u0628\u0627\u0626\u0639', color: 'bg-[#f5f5f7] border border-[#d2d2d7]' },
                    { label: locale === 'en' ? 'Extension Offer' : '\u0639\u0631\u0636 \u0627\u0644\u062a\u0645\u062f\u064a\u062f', color: 'bg-[#0071e3]/10 border border-[#0071e3]/20' },
                    { label: locale === 'en' ? 'Buyer' : '\u0627\u0644\u0645\u0634\u062a\u0631\u064a', color: 'bg-[#f5f5f7] border border-[#d2d2d7]' },
                    { label: locale === 'en' ? 'Extended Coverage' : '\u062a\u063a\u0637\u064a\u0629 \u0645\u0645\u062f\u062f\u0629', color: 'bg-[#30d158]/10 border border-[#30d158]/20' },
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {idx > 0 && <ArrowRight className="w-4 h-4 text-[#86868b] flex-shrink-0" />}
                      <div className={`flex-1 h-14 ${step.color} rounded-xl flex items-center justify-center text-[14px] font-medium text-[#1d1d1f]`}>
                        {step.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4 sm:px-6 bg-[#f5f5f7]">
          <div className="max-w-[980px] mx-auto">
            <div className="max-w-[680px] mx-auto text-center mb-16">
              <h2 className="text-[32px] sm:text-[40px] font-semibold leading-tight tracking-tight mb-4 text-[#1d1d1f]">
                {dictionary.pricing.title}
              </h2>
              <p className="text-[17px] text-[#86868b] leading-relaxed">{dictionary.pricing.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {dictionary.pricing.plans.map((plan, idx) => (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl p-8 transition-all duration-300 ${
                    idx === 1
                      ? 'ring-2 ring-[#0071e3] shadow-lg md:scale-[1.02]'
                      : 'ring-1 ring-[#d2d2d7]/60 hover:ring-[#d2d2d7]'
                  }`}
                >
                  {idx === 1 && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#0071e3] text-white px-4 py-1 rounded-full text-[11px] font-medium">
                      {locale === 'en' ? 'First year free' : '\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0645\u062c\u0627\u0646\u064a\u0629'}
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-1">{plan.name}</h3>
                    <p className="text-[14px] text-[#86868b]">{plan.description}</p>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[40px] font-semibold tracking-tight text-[#1d1d1f]">{plan.price}</span>
                      {plan.price !== 'Custom' && plan.price !== '\u0645\u062e\u0635\u0635' && (
                        <span className="text-[14px] text-[#86868b]">
                          / {locale === 'en' ? 'month' : '\u0634\u0647\u0631'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`w-full py-2.5 rounded-full text-[15px] font-medium transition-colors mb-8 ${
                      idx === 1
                        ? 'bg-[#0071e3] hover:bg-[#0077ED] text-white'
                        : 'bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f]'
                    }`}
                  >
                    {plan.cta}
                  </button>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-[#30d158] flex-shrink-0 mt-0.5" />
                        <span className="text-[14px] text-[#86868b] leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="contact" className="py-24 px-4 sm:px-6">
          <div className="max-w-[580px] mx-auto text-center">
            <h2 className="text-[32px] sm:text-[40px] font-semibold leading-tight tracking-tight mb-4 text-[#1d1d1f]">
              {locale === 'en' ? 'Ready to protect what matters?' : '\u0647\u0644 \u0623\u0646\u062a \u0645\u0633\u062a\u0639\u062f \u0644\u062d\u0645\u0627\u064a\u0629 \u0645\u0627 \u064a\u0647\u0645\u061f'}
            </h2>
            <p className="text-[17px] text-[#86868b] mb-8 leading-relaxed">
              {locale === 'en'
                ? 'Start your free account today. No credit card required.'
                : '\u0627\u0628\u062f\u0623 \u062d\u0633\u0627\u0628\u0643 \u0627\u0644\u0645\u062c\u0627\u0646\u064a \u0627\u0644\u064a\u0648\u0645. \u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u0627\u062c\u0629 \u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062a\u0645\u0627\u0646.'}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <a
                href={`/${locale}/auth`}
                className="inline-flex items-center justify-center px-7 py-3 bg-[#0071e3] hover:bg-[#0077ED] text-white font-normal text-[17px] rounded-full transition-colors"
              >
                {locale === 'en' ? 'Get Started' : '\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646'}
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </a>
            </div>
          </div>
        </section>

        <Footer locale={locale} dictionary={dictionary} />
      </body>
    </html>
  );
}
