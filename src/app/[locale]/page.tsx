import type { Metadata } from "next";
import {
  BadgeCheck,
  Bell,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  KeyRound,
  Mail,
  QrCode,
  ScanLine,
  ShieldCheck,
  UserRound,
  Workflow,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PageViewTracker } from "@/components/PageViewTracker";
import { TrackedLink } from "@/components/TrackedLink";
import { WarrantyProofPreview } from "@/components/marketing/WarrantyProofPreview";
import { DIRECTION, getDictionary, type Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  PROFESSIONAL_PRICE_SAR,
  PROFESSIONAL_PRICE_USD,
} from "@/lib/plan-config";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata("home", locale);
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === "rtl";
  const ForwardIcon = isRTL ? ChevronLeft : ChevronRight;

  const proofPoints = isRTL
    ? ["خطة مجانية دون بطاقة", "شهادات عربية وإنجليزية", "تحقق مباشر عبر QR"]
    : ["Free plan, no card", "Arabic and English certificates", "Live QR verification"];

  const workflowSteps = isRTL
    ? [
        {
          icon: FileCheck2,
          eyebrow: "01 — الإصدار",
          title: "أنشئ سجل الضمان مرة واحدة.",
          body: "أضف المنتج والمدة والشروط والمستندات في سجل منظم يملكه الشخص أو الشركة الصحيحة.",
          detail: "إدخال يدوي، استيراد جماعي، أو بريد إلى ضمان.",
        },
        {
          icon: Workflow,
          eyebrow: "02 — القرار",
          title: "وجّه الموافقات والمطالبات بسياق كامل.",
          body: "تبقى الأدلة والشروط وسجل القرارات مرتبطة بالضمان، بدل البحث بين الرسائل والجداول.",
          detail: "صلاحيات شركة، موافقات، مطالبات، وسجل تدقيق.",
        },
        {
          icon: QrCode,
          eyebrow: "03 — الإثبات",
          title: "شارك شهادة وجواز منتج يمكن التحقق منهما.",
          body: "يمسح المشتري رمز QR للتحقق من الحالة وفتح الشهادة وبدء المطالبة من نفس السجل.",
          detail: "تجربة ثنائية اللغة جاهزة للجوال.",
        },
      ]
    : [
        {
          icon: FileCheck2,
          eyebrow: "01 — Issue",
          title: "Create the warranty record once.",
          body: "Capture the product, coverage, terms, and evidence in a structured record owned by the right person or company.",
          detail: "Manual entry, bulk import, or email-to-warranty.",
        },
        {
          icon: Workflow,
          eyebrow: "02 — Decide",
          title: "Route approvals and claims with full context.",
          body: "Evidence, terms, and decisions stay connected to the warranty instead of being scattered across email and spreadsheets.",
          detail: "Company permissions, approvals, claims, and audit history.",
        },
        {
          icon: QrCode,
          eyebrow: "03 — Prove",
          title: "Share a certificate and verifiable product passport.",
          body: "The buyer scans a QR code to verify status, open the certificate, and start a claim from the same record.",
          detail: "Bilingual and ready for mobile use.",
        },
      ];

  const trustItems = isRTL
    ? [
        { icon: ShieldCheck, title: "حدود وصول واضحة", body: "الوصول للحساب والتكاملات مصادق ومقيد بالشركة والصلاحية." },
        { icon: FileCheck2, title: "أدلة مرتبطة بالسجل", body: "تبقى الشهادات والمستندات والمطالبات مع الضمان نفسه." },
        { icon: ScanLine, title: "تحقق عام آمن", body: "تعرض صفحة التحقق ما يلزم لإثبات الضمان دون كشف بيانات خاصة." },
        { icon: KeyRound, title: "تكاملات محددة الصلاحيات", body: "API / CLI / MCP تستخدم رموزًا قابلة للإلغاء، وليس كلمات مرور المستخدمين." },
      ]
    : [
        { icon: ShieldCheck, title: "Clear access boundaries", body: "Account and integration access is authenticated, company-aware, and scoped." },
        { icon: FileCheck2, title: "Evidence stays attached", body: "Certificates, documents, and claims remain connected to the warranty record." },
        { icon: ScanLine, title: "Privacy-aware verification", body: "Public verification shows what proves coverage without exposing private account data." },
        { icon: KeyRound, title: "Scoped integrations", body: "API / CLI / MCP use revocable tokens, never a customer username or password." },
      ];

  const pricing = isRTL
    ? [
        { name: "مجاني للأفراد", price: "0 ر.س", body: "حتى 10 ضمانات شخصية مع الفواتير والتنبيهات والاحتفاظ بالسجل.", cta: "أنشئ حسابًا شخصيًا", href: `/${locale}/auth?tab=signup&account=consumer`, id: "personal-free", audience: "personal" },
        { name: "مجاني للأعمال", price: "0 ر.س", body: "أول 100 ضمان مُصدر للعملاء مع الشهادات وجوازات المنتج.", cta: "أنشئ حساب أعمال", href: `/${locale}/auth?tab=signup&account=business`, id: "business-free", audience: "business" },
        { name: "الاحترافي", price: `${PROFESSIONAL_PRICE_SAR} ر.س / ${PROFESSIONAL_PRICE_USD} دولارات`, secondaryPrice: "شهريًا", body: "حتى 1,000 ضمان مُصدر و3 أعضاء فريق ومسارات موافقة مخصصة.", cta: "اطلب تفعيل الاحترافي", href: `/${locale}/contact?intent=professional-access`, id: "professional", audience: "business" },
        { name: "المؤسسات", price: "حسب الاتفاق", body: "لأكثر من 1,000 ضمان مع تهيئة وتكاملات ومستوى خدمة حسب النطاق.", cta: "ناقش احتياج المؤسسة", href: `/${locale}/contact?intent=enterprise`, id: "enterprise", audience: "business" },
      ]
    : [
        { name: "Personal Free", price: "SAR 0", body: "Up to 10 personal warranties with receipts, reminders, and the full record retained.", cta: "Create personal account", href: `/${locale}/auth?tab=signup&account=consumer`, id: "personal-free", audience: "personal" },
        { name: "Business Free", price: "SAR 0", body: "The first 100 issued customer warranties with certificates and QR product passports.", cta: "Create business account", href: `/${locale}/auth?tab=signup&account=business`, id: "business-free", audience: "business" },
        { name: "Professional", price: `SAR ${PROFESSIONAL_PRICE_SAR} / USD ${PROFESSIONAL_PRICE_USD}`, secondaryPrice: "per month", body: "Up to 1,000 issued warranties, 3 team members, and custom approval workflows.", cta: "Request Professional access", href: `/${locale}/contact?intent=professional-access`, id: "professional", audience: "business" },
        { name: "Enterprise", price: "By agreement", body: "More than 1,000 warranties with onboarding, integrations, and service levels based on scope.", cta: "Discuss enterprise needs", href: `/${locale}/contact?intent=enterprise`, id: "enterprise", audience: "business" },
      ];

  const renderPricingPlan = (plan: (typeof pricing)[number]) => (
    <article key={plan.id} className="flex h-full min-h-0 flex-col px-5 py-6 lg:px-6">
      <h3 className="text-[19px] font-semibold text-[#1d1d1f]">{plan.name}</h3>
      <p className="mt-3 text-[24px] font-semibold tracking-tight text-[#1d1d1f]">{plan.price}</p>
      {plan.secondaryPrice && <p className="mt-1 text-[12px] font-medium text-[#6e6e73]">{plan.secondaryPrice}</p>}
      <p className="mt-3 flex-1 text-[14px] leading-6 text-[#6e6e73]">{plan.body}</p>
      <TrackedLink
        href={plan.href}
        cta={`home_pricing_${plan.id}`}
        locale={locale}
        location="home_pricing"
        className={`mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold transition-colors ${
          plan.audience === "personal"
            ? "text-[#0f766e] hover:text-[#115e59]"
            : "text-[#0071e3] hover:text-[#0077ed]"
        }`}
      >
        {plan.cta}
        <ForwardIcon className="h-4 w-4" aria-hidden="true" />
      </TrackedLink>
    </article>
  );

  return (
    <>
      <PageViewTracker pageName="home" pageType="marketing" locale={locale} />
      <Navbar locale={locale} dictionary={dictionary} />

      <main>
        <section className="overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="mx-auto max-w-[1160px]">
            <div className="mx-auto max-w-[850px] text-center">
              <p className="brand-eyebrow">
                {isRTL ? "منصة تشغيل الضمانات للشركات والمشترين" : "Warranty operations for businesses and buyers"}
              </p>
              <h1 className="mt-5 text-[40px] font-semibold leading-[1.04] tracking-tight text-[#1d1d1f] sm:text-[58px] lg:text-[68px]">
                {isRTL ? "أصدر كل ضمان. واجعل كل التزام قابلًا للتحقق." : "Issue every warranty. Keep every promise verifiable."}
              </h1>
              <p className="mx-auto mt-6 max-w-[720px] text-[18px] leading-relaxed text-[#6e6e73] sm:text-[21px]">
                {isRTL
                  ? "أنشئ سجل الضمان والشهادة الثنائية ومسار المطالبة وجواز المنتج في منصة واحدة، ثم شارك إثباتًا يمكن للمشتري التحقق منه فورًا."
                  : "Create the warranty record, bilingual certificate, claim path, and product passport in one platform, then give every buyer proof they can verify instantly."}
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <TrackedLink href={`/${locale}/auth?tab=signup`} cta="hero_create_first_warranty" locale={locale} location="home_hero" className="brand-action-primary">
                  {isRTL ? "أنشئ أول ضمان" : "Create your first warranty"}
                  <ForwardIcon className="h-4 w-4" aria-hidden="true" />
                </TrackedLink>
                <TrackedLink href={`/${locale}/demo/product-passport`} cta="hero_live_passport" locale={locale} location="home_hero" className="brand-action-secondary">
                  {isRTL ? "شاهد جواز منتج مباشر" : "View a live product passport"}
                  <ForwardIcon className="h-4 w-4" aria-hidden="true" />
                </TrackedLink>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] font-medium text-[#6e6e73] sm:text-[13px]">
                {proofPoints.map((point) => (
                  <span key={point} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#248a3d]" aria-hidden="true" />
                    {point}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-12 sm:mt-14">
              <WarrantyProofPreview isRTL={isRTL} />
            </div>
          </div>
        </section>

        <section id="features" className="bg-[#f5f5f7] px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[1080px]">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="brand-eyebrow">{isRTL ? "مسار واحد متصل" : "One connected record"}</p>
                <h2 className="mt-4 text-[34px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[44px]">
                  {isRTL ? "من الإصدار إلى المطالبة دون فجوات." : "From issue to claim, without the gaps."}
                </h2>
                <p className="mt-5 text-[17px] leading-relaxed text-[#6e6e73]">
                  {isRTL
                    ? "يحل Warrantee محل الجداول والملفات المنفصلة بسجل واحد يحافظ على الملكية والأدلة والقرارات ومسار التحقق."
                    : "Warrantee replaces disconnected spreadsheets and files with one record that keeps ownership, evidence, decisions, and verification together."}
                </p>
              </div>

              <div id="how-it-works" className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
                {workflowSteps.map(({ icon: Icon, eyebrow, title, body, detail }) => (
                  <article key={eyebrow} className="grid gap-5 py-8 sm:grid-cols-[72px_1fr] sm:py-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0071e3] shadow-sm ring-1 ring-black/[0.04]">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="brand-eyebrow">{eyebrow}</p>
                      <h3 className="mt-3 text-[24px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[28px]">{title}</h3>
                      <p className="mt-3 text-[16px] leading-7 text-[#6e6e73]">{body}</p>
                      <p className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#1d1d1f]">
                        <BadgeCheck className="h-4 w-4 text-[#0071e3]" aria-hidden="true" />
                        {detail}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-[1080px] gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="rounded-[28px] bg-[#1d1d1f] p-6 text-white sm:p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">{isRTL ? "جواز المنتج" : "Product passport"}</p>
                  <h3 className="mt-3 max-w-sm text-[28px] font-semibold leading-tight sm:text-[34px]">
                    {isRTL ? "نقطة تحقق واحدة للمشتري وفريق الخدمة." : "One verification point for the buyer and service team."}
                  </h3>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1d1d1f]">
                  <QrCode className="h-10 w-10" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-10 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
                {[isRTL ? "التحقق من الحالة" : "Verify coverage", isRTL ? "فتح الشهادة" : "Open certificate", isRTL ? "بدء المطالبة" : "Start a claim", isRTL ? "متابعة طلب التمديد" : "Track an extension request"].map((label) => (
                  <p key={label} className="flex items-center gap-2 text-[13px] text-white/75">
                    <CheckCircle2 className="h-4 w-4 text-[#5ac8fa]" aria-hidden="true" />
                    {label}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <p className="brand-eyebrow">{isRTL ? "إثبات يراه العميل" : "Proof your customer can see"}</p>
              <h2 className="mt-4 text-[34px] font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-[44px]">
                {isRTL ? "الشهادة ليست نهاية المسار. إنها بداية العلاقة." : "The certificate is not the end. It is the start of the relationship."}
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-[#6e6e73]">
                {isRTL
                  ? "يبقى جواز المنتج متصلًا بسجل الضمان، فيعرف المشتري ما هو نشط وما هي الأدلة وما الخطوة التالية دون مراسلات إضافية."
                  : "The product passport stays connected to the warranty record, so buyers can see what is active, what proves it, and what to do next without another email thread."}
              </p>
              <TrackedLink href={`/${locale}/demo/product-passport`} cta="passport_proof_demo" locale={locale} location="home_passport" className="brand-action-secondary mt-8">
                {isRTL ? "افتح النموذج المباشر" : "Open the live sample"}
                <ForwardIcon className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
            </div>
          </div>
        </section>

        <section className="border-y border-black/[0.06] bg-[#fbfbfd] px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-[1080px]">
            <div className="mx-auto max-w-[680px] text-center">
              <p className="brand-eyebrow">{isRTL ? "ثقة قابلة للفحص" : "Inspectable trust"}</p>
              <h2 className="mt-4 text-[32px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[40px]">
                {isRTL ? "الثقة تأتي من السجل، لا من الادعاء." : "Trust comes from the record, not the claim."}
              </h2>
            </div>
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {trustItems.map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <Icon className="h-5 w-5 text-[#0071e3]" aria-hidden="true" />
                  <h3 className="mt-4 text-[16px] font-semibold text-[#1d1d1f]">{title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-[#6e6e73]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[1440px]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-[680px]">
                <p className="brand-eyebrow">{isRTL ? "تسعير واضح" : "Clear pricing"}</p>
                <h2 className="mt-4 text-[34px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[44px]">
                  {isRTL ? "ابدأ مجانًا. انتقل عندما يحتاج فريقك." : "Start free. Move up when your team needs it."}
                </h2>
                <p className="mt-4 text-[16px] leading-7 text-[#6e6e73]">
                  {isRTL
                    ? "الدفع الإلكتروني للاحترافي والتمديدات ليس مفعّلًا للعامة بعد. نؤكد النطاق والشروط قبل أي دفع."
                    : "Online Professional and extension payments are not generally active yet. We confirm scope and terms before any payment."}
                </p>
              </div>
              <TrackedLink href={`/${locale}/pricing`} cta="home_pricing_details" locale={locale} location="home_pricing" className="brand-action-secondary">
                {isRTL ? "تفاصيل الخطط" : "Compare plan details"}
                <ForwardIcon className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
            </div>

            <div className="mt-12 grid items-stretch gap-10 lg:grid-cols-[minmax(240px,1fr)_minmax(0,3fr)] lg:gap-8">
              <section
                aria-labelledby="home-personal-plans"
                data-testid="home-personal-plan-group"
                className="grid h-full grid-rows-[auto_minmax(0,1fr)] border-t-2 border-[#0f766e] bg-[#f0fdfa]"
              >
                <div className="flex items-center gap-2 px-5 pt-5 text-[#0f766e]">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  <h3 id="home-personal-plans" className="text-[12px] font-semibold uppercase">
                    {isRTL ? "للأفراد" : "Personal"}
                  </h3>
                </div>
                {pricing.filter((plan) => plan.audience === "personal").map(renderPricingPlan)}
              </section>

              <section
                aria-labelledby="home-business-plans"
                data-testid="home-business-plan-group"
                className="grid h-full grid-rows-[auto_minmax(0,1fr)] border-t-2 border-[#0071e3]"
              >
                <div className="flex items-center gap-2 px-5 pt-5 text-[#0071e3]">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  <h3 id="home-business-plans" className="text-[12px] font-semibold uppercase">
                    {isRTL ? "للأعمال" : "Business"}
                  </h3>
                </div>
                <div className="mt-1 h-full divide-y divide-black/[0.08] lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0 rtl:lg:divide-x-reverse">
                  {pricing.filter((plan) => plan.audience === "business").map(renderPricingPlan)}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section id="contact" className="bg-[#1d1d1f] px-4 py-20 text-white sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[760px] text-center">
            <Bell className="mx-auto h-7 w-7 text-[#5ac8fa]" aria-hidden="true" />
            <h2 className="mt-5 text-[36px] font-semibold leading-tight tracking-tight sm:text-[48px]">
              {isRTL ? "أنشئ أول سجل يمكن الاعتماد عليه." : "Create the first record you can rely on."}
            </h2>
            <p className="mx-auto mt-5 max-w-[620px] text-[17px] leading-relaxed text-white/65">
              {isRTL
                ? "ابدأ مجانًا دون بطاقة. أنشئ الضمان، أرفق الإثبات، وشارك جواز المنتج من نفس المسار."
                : "Start free without a card. Create the warranty, attach the evidence, and share the product passport from the same flow."}
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <TrackedLink href={`/${locale}/auth?tab=signup`} cta="bottom_create_first_warranty" locale={locale} location="home_bottom_cta" className="brand-action-primary">
                {isRTL ? "أنشئ أول ضمان" : "Create your first warranty"}
                <ForwardIcon className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
              <a href="mailto:hello@warrantee.io" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-white/10">
                <Mail className="h-4 w-4" aria-hidden="true" />
                hello@warrantee.io
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} dictionary={dictionary} />
    </>
  );
}
