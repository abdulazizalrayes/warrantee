import type { Metadata } from "next";
import { ShieldCheck, LockKeyhole, FileScan, KeyRound, Activity, CreditCard, Database, AlertTriangle } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getDictionary, DIRECTION, type Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/page-metadata";

interface SecurityPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SecurityPageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata("security", locale);
}

export default async function SecurityPage({ params }: SecurityPageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === "rtl";

  const controls = [
    {
      icon: LockKeyhole,
      title: isRTL ? "مصادقة وحدود جلسات" : "Authentication and session boundaries",
      body: isRTL
        ? "تستخدم صفحات الحساب ولوحات التحكم مسارات محمية، وتُبقي استرجاع كلمة المرور وتحديث الجلسة ضمن تدفقات محددة."
        : "Account and dashboard pages are protected routes, with password recovery and session refresh kept inside controlled flows.",
    },
    {
      icon: Database,
      title: isRTL ? "عزل المستخدمين والمستأجرين" : "User and tenant isolation",
      body: isRTL
        ? "تُراجع استعلامات الضمانات والمطالبات والمستندات حول صلاحية المالك والفريق، مع فحوصات إنتاجية لسياسات RLS."
        : "Warranty, claim, and document access is scoped around owner and team boundaries, with production RLS probes in the release gate.",
    },
    {
      icon: KeyRound,
      title: isRTL ? "رموز API محددة الصلاحيات" : "Scoped API integration tokens",
      body: isRTL
        ? "تكاملات API / CLI / MCP تعتمد على رموز تكامل، وليس اسم المستخدم وكلمة المرور، مع حدود طلبات ونطاقات استخدام."
        : "API / CLI / MCP integrations use integration tokens instead of usernames and passwords, with scopes and rate limits.",
    },
    {
      icon: FileScan,
      title: isRTL ? "أمان المستندات و OCR" : "Document and OCR safety",
      body: isRTL
        ? "تخضع الملفات لفحوصات امتداد ونوع ومخاطر PDF، وتوجد بوابة Corpus لاختبار حالات OCR قبل تغييرات الاستخراج."
        : "Files pass extension, MIME, and PDF-risk checks, while OCR corpus gates protect extraction changes from regressions.",
    },
    {
      icon: CreditCard,
      title: isRTL ? "سلامة المدفوعات" : "Payment integrity",
      body: isRTL
        ? "يعتمد Stripe على Webhook موقّع وفحوصات جاهزية إنتاجية لمنع تحديثات دفع غير موثوقة."
        : "Stripe relies on signed webhooks and production readiness checks to prevent untrusted payment-state changes.",
    },
    {
      icon: Activity,
      title: isRTL ? "مراقبة الإنتاج" : "Production monitoring",
      body: isRTL
        ? "تمر التغييرات عبر CI وبوابات أمان إنتاجية تشمل Smoke وRLS وجاهزية تشغيلية وE2E وحمل مضبوط."
        : "Changes pass CI and Production Security Gates covering smoke, RLS, operational readiness, E2E, and controlled load checks.",
    },
  ];

  const commitments = [
    isRTL ? "لا نطلب كلمات مرور العملاء لاستخدام التكاملات." : "We do not ask integrators to share user passwords.",
    isRTL ? "لا تُدرج صفحات الحساب والضمانات الخاصة في خريطة الموقع." : "Private account and warranty pages are excluded from the sitemap.",
    isRTL ? "لا تُعد لقطات الشاشة أو تحميل الصفحة دليلاً كافياً للجاهزية." : "A page load or screenshot alone is not treated as release proof.",
    isRTL ? "تحتاج مبيعات المؤسسات إلى اختبار اختراق خارجي قبل التوسع الكبير." : "Enterprise expansion should include an external penetration test before larger rollouts.",
  ];

  return (
    <>
      <Navbar locale={locale} dictionary={dictionary} />
      <main dir={isRTL ? "rtl" : "ltr"} className="bg-white text-[#1d1d1f]">
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-[980px]">
            <div className="max-w-3xl">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#0071e3]">
                {isRTL ? "الأمان والثقة" : "Security and trust"}
              </p>
              <h1 className="mt-4 text-[40px] font-semibold leading-tight tracking-tight sm:text-[56px]">
                {isRTL ? "ضوابط جاهزة لعمليات الضمانات الحساسة." : "Controls for sensitive warranty operations."}
              </h1>
              <p className="mt-5 text-[19px] leading-relaxed text-[#6e6e73]">
                {isRTL
                  ? "تتعامل وارنتي مع ضمانات ومطالبات ومستندات وتكاملات ومدفوعات. لذلك تُصمم المنصة حول العزل، قابلية التدقيق، وتقليل مشاركة البيانات."
                  : "Warrantee handles warranties, claims, documents, integrations, and payments. The platform is designed around isolation, auditability, and minimizing data exposure."}
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                { label: isRTL ? "CI" : "CI", value: isRTL ? "إلزامي" : "Required" },
                { label: isRTL ? "بوابات إنتاجية" : "Production gates", value: isRTL ? "مفعلة" : "Active" },
                { label: isRTL ? "اختبار خارجي" : "External pentest", value: isRTL ? "مرحلة التنفيذ" : "Execution-ready" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-black/[0.06] bg-[#f5f5f7] p-5">
                  <p className="text-[13px] text-[#6e6e73]">{item.label}</p>
                  <p className="mt-2 text-[24px] font-semibold text-[#1d1d1f]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-[980px] gap-5 md:grid-cols-2">
            {controls.map((control) => (
              <div key={control.title} className="rounded-2xl bg-white p-6 ring-1 ring-black/[0.06]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0071e3]/10">
                  <control.icon className="h-5 w-5 text-[#0071e3]" aria-hidden="true" />
                </div>
                <h2 className="text-[19px] font-semibold">{control.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">{control.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-[980px] gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <ShieldCheck className="h-9 w-9 text-[#0071e3]" aria-hidden="true" />
              <h2 className="mt-4 text-[32px] font-semibold tracking-tight">
                {isRTL ? "التزامات تشغيلية واضحة" : "Clear operating commitments"}
              </h2>
              <p className="mt-3 text-[16px] leading-relaxed text-[#6e6e73]">
                {isRTL
                  ? "هذه الصفحة تشرح الضوابط الحالية، وليست شهادة امتثال خارجية. سيتم تحديثها بعد تقرير الاختبار الخارجي."
                  : "This page explains current controls, not a third-party compliance certification. It should be updated after the external pentest report."}
              </p>
            </div>
            <div className="space-y-3">
              {commitments.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-black/[0.06] bg-white p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#0071e3]" aria-hidden="true" />
                  <p className="text-[15px] leading-relaxed text-[#1d1d1f]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </>
  );
}
