// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Check, Shield, Zap, Building2, Crown, User, Bell, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface SubscriptionInfo {
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  warranty_limit: number;
  team_limit: number;
  warranties_used: number;
  team_members_used: number;
}

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
    desc_ar: "للأفراد الذين يبدأون"
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
    desc_ar: "للشركات النامية"
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
    desc_ar: "للمؤسسات الكبيرة"
  },
];

export default function BillingPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchSub = async () => {
      const { data } = await supabase.rpc("get_user_subscription", { user_uuid: user.id });
      if (data) setSubscription(data as unknown as SubscriptionInfo);
      setLoading(false);
    };
    fetchSub();
  }, [user, authLoading, supabase]);

  const handleUpgrade = async (planId: string) => {
    if (planId === "enterprise") {
      window.location.href = "mailto:hello@warrantee.io?subject=" + encodeURIComponent(isRTL ? "استفسار عن خطة المؤسسات" : "Enterprise Plan Inquiry");
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, locale }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    }
    setUpgrading(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const currentPlan = subscription?.plan_id || "free";

  const sections = [
    { id: "profile", label: isRTL ? "الملف الشخصي" : "Profile", icon: User, href: `/${locale}/settings` },
    { id: "notifications", label: isRTL ? "الإشعارات" : "Notifications", icon: Bell, href: `/${locale}/settings` },
    { id: "language", label: isRTL ? "اللغة والمنطقة" : "Language & Region", icon: Globe, href: `/${locale}/settings` },
    { id: "subscription", label: isRTL ? "الاشتراك" : "Subscription", icon: CreditCard, href: `/${locale}/billing`, active: true },
    { id: "security", label: isRTL ? "الأمان" : "Security", icon: Shield, href: `/${locale}/settings` },
  ];

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[15px] text-[#86868b]">{dict.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={direction} className="min-h-[80vh]">
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={() => router.push(`/${locale}/settings`)}
          className="group inline-flex items-center gap-1.5 text-[15px] text-[#86868b] hover:text-[#1d1d1f] transition-colors mb-6"
        >
          {isRTL ? (
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          )}
          {isRTL ? "العودة للإعدادات" : "Back to Settings"}
        </button>
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
          {dict.common.settings}
        </h1>
        <p className="text-[17px] text-[#86868b] mt-2">
          {isRTL ? "إدارة اشتراكك وفواتيرك" : "Manage your subscription and billing"}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 max-w-[1100px]">
        {/* Sidebar Navigation - same as Settings page */}
        <nav className="lg:w-[240px] flex-shrink-0">
          <div className="lg:sticky lg:top-8 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 ${
                    section.active
                      ? "bg-[#1A1A2E] text-white shadow-sm"
                      : "text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {section.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Current Plan Card */}
          {subscription && (
            <div className="bg-gradient-to-br from-[#1A1A2E] to-[#2d2d5e] rounded-2xl p-8 text-white ring-1 ring-white/10 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[#D4A853]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white/60 uppercase tracking-wide">
                      {isRTL ? "خطتك الحالية" : "Current Plan"}
                    </p>
                    <p className="text-[21px] font-semibold tracking-tight">
                      {plans.find((p) => p.id === currentPlan)?.[isRTL ? "name_ar" : "name_en"] || currentPlan}
                    </p>
                  </div>
                </div>
                <span className="text-[13px] font-medium bg-[#D4A853] text-[#1A1A2E] px-3 py-1 rounded-full">
                  {subscription.status === "trialing" ? (isRTL ? "تجريبي" : "Trial") : (isRTL ? "نشط" : "Active")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-[12px] text-white/50 mb-1">{isRTL ? "الضمانات" : "Warranties"}</p>
                  <p className="text-[20px] font-semibold">{subscription.warranties_used}{subscription.warranty_limit > 0 && <span className="text-[14px] font-normal text-white/40"> / {subscription.warranty_limit}</span>}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-[12px] text-white/50 mb-1">{isRTL ? "الفريق" : "Team"}</p>
                  <p className="text-[20px] font-semibold">{subscription.team_members_used}{subscription.team_limit > 0 && <span className="text-[14px] font-normal text-white/40"> / {subscription.team_limit}</span>}</p>
                </div>
                {subscription.trial_end && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-[12px] text-white/50 mb-1">{isRTL ? "نهاية التجربة" : "Trial Ends"}</p>
                    <p className="text-[14px] font-medium">{formatDate(subscription.trial_end)}</p>
                  </div>
                )}
                {subscription.current_period_end && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-[12px] text-white/50 mb-1">{isRTL ? "التجديد" : "Renewal"}</p>
                    <p className="text-[14px] font-medium">{formatDate(subscription.current_period_end)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plans Section Header */}
          <div>
            <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-4">
              {isRTL ? "الخطط المتاحة" : "Available Plans"}
            </h3>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id;
              const Icon = plan.icon;
              const features = isRTL ? plan.features_ar : plan.features_en;
              const name = isRTL ? plan.name_ar : plan.name_en;
              const desc = isRTL ? plan.desc_ar : plan.desc_en;

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl ring-1 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md relative ${
                    plan.popular
                      ? "ring-[#D4A853] ring-2"
                      : isCurrentPlan
                      ? "ring-[#0071e3] ring-2"
                      : "ring-[#d2d2d7]/40"
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
                        <p className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">{isRTL ? "مجاني" : "Free"}</p>
                      ) : plan.price === -1 ? (
                        <p className="text-[17px] font-semibold text-[#1d1d1f]">{isRTL ? "تواصل معنا" : "Contact Us"}</p>
                      ) : (
                        <div>
                          <span className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">${plan.price}</span>
                          <span className="text-[14px] text-[#86868b]"> /{isRTL ? "شهر" : "month"}</span>
                          {plan.id === "pro" && (
                            <p className="text-[12px] text-[#30d158] font-medium mt-1">{isRTL ? "الشهر الأول مجاني!" : "First month free!"}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-6">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#1d1d1f]">
                          <div className="w-4 h-4 rounded-full bg-[#30d158]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check size={10} className="text-[#30d158]" />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-full text-[14px] font-medium bg-[#f5f5f7] text-[#86868b] cursor-not-allowed"
                      >
                        {isRTL ? "خطتك الحالية" : "Current Plan"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgrading}
                        className={`w-full py-2.5 rounded-full text-[14px] font-medium transition-all duration-200 disabled:opacity-50 ${
                          plan.popular
                            ? "bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white shadow-sm hover:shadow-md"
                            : "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f]"
                        }`}
                      >
                        {upgrading
                          ? "..."
                          : plan.price === -1
                          ? (isRTL ? "تواصل معنا" : "Contact Sales")
                          : (isRTL ? "ترقية" : "Upgrade")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
