// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Apple,
  ArrowUpRight,
  AlertCircle,
  BadgeCheck,
  Chrome,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { PageViewTracker } from "@/components/PageViewTracker";
import { trackAuthIntent, trackSignup } from "@/lib/ga4-events";

type AuthTab = "login" | "signup";

export default function AuthPage() {
  const params = useParams() ?? {};
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { signInWithGoogle, signInWithApple, signInWithMagicLink, signInWithPassword, signUp, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<"consumer" | "business">("consumer");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [authMode, setAuthMode] = useState<"magic" | "password">("magic");
  const errorFromUrl = searchParams?.get("error");
  const requestedTab = searchParams?.get("tab");

  useEffect(() => {
    setActiveTab(requestedTab === "signup" ? "signup" : "login");
  }, [requestedTab]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage(""); setErrorMsg("");
    trackAuthIntent("magic_link_start", "email", { locale, tab: activeTab });
    const { error } = await signInWithMagicLink(email, locale);
    if (error) { setErrorMsg(error); } else { setMessage(isRTL ? "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0633\u062d\u0631\u064a \u0625\u0644\u0649 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Magic link sent to your email! Check your inbox."); }
    setLoading(false);
  };
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage(""); setErrorMsg("");
    trackAuthIntent("password_start", "password", { locale, tab: activeTab });
    const { error } = await signInWithPassword(email, password);
    if (error) { setErrorMsg(error); }
    setLoading(false);
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage(""); setErrorMsg("");
    if (password.length < 8) { setErrorMsg(isRTL ? "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 8 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" : "Password must be at least 8 characters"); setLoading(false); return; }
    const { error } = await signUp(email, password, { full_name: fullName, account_type: accountType, company_name: accountType === "business" ? companyName : undefined });
    if (error) { setErrorMsg(error); } else {
      trackSignup(accountType === "business" ? "business_email" : "consumer_email");
      setMessage(isRTL ? "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628\u0643! \u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0644\u062a\u0623\u0643\u064a\u062f \u062d\u0633\u0627\u0628\u0643." : "Account created! Check your email to confirm your account.");
    }
    setLoading(false);
  };
  const handleGoogleAuth = async () => {
    trackAuthIntent("oauth_start", "google", { locale, tab: activeTab });
    await signInWithGoogle(locale);
  };
  const handleAppleAuth = async () => {
    trackAuthIntent("oauth_start", "apple", { locale, tab: activeTab });
    await signInWithApple(locale);
  };
  const isFormLoading = loading || authLoading;
  const trustPoints = isRTL
    ? [
        { icon: ShieldCheck, label: "الوصول الآمن إلى الضمانات والمطالبات" },
        { icon: BadgeCheck, label: "تجربة ثنائية اللغة للأفراد والشركات" },
        { icon: Sparkles, label: "رحلات موافقات ووثائق ومتابعة مصممة باحتراف" },
      ]
    : [
        { icon: ShieldCheck, label: "Secure access to warranties, claims, and approvals" },
        { icon: BadgeCheck, label: "Bilingual experience for consumers and businesses" },
        { icon: Sparkles, label: "A premium operations flow for certificates, approvals, and support" },
      ];

  return (
    <div className="min-h-screen bg-[#f5f5f7]" dir={direction}>
      <PageViewTracker
        pageName="auth_portal"
        pageType="authentication"
        locale={locale}
        extra={{ tab: activeTab, auth_mode: authMode }}
      />
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden rounded-[36px] bg-[#1A1A2E] px-7 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:px-10 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,83,0.24),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
            <div className="relative z-10">
              <Link
                href={`/${locale}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/90 transition hover:bg-white/15"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                {isRTL ? "العودة إلى الموقع" : "Back to site"}
              </Link>

              <div className="mt-10 max-w-xl">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4A853] text-[#1A1A2E] shadow-sm">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  {isRTL ? "بوابة الدخول" : "Access portal"}
                </p>
                <h1 className="text-[34px] font-semibold tracking-tight sm:text-[48px]">
                  {isRTL ? "ادخل إلى تجربة ضمان تبدو مكتملة فعلًا" : "Enter a warranty experience that feels complete"}
                </h1>
                <p className="mt-4 max-w-xl text-[16px] leading-7 text-white/70 sm:text-[18px]">
                  {isRTL
                    ? "يجب أن تكون بوابة الدخول بنفس جودة المنتج نفسه: واضحة، مطمئنة، راقية، وسهلة للأفراد والشركات على حد سواء."
                    : "The entry point should feel as considered as the product itself: calm, trustworthy, premium, and easy for both individuals and businesses."}
                </p>
              </div>

              <div className="mt-10 grid gap-3">
                {trustPoints.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-4 backdrop-blur-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                      <Icon className="h-5 w-5 text-[#D4A853]" />
                    </div>
                    <p className="text-[14px] text-white/88">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[36px] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-[#d2d2d7]/40 sm:p-7">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1A1A2E]">
                  <span className="text-lg font-semibold">W</span>
                </div>
                <h2 className="text-[30px] font-semibold tracking-tight text-[#1d1d1f]">Warrantee</h2>
                <p className="mt-2 text-[15px] text-[#6e6e73]">
                  {isRTL ? "\u0645\u0631\u062d\u0628\u0627 \u0628\u0643 \u0641\u064a Warrantee" : "Welcome back to Warrantee"}
                </p>
              </div>

              {errorFromUrl && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle size={16} />
                  {isRTL ? "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644. \u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649." : "An error occurred during sign in. Please try again."}
                </div>
              )}

              <div className="overflow-hidden rounded-[28px] border border-[#e5e5ea] bg-white">
                <div className="flex border-b border-[#e5e5ea] bg-[#fbfbfd]">
                  <button onClick={() => { setActiveTab("login"); setMessage(""); setErrorMsg(""); }} className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === "login" ? "border-b-2 border-[#D4A853] bg-white text-[#1A1A2E]" : "text-[#6e6e73] hover:text-[#1A1A2E]"}`}>{dict.auth.login}</button>
                  <button onClick={() => { setActiveTab("signup"); setMessage(""); setErrorMsg(""); }} className={`flex-1 px-6 py-4 font-medium transition-colors ${activeTab === "signup" ? "border-b-2 border-[#D4A853] bg-white text-[#1A1A2E]" : "text-[#6e6e73] hover:text-[#1A1A2E]"}`}>{dict.auth.signup}</button>
                </div>

                <div className="p-7">
                  {activeTab === "login" ? (
                    <form onSubmit={authMode === "magic" ? handleMagicLink : handlePasswordLogin} className="space-y-5">
                      <div><label className="mb-2 block text-sm font-medium text-[#1A1A2E]">{dict.auth.email}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border border-[#d2d2d7] px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20" required dir="ltr" /></div>
                      {authMode === "password" && (<div><label className="mb-2 block text-sm font-medium text-[#1A1A2E]">{dict.auth.password}</label><div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" className="w-full rounded-2xl border border-[#d2d2d7] px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20" required dir="ltr" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>)}
                      <button type="submit" disabled={isFormLoading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A2E] py-3 text-sm font-semibold text-white transition hover:bg-[#2d2d5e] disabled:cursor-not-allowed disabled:opacity-50"><Mail size={18} />{isFormLoading ? dict.common.loading : authMode === "magic" ? dict.auth.magic_link : dict.auth.sign_in}</button>
                      <div className="text-center"><button type="button" onClick={() => setAuthMode(authMode === "magic" ? "password" : "magic")} className="text-sm font-medium text-[#D4A853] transition hover:text-[#c39534]">{authMode === "magic" ? (isRTL ? "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" : "Sign in with password instead") : (isRTL ? "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0633\u062d\u0631\u064a" : "Sign in with magic link instead")}</button></div>
                      {authMode === "password" && (
                        <div className="text-center">
                          <Link href={`/${locale}/forgot-password`} className="text-sm text-[#6e6e73] transition hover:text-[#1A1A2E]">
                            {dict.auth.forgot_password}
                          </Link>
                        </div>
                      )}
                      {message && (<div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>)}
                      {errorMsg && (<div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={16} className="shrink-0" />{errorMsg}</div>)}
                      <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e5e5ea]"></div></div><div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-[#86868b]">{isRTL ? "\u0623\u0648" : "OR"}</span></div></div>
                      <button type="button" onClick={handleGoogleAuth} disabled={isFormLoading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] px-4 py-3 transition hover:bg-[#f8f8fa] disabled:opacity-50"><Chrome size={18} className="text-red-500" /><span className="font-medium text-[#1A1A2E]">{dict.auth.google}</span></button>
                      <button type="button" onClick={handleAppleAuth} disabled={isFormLoading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] px-4 py-3 transition hover:bg-[#f8f8fa] disabled:opacity-50"><Apple size={18} className="text-gray-900" /><span className="font-medium text-[#1A1A2E]">{dict.auth.apple}</span></button>
                    </form>
                  ) : (
                    <form onSubmit={handleSignUp} className="space-y-5">
                      <div><label className="mb-2 block text-sm font-medium text-[#1A1A2E]">{isRTL ? "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644" : "Full Name"}</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-2xl border border-[#d2d2d7] px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20" required /></div>
                      <div><label className="mb-2 block text-sm font-medium text-[#1A1A2E]">{dict.auth.email}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border border-[#d2d2d7] px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20" required dir="ltr" /></div>
                      <div><label className="mb-2 block text-sm font-medium text-[#1A1A2E]">{dict.auth.password}</label><div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-[#d2d2d7] px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20" required minLength={8} dir="ltr" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p className="mt-1 text-xs text-[#86868b]">{isRTL ? "8 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" : "Minimum 8 characters"}</p></div>
                      <div><label className="mb-2 block text-sm font-medium text-[#1A1A2E]">{isRTL ? "\u0646\u0648\u0639 \u0627\u0644\u062d\u0633\u0627\u0628" : "Account Type"}</label><div className="grid grid-cols-2 gap-3"><label className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${accountType === "consumer" ? "border-[#D4A853] bg-[#D4A853]/8" : "border-[#d2d2d7] bg-white"}`}><input type="radio" name="accountType" value="consumer" checked={accountType === "consumer"} onChange={(e) => setAccountType(e.target.value as "consumer" | "business")} className="sr-only" /><span className="text-sm font-medium text-[#1A1A2E]">{isRTL ? "\u0645\u0633\u062a\u0647\u0644\u0643" : "Consumer"}</span></label><label className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${accountType === "business" ? "border-[#D4A853] bg-[#D4A853]/8" : "border-[#d2d2d7] bg-white"}`}><input type="radio" name="accountType" value="business" checked={accountType === "business"} onChange={(e) => setAccountType(e.target.value as "consumer" | "business")} className="sr-only" /><span className="text-sm font-medium text-[#1A1A2E]">{isRTL ? "\u0634\u0631\u0643\u0629" : "Business"}</span></label></div></div>
                      {accountType === "business" && (<div><label className="mb-2 block text-sm font-medium text-[#1A1A2E]">{isRTL ? "\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629" : "Company Name"}</label><input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-2xl border border-[#d2d2d7] px-4 py-3 text-[#1d1d1f] outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20" required={accountType === "business"} /></div>)}
                      <button type="submit" disabled={isFormLoading} className="w-full rounded-full bg-[#1A1A2E] py-3 text-sm font-semibold text-white transition hover:bg-[#2d2d5e] disabled:cursor-not-allowed disabled:opacity-50">{isFormLoading ? dict.common.loading : dict.auth.create_account}</button>
                      {message && (<div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>)}
                      {errorMsg && (<div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={16} className="shrink-0" />{errorMsg}</div>)}
                      <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e5e5ea]"></div></div><div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-[#86868b]">{isRTL ? "\u0623\u0648" : "OR"}</span></div></div>
                      <button type="button" onClick={handleGoogleAuth} disabled={isFormLoading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] px-4 py-3 transition hover:bg-[#f8f8fa] disabled:opacity-50"><Chrome size={18} className="text-red-500" /><span className="font-medium text-[#1A1A2E]">{dict.auth.google}</span></button>
                      <button type="button" onClick={handleAppleAuth} disabled={isFormLoading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d2d2d7] px-4 py-3 transition hover:bg-[#f8f8fa] disabled:opacity-50"><Apple size={18} className="text-gray-900" /><span className="font-medium text-[#1A1A2E]">{dict.auth.apple}</span></button>
                    </form>
                  )}
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-[#6e6e73]">
                {activeTab === "login" ? (<>{dict.auth.no_account}{" "}<button onClick={() => setActiveTab("signup")} className="font-semibold text-[#D4A853] transition hover:text-[#c39534]">{dict.auth.signup}</button></>) : (<>{dict.auth.have_account}{" "}<button onClick={() => setActiveTab("login")} className="font-semibold text-[#D4A853] transition hover:text-[#c39534]">{dict.auth.login}</button></>)}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
