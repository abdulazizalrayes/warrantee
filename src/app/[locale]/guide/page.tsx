"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, Shield, FileText, Upload, Bell, ChevronRight, Sparkles, ArrowRight, HelpCircle, Zap } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getDictionary, type Locale } from "@/lib/i18n";

export default function GuidePage() {
  const params = useParams() ?? {};
  const locale = params?.locale as string || "en";
  const isRTL = locale === "ar";
  const dictionary = getDictionary(locale as Locale);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const tr = (value: string) => value;

  const steps = [
    { icon: Upload, title: isRTL ? tr("أضف ضمانك الأول") : "Add Your First Warranty", desc: isRTL ? tr("ارفع صورة أو أدخل التفاصيل يدوياً. المسح الذكي يملأ الحقول تلقائياً.") : "Upload a photo or enter details manually. Smart Scan auto-fills fields for you.", color: "#0071e3" },
    { icon: Shield, title: isRTL ? tr("تتبع الحالة") : "Track Status", desc: isRTL ? tr("راقب حالة الضمانات النشطة والمنتهية والتي ستنتهي.") : "Monitor active, expiring, and expired warranties at a glance.", color: "#30d158" },
    { icon: Bell, title: isRTL ? tr("احصل على تنبيهات") : "Get Notified", desc: isRTL ? tr("استلم تنبيهات قبل انتهاء الضمان حتى لا تفوتك.") : "Receive alerts before warranties expire so you never miss a claim.", color: "#0071e3" },
    { icon: FileText, title: isRTL ? tr("قدم مطالبة") : "File a Claim", desc: isRTL ? tr("قدم مطالبة ضمان بضغطة واحدة وتابع التقدم.") : "Submit a warranty claim in one click and track its progress.", color: "#ff453a" },
  ];

  const faqs = [
    { q: isRTL ? tr("كيف أضيف ضماناً جديداً؟") : "How do I add a new warranty?", a: isRTL ? tr("اذهب إلى الضمانات > جديد وارفع صورة أو أدخل التفاصيل يدوياً.") : "Go to Warranties > New and upload a photo or enter details manually. Smart Scan will auto-fill fields from your receipt." },
    { q: isRTL ? tr("ما هو المسح الذكي؟") : "What is Smart Scan?", a: isRTL ? tr("تقنية OCR تقرأ الإيصالات ووثائق الضمان وتستخرج التفاصيل تلقائياً.") : "Smart Scan uses OCR technology to read receipts and warranty documents, automatically extracting product details, dates, and seller info." },
    { q: isRTL ? tr("كيف أقدم مطالبة ضمان؟") : "How do I file a warranty claim?", a: isRTL ? tr("افتح الضمان > انقر تقديم مطالبة > صف المشكلة وأرفق الصور.") : "Open the warranty > Click File Claim > Describe the issue and attach photos. We will notify the seller and track the process." },
    { q: isRTL ? tr("هل يمكنني مشاركة الضمان؟") : "Can I share a warranty?", a: isRTL ? tr("نعم، يمكنك مشاركة شهادة الضمان عبر رابط أو تنزيل PDF.") : "Yes! You can share the warranty certificate via a link or download it as a PDF." },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#fbfbfd]">
      <Navbar locale={locale as Locale} dictionary={dictionary} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0071e3]/10 mb-4">
            <BookOpen className="w-7 h-7 text-[#0071e3]" />
          </div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            {isRTL ? tr("دليل الاستخدام") : "Getting Started Guide"}
          </h1>
          <p className="text-[15px] text-[#86868b] mt-2 max-w-lg mx-auto">
            {isRTL ? tr("تعلم كيف تدير ضماناتك بفعالية في 4 خطوات بسيطة") : "Learn how to manage your warranties effectively in 4 simple steps"}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-6 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: step.color + "14" }}>
                      <Icon className="w-5 h-5" style={{ color: step.color }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-medium text-[#86868b]">{isRTL ? tr("الخطوة") : "Step"} {i + 1}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">{step.title}</h3>
                    <p className="text-[13px] text-[#86868b] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mb-10">
          <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-4">
            {isRTL ? tr("الأسئلة الشائعة") : "Frequently Asked Questions"}
          </h2>
          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden divide-y divide-[#d2d2d7]/30">
            {faqs.map((faq, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 hover:bg-[#fafafa] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-[#0071e3] flex-shrink-0" />
                    <span className="text-[14px] font-medium text-[#1d1d1f]">{faq.q}</span>
                  </div>
                  <ChevronRight className={"w-4 h-4 text-[#86868b] transition-transform " + (openFaq === i ? "rotate-90" : "")} />
                </div>
                {openFaq === i && (
                  <p className="text-[13px] text-[#86868b] mt-3 leading-relaxed pl-7">
                    {faq.a}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-2xl border border-[#0071e3]/10 bg-[#f5f9ff] p-8 text-center shadow-sm">
          <Sparkles className="w-8 h-8 text-[#0071e3] mx-auto mb-3" />
          <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">
            {isRTL ? tr("جاهز للبدء؟") : "Ready to get started?"}
          </h2>
          <p className="text-[14px] text-[#6e6e73] mb-5 max-w-md mx-auto">
            {isRTL ? tr("أضف ضمانك الأول الآن وابدأ في حماية مشترياتك") : "Add your first warranty now and start protecting your purchases"}
          </p>
          <Link
            href={"/" + locale + "/warranties/new"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0071e3] text-white rounded-full text-[14px] font-semibold hover:bg-[#0077ED] transition-colors"
          >
            <Zap className="w-4 h-4" />
            {isRTL ? tr("أضف ضمان") : "Add Warranty"}
            <ArrowRight className={"w-4 h-4 " + (isRTL ? "rotate-180" : "")} />
          </Link>
        </div>
      </main>
      <Footer locale={locale as Locale} dictionary={dictionary} />
    </div>
  );
}
