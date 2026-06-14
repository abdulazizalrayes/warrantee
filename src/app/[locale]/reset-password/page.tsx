"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { DIRECTION, getDictionary, normalizeLocale } from "@/lib/i18n";

const dict = {
  en: {
    title: "Reset Password",
    subtitle: "Enter your new password below",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    submit: "Update Password",
    success: "Password updated successfully! Redirecting to login...",
    mismatch: "Passwords do not match",
    tooShort: "Password must be at least 8 characters",
    error: "Failed to update password. Please try again.",
    back: "Back to Sign In",
  },
  ar: {
    title: "إعادة تعيين كلمة المرور",
    subtitle: "أدخل كلمة المرور الجديدة أدناه",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    submit: "تحديث كلمة المرور",
    success: "تم تحديث كلمة المرور بنجاح! جاري التحويل...",
    mismatch: "كلمات المرور غير متطابقة",
    tooShort: "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
    error: "فشل تحديث كلمة المرور. حاول مرة أخرى.",
    back: "العودة لتسجيل الدخول",
  },
};

const supabase = createSupabaseBrowserClient();

export default function ResetPasswordPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const locale = normalizeLocale(String(params?.locale || "en"));
  const dictionary = getDictionary(locale);
  const direction = DIRECTION[locale];
  const t = dict[locale as keyof typeof dict] || dict.en;

  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError(t.tooShort);
      return;
    }
    if (password !== confirmPwd) {
      setError(t.mismatch);
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(t.error);
      setLoading(false);
    } else {
      setMessage(t.success);
      setTimeout(() => router.push("/" + locale + "/auth"), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]" dir={direction}>
      <Navbar locale={locale} dictionary={dictionary} />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0071e3]">
              {locale === "ar" ? "استعادة الحساب" : "Account recovery"}
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-[#1d1d1f]">{t.title}</h1>
            <p className="mt-3 text-base leading-7 text-[#6e6e73]">{t.subtitle}</p>
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm ring-1 ring-black/[0.02]">
            {message && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1d1d1f]">
                  {t.newPassword}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-[#d2d2d7] px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1d1d1f]">
                  {t.confirmPassword}
                </label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(event) => setConfirmPwd(event.target.value)}
                  className="w-full rounded-xl border border-[#d2d2d7] px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#0071e3] px-5 py-3 font-semibold text-white transition hover:bg-[#0077ED] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "..." : t.submit}
              </button>
              <Link
                href={`/${locale}/auth`}
                className="block text-center text-sm font-medium text-[#0071e3] transition hover:text-[#0077ED]"
              >
                {t.back}
              </Link>
            </form>
          </div>
        </div>
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
