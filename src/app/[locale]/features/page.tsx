import Link from "next/link";
import {
  Shield, FileText, BarChart3, Users, Globe, Mail, Lock, Clock, ArrowRight
} from "lucide-react";
import { DIRECTION, getDictionary, normalizeLocale } from "@/lib/i18n";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type FeaturesPageProps = {
  params: Promise<{ locale: string }>;
};

const features = [
  { icon: Shield, title_en: "Digital Warranty Certificates", title_ar: "شهادات ضمان رقمية", desc_en: "Issue bilingual certificates tied to QR-verifiable warranty records.", desc_ar: "أصدر شهادات ثنائية اللغة مرتبطة بسجلات ضمان يمكن التحقق منها عبر QR.", color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
  { icon: FileText, title_en: "Claims Management", title_ar: "إدارة المطالبات", desc_en: "Streamlined warranty claims workflow from submission to resolution.", desc_ar: "سير عمل مبسط للمطالبات من التقديم إلى الحل.", color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
  { icon: BarChart3, title_en: "Warranty Analytics", title_ar: "تحليلات الضمان", desc_en: "Current-status dashboards with warranty metrics and operational insights.", desc_ar: "لوحات حالة حالية تعرض مقاييس الضمان ورؤى التشغيل.", color: "text-[#30d158]", bg: "bg-[#30d158]/10" },
  { icon: Users, title_en: "Team Collaboration", title_ar: "تعاون الفريق", desc_en: "Invite team members with role-based access controls.", desc_ar: "دعوة أعضاء الفريق مع صلاحيات مخصصة.", color: "text-[#ff6482]", bg: "bg-[#ff6482]/10" },
  { icon: Globe, title_en: "Bilingual Support", title_ar: "دعم ثنائي اللغة", desc_en: "Core Arabic and English workflows with RTL layout support.", desc_ar: "مسارات أساسية بالعربية والإنجليزية مع دعم تخطيط RTL.", color: "text-[#bf5af2]", bg: "bg-[#bf5af2]/10" },
  { icon: Mail, title_en: "Email Ingestion", title_ar: "استيعاب البريد", desc_en: "Prepare warranty records from supported forwarded emails while retaining attachments.", desc_ar: "حضّر سجلات الضمان من رسائل البريد المدعومة مع الاحتفاظ بالمرفقات.", color: "text-[#64d2ff]", bg: "bg-[#64d2ff]/10" },
  { icon: Lock, title_en: "Data Access Controls", title_ar: "ضوابط الوصول للبيانات", desc_en: "Row-level security, encrypted data, and role-aware permissions.", desc_ar: "أمان على مستوى الصف وبيانات مشفرة وصلاحيات تراعي الأدوار.", color: "text-[#86868b]", bg: "bg-[#f5f5f7]" },
  { icon: Clock, title_en: "Expiry Tracking", title_ar: "تتبع الانتهاء", desc_en: "Automatic notifications before warranty expiration dates.", desc_ar: "إشعارات تلقائية قبل انتهاء الضمان.", color: "text-[#5856d6]", bg: "bg-[#5856d6]/10" },
];

export default async function FeaturesPage({ params }: FeaturesPageProps) {
  const { locale: routeLocale } = await params;
  const locale = normalizeLocale(String(routeLocale || "en"));
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale];
  const dictionary = getDictionary(locale);

  return (
    <div dir={direction} className="min-h-screen bg-[#fbfbfd]">
      <Navbar locale={locale} dictionary={dictionary} />
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-[40px] sm:text-[48px] font-semibold tracking-tight text-[#1d1d1f]">
            {isRTL ? "ميزات المنصة" : "Platform Features"}
          </h1>
          <p className="text-[17px] text-[#86868b] mt-3 max-w-2xl mx-auto">
            {isRTL ? "كل ما تحتاجه لإدارة الضمانات بكفاءة للشركات والبائعين في السعودية ودول الخليج" : "Everything businesses and sellers need to manage warranties efficiently in Saudi Arabia and the GCC"}
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
          <div className="rounded-2xl border border-[#0071e3]/10 bg-[#f5f9ff] p-10 text-[#1d1d1f] shadow-sm max-w-2xl mx-auto">
            <h2 className="text-[24px] font-semibold tracking-tight mb-3">{isRTL ? "ابدأ مجاناً اليوم" : "Start Free Today"}</h2>
            <p className="text-[15px] text-[#6e6e73] mb-6">{isRTL ? "أنشئ حسابك المجاني وابدأ إدارة ضماناتك في دقائق" : "Create your free account and start managing warranties in minutes"}</p>
            <Link href={`/${locale}/auth?tab=signup`} className="inline-flex items-center gap-2 bg-[#0071e3] text-white px-6 py-3 rounded-full text-[15px] font-medium hover:bg-[#0077ED] transition-all">
              {isRTL ? "ابدأ الآن" : "Get Started"}
              <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
            </Link>
          </div>
        </div>
      </div>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
