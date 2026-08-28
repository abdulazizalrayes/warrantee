"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, Shield, Zap, Building2 } from "lucide-react";
import { DIRECTION, getDictionary, normalizeLocale } from "@/lib/i18n";
import { appendCampaignParams, trackFunnelCtaClick } from "@/lib/ga4-events";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageViewTracker } from "@/components/PageViewTracker";

const plans = [
  {
    id: "free",
    icon: Shield,
    iconColor: "text-[#86868b]",
    iconBg: "bg-[#f5f5f7]",
    price: 0,
    features_en: ["Up to 10 warranties", "Basic dashboard", "Email support", "Single user", "Full warranty history"],
    features_ar: ["حتى 10 ضمانات", "لوحة أساسية", "دعم بريد", "مستخدم واحد", "سجل ضمانات كامل"],
    name_en: "Free",
    name_ar: "مجاني",
    desc_en: "For individuals getting started",
    desc_ar: "للأفراد الذين يبدأون",
  },
  {
    id: "pro",
    icon: Zap,
    iconColor: "text-[#0071e3]",
    iconBg: "bg-[#0071e3]/10",
    price: 149,
    currency_en: "SAR",
    currency_ar: "ر.س",
    pricePrefix_en: "Proposed pilot price",
    pricePrefix_ar: "سعر تجريبي مقترح",
    featured: true,
    features_en: ["Unlimited warranties", "Advanced analytics", "Priority support", "Up to 5 team members", "Full warranty history", "Custom workflows", "Bilingual certificates"],
    features_ar: ["ضمانات غير محدودة", "تحليلات متقدمة", "دعم أولوية", "حتى 5 أعضاء", "سجل ضمانات كامل", "سير عمل مخصص", "شهادات ثنائية"],
    name_en: "Professional",
    name_ar: "احترافي",
    desc_en: "Pilot access for early business teams",
    desc_ar: "وصول تجريبي لفرق الأعمال المبكرة",
  },
  {
    id: "enterprise",
    icon: Building2,
    iconColor: "text-[#1d1d1f]",
    iconBg: "bg-[#f5f5f7]",
    price: -1,
    features_en: ["Everything in Professional", "Team limits by agreement", "Enterprise onboarding by agreement", "Custom integrations by agreement", "Service levels by agreement"],
    features_ar: ["كل ما في الاحترافي", "حدود الفريق حسب الاتفاق", "تهيئة المؤسسات حسب الاتفاق", "تكاملات مخصصة حسب الاتفاق", "مستويات الخدمة حسب الاتفاق"],
    name_en: "Enterprise",
    name_ar: "مؤسسي",
    desc_en: "For large organizations",
    desc_ar: "للمؤسسات الكبيرة",
  },
];

