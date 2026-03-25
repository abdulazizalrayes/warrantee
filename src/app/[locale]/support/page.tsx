// @ts-nocheck
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ArrowLeft, MessageSquare, Mail, Phone, Clock, Send, CheckCircle, AlertCircle } from "lucide-react";

type TicketCategory = "general" | "technical" | "billing" | "warranty" | "claim" | "account";
type TicketPriority = "low" | "medium" | "high";

export default function SupportPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, profile } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [category, setCategory] = useState<TicketCategory>("general");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  const categories: { value: TicketCategory; en: string; ar: string }[] = [
    { value: "general", en: "General Inquiry", ar: "استفسار عام" },
    { value: "technical", en: "Technical Issue", ar: "مشكلة تقنية" },
    { value: "billing", en: "Billing & Subscription", ar: "الفواتير والاشتراك" },
    { value: "warranty", en: "Warranty Question", ar: "سؤال عن الضمان" },
    { value: "claim", en: "Claim Issue", ar: "مشكلة مطالبة" },
    { value: "account", en: "Account & Settings", ar: "الحساب والإعدادات" },
  ];

  const priorities: { value: TicketPriority; en: string; ar: string }[] = [
    { value: "low", en: "Low", ar: "منخفض" },
    { value: "medium", en: "Medium", ar: "متوسط" },
    { value: "high", en: "High - Urgent", ar: "عالي - عاجل" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError(isRTL ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const ticket = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const { error: dbError } = await supabase.from("support_tickets").insert({
        ticket_number: ticket,
        user_id: user?.id,
        email: profile?.email || user?.email || "",
        category,
        priority,
        subject: subject.trim(),
        message: message.trim(),
        status: "open",
      });

      if (dbError) {
        // If table doesn't exist yet, send via email fallback
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "hello@warrantee.io",
            subject: `[Support Ticket ${ticket}] ${subject}`,
            html: `<h3>Support Ticket: ${ticket}</h3><p><strong>From:</strong> ${profile?.email || user?.email}</p><p><strong>Category:</strong> ${category}</p><p><strong>Priority:</strong> ${priority}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br/>")}</p>`,
          }),
        });
        if (!res.ok) throw new Error("Failed to send");
      }

      setTicketNumber(ticket);
      setSubmitted(true);
    } catch (err) {
      setError(isRTL ? "حدث خطأ. يرجى المحاولة مرة أخرى أو مراسلتنا على hello@warrantee.io" : "Something went wrong. Please try again or email us at hello@warrantee.io");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div dir={direction} className="max-w-2xl mx-auto text-center py-16">
        <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-navy mb-2">
          {isRTL ? "تم إرسال طلبك بنجاح!" : "Your ticket has been submitted!"}
        </h1>
        <p className="text-gray-600 mb-2">
          {isRTL ? "رقم التذكرة:" : "Ticket number:"} <strong className="text-navy">{ticketNumber}</strong>
        </p>
        <p className="text-gray-500 text-sm mb-8">
          {isRTL ? "سنرد عليك خلال 24 ساعة عمل." : "We'll respond within 24 business hours."}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); }} className="bg-white border border-gray-300 text-navy px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
            {isRTL ? "تذكرة جديدة" : "New Ticket"}
          </button>
          <button onClick={() => router.push(`/${locale}/dashboard`)} className="bg-gold text-navy px-6 py-2.5 rounded-lg font-semibold hover:bg-yellow-500 transition">
            {isRTL ? "العودة للوحة التحكم" : "Back to Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir={direction} className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft size={20} className={isRTL ? "rotate-180" : ""} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
            <MessageSquare size={28} className="text-gold" />
            {isRTL ? "الدعم والمساعدة" : "Contact Support"}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {isRTL ? "أرسل تذكرة دعم وسنرد عليك في أقرب وقت" : "Submit a support ticket and we'll get back to you soon"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <Mail size={24} className="text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-navy">{isRTL ? "البريد الإلكتروني" : "Email"}</p>
          <a href="mailto:hello@warrantee.io" className="text-sm text-emerald-600 hover:underline">hello@warrantee.io</a>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <Clock size={24} className="text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-navy">{isRTL ? "وقت الاستجابة" : "Response Time"}</p>
          <p className="text-sm text-gray-600">{isRTL ? "خلال 24 ساعة" : "Within 24 hours"}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <Phone size={24} className="text-purple-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-navy">{isRTL ? "ساعات العمل" : "Business Hours"}</p>
          <p className="text-sm text-gray-600">{isRTL ? "الأحد - الخميس، 9ص - 5م" : "Sun - Thu, 9AM - 5PM"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <h2 className="font-bold text-navy text-lg">{isRTL ? "أرسل تذكرة دعم" : "Submit a Support Ticket"}</h2>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isRTL ? "الفئة" : "Category"}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-gold">
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{isRTL ? c.ar : c.en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isRTL ? "الأولوية" : "Priority"}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-gold">
              {priorities.map((p) => (
                <option key={p.value} value={p.value}>{isRTL ? p.ar : p.en}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{isRTL ? "الموضوع" : "Subject"} *</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={isRTL ? "صف مشكلتك باختصار" : "Briefly describe your issue"} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-gold" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{isRTL ? "الرسالة" : "Message"} *</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder={isRTL ? "اشرح مشكلتك بالتفصيل..." : "Explain your issue in detail..."} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-gold resize-none" required />
        </div>

        <button type="submit" disabled={submitting} className="w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
          <Send size={18} />
          {submitting ? (isRTL ? "جاري الإرسال..." : "Submitting...") : (isRTL ? "إرسال التذكرة" : "Submit Ticket")}
        </button>
      </form>
    </div>
  );
}
