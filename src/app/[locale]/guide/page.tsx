// @ts-nocheck
"use client";

import { useParams, useRouter } from "next/navigation";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { ArrowLeft, BookOpen, Shield, FileText, Upload, Bell, Users, HelpCircle, CheckCircle } from "lucide-react";

const guides = {
  en: [
    {
      icon: Shield,
      title: "Register a Warranty",
      description: "Learn how to add your product warranties to Warrantee for safe tracking and management.",
      steps: [
        "Go to Dashboard and click 'Create Warranty'",
        "Fill in product details: name, serial number, purchase date",
        "Set warranty start and end dates",
        "Add coverage type and amount",
        "Upload supporting documents (receipt, warranty card)",
        "Submit for tracking"
      ]
    },
    {
      icon: Upload,
      title: "Upload Documents",
      description: "Attach receipts, warranty cards, and other supporting documents to your warranties.",
      steps: [
        "Open any warranty from your dashboard",
        "Click the 'Documents' tab",
        "Drag and drop or click to upload files",
        "Supported formats: PDF, JPG, PNG (max 10MB)",
        "Documents are securely stored and encrypted"
      ]
    },
    {
      icon: FileText,
      title: "File a Warranty Claim",
      description: "Submit a claim when your product needs repair or replacement under warranty.",
      steps: [
        "Open the warranty you want to claim",
        "Click 'File Claim' button",
        "Describe the issue in detail",
        "Upload photos or videos of the problem",
        "Submit and track your claim status"
      ]
    },
    {
      icon: Bell,
      title: "Expiry Notifications",
      description: "Never miss a warranty expiration with automatic email and push notifications.",
      steps: [
        "Notifications are enabled by default",
        "You'll receive alerts 30, 15, and 7 days before expiry",
        "Manage notification preferences in Settings",
        "Enable push notifications for instant alerts",
        "Check the 'Expiring Soon' section on your dashboard"
      ]
    },
    {
      icon: Users,
      title: "Transfer a Warranty",
      description: "Transfer warranty ownership when selling or gifting a product.",
      steps: [
        "Open the warranty you want to transfer",
        "Click 'Transfer Warranty'",
        "Enter the recipient's email address",
        "Add a reason for the transfer (optional)",
        "The recipient will receive an email to accept"
      ]
    },
    {
      icon: CheckCircle,
      title: "Verify a Warranty",
      description: "Check if a warranty is valid using the certificate number or QR code.",
      steps: [
        "Go to the Verify page",
        "Enter the warranty certificate number",
        "Or scan the QR code on the warranty certificate",
        "View warranty details and validity status",
        "Download or share the verification result"
      ]
    }
  ],
  ar: [
    {
      icon: Shield,
      title: "تسجيل ضمان",
      description: "تعلم كيفية إضافة ضمانات منتجاتك إلى وارنتي لتتبعها وإدارتها بأمان.",
      steps: [
        "اذهب إلى لوحة التحكم وانقر على 'إنشاء ضمان'",
        "أدخل تفاصيل المنتج: الاسم، الرقم التسلسلي، تاريخ الشراء",
        "حدد تاريخ بداية ونهاية الضمان",
        "أضف نوع التغطية والمبلغ",
        "ارفع المستندات الداعمة (إيصال، بطاقة ضمان)",
        "أرسل للتتبع"
      ]
    },
    {
      icon: Upload,
      title: "رفع المستندات",
      description: "أرفق الإيصالات وبطاقات الضمان والمستندات الداعمة الأخرى لضماناتك.",
      steps: [
        "افتح أي ضمان من لوحة التحكم",
        "انقر على تبويب 'المستندات'",
        "اسحب وأفلت أو انقر لرفع الملفات",
        "الصيغ المدعومة: PDF، JPG، PNG (حد أقصى 10 ميجابايت)",
        "المستندات مخزنة ومشفرة بأمان"
      ]
    },
    {
      icon: FileText,
      title: "تقديم مطالبة ضمان",
      description: "قدم مطالبة عندما يحتاج منتجك إلى إصلاح أو استبدال تحت الضمان.",
      steps: [
        "افتح الضمان الذي تريد المطالبة به",
        "انقر زر 'تقديم مطالبة'",
        "صف المشكلة بالتفصيل",
        "ارفع صور أو فيديوهات للمشكلة",
        "أرسل وتتبع حالة مطالبتك"
      ]
    },
    {
      icon: Bell,
      title: "إشعارات الانتهاء",
      description: "لا تفوت انتهاء ضمان مع الإشعارات التلقائية بالبريد والإشعارات الفورية.",
      steps: [
        "الإشعارات مفعلة افتراضيًا",
        "ستتلقى تنبيهات قبل 30 و15 و7 أيام من الانتهاء",
        "أدر تفضيلات الإشعارات في الإعدادات",
        "فعّل الإشعارات الفورية للتنبيهات اللحظية",
        "تحقق من قسم 'تنتهي قريبًا' في لوحة التحكم"
      ]
    },
    {
      icon: Users,
      title: "نقل ضمان",
      description: "انقل ملكية الضمان عند بيع أو إهداء منتج.",
      steps: [
        "افتح الضمان الذي تريد نقله",
        "انقر 'نقل الضمان'",
        "أدخل البريد الإلكتروني للمستلم",
        "أضف سبب النقل (اختياري)",
        "سيتلقى المستلم بريدًا إلكترونيًا للقبول"
      ]
    },
    {
      icon: CheckCircle,
      title: "التحقق من ضمان",
      description: "تحقق من صلاحية الضمان باستخدام رقم الشهادة أو رمز QR.",
      steps: [
        "اذهب إلى صفحة التحقق",
        "أدخل رقم شهادة الضمان",
        "أو امسح رمز QR على شهادة الضمان",
        "اعرض تفاصيل الضمان وحالة الصلاحية",
        "حمّل أو شارك نتيجة التحقق"
      ]
    }
  ]
};

export default function GuidePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const guideList = isRTL ? guides.ar : guides.en;

  return (
    <div dir={direction} className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft size={20} className={isRTL ? "rotate-180" : ""} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
            <BookOpen size={28} className="text-gold" />
            {isRTL ? "دليل الاستخدام" : "User Guide & Training"}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {isRTL ? "تعلم كيفية استخدام جميع ميزات وارنتي" : "Learn how to use all Warrantee features"}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {guideList.map((guide, index) => {
          const Icon = guide.icon;
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <Icon size={24} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-navy mb-1">{guide.title}</h2>
                    <p className="text-gray-600 text-sm mb-4">{guide.description}</p>
                    <div className="space-y-2">
                      {guide.steps.map((step, stepIndex) => (
                        <div key={stepIndex} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {stepIndex + 1}
                          </span>
                          <p className="text-sm text-gray-700 pt-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start gap-3">
          <HelpCircle size={24} className="text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-navy mb-1">
              {isRTL ? "تحتاج مساعدة إضافية؟" : "Need more help?"}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {isRTL
                ? "تواصل مع فريق الدعم لأي استفسارات أو مشاكل تقنية."
                : "Contact our support team for any questions or technical issues."}
            </p>
            <a
              href={`/${locale}/support`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              {isRTL ? "تواصل مع الدعم" : "Contact Support"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
