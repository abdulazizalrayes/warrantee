// @ts-nocheck
"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/i18n";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ForgotPasswordPage({ params }: { params: { locale: string } }) {
  const isAr = params.locale === "ar";
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
        redirectTo: `${window.location.origin}/${params.locale}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || (isAr ? "حدث خطأ" : "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{isAr ? "نسيت كلمة المرور؟" : "Forgot your password?"}</h1>
          <p className="text-gray-600 mt-2">{isAr ? "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين" : "Enter your email and we'll send you a reset link"}</p>
        </div>
        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="text-green-700 font-medium">{isAr ? "تم إرسال رابط إعادة التعيين!" : "Reset link sent!"}</p>
            <p className="text-green-600 text-sm mt-2">{isAr ? "تحقق من بريدك الإلكتروني" : "Check your email inbox"}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isAr ? "البريد الإلكتروني" : "Email"}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder={isAr ? "أدخل بريدك الإلكتروني" : "Enter your email"} required />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
              {loading ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال رابط إعادة التعيين" : "Send Reset Link")}
            </button>
            <a href={`/${params.locale}/auth`} className="block text-center text-sm text-emerald-600 hover:underline">
              {isAr ? "العودة لتسجيل الدخول" : "Back to Sign In"}
            </a>
          </form>
        )}
      </div>
    </div>
  );
    }
