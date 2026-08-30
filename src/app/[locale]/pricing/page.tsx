"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, Shield, Zap, Building2, UserRound } from "lucide-react";
import { DIRECTION, getDictionary, normalizeLocale } from "@/lib/i18n";
import { appendCampaignParams, trackFunnelCtaClick } from "@/lib/ga4-events";
import { PublicBreadcrumbs } from "@/components/PublicBreadcrumbs";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageViewTracker } from "@/components/PageViewTracker";

const plans = [
  {
    id: "personal-free",
    account: "consumer",
    icon: UserRound,
    iconColor: "text-[#0f766e]",
    iconBg: "bg-[#ccfbf1]",
    price: 0,
    features_en: ["Up to 10 personal warranties", "Receipts and supporting documents", "Expiry reminders", "Single user", "Full warranty history retained"],
    features_ar: ["حتى 10 ضمانات شخصية", "الفواتير والمستندات الداعمة", "تنبيهات انتهاء الضمان", "مستخدم واحد", "الاحتفاظ بسجل الضمان كاملًا"],
    name_en: "Personal Free",
    name_ar: "مجاني للأفراد",
    desc_en: "For people protecting their own purchases",
    desc_ar: "للأفراد لحفظ ضمانات مشترياتهم",
  },
  {
    id: "business-free",
    account: "business",
    icon: Shield,
    iconColor: "text-[#0071e3]",
    iconBg: "bg-[#0071e3]/10",
    price: 0,
    features_en: ["First 100 issued warranties", "Customer certificates and QR passports", "Basic claims workflow", "Single business user", "Full warranty history retained"],
    features_ar: ["أول 100 ضمان مُصدر", "شهادات العملاء وجوازات المنتج عبر QR", "مسار مطالبات أساسي", "مستخدم أعمال واحد", "الاحتفاظ بسجل الضمان كاملًا"],
    name_en: "Business Free",
    name_ar: "مجاني للأعمال",
    desc_en: "For businesses proving the customer workflow",
    desc_ar: "للشركات لتجربة مسار ضمان العملاء",
  },
  {
    id: "pro",
    account: "business",
    icon: Zap,
    iconColor: "text-[#0071e3]",
    iconBg: "bg-[#0071e3]/10",
    price: 14.9,
    usdPrice: 3.99,
    pricePrefix_en: "Founding-business launch price",
    pricePrefix_ar: "سعر إطلاق للشركات المؤسسة",
    featured: true,
    features_en: ["Up to 1,000 issued warranties", "Advanced analytics", "Priority email support", "Up to 3 team members", "Custom approval workflows", "Bilingual certificates and QR passports"],
    features_ar: ["حتى 1,000 ضمان مُصدر", "تحليلات متقدمة", "دعم بريد إلكتروني بأولوية", "حتى 3 أعضاء فريق", "مسارات موافقة مخصصة", "شهادات وجوازات منتج ثنائية اللغة"],
    name_en: "Professional",
    name_ar: "احترافي",
    desc_en: "For growing warranty operations",
    desc_ar: "لعمليات الضمان في الشركات النامية",
  },
  {
    id: "enterprise",
    account: "business",
    icon: Building2,
    iconColor: "text-[#1d1d1f]",
    iconBg: "bg-[#f5f5f7]",
    price: -1,
    features_en: ["More than 1,000 issued warranties", "Team limits by agreement", "Enterprise onboarding by agreement", "Custom integrations by agreement", "Service levels by agreement"],
    features_ar: ["أكثر من 1,000 ضمان مُصدر", "حدود الفريق حسب الاتفاق", "تهيئة المؤسسات حسب الاتفاق", "تكاملات مخصصة حسب الاتفاق", "مستويات الخدمة حسب الاتفاق"],
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
      : planId === "personal-free"
        ? `/${locale}/auth?tab=signup&account=consumer`
      : planId === "business-free"
        ? `/${locale}/auth?tab=signup&account=business`
        : `/${locale}/contact?intent=professional-access`;
    const trackedDestination = appendCampaignParams(rawDestination);

    trackFunnelCtaClick("pricing_plan_cta", trackedDestination, {
      locale,
      plan: planId,
      location: "pricing_plan_card",
    });

    if (planId === "personal-free" || planId === "business-free") {
      window.location.href = trackedDestination;
      return;
    }

    window.location.href = trackedDestination;
  };

  const renderPlanCard = (plan: (typeof plans)[number]) => {
    const Icon = plan.icon;
    const features = isRTL ? plan.features_ar : plan.features_en;
    const name = isRTL ? plan.name_ar : plan.name_en;
    const desc = isRTL ? plan.desc_ar : plan.desc_en;
    const isPersonal = plan.account === "consumer";

    return (
      <div
        key={plan.id}
        className={`relative h-full overflow-hidden rounded-2xl ring-1 shadow-sm transition-all duration-200 hover:shadow-md ${
          plan.featured
            ? "bg-white ring-2 ring-[#0071e3]"
            : isPersonal
              ? "bg-[#f7fffd] ring-[#0f766e]/35"
              : "bg-white ring-[#d2d2d7]/40"
        }`}
      >
        {plan.featured && (
          <div className="bg-[#0071e3] py-1.5 text-center text-[12px] font-semibold uppercase text-white">
            {isRTL ? "وصول تجريبي" : "Pilot access"}
          </div>
        )}
        <div className="p-6">
          <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${plan.iconBg}`}>
            <Icon className={`h-5 w-5 ${plan.iconColor}`} aria-hidden="true" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{name}</h3>
          <p className="mt-0.5 text-[13px] text-[#6e6e73]">{desc}</p>

          <div className="mb-5 mt-4">
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
                <span className="block text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
                  {isRTL ? `${plan.price.toFixed(2)} ر.س` : `SAR ${plan.price.toFixed(2)}`}
                </span>
                <span className="text-[14px] text-[#6e6e73]"> /{isRTL ? "شهر" : "month"}</span>
                {plan.id === "pro" && (
                  <>
                    <p className="mt-1 text-[13px] font-medium text-[#1d1d1f]">
                      {isRTL ? `${plan.usdPrice?.toFixed(2)} دولار خارج الخليج` : `USD ${plan.usdPrice?.toFixed(2)} outside the GCC`}
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-[#0071e3]">
                      {isRTL ? plan.pricePrefix_ar : plan.pricePrefix_en}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <ul className="mb-6 space-y-2.5">
            {features.map((feature: string) => (
              <li key={feature} className="flex items-start gap-2.5 text-[14px] text-[#1d1d1f]">
                <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#30d158]/10">
                  <Check size={10} className="text-[#30d158]" aria-hidden="true" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => selectPlan(plan.id)}
            className={`block w-full rounded-full py-2.5 text-center text-[14px] font-medium transition-all duration-200 ${
              plan.featured
                ? "bg-[#0071e3] text-white shadow-sm hover:bg-[#0077ED] hover:shadow-md"
                : isPersonal
                  ? "bg-[#0f766e] text-white hover:bg-[#115e59]"
                  : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
            }`}
          >
            {plan.price === -1
              ? isRTL ? "تواصل معنا" : "Contact Sales"
              : plan.id === "pro"
                ? isRTL ? "اطلب الانضمام للبرنامج" : "Request pilot access"
                : plan.id === "personal-free"
                  ? isRTL ? "أنشئ حسابًا شخصيًا" : "Create personal account"
                  : isRTL ? "أنشئ حساب أعمال" : "Create business account"}
          </button>
        </div>
      </div>
    );
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
              ? "اختر حسابًا شخصيًا لحفظ مشترياتك أو حساب أعمال لإصدار أول 100 ضمان للعملاء مجانًا."
              : "Choose Personal to protect your purchases or Business to issue the first 100 customer warranties free."}
          </p>
          <p className="mt-5 text-[13px] font-medium text-[#6e6e73]">
            {isRTL
              ? "الاحترافي بسعر إطلاق 14.90 ر.س شهريًا في الخليج أو 3.99 دولار خارجه. الدفع الإلكتروني ليس مفعّلًا للعامة بعد."
              : "Professional launches at SAR 14.90/month in the GCC or USD 3.99/month elsewhere. Online checkout is not yet generally active."}
          </p>
        </div>

        {/* Account families */}
        <div className="grid gap-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,3fr)] xl:gap-8">
          <section aria-labelledby="personal-plans-heading">
            <div className="flex items-center gap-2 border-t-2 border-[#0f766e] pt-4 text-[#0f766e]">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              <h2 id="personal-plans-heading" className="text-[13px] font-semibold uppercase">
                {isRTL ? "خطط الأفراد" : "Personal plan"}
              </h2>
            </div>
            <p className="mb-4 mt-2 text-[13px] leading-5 text-[#6e6e73]">
              {isRTL ? "لحفظ ضمانات مشترياتك الشخصية." : "For warranties on purchases you own."}
            </p>
            {plans.filter((plan) => plan.account === "consumer").map(renderPlanCard)}
          </section>

          <section aria-labelledby="business-plans-heading">
            <div className="flex items-center gap-2 border-t-2 border-[#0071e3] pt-4 text-[#0071e3]">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              <h2 id="business-plans-heading" className="text-[13px] font-semibold uppercase">
                {isRTL ? "خطط الأعمال" : "Business plans"}
              </h2>
            </div>
            <p className="mb-4 mt-2 text-[13px] leading-5 text-[#6e6e73]">
              {isRTL ? "لإصدار ضمانات العملاء وإدارة الفريق." : "For issuing customer warranties and managing a team."}
            </p>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {plans.filter((plan) => plan.account === "business").map(renderPlanCard)}
            </div>
          </section>
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
                  ? "سعر الاحترافي المقترح هو 14.90 ر.س شهريًا في دول الخليج و3.99 دولار شهريًا خارجها، حتى 1,000 ضمان مُصدر. نؤكد التفعيل قبل أي دفع ولا توجد رسوم تلقائية حاليًا."
                  : "The proposed Professional launch price is SAR 14.90/month in the GCC and USD 3.99/month elsewhere for up to 1,000 issued warranties. Activation is confirmed before payment and there is currently no automatic charge."}
              </p>
            </div>
            <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
              {[
                {
                  icon: Shield,
                  title: isRTL ? "بدون بطاقة للخطة المجانية" : "No card for Free",
                  desc: isRTL ? "10 ضمانات شخصية أو أول 100 ضمان للأعمال دون بطاقة." : "10 personal warranties or the first 100 Business warranties without a card.",
                },
                {
                  icon: Check,
                  title: isRTL ? "تسعير إقليمي واضح" : "Clear regional pricing",
                  desc: isRTL ? "14.90 ر.س في الخليج أو 3.99 دولار خارجه." : "SAR 14.90 in the GCC or USD 3.99 elsewhere.",
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