export default function PricingPage() {
  const params = useParams() ?? {};
  const locale = normalizeLocale(String(params.locale || "en"));
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale];
  const dictionary = getDictionary(locale);
  const selectPlan = (planId: string) => {
    const rawDestination = planId === "enterprise"
      ? `/${locale}/contact?intent=enterprise`
      : planId === "free"
        ? `/${locale}/auth?tab=signup`
        : `/${locale}/contact?intent=professional-access`;
    const trackedDestination = appendCampaignParams(rawDestination);

    trackFunnelCtaClick("pricing_plan_cta", trackedDestination, {
      locale,
      plan: planId,
      location: "pricing_plan_card",
    });

    if (planId === "free") {
      window.location.href = appendCampaignParams(`/${locale}/auth?tab=signup`);
      return;
    }

    window.location.href = trackedDestination;
  };

  return (
    <div dir={direction} className="min-h-screen bg-[#fbfbfd]">
      <PageViewTracker pageName="pricing" pageType="marketing" locale={locale} />
      <Navbar locale={locale} dictionary={dictionary} />
      <PublicBreadcrumbs locale={locale} includeJsonLd={false} />
      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-[40px] sm:text-[48px] font-semibold tracking-tight text-[#1d1d1f]">
            {isRTL ? "ابدأ مجانًا، ثم توسع عند الحاجة" : "Start free, then scale when needed"}
          </h1>
          <p className="text-[17px] text-[#6e6e73] mt-3 max-w-xl mx-auto">
            {isRTL
              ? "أنشئ أول 10 ضمانات دون بطاقة، أو اطلب الانضمام إلى البرنامج التجريبي للاحترافي بالريال السعودي."
              : "Create your first 10 warranties without a card, or request access to the SAR Professional pilot."}
          </p>
          <p className="mt-5 text-[13px] font-medium text-[#6e6e73]">
            {isRTL
              ? "الخطة المجانية تشمل حتى 10 ضمانات مع الاحتفاظ بالسجلات. الدفع الإلكتروني للاحترافي والتمديدات ليس مفعّلًا للعامة بعد."
              : "Free includes up to 10 warranties with records retained. Online Professional and extension payments are not yet generally active."}
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const features = isRTL ? plan.features_ar : plan.features_en;
            const name = isRTL ? plan.name_ar : plan.name_en;
            const desc = isRTL ? plan.desc_ar : plan.desc_en;

            return (
              <div
                key={plan.id}
                className={`relative overflow-hidden rounded-2xl bg-white ring-1 shadow-sm transition-all duration-200 hover:shadow-md ${
                  plan.featured
                    ? "ring-2 ring-[#0071e3]"
                    : "ring-[#d2d2d7]/40"
                }`}
              >
                {plan.featured && (
                  <div className="bg-[#0071e3] text-white text-[12px] font-semibold text-center py-1.5 tracking-wide uppercase">
                    {isRTL ? "وصول تجريبي" : "Pilot access"}
                  </div>
                )}
                <div className="p-6">
                  <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{name}</h3>
                  <p className="text-[13px] text-[#6e6e73] mt-0.5">{desc}</p>

                  <div className="mt-4 mb-5">
                    {plan.price === 0 ? (
                      <p className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
                        {isRTL ? "مجاني" : "Free"}
                      </p>
                    ) : plan.price === -1 ? (
                      <p className="text-[17px] font-semibold text-[#1d1d1f]">
                        {isRTL ? "تواصل معنا" : "Contact Us"}
                      </p>
                    ) : (
                      <div>
                        <span className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">{isRTL ? plan.currency_ar : plan.currency_en} {plan.price}</span>
                        <span className="text-[14px] text-[#6e6e73]"> /{isRTL ? "شهر" : "month"}</span>
                        {plan.id === "pro" && (
                          <>
                            <p className="text-[12px] text-[#0071e3] font-medium mt-1">
                              {isRTL ? plan.pricePrefix_ar : plan.pricePrefix_en}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#1d1d1f]">
                        <div className="w-4 h-4 rounded-full bg-[#30d158]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={10} className="text-[#30d158]" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => selectPlan(plan.id)}
                    className={`w-full py-2.5 rounded-full text-[14px] font-medium transition-all duration-200 text-center block ${
                      plan.featured
                        ? "bg-[#0071e3] hover:bg-[#0077ED] text-white shadow-sm hover:shadow-md"
                        : "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f]"
                    }`}
                  >
                    {plan.price === -1
                      ? isRTL ? "تواصل معنا" : "Contact Sales"
                      : plan.id === "pro"
                      ? isRTL ? "اطلب الانضمام للبرنامج" : "Request pilot access"
                      : isRTL ? "ابدأ الآن" : "Get Started"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <section className="mt-12 border-y border-black/[0.08] py-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="max-w-xl">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#0071e3]">
                {isRTL ? "ما الذي يعنيه البرنامج التجريبي؟" : "What pilot access means"}
              </p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
                {isRTL ? "تجربة واضحة قبل تفعيل الدفع." : "A clear pilot before billing goes live."}
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[#6e6e73]">
                {isRTL
                  ? "149 ريالًا هو السعر الشهري المقترح للفرق المبكرة في السعودية والخليج. نؤكد النطاق والشروط والتفعيل قبل أي دفع، ولا تتم أي رسوم تلقائية."
                  : "SAR 149 is the proposed monthly price for early Saudi and GCC teams. Scope, terms, and activation are confirmed before any payment, with no automatic charge."}
              </p>
            </div>
            <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
              {[
                {
                  icon: Shield,
                  title: isRTL ? "بدون بطاقة للخطة المجانية" : "No card for Free",
                  desc: isRTL ? "ابدأ حتى 10 ضمانات بدون إدخال بطاقة." : "Start with up to 10 warranties without entering a card.",
                },
                {
                  icon: Check,
                  title: isRTL ? "سعر واضح بالريال" : "Clear SAR pricing",
                  desc: isRTL ? "يُؤكد تفعيل الاحترافي وشروطه قبل أي دفع." : "Professional activation and terms are confirmed before any payment.",
                },
                {
                  icon: Building2,
                  title: isRTL ? "جاهز للفرق" : "Team ready",
                  desc: isRTL ? "مناسب للبائعين وسير الموافقات والشهادات." : "Built for sellers, approvals, and certificates.",
                },
                {
                  icon: Zap,
                  title: isRTL ? "جاهز للتكامل" : "Integration ready",
                  desc: isRTL ? "دليل API / CLI / MCP متاح للمستخدمين التجاريين." : "API / CLI / MCP guide is available for business users.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <item.icon className="h-5 w-5 text-[#0071e3]" aria-hidden="true" />
                  <h3 className="mt-3 text-[15px] font-semibold text-[#1d1d1f]">{item.title}</h3>
                  <p className="mt-1 text-[13px] leading-6 text-[#6e6e73]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ / Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-[15px] text-[#6e6e73]">
            {isRTL ? "هل لديك أسئلة؟" : "Have questions?"}{" "}
            <Link href={`/${locale}/contact`} className="text-[#0071e3] font-medium hover:underline">
              {isRTL ? "تواصل معنا" : "Contact us"}
            </Link>
          </p>
        </div>
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
