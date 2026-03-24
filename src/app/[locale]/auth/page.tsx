"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

const translations = {
  en: {
    signIn: "Sign In",
    signUp: "Sign Up",
    email: "Email",
    password: "Password",
    fullName: "Full Name",
    forgotPassword: "Forgot password?",
    noAccount: "Don\'t have an account?",
    hasAccount: "Already have an account?",
    orContinueWith: "Or continue with",
    google: "Continue with Google",
    apple: "Continue with Apple",
    signingIn: "Signing in...",
    signingUp: "Creating account...",
    checkEmail: "Check your email for a confirmation link!",
    tagline: "Trust the Terms\u2122",
    subtitle: "Manage your warranties digitally",
  },
  ar: {
    signIn: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644",
    signUp: "\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628",
    email: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
    password: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    fullName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644",
    forgotPassword: "\u0646\u0633\u064A\u062A \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061F",
    noAccount: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u062D\u0633\u0627\u0628\u061F",
    hasAccount: "\u0644\u062F\u064A\u0643 \u062D\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644\u061F",
    orContinueWith: "\u0623\u0648 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645",
    google: "\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0628\u062D\u0633\u0627\u0628 Google",
    apple: "\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0628\u062D\u0633\u0627\u0628 Apple",
    signingIn: "\u062C\u0627\u0631\u064A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644...",
    signingUp: "\u062C\u0627\u0631\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628...",
    checkEmail: "\u062A\u062D\u0642\u0642 \u0645\u0646 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0623\u0643\u064A\u062F!",
    tagline: "\u0636\u0645\u0627\u0646\u062A\u064A\u2122",
    subtitle: "\u0625\u062F\u0627\u0631\u0629 \u0636\u0645\u0627\u0646\u0627\u062A\u0643 \u0631\u0642\u0645\u064A\u064B\u0627",
  },
};

export default function AuthPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const t = translations[locale as keyof typeof translations] || translations.en;
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, preferred_language: locale },
            emailRedirectTo: window.location.origin + "/" + locale + "/dashboard",
          },
        });
        if (error) throw error;
        setMessage(t.checkEmail);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/" + locale + "/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + "/" + locale + "/dashboard",
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#4169E1] rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{t.tagline}</h1>
          <p className="text-gray-400 mt-2">{t.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-6 text-center">
            {isSignUp ? t.signUp : t.signIn}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
          )}
          {message && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{message}</div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t.fullName}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4169E1] focus:border-transparent outline-none"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder={t.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4169E1] focus:border-transparent outline-none"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4169E1] focus:border-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {!isSignUp && (
              <div className="text-right">
                <button type="button" className="text-sm text-[#4169E1] hover:underline">
                  {t.forgotPassword}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#4169E1] text-white rounded-xl font-semibold hover:bg-[#3457b5] transition-colors disabled:opacity-50"
            >
              {loading ? (isSignUp ? t.signingUp : t.signingIn) : (isSignUp ? t.signUp : t.signIn)}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-500">{t.orContinueWith}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleOAuth("google")}
              className="w-full py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {t.google}
            </button>
            <button
              onClick={() => handleOAuth("apple")}
              className="w-full py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              {t.apple}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isSignUp ? t.hasAccount : t.noAccount}{" "}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
              className="text-[#4169E1] font-semibold hover:underline"
            >
              {isSignUp ? t.signIn : t.signUp}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
