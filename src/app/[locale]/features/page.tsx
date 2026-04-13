// @ts-nocheck
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Shield, FileText, BarChart3, Users, Globe, Mail, Lock, Clock, Check, ArrowRight
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

const features = [
  { icon: Shield, title_en: "Digital Warranty Certificates", title_ar: "شهادات ضمان رقمية", desc_en: "Issue professional, tamper-proof warranty certificates with QR verification codes.", desc_ar: "إصدار شهادات ضمان احترافية مع رموز QR للتحقق.", color: "text-[#D4A853]", bg: "bg-[#D4A853]/10" },
  { icon: FileText, title_en: "Claims Management", title_ar: "إدارة المطالبات", desc_en: "Streamlined warranty claims workflow from submission to resolution.", desc_ar: "سير عمل مبسط للمطالبات من التقديم إلى الحل.", color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
  { icon: BarChart3, title_en: "Advanced Analytics", title_ar: "تحليلات متقدمة", desc_en: "Real-time dashboards with warranty performance metrics and insights.", desc_ar: "لوحات معلومات فورية مع مقاييس الأداء.", color: "text-[#30d158]", bg: "bg-[#30d158]/10" },
  { icon: Users, title_en: "Team Collaboration", title_ar: "تعاون الفريق", desc_en: "Invite team members with role-based access controls.", desc_ar: "دعوة أعضاء الفريق مع صلاحيات مخصصة.", color: "text-[#ff6482]", bg: "bg-[#ff6482]/10" },
  { icon: Globe, title_en: "Bilingual Support", title_ar: "دعم ثنائي اللغة", desc_en: "Full Arabic and English interface with RTL layout support.", desc_ar: "واجهة كاملة بالعربية والإنجليزية مع دعم RTL.", color: "text-[#bf5af2]", bg: "bg-[#bf5af2]/10" },
  { icon: Mail, title_en: "Email Ingestion", title_ar: "استيعاب البريد", desc_en: "Automatically create warranties from forwarded emails using AI.", desc_ar: "إنشاء ضمانات تلقائياً من البريد باستخدام الذكاء الاصطناعي.", color: "text-[#ff9f0a]", bg: "bg-[#ff9f0a]/10" },
  { icon: Lock, title_en: "Enterprise Security", title_ar: "أمان مؤسسي", desc_en: "Row-level security, encrypted data, and role-based permissions.", desc_ar: "أمان على مستوى الصف وتشفير البيانات.", color: "text-[#1d1d1f]", bg: "bg-[#1d1d1f]/10" },
  { icon: Clock, title_en: "Expiry Tracking", title_ar: "تتبع الانتهاء", desc_en: "Automatic notifications before warranty expiration dates.", desc_ar: "إشعارات تلقائية قبل انتهاء الضمان.", color: "text-[#5856d6]", bg: "bg-[#5856d6]/10" },
];

export default function FeaturesPage() {
  const params = useParams() ?? {};
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  return (
    <div dir={direction} className="min-h-screen bg-[#fbfbfd]">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-[40px] sm:text-[48px] font-semibold tracking-tight text-[#1d1d1f]">
            {isRTL ? "ميزات المنصة" : "Platform Features"}
          </h1>
          <p className="text-[17px] text-[#86868b] mt-3 max-w-2xl mx-auto">
            {isRTL ? "كل ما تحتاجه لإدارة الضمانات بكفاءة في قطاع البناء السعودي" : "Everything you need to manage warranties efficiently in the Saudi construction sector"}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="bg-white rounded-2xl p-6 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1.5">{isRTL ? feature.title_ar : feature.title_en}</h3>
                <p className="text-[13px] text-[#86868b] leading-relaxed">{isRTL ? feature.desc_ar : feature.desc_en}</p>
              </div>
            );
          })}
        </div>
        <div className="text-center mt-20">
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#2d2d5e] rounded-2xl p-10 text-white max-w-2xl mx-auto">
            <h2 className="text-[24px] font-semibold tracking-tight mb-3">{isRTL ? "ابدأ مجاناً اليوم" : "Start Free Today"}</h2>
            <p className="text-[15px] text-white/70 mb-6">{isRTL ? "أنشئ حسابك المجاني وابدأ إدارة ضماناتك في دقائق" : "Create your free account and start managing warranties in minutes"}</p>
            <Link href={`/${locale}/auth?tab=signup`} className="inline-flex items-center gap-2 bg-white text-[#1A1A2E] px-6 py-3 rounded-full text-[15px] font-medium hover:bg-white/90 transition-all">
              {isRTL ? "ابدأ الآن" : "Get Started"}
              <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
