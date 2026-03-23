"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Mail, Apple, Chrome } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type AuthTab = "login" | "signup";

export default function AuthPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<"consumer" | "business">(
    "consumer"
  );
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Simulate magic link send - in production, connect to Supabase
    setTimeout(() => {
      setMessage(
        isRTL ? "ØªÙ Ø¥Ø±Ø³Ø§Ù Ø±Ø§Ø¨Ø· Ø³Ø­Ø±Ù Ø¥ÙÙ Ø¨Ø±ÙØ¯Ù Ø§ÙØ¥ÙÙØªØ±ÙÙÙ" : "Magic link sent to your email"
      );
      setLoading(false);
    }, 1000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Simulate signup - in production, connect to Supabase
    setTimeout(() => {
      setMessage(
        isRTL ? "ØªÙ Ø¥ÙØ´Ø§Ø¡ Ø­Ø³Ø§Ø¨Ù Ø¨ÙØ¬Ø§Ø­!" : "Account created successfully!"
      );
      setLoading(false);
    }, 1000);
  };

  const handleSocialAuth = (provider: "google" | "apple") => {
    setLoading(true);
    // In production, initiate OAuth flow via Supabase
    console.log(`Authenticate with ${provider}`);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-warm-white to-gray-50"
      dir={direction}
    >
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">Warrantee</h1>
          <p className="text-gray-600">
            {isRTL ? "ÙØ±Ø­Ø¨Ø§ Ø¨Ù ÙÙ Warrantee" : "Welcome to Warrantee"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === "login"
                  ? "border-b-2 border-gold text-navy bg-gray-50"
                  : "text-gray-600 hover:text-navy"
              }`}
            >
              {dict.auth.login}
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`flex-1 py-4 px-6 font-medium transition-colors ${
                activeTab === "signup"
                  ? "border-b-2 border-gold text-navy bg-gray-50"
                  : "text-gray-600 hover:text-navy"
              }`}
            >
              {dict.auth.signup}
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {activeTab === "login" ? (
              // LOGIN FORM
              <form onSubmit={handleMagicLink} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">
                    {dict.auth.email}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Mail size={18} />
                  {loading ? dict.common.loading : dict.auth.magic_link}
                </button>

                {message && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                    {message}
                  </div>
                )}

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-600">
                      {isRTL ? "Ø£Ù" : "OR"}
                    </span>
                  </div>
                </div>

                {/* Social Auth */}
                <button
                  type="button"
                  onClick={() => handleSocialAuth("google")}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Chrome size={18} className="text-red-500" />
                  <span className="font-medium text-navy">{dict.auth.google}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialAuth("apple")}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Apple size={18} className="text-gray-900" />
                  <span className="font-medium text-navy">{dict.auth.apple}</span>
                </button>
              </form>
            ) : (
              // SIGNUP FORM
              <form onSubmit={handleSignUp} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">
                    {isRTL ? "Ø§ÙØ§Ø³Ù Ø§ÙÙØ§ÙÙ" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isRTL ? "Ø£Ø­ÙØ¯ ÙØ­ÙØ¯" : "John Doe"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">
                    {dict.auth.email}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">
                    {isRTL ? "ÙÙØ¹ Ø§ÙØ­Ø³Ø§Ø¨" : "Account Type"}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="accountType"
                        value="consumer"
                        checked={accountType === "consumer"}
                        onChange={(e) =>
                          setAccountType(e.target.value as "consumer" | "business")
                        }
                        className="w-4 h-4 accent-gold"
                      />
                      <span className="text-sm font-medium text-navy">
                        {isRTL ? "ÙØ³ØªÙÙÙ" : "Consumer"}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="accountType"
                        value="business"
                        checked={accountType === "business"}
                        onChange={(e) =>
                          setAccountType(e.target.value as "consumer" | "business")
                        }
                        className="w-4 h-4 accent-gold"
                      />
                      <span className="text-sm font-medium text-navy">
                        {isRTL ? "Ø´Ø±ÙØ©" : "Business"}
                      </span>
                    </label>
                  </div>
                </div>

                {accountType === "business" && (
                  <div>
                    <label className="block text-sm font-medium text-navy mb-2">
                      {isRTL ? "Ø§Ø³Ù Ø§ÙØ´Ø±ÙØ©" : "Company Name"}
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={isRTL ? "Ø´Ø±ÙØªÙ" : "My Company"}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition"
                      required={accountType === "business"}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? dict.common.loading : dict.auth.create_account}
                </button>

                {message && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                    {message}
                  </div>
                )}

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-600">
                      {isRTL ? "Ø£Ù" : "OR"}
                    </span>
                  </div>
                </div>

                {/* Social Auth */}
                <button
                  type="button"
                  onClick={() => handleSocialAuth("google")}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Chrome size={18} className="text-red-500" />
                  <span className="font-medium text-navy">{dict.auth.google}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialAuth("apple")}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Apple size={18} className="text-gray-900" />
                  <span className="font-medium text-navy">{dict.auth.apple}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          {activeTab === "login" ? (
            <>
              {dict.auth.no_account}{" "}
              <button
                onClick={() => setActiveTab("signup")}
                className="font-semibold text-gold hover:text-yellow-600 transition"
              >
                {dict.auth.signup}
              </button>
            </>
          ) : (
            <>
              {dict.auth.have_account}{" "}
              <button
                onClick={() => setActiveTab("login")}
                className="font-semibold text-gold hover:text-yellow-600 transition"
              >
                {dict.auth.login}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}