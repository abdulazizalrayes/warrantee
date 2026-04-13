"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Headphones, Mail, MessageCircle, Clock, Send, ChevronRight, BookOpen, Shield } from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  const params = useParams() ?? {};
  const locale = params?.locale as string || "en";
  const isRTL = locale === "ar";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const channels = [
    { icon: Mail, title: isRTL ? "Ø§ÙØ¨Ø±ÙØ¯ Ø§ÙØ¥ÙÙØªØ±ÙÙÙ" : "Email", desc: isRTL ? "support@warrantee.io" : "support@warrantee.io", sub: isRTL ? "Ø±Ø¯ Ø®ÙØ§Ù 24 Ø³Ø§Ø¹Ø©" : "Response within 24 hours", color: "#007aff" },
    { icon: MessageCircle, title: isRTL ? "Ø§ÙØ¯Ø±Ø¯Ø´Ø© Ø§ÙÙØ¨Ø§Ø´Ø±Ø©" : "Live Chat", desc: isRTL ? "ØªØ­Ø¯Ø« ÙØ¹ ÙØ±ÙÙÙØ§" : "Chat with our team", sub: isRTL ? "ÙØªØ§Ø­ 9Øµ-6Ù" : "Available 9AM-6PM", color: "#30d158" },
    { icon: Clock, title: isRTL ? "ÙØ±ÙØ² Ø§ÙÙØ³Ø§Ø¹Ø¯Ø©" : "Help Center", desc: isRTL ? "ÙÙØ§ÙØ§Øª ÙØ£Ø¯ÙØ©" : "Articles and guides", sub: isRTL ? "ÙØªØ§Ø­ 24/7" : "Available 24/7", color: "#ff9f0a" },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#2d2d5e] mb-4">
            <Headphones className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            {isRTL ? "Ø§ÙØ¯Ø¹Ù" : "Support"}
          </h1>
          <p className="text-[15px] text-[#86868b] mt-2">
            {isRTL ? "ÙØ­Ù ÙÙØ§ ÙÙØ³Ø§Ø¹Ø¯ØªÙ" : "We\'re here to help"}
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
                <p className="text-[13px] text-[#007aff] font-medium mb-0.5">{ch.desc}</p>
                <p className="text-[12px] text-[#86868b]">{ch.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-[#d2d2d7]/30">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
              {isRTL ? "Ø£Ø±Ø³Ù Ø±Ø³Ø§ÙØ©" : "Send a Message"}
            </h2>
          </div>
          {sent ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-[#30d158]/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6 text-[#30d158]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
                {isRTL ? "ØªÙ Ø§ÙØ¥Ø±Ø³Ø§Ù!" : "Message Sent!"}
              </h3>
              <p className="text-[14px] text-[#86868b]">
                {isRTL ? "Ø³ÙØ±Ø¯ Ø¹ÙÙÙ Ø®ÙØ§Ù 24 Ø³Ø§Ø¹Ø©" : "We\'ll get back to you within 24 hours"}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">{isRTL ? "Ø§ÙØ§Ø³Ù" : "Name"}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#f5f5f7] border-0 ring-1 ring-[#d2d2d7]/40 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:ring-2 focus:ring-[#007aff] outline-none transition-all"
                    placeholder={isRTL ? "Ø§Ø³ÙÙ" : "Your name"}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">{isRTL ? "Ø§ÙØ¨Ø±ÙØ¯" : "Email"}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#f5f5f7] border-0 ring-1 ring-[#d2d2d7]/40 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:ring-2 focus:ring-[#007aff] outline-none transition-all"
                    placeholder={isRTL ? "Ø¨Ø±ÙØ¯Ù" : "Your email"}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">{isRTL ? "Ø§ÙÙÙØ¶ÙØ¹" : "Subject"}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f5f5f7] border-0 ring-1 ring-[#d2d2d7]/40 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:ring-2 focus:ring-[#007aff] outline-none transition-all"
                  placeholder={isRTL ? "ÙÙØ¶ÙØ¹ Ø§ÙØ±Ø³Ø§ÙØ©" : "What is this about?"}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">{isRTL ? "Ø§ÙØ±Ø³Ø§ÙØ©" : "Message"}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f5f5f7] border-0 ring-1 ring-[#d2d2d7]/40 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:ring-2 focus:ring-[#007aff] outline-none transition-all resize-none"
                  placeholder={isRTL ? "ÙÙÙ ÙÙÙÙÙØ§ ÙØ³Ø§Ø¹Ø¯ØªÙØ" : "How can we help you?"}
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1A1A2E] text-white rounded-full text-[14px] font-medium hover:bg-[#2d2d5e] transition-colors"
              >
                <Send className="w-4 h-4" />
                {isRTL ? "Ø¥Ø±Ø³Ø§Ù" : "Send Message"}
              </button>
            </form>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href={"/" + locale + "/guide"} className="bg-white rounded-2xl p-5 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-[#007aff]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#007aff]" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[#1d1d1f]">{isRTL ? "Ø¯ÙÙÙ Ø§ÙØ§Ø³ØªØ®Ø¯Ø§Ù" : "Getting Started Guide"}</div>
              <div className="text-[12px] text-[#86868b]">{isRTL ? "ØªØ¹ÙÙ Ø§ÙØ£Ø³Ø§Ø³ÙØ§Øª" : "Learn the basics"}</div>
            </div>
            <ChevronRight className={"w-4 h-4 text-[#86868b] group-hover:text-[#007aff] transition-colors " + (isRTL ? "rotate-180" : "")} />
          </Link>
          <Link href={"/" + locale + "/warranties"} className="bg-white rounded-2xl p-5 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-[#30d158]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#30d158]" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[#1d1d1f]">{isRTL ? "Ø¶ÙØ§ÙØ§ØªÙ" : "My Warranties"}</div>
              <div className="text-[12px] text-[#86868b]">{isRTL ? "Ø¥Ø¯Ø§Ø±Ø© Ø§ÙØ¶ÙØ§ÙØ§Øª" : "Manage warranties"}</div>
            </div>
            <ChevronRight className={"w-4 h-4 text-[#86868b] group-hover:text-[#30d158] transition-colors " + (isRTL ? "rotate-180" : "")} />
          </Link>
        </div>
      </div>
    </div>
  );
}
