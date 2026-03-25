"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

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
  },
};

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const t = dict[locale as keyof typeof dict] || dict.en;

  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
      setTimeout(() => router.push("/" + locale + "/login"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] to-[#16213E] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2 text-center">{t.title}</h1>
        <p className="text-gray-500 text-center mb-6">{t.subtitle}</p>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.newPassword}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E94560] focus:border-transparent"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.confirmPassword}</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E94560] focus:border-transparent"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#E94560] text-white rounded-lg font-semibold hover:bg-[#d63d56] transition-colors disabled:opacity-50"
          >
            {loading ? "..." : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
