// @ts-nocheck
"use client";

import { use, useState } from "react";
import { getDictionary } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const supabase = createSupabaseBrowserClient();

export default function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || (isAr ? "Ø­Ø¯Ø« Ø®Ø·Ø£" : "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{isAr ? "ÙØ³ÙØª ÙÙÙØ© Ø§ÙÙØ±ÙØ±Ø" : "Forgot your password?"}</h1>
          <p className="text-gray-600 mt-2">{isAr ? "Ø£Ø¯Ø®Ù Ø¨Ø±ÙØ¯Ù Ø§ÙØ¥ÙÙØªØ±ÙÙÙ ÙØ³ÙØ±Ø³Ù ÙÙ Ø±Ø§Ø¨Ø· Ø¥Ø¹Ø§Ø¯Ø© Ø§ÙØªØ¹ÙÙÙ" : "Enter your email and we'll send you a reset link"}</p>
        </div>
        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="text-green-700 font-medium">{isAr ? "ØªÙ Ø¥Ø±Ø³Ø§Ù Ø±Ø§Ø¨Ø· Ø¥Ø¹Ø§Ø¯Ø© Ø§ÙØªØ¹ÙÙÙ!" : "Reset link sent!"}</p>
            <p className="text-green-600 text-sm mt-2">{isAr ? "ØªØ­ÙÙ ÙÙ Ø¨Ø±ÙØ¯Ù Ø§ÙØ¥ÙÙØªØ±ÙÙÙ" : "Check your email inbox"}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? "Ø§ÙØ¨Ø±ÙØ¯ Ø§ÙØ¥ÙÙØªØ±ÙÙÙ" : "Email"}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder={isAr ? "Ø£Ø¯Ø®Ù Ø¨Ø±ÙØ¯Ù Ø§ÙØ¥ÙÙØªØ±ÙÙÙ" : "Enter your email"} required />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
              {loading ? (isAr ? "Ø¬Ø§Ø±Ù Ø§ÙØ¥Ø±Ø³Ø§Ù..." : "Sending...") : (isAr ? "Ø¥Ø±Ø³Ø§Ù Ø±Ø§Ø¨Ø· Ø¥Ø¹Ø§Ø¯Ø© Ø§ÙØªØ¹ÙÙÙ" : "Send Reset Link")}
            </button>
            <a href={`/${locale}/auth`} className="block text-center text-sm text-emerald-600 hover:underline">
              {isAr ? "Ø§ÙØ¹ÙØ¯Ø© ÙØªØ³Ø¬ÙÙ Ø§ÙØ¯Ø®ÙÙ" : "Back to Sign In"}
            </a>
          </form>
        )}
      </div>
    </div>
  );
    }
