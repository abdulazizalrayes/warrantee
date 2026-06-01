import Link from "next/link";
import { ArrowRight, Eye, Globe, Shield, Smile } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { DIRECTION, getDictionary, Locale } from "@/lib/i18n";

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

const content = {
  en: {
    storyTitle: "Our Story",
    storyLead:
      "How a forgotten warranty receipt turned into a mission to protect every purchase you'll ever make.",
    originTitle: "It Started with a Broken AC",
    originOne:
      "In the summer of 2024, our founder's office air conditioning unit failed. It was less than two years old, well within the warranty period. But when he went to file a claim, the receipt was gone. The supplier email was buried in an old thread. The result: SAR 4,500 out of pocket for a repair that should have been free.",
    originTwo:
      "That was not the first time. A laptop with a dead screen had a warranty that expired two weeks before anyone noticed. A water heater failed while the installer warranty was still valid, but nobody could find the paperwork.",
    quote:
      "I realized I was not alone. Every person, every business, every facility manager I talked to had the same problem. Warranties exist to protect us, but we had built no system to manage them.",
    founder: "Abdulaziz Alrayes, Founder",
    missionTitle: "The Mission",
    mission:
      "Warrantee was founded with a simple mission: no one should lose money because they forgot about a warranty. We built a platform that does for warranties what your bank does for your money: keeps track of everything in one place, reminds you when action is needed, and gives you the tools to act.",
    valuesTitle: "Our Values",
    ctaTitle: "Join Us",
    ctaText:
      "Start protecting your warranties today. It takes 60 seconds to sign up, and it is free.",
    cta: "Get Started Free",
    values: [
      {
        icon: Eye,
        title: "Transparency",
        desc: "Warranty terms should be clear, accessible, and easy to understand. We make the fine print visible.",
      },
      {
        icon: Shield,
        title: "Trust",
        desc: "Trust the Terms is not just a tagline. Every feature we build creates accountability between buyers and sellers.",
      },
      {
        icon: Globe,
        title: "Bilingual by Default",
        desc: "Arabic and English are equal first-class citizens in every feature and every screen.",
      },
      {
        icon: Smile,
        title: "Simplicity",
        desc: "Warranty management should not require training. If it is not obvious, we keep improving it.",
      },
    ],
  },
  ar: {
    storyTitle: "قصتنا",
    storyLead:
      "كيف تحولت فاتورة ضمان منسية إلى مهمة لحماية كل عملية شراء تقوم بها.",
    originTitle: "بدأت مع مكيف متعطل",
    originOne:
      "في صيف 2024، تعطل مكيف مكتب المؤسس. كان عمره أقل من سنتين، أي ضمن فترة الضمان. لكن عند محاولة تقديم المطالبة، لم تكن الفاتورة موجودة، وكان بريد المورد مدفونا في محادثة قديمة. النتيجة: دفع 4,500 ريال من جيبه لإصلاح كان يفترض أن يكون مجانيا.",
    originTwo:
      "لم تكن تلك المرة الأولى. جهاز محمول تعطلت شاشته بعد انتهاء الضمان بأسبوعين فقط، وسخان مياه تعطّل بينما كان ضمان المركّب لا يزال ساريا، لكن لم يجد أحد المستندات.",
    quote:
      "أدركت أنني لست وحدي. كل شخص، وكل شركة، وكل مدير مرافق تحدثت معه كان يعاني من المشكلة نفسها. الضمانات موجودة لحمايتنا، لكننا لم نبن نظاما لإدارتها.",
    founder: "عبدالعزيز الرايس، المؤسس",
    missionTitle: "المهمة",
    mission:
      "تأسست Warrantee بمهمة بسيطة: ألا يخسر أحد ماله لأنه نسي ضمانا. بنينا منصة تفعل للضمانات ما يفعله البنك لأموالك: تجمع كل شيء في مكان واحد، وتذكرك عند الحاجة إلى التصرف، وتعطيك الأدوات اللازمة للتنفيذ.",
    valuesTitle: "قيمنا",
    ctaTitle: "انضم إلينا",
    ctaText:
      "ابدأ حماية ضماناتك اليوم. التسجيل يستغرق 60 ثانية، وهو مجاني.",
    cta: "ابدأ مجانا",
    values: [
      {
        icon: Eye,
        title: "الشفافية",
        desc: "يجب أن تكون شروط الضمان واضحة وسهلة الوصول والفهم. نحن نجعل التفاصيل الدقيقة مرئية.",
      },
      {
        icon: Shield,
        title: "الثقة",
        desc: "ثق بالشروط ليست مجرد عبارة. كل ميزة نبنيها تخلق مساءلة أوضح بين المشتري والبائع.",
      },
      {
        icon: Globe,
        title: "ثنائي اللغة من الأساس",
        desc: "العربية والإنجليزية لغتان أساسيتان في كل ميزة وكل شاشة.",
      },
      {
        icon: Smile,
        title: "البساطة",
        desc: "إدارة الضمانات يجب ألا تحتاج إلى تدريب. إذا لم تكن واضحة، فنحن نواصل تحسينها.",
      },
    ],
  },
};

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale: localeParam } = await params;
  const locale = (localeParam === "ar" ? "ar" : "en") as Locale;
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === "rtl";
  const page = content[locale];

  return (
    <div className="bg-warm-white text-navy font-sans" dir={isRTL ? "rtl" : "ltr"}>
      <Navbar locale={locale} dictionary={dictionary} />

      <main id="main-content">
        <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-center bg-gradient-to-b from-gold/5 to-transparent">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-navy tracking-tight mb-6">
              {page.storyTitle}
            </h1>
            <p className="text-xl text-navy/60 leading-relaxed">{page.storyLead}</p>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-navy mb-6">{page.originTitle}</h2>
            <p className="text-navy/60 text-lg leading-relaxed mb-6">{page.originOne}</p>
            <p className="text-navy/60 text-lg leading-relaxed mb-6">{page.originTwo}</p>

            <blockquote className="bg-navy/5 border-l-4 border-gold rounded-r-2xl p-8 my-10">
              <p className="text-navy text-lg italic leading-relaxed">&ldquo;{page.quote}&rdquo;</p>
              <footer className="text-gold font-semibold mt-4">- {page.founder}</footer>
            </blockquote>

            <h2 className="text-3xl font-bold text-navy mb-6">{page.missionTitle}</h2>
            <p className="text-navy/60 text-lg leading-relaxed mb-6">{page.mission}</p>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-navy/[0.02]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-navy mb-10 text-center">{page.valuesTitle}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {page.values.map((value) => (
                <div
                  key={value.title}
                  className="p-8 bg-warm-white border border-navy/5 rounded-2xl hover:border-gold/20 transition-all"
                >
                  <value.icon className="w-8 h-8 text-gold mb-4" />
                  <h3 className="font-bold text-lg text-navy mb-2">{value.title}</h3>
                  <p className="text-navy/60 text-sm leading-relaxed">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-navy rounded-3xl p-12">
              <h2 className="text-3xl font-bold text-white mb-4">{page.ctaTitle}</h2>
              <p className="text-white/60 mb-8">{page.ctaText}</p>
              <Link
                href={`/${locale}/auth?tab=signup`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/90 transition-all"
              >
                {page.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
