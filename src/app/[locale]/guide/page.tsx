"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, Shield, FileText, Upload, Bell, ChevronRight, Sparkles, ArrowRight, HelpCircle, Zap } from "lucide-react";
import Link from "next/link";

export default function GuidePage() {
  const params = useParams() ?? {};
  const locale = params?.locale as string || "en";
  const isRTL = locale === "ar";
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const steps = [
    { icon: Upload, title: isRTL ? "Ø£Ø¶Ù Ø¶ÙØ§ÙÙ Ø§ÙØ£ÙÙ" : "Add Your First Warranty", desc: isRTL ? "Ø§Ø±ÙØ¹ ØµÙØ±Ø© Ø£Ù Ø£Ø¯Ø®Ù Ø§ÙØªÙØ§ØµÙÙ ÙØ¯ÙÙØ§Ù. Ø§ÙÙØ³Ø­ Ø§ÙØ°ÙÙ ÙÙÙØ£ Ø§ÙØ­ÙÙÙ ØªÙÙØ§Ø¦ÙØ§Ù." : "Upload a photo or enter details manually. Smart Scan auto-fills fields for you.", color: "#007aff" },
    { icon: Shield, title: isRTL ? "ØªØªØ¨Ø¹ Ø§ÙØ­Ø§ÙØ©" : "Track Status", desc: isRTL ? "Ø±Ø§ÙØ¨ Ø­Ø§ÙØ© Ø§ÙØ¶ÙØ§ÙØ§Øª Ø§ÙÙØ´Ø·Ø© ÙØ§ÙÙÙØªÙÙØ© ÙØ§ÙØªÙ Ø³ØªÙØªÙÙ." : "Monitor active, expiring, and expired warranties at a glance.", color: "#30d158" },
    { icon: Bell, title: isRTL ? "Ø§Ø­ØµÙ Ø¹ÙÙ ØªÙØ¨ÙÙØ§Øª" : "Get Notified", desc: isRTL ? "Ø§Ø³ØªÙÙ ØªÙØ¨ÙÙØ§Øª ÙØ¨Ù Ø§ÙØªÙØ§Ø¡ Ø§ÙØ¶ÙØ§Ù Ø­ØªÙ ÙØ§ ØªÙÙØªÙ." : "Receive alerts before warranties expire so you never miss a claim.", color: "#ff9f0a" },
    { icon: FileText, title: isRTL ? "ÙØ¯Ù ÙØ·Ø§ÙØ¨Ø©" : "File a Claim", desc: isRTL ? "ÙØ¯Ù ÙØ·Ø§ÙØ¨Ø© Ø¶ÙØ§Ù Ø¨Ø¶ØºØ·Ø© ÙØ§Ø­Ø¯Ø© ÙØªØ§Ø¨Ø¹ Ø§ÙØªÙØ¯Ù." : "Submit a warranty claim in one click and track its progress.", color: "#ff453a" },
  ];

  const faqs = [
    { q: isRTL ? "ÙÙÙ Ø£Ø¶ÙÙ Ø¶ÙØ§ÙØ§Ù Ø¬Ø¯ÙØ¯Ø§ÙØ" : "How do I add a new warranty?", a: isRTL ? "Ø§Ø°ÙØ¨ Ø¥ÙÙ Ø§ÙØ¶ÙØ§ÙØ§Øª > Ø¬Ø¯ÙØ¯ ÙØ§Ø±ÙØ¹ ØµÙØ±Ø© Ø£Ù Ø£Ø¯Ø®Ù Ø§ÙØªÙØ§ØµÙÙ ÙØ¯ÙÙØ§Ù." : "Go to Warranties > New and upload a photo or enter details manually. Smart Scan will auto-fill fields from your receipt." },
    { q: isRTL ? "ÙØ§ ÙÙ Ø§ÙÙØ³Ø­ Ø§ÙØ°ÙÙØ" : "What is Smart Scan?", a: isRTL ? "ØªÙÙÙØ© OCR ØªÙØ±Ø£ Ø§ÙØ¥ÙØµØ§ÙØ§Øª ÙÙØ«Ø§Ø¦Ù Ø§ÙØ¶ÙØ§Ù ÙØªØ³ØªØ®Ø±Ø¬ Ø§ÙØªÙØ§ØµÙÙ ØªÙÙØ§Ø¦ÙØ§Ù." : "Smart Scan uses OCR technology to read receipts and warranty documents, automatically extracting product details, dates, and seller info." },
    { q: isRTL ? "ÙÙÙ Ø£ÙØ¯Ù ÙØ·Ø§ÙØ¨Ø© Ø¶ÙØ§ÙØ" : "How do I file a warranty claim?", a: isRTL ? "Ø§ÙØªØ­ Ø§ÙØ¶ÙØ§Ù > Ø§ÙÙØ± ØªÙØ¯ÙÙ ÙØ·Ø§ÙØ¨Ø© > ØµÙ Ø§ÙÙØ´ÙÙØ© ÙØ£Ø±ÙÙ Ø§ÙØµÙØ±." : "Open the warranty > Click File Claim > Describe the issue and attach photos. We will notify the seller and track the process." },
    { q: isRTL ? "ÙÙ ÙÙÙÙÙÙ ÙØ´Ø§Ø±ÙØ© Ø§ÙØ¶ÙØ§ÙØ" : "Can I share a warranty?", a: isRTL ? "ÙØ¹ÙØ ÙÙÙÙÙ ÙØ´Ø§Ø±ÙØ© Ø´ÙØ§Ø¯Ø© Ø§ÙØ¶ÙØ§Ù Ø¹Ø¨Ø± Ø±Ø§Ø¨Ø· Ø£Ù ØªÙØ²ÙÙ PDF." : "Yes! You can share the warranty certificate via a link or download it as a PDF." },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#2d2d5e] mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            {isRTL ? "Ø¯ÙÙÙ Ø§ÙØ§Ø³ØªØ®Ø¯Ø§Ù" : "Getting Started Guide"}
          </h1>
          <p className="text-[15px] text-[#86868b] mt-2 max-w-lg mx-auto">
            {isRTL ? "ØªØ¹ÙÙ ÙÙÙ ØªØ¯ÙØ± Ø¶ÙØ§ÙØ§ØªÙ Ø¨ÙØ¹Ø§ÙÙØ© ÙÙ 4 Ø®Ø·ÙØ§Øª Ø¨Ø³ÙØ·Ø©" : "Learn how to manage your warranties effectively in 4 simple steps"}
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
                      <span className="text-[12px] font-medium text-[#86868b]">{isRTL ? "Ø§ÙØ®Ø·ÙØ©" : "Step"} {i + 1}</span>
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
            {isRTL ? "Ø§ÙØ£Ø³Ø¦ÙØ© Ø§ÙØ´Ø§Ø¦Ø¹Ø©" : "Frequently Asked Questions"}
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
                    <HelpCircle className="w-4 h-4 text-[#007aff] flex-shrink-0" />
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
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#2d2d5e] rounded-2xl p-8 text-center">
          <Sparkles className="w-8 h-8 text-[#ff9f0a] mx-auto mb-3" />
          <h2 className="text-[20px] font-semibold text-white mb-2">
            {isRTL ? "Ø¬Ø§ÙØ² ÙÙØ¨Ø¯Ø¡Ø" : "Ready to get started?"}
          </h2>
          <p className="text-[14px] text-white/70 mb-5 max-w-md mx-auto">
            {isRTL ? "Ø£Ø¶Ù Ø¶ÙØ§ÙÙ Ø§ÙØ£ÙÙ Ø§ÙØ¢Ù ÙØ§Ø¨Ø¯Ø£ ÙÙ Ø­ÙØ§ÙØ© ÙØ´ØªØ±ÙØ§ØªÙ" : "Add your first warranty now and start protecting your purchases"}
          </p>
          <Link
            href={"/" + locale + "/warranties/new"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1A1A2E] rounded-full text-[14px] font-semibold hover:bg-white/90 transition-colors"
          >
            <Zap className="w-4 h-4" />
            {isRTL ? "Ø£Ø¶Ù Ø¶ÙØ§Ù" : "Add Warranty"}
            <ArrowRight className={"w-4 h-4 " + (isRTL ? "rotate-180" : "")} />
          </Link>
        </div>
      </div>
    </div>
  );
}
