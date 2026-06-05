"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Headphones, Mail, MessageCircle, Clock, Send, ChevronRight, BookOpen, Shield } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getDictionary, type Locale } from "@/lib/i18n";

export default function SupportPage() {
  const params = useParams() ?? {};
  const locale = params?.locale as string || "en";
  const isRTL = locale === "ar";
  const dictionary = getDictionary(locale as Locale);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const tr = (value: string) => value;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        subject,
        message,
        company: "Warrantee support request",
        kind: "support_request",
      }),
    });

    if (!response.ok) {
      setError(isRTL ? "\u062a\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649." : "We could not send the request. Please try again.");
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  };

  const channels = [
    { icon: Mail, title: isRTL ? tr("البريد الإلكتروني") : "Email", desc: "support@warrantee.io", sub: isRTL ? tr("رد خلال 24 ساعة") : "Response within 24 hours", color: "#0071e3" },
    { icon: MessageCircle, title: isRTL ? tr("الدردشة المباشرة") : "Live Chat", desc: isRTL ? tr("تحدث مع فريقنا") : "Chat with our team", sub: isRTL ? tr("متاح 9ص-6م") : "Available 9AM-6PM", color: "#30d158" },
    { icon: Clock, title: isRTL ? tr("مركز المساعدة") : "Help Center", desc: isRTL ? tr("مقالات وأدلة") : "Articles and guides", sub: isRTL ? tr("متاح 24/7") : "Available 24/7", color: "#0071e3" },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#fbfbfd]">
      <Navbar locale={locale as Locale} dictionary={dictionary} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0071e3]/10 mb-4">
            <Headphones className="w-7 h-7 text-[#0071e3]" />
          </div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            {isRTL ? tr("الدعم") : "Support"}
          </h1>
          <p className="text-[15px] text-[#86868b] mt-2">
            {isRTL ? tr("نحن هنا لمساعدتك") : "We\'re here to help"}
          </p>
        </div>

        {/* Contact Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {channels.map((ch, i) => {
            const Icon = ch.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-5 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-all text-center">
                <div className="w-11 h-11 rounded-xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: ch.color + "14" }}>
                  <Icon className="w-5 h-5" style={{ color: ch.color }} />
                </div>
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">{ch.title}</h3>
                <p className="text-[13px] text-[#0071e3] font-medium mb-0.5">{ch.desc}</p>
                <p className="text-[12px] text-[#86868b]">{ch.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-[#d2d2d7]/30">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
              {isRTL ? tr("أرسل رسالة") : "Send a Message"}
            </h2>
          </div>
          {sent ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-[#30d158]/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6 text-[#30d158]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
                {isRTL ? tr("تم الإرسال!") : "Message Sent!"}
              </h3>
              <p className="text-[14px] text-[#86868b]">
                {isRTL ? tr("سنرد عليك خلال 24 ساعة") : "We\'ll get back to you within 24 hours"}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">{isRTL ? tr("الاسم") : "Name"}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#f5f5f7] border-0 ring-1 ring-[#d2d2d7]/40 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:ring-2 focus:ring-[#0071e3] outline-none transition-all"
                    placeholder={isRTL ? tr("اسمك") : "Your name"}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">{isRTL ? tr("البريد") : "Email"}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#f5f5f7] border-0 ring-1 ring-[#d2d2d7]/40 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:ring-2 focus:ring-[#0071e3] outline-none transition-all"
                    placeholder={isRTL ? tr("بريدك") : "Your email"}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">{isRTL ? tr("الموضوع") : "Subject"}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f5f5f7] border-0 ring-1 ring-[#d2d2d7]/40 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:ring-2 focus:ring-[#0071e3] outline-none transition-all"
                  placeholder={isRTL ? tr("موضوع الرسالة") : "What is this about?"}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">{isRTL ? tr("الرسالة") : "Message"}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f5f5f7] border-0 ring-1 ring-[#d2d2d7]/40 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:ring-2 focus:ring-[#0071e3] outline-none transition-all resize-none"
                  placeholder={isRTL ? tr("كيف يمكننا مساعدتك؟") : "How can we help you?"}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0071e3] text-white rounded-full text-[14px] font-medium hover:bg-[#0077ED] transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? (isRTL ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0631\u0633\u0627\u0644..." : "Sending...") : (isRTL ? tr("إرسال") : "Send Message")}
              </button>
            </form>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href={"/" + locale + "/guide"} className="bg-white rounded-2xl p-5 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[#1d1d1f]">{isRTL ? tr("دليل الاستخدام") : "Getting Started Guide"}</div>
              <div className="text-[12px] text-[#86868b]">{isRTL ? tr("تعلم الأساسيات") : "Learn the basics"}</div>
            </div>
            <ChevronRight className={"w-4 h-4 text-[#86868b] group-hover:text-[#0071e3] transition-colors " + (isRTL ? "rotate-180" : "")} />
          </Link>
          <Link href={"/" + locale + "/warranties"} className="bg-white rounded-2xl p-5 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-[#30d158]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#30d158]" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[#1d1d1f]">{isRTL ? tr("ضماناتي") : "My Warranties"}</div>
              <div className="text-[12px] text-[#86868b]">{isRTL ? tr("إدارة الضمانات") : "Manage warranties"}</div>
            </div>
            <ChevronRight className={"w-4 h-4 text-[#86868b] group-hover:text-[#30d158] transition-colors " + (isRTL ? "rotate-180" : "")} />
          </Link>
        </div>
      </main>
      <Footer locale={locale as Locale} dictionary={dictionary} />
    </div>
  );
}
