import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarClock, ChevronRight, FileCheck, QrCode, Shield, Wrench } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getDictionary, type Locale, DIRECTION } from "@/lib/i18n";

interface DemoPassportPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: DemoPassportPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr ? "نموذج جواز منتج | Warrantee" : "Sample Product Passport | Warrantee",
    description: isAr
      ? "نموذج عام يوضح كيف يظهر سجل ضمان موثق في Warrantee."
      : "A generic sample showing how a verified warranty record appears in Warrantee.",
    robots: { index: false, follow: true },
  };
}

export default async function DemoProductPassportPage({ params }: DemoPassportPageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === "rtl";

  const steps = [
    {
      icon: BadgeCheck,
      title: isRTL ? "تحقق من الأصالة" : "Authenticity verified",
      body: isRTL
        ? "يظهر السجل أن الضمان صادر من بائع مسجل وليس ملف PDF منفصل."
        : "The record shows the warranty was issued by a registered seller, not a detached PDF.",
    },
    {
      icon: FileCheck,
      title: isRTL ? "الشهادة والمستندات" : "Certificate and evidence",
      body: isRTL
        ? "الشهادة والمستندات مرتبطة بنفس سجل الضمان لتقليل النزاعات."
        : "The certificate and documents stay attached to the same warranty record to reduce disputes.",
    },
    {
      icon: Wrench,
      title: isRTL ? "مطالبة جاهزة للسياق" : "Context-ready claim",
      body: isRTL
        ? "عند فتح مطالبة، تنتقل بيانات المنتج والضمان معها تلقائيا."
        : "When a claim is opened, product and warranty context moves with it.",
    },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <Navbar locale={locale} dictionary={dictionary} />
      <main>
        <section className="px-4 pb-12 pt-24 sm:px-6">
          <div className="mx-auto max-w-[980px]">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#0071e3]/10 px-3 py-1 text-[13px] font-semibold text-[#0071e3]">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              {isRTL ? "نموذج توضيحي" : "Sample experience"}
            </div>
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <div>
                <h1 className="text-[38px] font-semibold leading-tight tracking-tight sm:text-[52px]">
                  {isRTL ? "جواز منتج موثق قبل أن تضيف أول ضمان." : "A verified product passport before your first warranty."}
                </h1>
                <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-[#6e6e73]">
                  {isRTL
                    ? "هذا سجل تجريبي عام يوضح تجربة المشتري والبائع. لا يحتوي على بيانات عميل حقيقية ولا يستخدم كإثبات تجاري."
                    : "This is a generic sample record for the buyer and seller experience. It contains no real customer data and is not commercial proof."}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/${locale}/warranties/new`}
                    className="inline-flex items-center justify-center rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#0077ED]"
                  >
                    {isRTL ? "أضف ضمانك الأول" : "Add your first warranty"}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/${locale}/contact?intent=enterprise-demo`}
                    className="inline-flex items-center justify-center rounded-full border border-[#d2d2d7] px-6 py-3 text-[15px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                  >
                    {isRTL ? "اطلب عرضا للشركات" : "Request an enterprise demo"}
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
                <div className="rounded-2xl bg-[#1A1A2E] p-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.18em] text-white/55">
                        {isRTL ? "رقم السجل" : "Record"}
                      </p>
                      <h2 className="mt-2 text-[24px] font-semibold">
                        {isRTL ? "جهاز ذكي - نموذج" : "Smart Device - Sample"}
                      </h2>
                      <p className="mt-1 text-[14px] text-white/65">WR-SAMPLE-2026</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#1A1A2E]">
                      <QrCode className="h-8 w-8" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      [isRTL ? "الحالة" : "Status", isRTL ? "نشط" : "Active"],
                      [isRTL ? "انتهاء الضمان" : "Warranty until", "31 Dec 2027"],
                      [isRTL ? "البائع" : "Seller", isRTL ? "بائع مسجل" : "Registered seller"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-white/8 p-3">
                        <p className="text-[11px] text-white/45">{label}</p>
                        <p className="mt-1 text-[14px] font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {steps.map((step) => (
                    <div key={step.title} className="rounded-2xl border border-[#d2d2d7]/60 bg-[#fbfbfd] p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0071e3]/10">
                          <step.icon className="h-5 w-5 text-[#0071e3]" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold">{step.title}</h3>
                          <p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">{step.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-[#f5f5f7] p-4">
                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-5 w-5 text-[#0071e3]" aria-hidden="true" />
                    <p className="text-[14px] font-medium">
                      {isRTL
                        ? "تنبيه تمديد قبل انتهاء الضمان ب 90 يوما."
                        : "Extension reminder 90 days before the warranty expires."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-[#d2d2d7]/70 bg-white p-5">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-[#0071e3]" aria-hidden="true" />
                <p className="text-[14px] leading-relaxed text-[#6e6e73]">
                  {isRTL
                    ? "في الإنتاج، لا يرى المستخدم إلا السجلات المسموح له بها. هذا النموذج عام ومفصول عن بيانات العملاء."
                    : "In production, each user only sees records they are allowed to access. This sample is public and separated from customer data."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
