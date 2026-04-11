// @ts-nocheck
"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Mail, Apple, Eye, EyeOff, AlertCircle } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

type AuthTab = "login" | "signup";

function AuthPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { signInWithApple, signInWithMagicLink, signInWithPassword, signUp, loading: authLoading } = useAuth();
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
  const errorFromUrl = searchParams.get("error");

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage(""); setErrorMsg("");
    const { error } = await signInWithMagicLink(email, locale);
    if (error) { setErrorMsg(typeof error === "string" ? error : (error as any).message ?? String(error)); } else { setMessage(isRTL ? "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0633\u062d\u0631\u064a \u0625\u0644\u0649 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Magic link sent to your email! Check your inbox."); }
    setLoading(false);
  };
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage(""); setErrorMsg("");
    const { error } = await signInWithPassword(email, password);
    if (error) { setErrorMsg(typeof error === "string" ? error : (error as any).message ?? String(error)); }
    setLoading(false);
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage(""); setErrorMsg("");
    if (password.length < 8) { setErrorMsg(isRTL ? "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 8 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" : "Password must be at least 8 characters"); setLoading(false); return; }
    const { error } = await signUp(email, password, { full_name: fullName, account_type: accountType, company_name: accountType === "business" ? companyName : undefined });
    if (error) { setErrorMsg(typeof error === "string" ? error : (error as any).message ?? String(error)); } else { setMessage(isRTL ? "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628\u0643! \u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0644\u062a\u0623\u0643\u064a\u062f \u062d\u0633\u0627\u0628\u0643." : "Account created! Check your email to confirm your account."); }
    setLoading(false);
  };
  const handleAppleAuth = async () => { await signInWithApple(locale); };
  const isFormLoading = loading || authLoading;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-warm-white to-gray-50" dir={direction}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">Warrantee</h1>
          <p className="text-gray-600">{isRTL ? "\u0645\u0631\u062d\u0628\u0627 \u0628\u0643 \u0641\u064a Warrantee" : "Welcome to Warrantee"}</p>
        </div>
        {errorFromUrl && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center gap-2"><AlertCircle size={16} />{isRTL ? "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644. \u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649." : "An error occurred during sign in. Please try again."}</div>)}
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button onClick={() => { setActiveTab("login"); setMessage(""); setErrorMsg(""); }} className={`flex-1 py-4 px-6 font-medium transition-colors ${activeTab === "login" ? "border-b-2 border-gold text-navy bg-gray-50" : "text-gray-600 hover:text-navy"}`}>{dict.auth.login}</button>
            <button onClick={() => { setActiveTab("signup"); setMessage(""); setErrorMsg(""); }} className={`flex-1 py-4 px-6 font-medium transition-colors ${activeTab === "signup" ? "border-b-2 border-gold text-navy bg-gray-50" : "text-gray-600 hover:text-navy"}`}>{dict.auth.signup}</button>
          </div>
          <div className="p-8">
            {activeTab === "login" ? (
              <form onSubmit={authMode === "magic" ? handleMagicLink : handlePasswordLogin} className="space-y-5">
                <div><label className="block text-sm font-medium text-navy mb-2">{dict.auth.email}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition" required dir="ltr" /></div>
                {authMode === "password" && (<div><label className="block text-sm font-medium text-navy mb-2">{dict.auth.password}</label><div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition" required dir="ltr" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>)}
                <button type="submit" disabled={isFormLoading} className="w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Mail size={18} />{isFormLoading ? dict.common.loading : authMode === "magic" ? dict.auth.magic_link : dict.auth.sign_in}</button>
                <div className="text-center"><button type="button" onClick={() => setAuthMode(authMode === "magic" ? "password" : "magic")} className="text-sm text-gold hover:text-yellow-600 transition font-medium">{authMode === "magic" ? (isRTL ? "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" : "Sign in with password instead") : (isRTL ? "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0633\u062d\u0631\u064a" : "Sign in with magic link instead")}</button></div>
                {message && (<div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">{message}</div>)}
                {errorMsg && (<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center gap-2"><AlertCircle size={16} className="shrink-0" />{errorMsg}</div>)}
                <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-600">{isRTL ? "\u0623\u0648" : "OR"}</span></div></div>

                <button type="button" onClick={handleAppleAuth} disabled={isFormLoading} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"><Apple size={18} className="text-gray-900" /><span className="font-medium text-navy">{dict.auth.apple}</span></button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-5">
                <div><label className="block text-sm font-medium text-navy mb-2">{isRTL ? "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644" : "Full Name"}</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition" required /></div>
                <div><label className="block text-sm font-medium text-navy mb-2">{dict.auth.email}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition" required dir="ltr" /></div>
                <div><label className="block text-sm font-medium text-navy mb-2">{dict.auth.password}</label><div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition" required minLength={8} dir="ltr" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p className="text-xs text-gray-500 mt-1">{isRTL ? "8 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" : "Minimum 8 characters"}</p></div>
                <div><label className="block text-sm font-medium text-navy mb-2">{isRTL ? "\u0646\u0648\u0639 \u0627\u0644\u062d\u0633\u0627\u0628" : "Account Type"}</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="accountType" value="consumer" checked={accountType === "consumer"} onChange={(e) => setAccountType(e.target.value as "consumer" | "business")} className="w-4 h-4 accent-gold" /><span className="text-sm font-medium text-navy">{isRTL ? "\u0645\u0633\u062a\u0647\u0644\u0643" : "Consumer"}</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="accountType" value="business" checked={accountType === "business"} onChange={(e) => setAccountType(e.target.value as "consumer" | "business")} className="w-4 h-4 accent-gold" /><span className="text-sm font-medium text-navy">{isRTL ? "\u0634\u0631\u0643\u0629" : "Business"}</span></label></div></div>
                {accountType === "business" && (<div><label className="block text-sm font-medium text-navy mb-2">{isRTL ? "\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629" : "Company Name"}</label><input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition" required={accountType === "business"} /></div>)}
                <button type="submit" disabled={isFormLoading} className="w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">{isFormLoading ? dict.common.loading : dict.auth.create_account}</button>
                {message && (<div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">{message}</div>)}
                {errorMsg && (<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center gap-2"><AlertCircle size={16} className="shrink-0" />{errorMsg}</div>)}
                <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-600">{isRTL ? "\u0623\u0648" : "OR"}</span></div></div>

                <button type="button" onClick={handleAppleAuth} disabled={isFormLoading} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"><Apple size={18} className="text-gray-900" /><span className="font-medium text-navy">{dict.auth.apple}</span></button>
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-sm text-gray-600 mt-6">
          {activeTab === "login" ? (<>{dict.auth.no_account}{" "}<button onClick={() => setActiveTab("signup")} className="font-semibold text-gold hover:text-yellow-600 transition">{dict.auth.signup}</button></>) : (<>{dict.auth.have_account}{" "}<button onClick={() => setActiveTab("login")} className="font-semibold text-gold hover:text-yellow-600 transition">{dict.auth.login}</button></>)}
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a06800]" /></div>}>
      <AuthPageInner />
    </Suspense>
  );
}
