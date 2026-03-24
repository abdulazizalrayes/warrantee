import { getDictionary, Locale, DIRECTION } from '@/lib/i18n';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Shield,
  Bell,
  FileCheck,
  BarChart3,
  Mail,
  Link2,
  Clock,
  CheckCircle,
  ArrowRight,
  Globe,
} from 'lucide-react';

interface HomePageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === 'rtl';

  const featureIcons: Record<string, React.ReactNode> = {
    approval_workflow: <FileCheck className="w-8 h-8" />,
    expiry_reminders: <Bell className="w-8 h-8" />,
    bilingual_certs: <Globe className="w-8 h-8" />,
    dashboard: <BarChart3 className="w-8 h-8" />,
    email_to_warranty: <Mail className="w-8 h-8" />,
    chain_tracking: <Link2 className="w-8 h-8" />,
  };

  return (
    <html lang={locale === 'ar' ? 'ar-SA' : 'en-US'} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="bg-warm-white text-navy font-sans">
        {/* Navigation */}
        <Navbar locale={locale} dictionary={dictionary} />

        {/* Hero Section */}
        <section
          className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8"
          style={{
            background: `linear-gradient(135deg, rgba(26, 26, 46, 0.02) 0%, rgba(212, 168, 83, 0.03) 100%)`,
          }}
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-navy/5 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className={isRTL ? 'md:order-2' : ''}>
                <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-navy">
                  {dictionary.hero.title}
                </h1>
                <p className="text-lg text-navy/70 mb-8 leading-relaxed">
                  {dictionary.hero.subtitle}
                </p>

                {/* CTA Buttons */}
                <div
                  className={`flex flex-col sm:flex-row gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}
                >
                  <a
                    href={`/${locale}/auth`}
                    className="px-8 py-4 bg-gold hover:bg-gold/90 text-navy font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-gold/20 text-center"
                  >
                    {dictionary.hero.cta_start}
                  </a>
                  <a
                    href="#contact"
                    className="px-8 py-4 border-2 border-navy text-navy hover:bg-navy/5 font-semibold rounded-xl transition-all text-center"
                  >
                    {dictionary.hero.cta_demo}
                  </a>
                </div>

                {/* Trust Badge */}
                <p className="mt-8 text-sm text-navy/50">
                  {locale === 'en'
                    ? 'No credit card required. Free forever plan available.'
                    : 'ÙØ§ ØªÙØ¬Ø¯ Ø­Ø§Ø¬Ø© ÙØ¨Ø·Ø§ÙØ© Ø§Ø¦ØªÙØ§Ù. Ø®Ø·Ø© ÙØ¬Ø§ÙÙØ© Ø¯Ø§Ø¦ÙØ© ÙØªØ§Ø­Ø©.'}
                </p>
              </div>

              {/* Right Illustration */}
              <div className={`relative h-96 md:h-full min-h-96 ${isRTL ? 'md:order-1' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-navy/5 via-gold/5 to-transparent rounded-2xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* Abstract geometric pattern */}
                    <div className="absolute top-10 left-10 w-24 h-24 bg-gold rounded-3xl opacity-10 blur-xl" />
                    <div className="absolute top-20 right-5 w-32 h-32 bg-navy rounded-full opacity-5" />
                    <div className="absolute bottom-10 left-1/4 w-40 h-40 bg-gold rounded-3xl opacity-5 blur-2xl" />

                    {/* Center shield icon with animation */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gold/20 rounded-full blur-3xl animate-pulse" />
                        <Shield className="w-32 h-32 text-navy/20 relative z-10" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-navy/5">
          <div className="max-w-7xl mx-auto">
            <p className="text-center text-navy/50 text-sm uppercase tracking-wider mb-8">
              {locale === 'en' ? 'Trusted by leading companies' : 'ÙÙØ«ÙÙ Ø¨Ù ÙÙ ÙØ¨Ù Ø§ÙØ´Ø±ÙØ§Øª Ø§ÙØ±Ø§Ø¦Ø¯Ø©'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-navy/5 rounded-lg flex items-center justify-center text-navy/30 text-sm font-medium"
                >
                  {locale === 'en' ? `Company ${i}` : `Ø§ÙØ´Ø±ÙØ© ${i}`}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section id="problem" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-bold mb-6 text-navy">
                {locale === 'en'
                  ? 'Warranties shouldn\'t be lost in chaos'
                  : 'ÙØ§ ÙØ¬Ø¨ Ø£Ù ØªØ¶ÙØ¹ Ø§ÙØ¶ÙØ§ÙØ§Øª ÙÙ Ø§ÙÙÙØ¶Ù'}
              </h2>
              <p className="text-lg text-navy/60 mb-12">
                {locale === 'en'
                  ? 'Managing warranties across your organization is complex. Track them efficiently with Warrantee.'
                  : 'Ø¥Ø¯Ø§Ø±Ø© Ø§ÙØ¶ÙØ§ÙØ§Øª Ø¹Ø¨Ø± ÙØ¤Ø³Ø³ØªÙ ÙØ¹ÙØ¯Ø©. ØªØªØ¨Ø¹ÙØ§ Ø¨ÙÙØ§Ø¡Ø© Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù Warrantee.'}
              </p>
            </div>

            {/* Pain Points */}
            <div
              className={`grid md:grid-cols-2 gap-8 ${
                isRTL ? 'md:grid-flow-col-dense' : ''
              }`}
            >
              {[
                {
                  icon: Clock,
                  title: locale === 'en' ? 'Missing Deadlines' : 'ÙÙØ¯Ø§Ù Ø§ÙÙÙØ§Ø¹ÙØ¯',
                  desc: locale === 'en'
                    ? 'Forget expiration dates and lose coverage when you need it most.'
                    : 'ÙØ³ÙØ§Ù ØªÙØ§Ø±ÙØ® Ø§ÙØªÙØ§Ø¡ Ø§ÙØµÙØ§Ø­ÙØ© ÙÙÙØ¯Ø§Ù Ø§ÙØªØºØ·ÙØ© Ø¹ÙØ¯ÙØ§ ØªØ­ØªØ§Ø¬ÙØ§ Ø£ÙØ«Ø±.',
                },
                {
                  icon: FileCheck,
                  title: locale === 'en' ? 'Manual Approvals' : 'Ø§ÙÙÙØ§ÙÙØ§Øª Ø§ÙÙØ¯ÙÙØ©',
                  desc: locale === 'en'
                    ? 'Back-and-forth emails and spreadsheets slow down your team.'
                    : 'Ø±Ø³Ø§Ø¦Ù Ø§ÙØ¨Ø±ÙØ¯ Ø§ÙØ¥ÙÙØªØ±ÙÙÙ ÙØ§ÙØ¬Ø¯Ø§ÙÙ Ø§ÙØ¢ÙÙØ© Ø°ÙØ§Ø¨Ø§Ù ÙØ¥ÙØ§Ø¨Ø§Ù ØªØ¨Ø·Ø¦ ÙØ±ÙÙÙ.',
                },
                {
                  icon: Shield,
                  title: locale === 'en' ? 'Unverified Claims' : 'Ø§Ø¯Ø¹Ø§Ø¡Ø§Øª ØºÙØ± ÙØ­ÙÙØ©',
                  desc: locale === 'en'
                    ? 'Lack of audit trails and documentation lead to disputes.'
                    : 'ØºÙØ§Ø¨ ÙØ³Ø§Ø±Ø§Øª Ø§ÙØªØ¯ÙÙÙ ÙØ§ÙØªÙØ«ÙÙ ÙØ¤Ø¯Ù Ø¥ÙÙ ÙØ²Ø§Ø¹Ø§Øª.',
                },
                {
                  icon: Globe,
                  title: locale === 'en' ? 'Language Barriers' : 'Ø­ÙØ§Ø¬Ø² Ø§ÙÙØºØ©',
                  desc: locale === 'en'
                    ? 'Managing warranties across Arabic and English regions requires translation overhead.'
                    : 'Ø¥Ø¯Ø§Ø±Ø© Ø§ÙØ¶ÙØ§ÙØ§Øª ÙÙ Ø§ÙÙÙØ§Ø·Ù Ø§ÙØ¹Ø±Ø¨ÙØ© ÙØ§ÙØ¥ÙØ¬ÙÙØ²ÙØ© ØªØªØ·ÙØ¨ ØªÙØ§ÙÙÙ ØªØ±Ø¬ÙØ©.',
                },
              ].map((pain, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <pain.icon className="w-6 h-6 text-gold mt-1" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy mb-2">{pain.title}</h3>
                    <p className="text-navy/60 text-sm">{pain.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="py-20 px-4 sm:px-6 lg:px-8"
          style={{
            background: `linear-gradient(135deg, rgba(26, 26, 46, 0.01) 0%, rgba(212, 168, 83, 0.02) 100%)`,
          }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-16">
              <h2 className="text-4xl font-bold mb-4 text-navy">
                {dictionary.features.title}
              </h2>
              <p className="text-lg text-navy/60">
                {locale === 'en'
                  ? 'All the tools you need to manage warranties at scale, with confidence and compliance.'
                  : 'Ø¬ÙÙØ¹ Ø§ÙØ£Ø¯ÙØ§Øª Ø§ÙØªÙ ØªØ­ØªØ§Ø¬ÙØ§ ÙØ¥Ø¯Ø§Ø±Ø© Ø§ÙØ¶ÙØ§ÙØ§Øª Ø¨Ø­Ø¬Ù ÙØ¨ÙØ±Ø Ø¨Ø«ÙØ© ÙØ§ÙØ§ÙØªØ«Ø§Ù.'}
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {dictionary.features.items.map((feature) => (
                <div
                  key={feature.id}
                  className="group p-8 bg-warm-white border border-navy/5 rounded-2xl hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300"
                >
                  <div className="mb-4 inline-flex p-3 bg-gold/10 rounded-lg group-hover:bg-gold/15 transition-colors">
                    {featureIcons[feature.id as keyof typeof featureIcons] || (
                      <Shield className="w-6 h-6" />
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-navy mb-3">{feature.title}</h3>
                  <p className="text-navy/60 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-16">
              <h2 className="text-4xl font-bold mb-4 text-navy">
                {dictionary.how_it_works.title}
              </h2>
              <p className="text-lg text-navy/60">
                {locale === 'en'
                  ? 'Get started in minutes with our intuitive workflow.'
                  : 'Ø§Ø¨Ø¯Ø£ ÙÙ Ø¯ÙØ§Ø¦Ù ÙÙ Ø®ÙØ§Ù Ø³ÙØ± Ø¹ÙÙÙØ§ Ø§ÙØ­Ø¯Ø³Ù.'}
              </p>
            </div>

            {/* Timeline */}
            <div className="grid md:grid-cols-4 gap-8">
              {dictionary.how_it_works.steps.map((step, idx) => (
                <div key={step.id} className="relative">
                  {/* Step Number Circle */}
                  <div className="mb-6 flex items-center justify-center">
                    <div className="w-14 h-14 bg-gold text-navy font-bold text-xl rounded-full flex items-center justify-center shadow-md shadow-gold/20">
                      {idx + 1}
                    </div>
                    {idx < dictionary.how_it_works.steps.length - 1 && (
                      <div className="hidden md:block absolute top-7 left-full w-full h-0.5 bg-gradient-to-r from-gold/50 to-gold/0" />
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="font-semibold text-lg text-navy mb-2">{step.title}</h3>
                    <p className="text-navy/60 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Warranty Extension Section */}
        <section
          className="py-20 px-4 sm:px-6 lg:px-8"
          style={{
            background: `linear-gradient(135deg, rgba(26, 26, 46, 0.02) 0%, rgba(212, 168, 83, 0.03) 100%)`,
          }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className={isRTL ? 'md:order-2' : ''}>
                <h2 className="text-4xl font-bold mb-6 text-navy">
                  {locale === 'en'
                    ? 'Never Lose Coverage Again'
                    : 'ÙØ§ ØªÙÙØ¯ Ø§ÙØªØºØ·ÙØ© Ø£Ø¨Ø¯Ø§Ù ÙØ±Ø© Ø£Ø®Ø±Ù'}
                </h2>
                <p className="text-lg text-navy/60 mb-6">
                  {locale === 'en'
                    ? 'Extend warranties before expiration. Sellers can offer extensions directly through Warrantee, and buyers can purchase them instantly.'
                    : 'ÙØ¯ Ø§ÙØ¶ÙØ§ÙØ§Øª ÙØ¨Ù Ø§ÙØªÙØ§Ø¡ Ø§ÙØµÙØ§Ø­ÙØ©. ÙÙÙÙ ÙÙØ¨Ø§Ø¦Ø¹ÙÙ ØªÙØ¯ÙÙ Ø§ÙØªÙØ¯ÙØ¯Ø§Øª ÙØ¨Ø§Ø´Ø±Ø© ÙÙ Ø®ÙØ§Ù WarranteeØ ÙÙÙÙÙ ÙÙÙØ´ØªØ±ÙÙ Ø´Ø±Ø§Ø¤ÙØ§ Ø¹ÙÙ Ø§ÙÙÙØ±.'}
                </p>
                <ul className="space-y-4">
                  {[
                    locale === 'en' ? 'Flexible extension terms' : 'Ø´Ø±ÙØ· ØªÙØ¯ÙØ¯ ÙØ±ÙØ©',
                    locale === 'en' ? 'Instant approval process' : 'Ø¹ÙÙÙØ© ÙÙØ§ÙÙØ© ÙÙØ±ÙØ©',
                    locale === 'en' ? 'Transparent pricing' : 'ØªØ³Ø¹ÙØ± Ø´ÙØ§Ù',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-gold flex-shrink-0" />
                      <span className="text-navy">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Extension Flow Visualization */}
              <div className={isRTL ? 'md:order-1' : ''}>
                <div className="relative h-80 bg-navy/5 rounded-2xl p-8 flex flex-col justify-center items-center space-y-4">
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 h-16 bg-navy/10 rounded-lg flex items-center justify-center text-sm font-medium text-navy/60">
                      {locale === 'en' ? 'Seller' : 'Ø§ÙØ¨Ø§Ø¦Ø¹'}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gold flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <ArrowRight className="w-5 h-5 text-gold flex-shrink-0" />
                    <div className="flex-1 h-16 bg-gold/10 rounded-lg flex items-center justify-center text-sm font-medium text-navy">
                      {locale === 'en' ? 'Extension Offer' : 'Ø¹Ø±Ø¶ Ø§ÙØªÙØ¯ÙØ¯'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 h-16 bg-navy/10 rounded-lg flex items-center justify-center text-sm font-medium text-navy/60">
                      {locale === 'en' ? 'Buyer' : 'Ø§ÙÙØ´ØªØ±Ù'}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gold flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <ArrowRight className="w-5 h-5 text-gold flex-shrink-0" />
                    <div className="flex-1 h-16 bg-green-100 rounded-lg flex items-center justify-center text-sm font-medium text-green-900">
                      {locale === 'en' ? 'Extended Coverage' : 'ØªØºØ·ÙØ© ÙØ¹Ø¯Ø¯Ø©'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-navy">
                {dictionary.pricing.title}
              </h2>
              <p className="text-lg text-navy/60">{dictionary.pricing.subtitle}</p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              {dictionary.pricing.plans.map((plan, idx) => (
                <div
                  key={plan.id}
                  className={`relative p-8 rounded-2xl transition-all duration-300 ${
                    idx === 1
                      ? 'border-2 border-gold shadow-lg shadow-gold/10 md:scale-105 md:z-10'
                      : 'border border-navy/10 hover:border-navy/20'
                  }`}
                  style={{
                    backgroundColor:
                      idx === 1
                        ? 'rgba(212, 168, 83, 0.02)'
                        : 'rgba(26, 26, 46, 0.01)',
                  }}
                >
                  {/* Pro Badge */}
                  {idx === 1 && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gold text-navy px-4 py-1 rounded-full text-xs font-bold uppercase">
                      {locale === 'en'
                        ? 'Free first year'
                        : 'Ø§ÙØ³ÙØ© Ø§ÙØ£ÙÙÙ ÙØ¬Ø§ÙÙØ©'}
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-navy mb-2">{plan.name}</h3>
                    <p className="text-navy/60 text-sm">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-navy">{plan.price}</span>
                      {plan.price !== 'Custom' && plan.price !== 'ÙØ®ØµØµ' && (
                        <span className="text-navy/60">/
                          {locale === 'en' ? 'year' : 'Ø³ÙØ©'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    className={`w-full py-3 rounded-xl font-semibold transition-all mb-8 ${
                      idx === 1
                        ? 'bg-gold hover:bg-gold/90 text-navy'
                        : 'border-2 border-navy text-navy hover:bg-navy/5'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  {/* Features */}
                  <ul className="space-y-4">
                    {plan.features.map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                        <span className="text-navy/70 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-navy">
              {locale === 'en'
                ? 'Ready to protect what matters?'
                : 'ÙÙ Ø£ÙØª ÙØ³ØªØ¹Ø¯ ÙØ­ÙØ§ÙØ© ÙØ§ ÙÙÙÙØ'}
            </h2>
            <p className="text-lg text-navy/60 mb-8">
              {locale === 'en'
                ? 'Start your free account today. No credit card required.'
                : 'Ø§Ø¨Ø¯Ø£ Ø­Ø³Ø§Ø¨Ù Ø§ÙÙØ¬Ø§ÙÙ Ø§ÙÙÙÙ. ÙØ§ ØªÙØ¬Ø¯ Ø­Ø§Ø¬Ø© ÙØ¨Ø·Ø§ÙØ© Ø§Ø¦ØªÙØ§Ù.'}
            </p>

            {/* Email Capture */}
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder={
                  locale === 'en' ? 'your@email.com' : 'Ø¨Ø±ÙØ¯Ù@Ø§ÙØ¨Ø±ÙØ¯.com'
                }
                className="flex-1 px-4 py-3 rounded-xl border border-navy/20 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 bg-warm-white"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gold hover:bg-gold/90 text-navy font-semibold rounded-xl transition-all whitespace-nowrap"
              >
                {locale === 'en' ? 'Get Started' : 'Ø§Ø¨Ø¯Ø£ Ø§ÙØ¢Ù'}
              </button>
            </form>

            <p className="mt-4 text-sm text-navy/50">
              {locale === 'en'
                ? 'We respect your privacy. Unsubscribe at any time.'
                : 'ÙØ­ØªØ±Ù Ø®ØµÙØµÙØªÙ. Ø¥ÙØºØ§Ø¡ Ø§ÙØ§Ø´ØªØ±Ø§Ù ÙÙ Ø£Ù ÙÙØª.'}
            </p>
          </div>
        </section>

        {/* Footer */}
        <Footer locale={locale} dictionary={dictionary} />
      </body>
    </html>
  );
}