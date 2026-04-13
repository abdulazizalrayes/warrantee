// @ts-nocheck
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, Shield, Zap, Building2 } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

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
    iconColor: "text-[#D4A853]",
    iconBg: "bg-[#D4A853]/10",
    price: 1,
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
    iconColor: "text-[#0071e3]",
    iconBg: "bg-[#0071e3]/10",
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
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  return (
    <div dir={direction} className="min-h-screen bg-[#fbfbfd]">
      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-[40px] sm:text-[48px] font-semibold tracking-tight text-[#1d1d1f]">
            {isRTL ? "اختر خطتك" : "Choose Your Plan"}
          </h1>
          <p className="text-[17px] text-[#86868b] mt-3 max-w-xl mx-auto">
            {isRTL
              ? "ابدأ مجاناً للأفراد أو احصل على ميزات متقدمة لشركتك بدولار واحد فقط شهرياً"
              : "Start free for individuals or unlock advanced features for your business at just $1/month"}
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
                className={`bg-white rounded-2xl ring-1 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md relative ${
                  plan.popular ? "ring-[#D4A853] ring-2" : "ring-[#d2d2d7]/40"
                }`}
              >
                {plan.popular && (
                  <div className="bg-[#D4A853] text-[#1A1A2E] text-[12px] font-semibold text-center py-1.5 tracking-wide uppercase">
                    {isRTL ? "الأكثر شعبية" : "Most Popular"}
                  </div>
                )}
                <div className="p-6">
                  <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{name}</h3>
                  <p className="text-[13px] text-[#86868b] mt-0.5">{desc}</p>

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
                        <span className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">$${plan.price}</span>
                        <span className="text-[14px] text-[#86868b]"> /{isRTL ? "شهر" : "month"}</span>
                        {plan.id === "pro" && (
                          <p className="text-[12px] text-[#30d158] font-medium mt-1">
                            {isRTL ? "الشهر الأول مجاني!" : "First month free!"}
                          </p>
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

                  <Link
                    href={`/${locale}/auth?tab=signup`}
                    className={`w-full py-2.5 rounded-full text-[14px] font-medium transition-all duration-200 text-center block ${
                      plan.popular
                        ? "bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white shadow-sm hover:shadow-md"
                        : "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f]"
                    }`}
                  >
                    {plan.price === -1
                      ? isRTL ? "تواصل معنا" : "Contact Sales"
                      : isRTL ? "ابدأ الآن" : "Get Started"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-[15px] text-[#86868b]">
            {isRTL ? "هل لديك أسئلة؟" : "Have questions?"}{" "}
            <Link href={`/${locale}/contact`} className="text-[#0071e3] hover:underline">
              {isRTL ? "تواصل معنا" : "Contact us"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
