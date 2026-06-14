"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  buildAuthEmailErrorMessage,
  normalizeAuthEmail,
  rememberAuthEmailSend,
} from "@/lib/auth-email-guard";
import { DIRECTION, getDictionary, normalizeLocale } from "@/lib/i18n";

const supabase = createSupabaseBrowserClient();

export default function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const locale = normalizeLocale(resolvedParams.locale);
  const dictionary = getDictionary(locale);
  const direction = DIRECTION[locale];
  const isAr = locale === "ar";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tr = (value: string) => value;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const normalizedEmail = normalizeAuthEmail(email);
      const guardError = buildAuthEmailErrorMessage(normalizedEmail, "reset-password");
      if (guardError) {
        throw new Error(guardError);
      }

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(
          `/${locale}/reset-password`
        )}`,
      });
      if (error) throw error;
      rememberAuthEmailSend(normalizedEmail, "reset-password");
      setSent(true);
    } catch (err: any) {
      setError(err.message || (isAr ? tr("حدث خطأ") : "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]" dir={direction}>
      <Navbar locale={locale} dictionary={dictionary} />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0071e3]">
              {isAr ? tr("استعادة الحساب") : "Account recovery"}
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-[#1d1d1f]">
              {isAr ? tr("نسيت كلمة المرور؟") : "Forgot your password?"}
            </h1>
            <p className="mt-3 text-base leading-7 text-[#6e6e73]">
              {isAr
                ? tr("أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين")
                : "Enter your email and we'll send you a reset link"}
            </p>
            <p className="mt-2 text-sm text-[#6e6e73]">
              {isAr
                ? tr("اسم المستخدم هو بريدك الإلكتروني المسجل.")
                : "Your username is your registered email address."}
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm ring-1 ring-black/[0.02]">
              <p className="font-semibold text-emerald-700">
                {isAr ? tr("تم إرسال رابط إعادة التعيين!") : "Reset link sent!"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                {isAr ? tr("تحقق من بريدك الإلكتروني") : "Check your email inbox"}
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm ring-1 ring-black/[0.02]"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1d1d1f]">
                  {isAr ? tr("البريد الإلكتروني") : "Email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-[#d2d2d7] px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                  placeholder={isAr ? tr("أدخل بريدك الإلكتروني") : "Enter your email"}
                  required
                />
              </div>
              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#0071e3] px-5 py-3 font-semibold text-white transition hover:bg-[#0077ED] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? isAr
                    ? tr("جاري الإرسال...")
                    : "Sending..."
                  : isAr
                    ? tr("إرسال رابط إعادة التعيين")
                    : "Send Reset Link"}
              </button>
              <Link
                href={`/${locale}/auth`}
                className="block text-center text-sm font-medium text-[#0071e3] transition hover:text-[#0077ED]"
              >
                {isAr ? tr("العودة لتسجيل الدخول") : "Back to Sign In"}
              </Link>
            </form>
          )}
        </div>
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
