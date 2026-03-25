// @ts-nocheck
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  User,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [preferredLocale, setPreferredLocale] = useState(locale);

  const [companyName, setCompanyName] = useState("");
  const [companyNameAr, setCompanyNameAr] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [companyRole, setCompanyRole] = useState<"vendor" | "client" | "both">("both");
  const [country, setCountry] = useState("SA");
  const [city, setCity] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [website, setWebsite] = useState("");

  const isBusiness = profile?.account_type === "business";
  const totalSteps = isBusiness ? 3 : 2;

  const handleStep1 = async () => {
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        preferred_locale: preferredLocale,
      })
      .eq("id", user!.id);
    if (updateError) { setError(updateError.message); setLoading(false); return; }
    await refreshProfile();
    setStep(2);
    setLoading(false);
  };

  const handleStep2Company = async () => {
    setLoading(true);
    setError("");
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        name_ar: companyNameAr || null,
        cr_number: crNumber || null,
        vat_number: vatNumber || null,
        company_role: companyRole,
        country,
        city: city || null,
        email: companyEmail || user!.email,
        phone: companyPhone || null,
        website: website || null,
        created_by: user!.id,
      })
      .select()
      .single();
    if (companyError) { setError(companyError.message); setLoading(false); return; }
    await supabase.from("company_members").insert({
      company_id: company.id,
      user_id: user!.id,
      role: "company_admin",
      is_active: true,
    });
    setStep(3);
    setLoading(false);
  };

  const handleComplete = async () => {
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user!.id);
    if (updateError) { setError(updateError.message); setLoading(false); return; }
    await refreshProfile();
    router.push(`/${locale}/dashboard`);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={32} className="text-gold" />
        </div>
        <h2 className="text-xl font-bold text-navy">
          {isRTL ? "\u0623\u0643\u0645\u0644 \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062E\u0635\u064A" : "Complete Your Profile"}
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          {isRTL ? "\u0623\u062E\u0628\u0631\u0646\u0627 \u0639\u0646 \u0646\u0641\u0633\u0643" : "Tell us a bit about yourself"}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-2">
          {isRTL ? "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644" : "Full Name"} *
        </label>
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-2">
          {isRTL ? "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641" : "Phone Number"}
        </label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="+966 5X XXX XXXX"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-2">
          {isRTL ? "\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0645\u0641\u0636\u0644\u0629" : "Preferred Language"}
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="locale" value="en" checked={preferredLocale === "en"}
              onChange={(e) => setPreferredLocale(e.target.value)} className="w-4 h-4 accent-gold" />
            <span className="text-sm">English</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="locale" value="ar" checked={preferredLocale === "ar"}
              onChange={(e) => setPreferredLocale(e.target.value)} className="w-4 h-4 accent-gold" />
            <span className="text-sm">\u0627\u0644\u0639\u0631\u0628\u064A\u0629</span>
          </label>
        </div>
      </div>
      <button onClick={handleStep1} disabled={loading || !fullName}
        className="w-full bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading ? dict.common.loading : dict.common.next}
        {!isRTL && <ArrowRight size={18} />}
        {isRTL && <ArrowLeft size={18} />}
      </button>
    </div>
  );

  const renderStep2Company = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-gold" />
        </div>
        <h2 className="text-xl font-bold text-navy">
          {isRTL ? "\u0633\u062C\u0644 \u0634\u0631\u0643\u062A\u0643" : "Register Your Company"}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 (English)" : "Company Name (English)"} *</label>
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 (\u0639\u0631\u0628\u064A)" : "Company Name (Arabic)"}</label>
          <input type="text" value={companyNameAr} onChange={(e) => setCompanyNameAr(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="rtl" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0631\u0642\u0645 \u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u062A\u062C\u0627\u0631\u064A" : "CR Number"}</label>
          <input type="text" value={crNumber} onChange={(e) => setCrNumber(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0636\u0631\u064A\u0628\u064A" : "VAT Number"}</label>
          <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u062F\u0648\u0631 \u0627\u0644\u0634\u0631\u0643\u0629" : "Company Role"} *</label>
        <select value={companyRole} onChange={(e) => setCompanyRole(e.target.value as "vendor" | "client" | "both")}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent">
          <option value="vendor">{isRTL ? "\u0645\u0648\u0631\u062F" : "Vendor/Seller"}</option>
          <option value="client">{isRTL ? "\u0639\u0645\u064A\u0644" : "Client/Buyer"}</option>
          <option value="both">{isRTL ? "\u0643\u0644\u0627\u0647\u0645\u0627" : "Both"}</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u062F\u0648\u0644\u0629" : "Country"}</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent">
            <option value="SA">{isRTL ? "\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629" : "Saudi Arabia"}</option>
            <option value="AE">{isRTL ? "\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A" : "UAE"}</option>
            <option value="KW">{isRTL ? "\u0627\u0644\u0643\u0648\u064A\u062A" : "Kuwait"}</option>
            <option value="BH">{isRTL ? "\u0627\u0644\u0628\u062D\u0631\u064A\u0646" : "Bahrain"}</option>
            <option value="QA">{isRTL ? "\u0642\u0637\u0631" : "Qatar"}</option>
            <option value="OM">{isRTL ? "\u0639\u0645\u0627\u0646" : "Oman"}</option>
            <option value="EG">{isRTL ? "\u0645\u0635\u0631" : "Egypt"}</option>
            <option value="JO">{isRTL ? "\u0627\u0644\u0623\u0631\u062F\u0646" : "Jordan"}</option>
            <option value="US">{isRTL ? "\u0627\u0644\u0648\u0644\u0627\u064A\u0627\u062A \u0627\u0644\u0645\u062A\u062D\u062F\u0629" : "United States"}</option>
            <option value="GB">{isRTL ? "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0645\u062A\u062D\u062F\u0629" : "United Kingdom"}</option>
            <option value="OTHER">{isRTL ? "\u0623\u062E\u0631\u0649" : "Other"}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0645\u062F\u064A\u0646\u0629" : "City"}</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u0644\u0634\u0631\u0643\u0629" : "Company Email"}</label>
          <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">{isRTL ? "\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A" : "Website"}</label>
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" dir="ltr" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-navy">
          {dict.common.back}
        </button>
        <button onClick={handleStep2Company} disabled={loading || !companyName}
          className="flex-1 bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? dict.common.loading : dict.common.next}
          {!isRTL && <ArrowRight size={18} />}
          {isRTL && <ArrowLeft size={18} />}
        </button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle size={40} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-navy">
        {isRTL ? "\u0623\u0646\u062A \u062C\u0627\u0647\u0632!" : "You're All Set!"}
      </h2>
      <p className="text-gray-600">
        {isRTL ? "\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u062D\u0633\u0627\u0628\u0643 \u0628\u0646\u062C\u0627\u062D. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u0627\u0644\u0628\u062F\u0621 \u0641\u064A \u0625\u062F\u0627\u0631\u0629 \u0636\u0645\u0627\u0646\u0627\u062A\u0643." : "Your account is set up. You can now start managing your warranties."}
      </p>
      <button onClick={handleComplete} disabled={loading}
        className="bg-gold hover:bg-yellow-500 text-navy font-semibold py-3 px-8 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? dict.common.loading : isRTL ? "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645" : "Go to Dashboard"}
      </button>
    </div>
  );

  const renderCurrentStep = () => {
    if (step === 1) return renderStep1();
    if (step === 2 && isBusiness) return renderStep2Company();
    return renderComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-warm-white to-gray-50" dir={direction}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-navy">Warrantee</h1>
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${i + 1 <= step ? "bg-gold w-12" : "bg-gray-200 w-8"}`} />
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
          )}
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
}
