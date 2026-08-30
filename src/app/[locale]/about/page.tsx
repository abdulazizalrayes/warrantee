import Link from "next/link";
import { ArrowRight, Eye, Globe, Shield, Smile } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { DIRECTION, getContentLocale, getDictionary, normalizeLocale } from "@/lib/i18n";

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

const content = {
  en: {
    storyTitle: "Our Story",
    storyLead:
      "Why Warrantee is being built to keep warranty terms, evidence, deadlines, and decisions connected.",
    originTitle: "The Problem Warrantee Is Built to Solve",
    originOne:
      "Warranty records are often scattered across receipts, inboxes, spreadsheets, and supplier systems. When coverage is needed, people and businesses can lose time or money simply because the proof, terms, or deadline cannot be found quickly.",
    originTwo:
      "Warrantee brings the warranty record, documents, approvals, reminders, claims, and verification path together so each decision can be made from the same evidence.",
    principle:
      "A warranty should remain understandable and actionable from purchase through expiry, claim, transfer, or extension request.",
    principleLabel: "Product principle",
    missionTitle: "The Mission",
    mission:
      "Warrantee is being built so people and businesses can keep warranty records in one place, receive reminders when action is needed, and use clear workflows for approvals, claims, certificates, and verification.",
    valuesTitle: "Our Values",
    ctaTitle: "Join Us",
    ctaText:
      "Create a free account and add your first warranty when you are ready.",
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
        desc: "Core public and account workflows support Arabic and English, including right-to-left layout where applicable.",
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
      "لماذا يجري بناء وارنتي لربط شروط الضمان وأدلته ومواعيده وقراراته في مكان واحد.",
    originTitle: "المشكلة التي صُممت وارنتي لمعالجتها",
    originOne:
      "غالبًا ما تتوزع سجلات الضمان بين الفواتير والبريد والجداول وأنظمة الموردين. وعند الحاجة إلى التغطية، قد يخسر الأفراد والشركات الوقت أو المال لأن الدليل أو الشروط أو الموعد لا يمكن العثور عليه بسرعة.",
    originTwo:
      "تجمع وارنتي سجل الضمان والمستندات والموافقات والتنبيهات والمطالبات ومسار التحقق حتى يُتخذ كل قرار بالاستناد إلى الأدلة نفسها.",
    principle:
      "يجب أن يبقى الضمان مفهومًا وقابلًا للتنفيذ من الشراء حتى الانتهاء أو المطالبة أو النقل أو طلب التمديد.",
    principleLabel: "مبدأ المنتج",
    missionTitle: "المهمة",
    mission:
      "يجري بناء Warrantee ليتمكن الأفراد والشركات من حفظ سجلات الضمان في مكان واحد، وتلقي التنبيهات عند الحاجة إلى الإجراء، واستخدام مسارات واضحة للموافقات والمطالبات والشهادات والتحقق.",
    valuesTitle: "قيمنا",
    ctaTitle: "انضم إلينا",
    ctaText:
      "أنشئ حسابًا مجانيًا وأضف ضمانك الأول عندما تكون مستعدًا.",
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
        desc: "تدعم المسارات العامة ومسارات الحساب الأساسية العربية والإنجليزية، بما في ذلك اتجاه الكتابة من اليمين إلى اليسار عند الحاجة.",
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
  const locale = normalizeLocale(localeParam);
  const contentLocale = getContentLocale(locale);
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === "rtl";
  const page = content[contentLocale];

  return (
    <div className="bg-warm-white text-navy font-sans" dir={isRTL ? "rtl" : "ltr"}>
      <Navbar locale={locale} dictionary={dictionary} />

      <div>
        <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-center bg-[#fbfbfd]">
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

            <blockquote className="bg-[#f5f9ff] border-l-4 border-[#0071e3] rounded-r-2xl p-8 my-10">
              <p className="text-navy text-lg italic leading-relaxed">{page.principle}</p>
              <footer className="text-[#0071e3] font-semibold mt-4">{page.principleLabel}</footer>
            </blockquote>

            <h2 className="text-3xl font-bold text-navy mb-6">{page.missionTitle}</h2>
            <p className="text-navy/60 text-lg leading-relaxed mb-6">{page.mission}</p>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#fbfbfd]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-navy mb-10 text-center">{page.valuesTitle}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {page.values.map((value) => (
                <div
                  key={value.title}
                  className="p-8 bg-warm-white border border-navy/5 rounded-2xl hover:border-[#0071e3]/20 transition-all"
                >
                  <value.icon className="w-8 h-8 text-[#0071e3] mb-4" />
                  <h3 className="font-bold text-lg text-navy mb-2">{value.title}</h3>
                  <p className="text-navy/60 text-sm leading-relaxed">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="rounded-3xl border border-[#0071e3]/10 bg-[#f5f9ff] p-12 shadow-sm">
              <h2 className="text-3xl font-bold text-[#1d1d1f] mb-4">{page.ctaTitle}</h2>
              <p className="text-[#6e6e73] mb-8">{page.ctaText}</p>
              <Link
                href={`/${locale}/auth?tab=signup`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#0071e3] text-white font-semibold rounded-full hover:bg-[#0077ED] transition-all"
              >
                {page.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
