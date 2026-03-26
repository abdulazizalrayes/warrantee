"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { Shield, User, Building2, Bell, ChevronRight, ChevronLeft, Check, Sparkles, Globe, Camera, Smartphone } from "lucide-react";
import Link from "next/link";

export default function OnboardingPage() {
  const { locale } = useParams();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { user, refreshProfile } = useAuth();
  const isAr = locale === "ar";
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    company: "",
    phone: "",
    notify_expiry: true,
    notify_claims: true,
    notify_newsletter: false,
    language: locale as string,
  });

  const steps = [
    { icon: User, title: isAr ? "\u0645\u0639\u0644\u0648\u0645\u0627\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629" : "Personal Info", sub: isAr ? "\u0623\u062e\u0628\u0631\u0646\u0627 \u0639\u0646 \u0646\u0641\u0633\u0643" : "Tell us about yourself" },
    { icon: Building2, title: isAr ? "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u0644" : "Business Details", sub: isAr ? "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0634\u0631\u0643\u062a\u0643" : "Your company info" },
    { icon: Bell, title: isAr ? "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a" : "Notifications", sub: isAr ? "\u0627\u062e\u062a\u0631 \u062a\u0646\u0628\u064a\u0647\u0627\u062a\u0643" : "Choose your alerts" },
    { icon: Sparkles, title: isAr ? "\u062c\u0627\u0647\u0632!" : "All Set!", sub: isAr ? "\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646" : "Start exploring" },
  ];
  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: form.full_name,
        company: form.company,
        phone: form.phone,
        notify_expiry: form.notify_expiry,
        notify_claims: form.notify_claims,
        notify_newsletter: form.notify_newsletter,
        preferred_language: form.language,
        onboarding_completed: true,
      });
      if (error) throw error;
      await refreshProfile();
      router.push("/" + locale + "/dashboard");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const canNext = step === 0 ? form.full_name.trim().length > 0 : true;

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#f5f5f7]">
      {/* Top bar */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]/40 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1A1A2E] to-[#2d2d5e] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[#1d1d1f]">Warrantee</span>
          </div>
          <span className="text-[13px] text-[#86868b]">{isAr ? "\u0627\u0644\u062e\u0637\u0648\u0629" : "Step"} {step + 1} / {steps.length}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={"w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 " + (i < step ? "bg-[#30d158] text-white" : i === step ? "bg-[#1A1A2E] text-white ring-4 ring-[#1A1A2E]/20" : "bg-[#d2d2d7]/40 text-[#86868b]")}>
                {i < step ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              {i < steps.length - 1 && (
                <div className={"w-12 h-0.5 rounded-full transition-all duration-300 " + (i < step ? "bg-[#30d158]" : "bg-[#d2d2d7]/60")} />
              )}
            </div>
          ))}
        </div>

        {/* Step title */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight">{steps[step].title}</h1>
          <p className="text-[15px] text-[#86868b] mt-1">{steps[step].sub}</p>
        </div>

        {/* Step Content Card */}
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-8 mb-8">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">{isAr ? "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644" : "Full Name"} *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder={isAr ? "\u0623\u062f\u062e\u0644 \u0627\u0633\u0645\u0643" : "Enter your name"}
                  className="w-full px-4 py-3 rounded-xl bg-[#f5f5f7] border-0 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b]/60 focus:outline-none focus:ring-2 focus:ring-[#007aff] transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">{isAr ? "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641" : "Phone Number"}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={isAr ? "+966 5x xxx xxxx" : "+966 5x xxx xxxx"}
                  className="w-full px-4 py-3 rounded-xl bg-[#f5f5f7] border-0 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b]/60 focus:outline-none focus:ring-2 focus:ring-[#007aff] transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">{isAr ? "\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u0645\u0641\u0636\u0644\u0629" : "Preferred Language"}</label>
                <div className="flex gap-3">
                  {[{ val: "en", label: "English", icon: "\ud83c\uddec\ud83c\udde7" }, { val: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", icon: "\ud83c\uddf8\ud83c\udde6" }].map((lang) => (
                    <button
                      key={lang.val}
                      onClick={() => setForm({ ...form, language: lang.val })}
                      className={"flex-1 py-3 px-4 rounded-xl text-[15px] font-medium transition-all duration-200 " + (form.language === lang.val ? "bg-[#1A1A2E] text-white shadow-lg" : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]")}
                    >
                      {lang.icon} {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-2">{isAr ? "\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629" : "Company Name"}</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder={isAr ? "\u0627\u0633\u0645 \u0634\u0631\u0643\u062a\u0643 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)" : "Your company name (optional)"}
                  className="w-full px-4 py-3 rounded-xl bg-[#f5f5f7] border-0 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b]/60 focus:outline-none focus:ring-2 focus:ring-[#007aff] transition-all"
                />
              </div>
              <div className="bg-[#f5f5f7] rounded-2xl p-6">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">{isAr ? "\u0645\u0627\u0630\u0627 \u064a\u0645\u0643\u0646\u0643 \u0641\u0639\u0644\u0647" : "What you can do"}</h3>
                <div className="space-y-3">
                  {[
                    { icon: Camera, text: isAr ? "\u0645\u0633\u062d \u0636\u0648\u0626\u064a \u0644\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a" : "AI-powered warranty scanning" },
                    { icon: Globe, text: isAr ? "\u062f\u0639\u0645 \u062b\u0646\u0627\u0626\u064a \u0627\u0644\u0644\u063a\u0629" : "Bilingual Arabic & English" },
                    { icon: Smartphone, text: isAr ? "\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0630\u0643\u064a\u0629 \u0642\u0628\u0644 \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646" : "Smart expiry alerts" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-[#007aff]" />
                      </div>
                      <span className="text-[14px] text-[#1d1d1f]">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {[
                { key: "notify_expiry", title: isAr ? "\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646" : "Warranty Expiry Alerts", desc: isAr ? "\u0625\u0634\u0639\u0627\u0631 \u0642\u0628\u0644 30 \u064a\u0648\u0645 \u0645\u0646 \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646" : "Get notified 30 days before expiry", recommended: true },
                { key: "notify_claims", title: isAr ? "\u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a" : "Claim Status Updates", desc: isAr ? "\u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0641\u0648\u0631\u064a\u0629 \u0639\u0646 \u062d\u0627\u0644\u0629 \u0645\u0637\u0627\u0644\u0628\u0627\u062a\u0643" : "Real-time updates on your claims", recommended: true },
                { key: "notify_newsletter", title: isAr ? "\u0627\u0644\u0646\u0634\u0631\u0629 \u0627\u0644\u0625\u062e\u0628\u0627\u0631\u064a\u0629" : "Product Newsletter", desc: isAr ? "\u0646\u0635\u0627\u0626\u062d \u0648\u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0634\u0647\u0631\u064a\u0629" : "Monthly tips and product updates", recommended: false },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setForm({ ...form, [item.key]: !form[item.key as keyof typeof form] })}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-all duration-200"
                >
                  <div className="flex-1 text-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium text-[#1d1d1f]">{item.title}</span>
                      {item.recommended && (
                        <span className="text-[11px] font-medium text-[#007aff] bg-[#007aff]/10 px-2 py-0.5 rounded-full">{isAr ? "\u0645\u0648\u0635\u0649 \u0628\u0647" : "Recommended"}</span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#86868b] mt-0.5">{item.desc}</p>
                  </div>
                  <div className={"w-12 h-7 rounded-full transition-all duration-300 flex items-center " + (form[item.key as keyof typeof form] ? "bg-[#30d158] justify-end" : "bg-[#d2d2d7] justify-start")}>
                    <div className="w-5.5 h-5.5 mx-0.5 bg-white rounded-full shadow-sm" style={{ width: 22, height: 22, margin: 2 }} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[#30d158]/10 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-[#30d158]" />
              </div>
              <h2 className="text-[24px] font-bold text-[#1d1d1f] mb-2">
                {isAr ? "\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643, " + form.full_name + "!" : "Welcome, " + form.full_name + "!"}
              </h2>
              <p className="text-[15px] text-[#86868b] mb-8 max-w-md mx-auto">
                {isAr ? "\u062d\u0633\u0627\u0628\u0643 \u062c\u0627\u0647\u0632. \u0627\u0628\u062f\u0623 \u0628\u0625\u0636\u0627\u0641\u0629 \u0623\u0648\u0644 \u0636\u0645\u0627\u0646 \u0644\u0643." : "Your account is all set up. Start by adding your first warranty."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={"/" + locale + "/warranties/new"}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#1A1A2E] text-white text-[15px] font-medium hover:opacity-90 transition-opacity"
                >
                  {isAr ? "\u0623\u0636\u0641 \u0636\u0645\u0627\u0646" : "Add Warranty"}
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href={"/" + locale + "/dashboard"}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#f5f5f7] text-[#1d1d1f] text-[15px] font-medium hover:bg-[#e8e8ed] transition-colors"
                >
                  {isAr ? "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645" : "Go to Dashboard"}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {step < 3 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[15px] font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-white hover:ring-1 hover:ring-[#d2d2d7]/40 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:ring-0 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {isAr ? "\u0627\u0644\u0633\u0627\u0628\u0642" : "Back"}
            </button>

            {step < 2 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1A1A2E] text-white text-[15px] font-medium hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {isAr ? "\u0627\u0644\u062a\u0627\u0644\u064a" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#30d158] text-white text-[15px] font-medium hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isAr ? "\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0625\u0639\u062f\u0627\u062f" : "Complete Setup"}
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Skip link */}
        {step < 3 && (
          <div className="text-center mt-6">
            <Link
              href={"/" + locale + "/dashboard"}
              className="text-[13px] text-[#86868b] hover:text-[#1d1d1f] transition-colors"
            >
              {isAr ? "\u062a\u062e\u0637\u064a \u0627\u0644\u0625\u0639\u062f\u0627\u062f" : "Skip for now"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
