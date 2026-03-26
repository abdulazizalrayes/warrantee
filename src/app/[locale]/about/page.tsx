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
              {locale === 'en' ? 'Our Story' : 'قصتنا'}
            </h1>
            <p className="text-xl text-navy/60 leading-relaxed">
              {locale === 'en'
                ? 'How a forgotten warranty receipt turned into a mission to protect every purchase you\'ll ever make.'
                : 'كيف تحوّلت فاتورة ضمان منسية إلى مهمة لحماية كل عملية شراء ستقوم بها.'}
            </p>
          </div>
        </section>

        {/* Founder Story */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-navy mb-6">
              {locale === 'en' ? 'It Started with a Broken AC' : 'بدأت مع مكيف معطّل'}
            </h2>
            <p className="text-navy/60 text-lg leading-relaxed mb-6">
              {locale === 'en'
                ? 'In the summer of 2024, our founder\'s office air conditioning unit failed. It was less than two years old \u2014 well within the warranty period. But when he went to file a claim, the receipt was gone. The email from the supplier? Buried in a thread from 18 months ago. The result: SAR 4,500 out of pocket for a repair that should have been free.'
                : 'في صيف ٢٠٢٤، تعطّل مكيف مكتب مؤسسنا. كان عمره أقل من سنتين — أي ضمن فترة الضمان. لكن عندما حاول تقديم مطالبة، كانت الفاتورة مفقودة. البريد الإلكتروني من المورد؟ مدفون في سلسلة رسائل منذ ١٨ شهراً. النتيجة: ٤،٥٠٠ ريال من جيبه لإصلاح كان يجب أن يكون مجانياً.'}
            </p>
            <p className="text-navy/60 text-lg leading-relaxed mb-6">
              {locale === 'en'
                ? 'That wasn\'t the first time. A laptop with a dead screen \u2014 warranty expired two weeks before he noticed. A water heater that failed \u2014 the installer\'s warranty was still valid, but nobody could find the paperwork.'
                : 'لم تكن تلك المرة الأولى. لابتوب بشاشة ميتة — انتهى الضمان قبل أسبوعين من أن يلاحظ. سخان مياه تعطّل — ضمان المركّب كان لا يزال سارياً، لكن لم يجد أحد الأوراق.'}
            </p>

            {/* Quote */}
            <div className="bg-navy/5 border-l-4 border-gold rounded-r-2xl p-8 my-10">
              <p className="text-navy text-lg italic leading-relaxed">
                {locale === 'en'
                  ? '"I realized I wasn\'t alone. Every person, every business, every facility manager I talked to had the same problem. Warranties exist to protect us \u2014 but we\'ve built no system to manage them."'
                  : '"\u0623\u062f\u0631\u0643\u062a \u0623\u0646\u0646\u064a \u0644\u0633\u062a \u0648\u062d\u062f\u064a. \u0643\u0644 \u0634\u062e\u0635\u060c \u0643\u0644 \u0634\u0631\u0643\u0629\u060c \u0643\u0644 \u0645\u062f\u064a\u0631 \u0645\u0631\u0627\u0641\u0642 \u062a\u062d\u062f\u062b\u062a \u0625\u0644\u064a\u0647 \u0643\u0627\u0646 \u064a\u0639\u0627\u0646\u064a \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0645\u0634\u0643\u0644\u0629. \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0645\u0648\u062c\u0648\u062f\u0629 \u0644\u062d\u0645\u0627\u064a\u062a\u0646\u0627 \u2014 \u0644\u0643\u0646\u0646\u0627 \u0644\u0645 \u0646\u0628\u0646\u0650 \u0623\u064a \u0646\u0638\u0627\u0645 \u0644\u0625\u062f\u0627\u0631\u062a\u0647\u0627."'}
              </p>
              <p className="text-gold font-semibold mt-4">
                {locale === 'en'
                  ? '\u2014 Abdulaziz Alrayes, Founder'
                  : '\u2014 \u0639\u0628\u062f\u0627\u0644\u0639\u0632\u064a\u0632 \u0627\u0644\u0631\u0627\u064a\u0633\u060c \u0627\u0644\u0645\u0624\u0633\u0633'}
              </p>
            </div>

            <h2 className="text-3xl font-bold text-navy mb-6">
              {locale === 'en' ? 'The Mission' : '\u0627\u0644\u0645\u0647\u0645\u0629'}
            </h2>
            <p className="text-navy/60 text-lg leading-relaxed mb-6">
              {locale === 'en'
                ? 'Warrantee was founded with a simple mission: no one should ever lose money because they forgot about a warranty. We built a platform that does for warranties what your bank does for your money \u2014 keeps track of everything in one place, reminds you when action is needed, and gives you the tools to act.'
                : '\u062a\u0623\u0633\u0633\u062a Warrantee \u0628\u0645\u0647\u0645\u0629 \u0628\u0633\u064a\u0637\u0629: \u0644\u0627 \u0623\u062d\u062f \u064a\u062c\u0628 \u0623\u0646 \u064a\u062e\u0633\u0631 \u0645\u0627\u0644\u0647 \u0644\u0623\u0646\u0647 \u0646\u0633\u064a \u0636\u0645\u0627\u0646\u0627\u064b. \u0628\u0646\u064a\u0646\u0627 \u0645\u0646\u0635\u0629 \u062a\u0641\u0639\u0644 \u0644\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0645\u0627 \u064a\u0641\u0639\u0644\u0647 \u0627\u0644\u0628\u0646\u0643 \u0644\u0623\u0645\u0648\u0627\u0644\u0643 \u2014 \u062a\u062a\u0628\u0639 \u0643\u0644 \u0634\u064a\u0621 \u0641\u064a \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f\u060c \u0648\u062a\u0630\u0643\u0631\u0643 \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629 \u0644\u0644\u062a\u0635\u0631\u0641\u060c \u0648\u062a\u0639\u0637\u064a\u0643 \u0627\u0644\u0623\u062f\u0648\u0627\u062a \u0644\u0644\u062a\u0646\u0641\u064a\u0630.'}
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-navy/[0.02]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-navy mb-10 text-center">
              {locale === 'en' ? 'Our Values' : 'قيمنا'}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Eye,
                  title: locale === 'en' ? 'Transparency' : 'الشفافية',
                  desc: locale === 'en'
                    ? 'Warranty terms should be clear, accessible, and easy to understand. We make the fine print visible.'
                    : 'شروط الضمان يجب أن تكون واضحة وسهلة الفهم. نجعل التفاصيل الدقيقة مرئية.',
                },
                {
                  icon: Shield,
                  title: locale === 'en' ? 'Trust' : 'الثقة',
                  desc: locale === 'en'
                    ? '"Trust the Terms" isn\'t just a tagline. Every feature we build creates accountability between buyers and sellers.'
                    : '"\u062b\u0642 \u0628\u0627\u0644\u0634\u0631\u0648\u0637" \u0644\u064a\u0633\u062a \u0645\u062c\u0631\u062f \u0634\u0639\u0627\u0631. \u0643\u0644 \u0645\u064a\u0632\u0629 \u0646\u0628\u0646\u064a\u0647\u0627 \u062a\u062e\u0644\u0642 \u0627\u0644\u0645\u0633\u0627\u0621\u0644\u0629 \u0628\u064a\u0646 \u0627\u0644\u0628\u0627\u0626\u0639 \u0648\u0627\u0644\u0645\u0634\u062a\u0631\u064a.',
                },
                {
                  icon: Globe,
                  title: locale === 'en' ? 'Bilingual by Default' : 'ثنائي اللغة أصلاً',
                  desc: locale === 'en'
                    ? 'Not an afterthought. Arabic and English are equal first-class citizens in every feature, every screen.'
                    : 'ليست فكرة لاحقة. العربية والإنجليزية مواطنان متساويان في كل ميزة وكل شاشة.',
                },
                {
                  icon: Smile,
                  title: locale === 'en' ? 'Simplicity' : 'البساطة',
                  desc: locale === 'en'
                    ? 'Warranty management shouldn\'t require training. If your grandmother can\'t use it, we haven\'t built it right.'
                    : 'إدارة الضمانات لا يجب أن تتطلب تدريباً. إذا لم تستطع جدتك استخدامه، فنحن لم نبنِه بشكل صحيح.',
                },
              ].map((val, idx) => (
                <div
                  key={idx}
                  className="p-8 bg-warm-white border border-navy/5 rounded-2xl hover:border-gold/20 transition-all"
                >
                  <val.icon className="w-8 h-8 text-gold mb-4" />
                  <h3 className="font-bold text-lg text-navy mb-2">{val.title}</h3>
                  <p className="text-navy/60 text-sm leading-relaxed">{val.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-navy rounded-3xl p-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                {locale === 'en' ? 'Join Us' : 'انضم إلينا'}
              </h2>
              <p className="text-white/60 mb-8">
                {locale === 'en'
                  ? 'Start protecting your warranties today. It takes 60 seconds to sign up \u2014 and it\'s free.'
                  : 'ابدأ حماية ضماناتك اليوم. التسجيل يستغرق ٦٠ ثانية \u2014 ومجاني.'}
              </p>
              <a
                href={`/${locale}/signup`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/90 transition-all"
              >
                {locale === 'en' ? 'Get Started Free' : 'ابدأ مجاناً'}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        <Footer locale={locale} dictionary={dictionary} />
      </body>
    </html>
  );
}
