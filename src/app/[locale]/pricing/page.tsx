"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, Shield, Zap, Building2 } from "lucide-react";
import { DIRECTION, getDictionary, normalizeLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const plans = [
  {
    id: "free",
    icon: Shield,
    iconColor: "text-[#86868b]",
    iconBg: "bg-[#f5f5f7]",
    price: 0,
    features_en: ["Up to 10 warranties", "Basic dashboard", "Email support", "Single user"],
    features_ar: ["حتى 10 ضمانات", "لوحة أساسية", "دعم بريد", "مستخدم واحد"],
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
    price: 1,
    pricePrefix_en: "Launch offer",
    pricePrefix_ar: "عرض إطلاق",
    popular: true,
    features_en: ["Unlimited warranties", "Advanced analytics", "Priority support", "Up to 5 team members", "Custom workflows", "Bilingual certificates", "8% commission"],
    features_ar: ["ضمانات غير محدودة", "تحليلات متقدمة", "دعم أولوية", "حتى 5 أعضاء", "سير عمل مخصص", "شهادات ثنائية", "عمولة 8%"],
    name_en: "Professional",
    name_ar: "احترافي",
    desc_en: "For growing businesses",
    desc_ar: "للشركات النامية",
  },
  {
    id: "enterprise",
    icon: Building2,
    iconColor: "text-[#1d1d1f]",
    iconBg: "bg-[#f5f5f7]",
    price: -1,
    features_en: ["Everything in Professional", "Unlimited team members", "Dedicated account manager", "Custom integrations", "SLA guarantee"],
    features_ar: ["كل ما في الاحترافي", "أعضاء غير محدودين", "مدير حساب مخصص", "تكاملات مخصصة", "ضمان SLA"],
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
  const { user } = useAuth();
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const startCheckout = async (planId: string) => {
    if (planId === "free") {
      window.location.href = `/${locale}/auth?tab=signup`;
      return;
    }

    if (planId === "enterprise") {
      window.location.href = `/${locale}/contact?intent=enterprise`;
      return;
    }

    if (!user) {
      window.location.href = `/${locale}/auth?tab=signup&plan=${encodeURIComponent(planId)}`;
      return;
    }

    setCheckoutPlan(planId);
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, locale }),
    });
    const payload = await response.json().catch(() => null);
    setCheckoutPlan(null);

    if (response.ok && payload?.url) {
      window.location.href = payload.url;
      return;
    }

    window.location.href = `/${locale}/billing?checkout=unavailable`;
  };

  return (
    <div dir={direction} className="min-h-screen bg-[#fbfbfd]">
      <Navbar locale={locale} dictionary={dictionary} />
      <PublicBreadcrumbs locale={locale} includeJsonLd={false} />
      <main className="mx-auto max-w-5xl px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-[40px] sm:text-[48px] font-semibold tracking-tight text-[#1d1d1f]">
            {isRTL ? "اختر خطتك" : "Choose Your Plan"}
          </h1>
          <p className="text-[17px] text-[#6e6e73] mt-3 max-w-xl mx-auto">
            {isRTL
              ? "ابدأ بالخطة المجانية دون بطاقة ائتمانية، أو فعّل عرض الإطلاق للاحترافي بدولار واحد شهرياً"
              : "Start with a Free plan, no card required, or unlock the Professional launch offer at $1/month"}
          </p>
          <p className="mt-5 text-[13px] font-medium text-[#6e6e73]">
            {isRTL
              ? "الخطة المجانية تشمل حتى 10 ضمانات. عرض الاحترافي: الشهر الأول مجاني."
              : "Free includes up to 10 warranties. Professional launch offer: first month free."}
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
                  plan.popular
                    ? "ring-2 ring-[#0071e3]"
                    : "ring-[#d2d2d7]/40"
                }`}
              >
                {plan.popular && (
                  <div className="bg-[#0071e3] text-white text-[12px] font-semibold text-center py-1.5 tracking-wide uppercase">
                    {isRTL ? "الأكثر شعبية" : "Most Popular"}
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
                        <span className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">${plan.price}</span>
                        <span className="text-[14px] text-[#6e6e73]"> /{isRTL ? "شهر" : "month"}</span>
                        {plan.id === "pro" && (
                          <>
                            <p className="text-[12px] text-[#0071e3] font-medium mt-1">
                              {isRTL ? plan.pricePrefix_ar : plan.pricePrefix_en}
                            </p>
                            <p className="text-[12px] text-[#30d158] font-medium mt-1">
                              {isRTL ? "الشهر الأول مجاني!" : "First month free!"}
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
                    onClick={() => startCheckout(plan.id)}
                    disabled={checkoutPlan === plan.id}
                    className={`w-full py-2.5 rounded-full text-[14px] font-medium transition-all duration-200 text-center block ${
                      plan.popular
                        ? "bg-[#0071e3] hover:bg-[#0077ED] text-white shadow-sm hover:shadow-md"
                        : "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f]"
                    }`}
                  >
                    {checkoutPlan === plan.id
                      ? isRTL ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0648\u064a\u0644..." : "Redirecting..."
                      : plan.price === -1
                      ? isRTL ? "تواصل معنا" : "Contact Sales"
                      : plan.id === "pro"
                      ? isRTL ? "ابدأ الاحترافي" : "Start Professional"
                      : isRTL ? "ابدأ الآن" : "Get Started"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#d2d2d7]/40 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#0071e3]">
                {isRTL ? "وضوح عرض الإطلاق" : "Launch offer clarity"}
              </p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
                {isRTL ? "لماذا الخطة الاحترافية بدولار واحد؟" : "Why the $1 Professional launch offer?"}
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[#6e6e73]">
                {isRTL
                  ? "السعر الاحترافي هو عرض إطلاق للعملاء الأوائل. يقلل عائق الانضمام بينما نوسع التكاملات ومسارات الدعم. حدود الخطة المجانية والشهر الأول المجاني وعمولة التمديد ظاهرة بوضوح."
                  : "The Professional price is an early customer launch offer. It lowers onboarding friction while Warrantee expands integrations and support workflows. Free-plan limits, the first free month, and extension commission are shown upfront."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Shield,
                  title: isRTL ? "بدون بطاقة للخطة المجانية" : "No card for Free",
                  desc: isRTL ? "ابدأ حتى 10 ضمانات بدون إدخال بطاقة." : "Start with up to 10 warranties without entering a card.",
                },
                {
                  icon: Check,
                  title: isRTL ? "شهر أول مجاني" : "First month free",
                  desc: isRTL ? "عرض الاحترافي موضح قبل الدفع." : "Professional trial terms are stated before checkout.",
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
                <div key={item.title} className="rounded-2xl bg-[#f5f5f7] p-5">
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
