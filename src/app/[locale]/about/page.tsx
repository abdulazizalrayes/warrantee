import { getDictionary, Locale, DIRECTION } from '@/lib/i18n';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Shield, ArrowRight, CheckCircle, Globe, Eye, Heart, Smile } from 'lucide-react';

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === 'rtl';

  return (
    <html lang={locale === 'ar' ? 'ar-SA' : 'en-US'} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="bg-warm-white text-navy font-sans">
        <Navbar locale={locale} dictionary={dictionary} />

        {/* Hero */}
        <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-center bg-gradient-to-b from-gold/5 to-transparent">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-navy tracking-tight mb-6">
              {locale === 'en' ? 'Our Story' : '\u0642\u0635\u062a\u0646\u0627'}
            </h1>
            <p className="text-xl text-navy/60 leading-relaxed">
              {locale === 'en'
                ? 'How a forgotten warranty receipt turned into a mission to protect every purchase you\'ll ever make.'
                : '\u0643\u064a\u0641 \u062a\u062d\u0648\u0651\u0644\u062a \u0641\u0627\u062a\u0648\u0631\u0629 \u0636\u0645\u0627\u0646 \u0645\u0646\u0633\u064a\u0629 \u0625\u0644\u0649 \u0645\u0647\u0645\u0629 \u0644\u062d\u0645\u0627\u064a\u0629 \u0643\u0644 \u0639\u0645\u0644\u064a\u0629 \u0634\u0631\u0627\u0621 \u0633\u062a\u0642\u0648\u0645 \u0628\u0647\u0627.'}
            </p>
          </div>
        </section>

        <Footer locale={locale} dictionary={dictionary} />
      </body>
    </html>
  );
}
