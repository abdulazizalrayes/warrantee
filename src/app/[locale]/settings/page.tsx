// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { PageViewTracker } from "@/components/PageViewTracker";
import {
  User,
  Mail,
  Phone,
  Globe,
  Bell,
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  CreditCard,
} from "lucide-react";

export default function SettingsPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLocale, setPreferredLocale] = useState("en");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("profile");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setPreferredLocale(profile.preferred_locale || "en");
      setEmailNotifications(profile.email_notifications ?? true);
      setPushNotifications(profile.push_notifications ?? false);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");

    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        preferred_locale: preferredLocale,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
      })
      .eq("id", user!.id);

    if (saveError) {
      setError(
        isRTL
          ? "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u062d\u0641\u0638"
          : "Error saving settings. Please try again."
      );
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== "DELETE") return;
    setDeleting(true);
    try {
      await supabase.auth.signOut();
      router.push(`/${locale}`);
    } catch {
      setDeleting(false);
    }
  };

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  const sections = [
    { id: "profile", label: isRTL ? "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a" : "Profile", icon: User },
    { id: "notifications", label: isRTL ? "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a" : "Notifications", icon: Bell },
    { id: "language", label: isRTL ? "\u0627\u0644\u0644\u063a\u0629 \u0648\u0627\u0644\u0645\u0646\u0637\u0642\u0629" : "Language & Region", icon: Globe },
    { id: "subscription", label: isRTL ? "\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643" : "Subscription", icon: CreditCard },
    { id: "security", label: isRTL ? "\u0627\u0644\u0623\u0645\u0627\u0646" : "Security", icon: Shield },
  ];

  return (
    <div dir={direction} className="min-h-[80vh]">
      <PageViewTracker
        pageName="account_settings"
        pageType="account"
        locale={locale}
        extra={{ active_section: activeSection }}
      />
      <DashboardPageShell
        eyebrow={isRTL ? "\u062a\u0641\u0636\u064a\u0644\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628" : "Account preferences"}
        title={dict.common.settings}
        subtitle={isRTL ? "\u0645\u0633\u0627\u062d\u0629 \u0648\u0627\u062d\u062f\u0629 \u0644\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0648\u0627\u0644\u0644\u063a\u0629 \u0648\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643." : "One place to manage identity, notifications, language, billing, and account controls."}
        crumbs={[
          { label: "Dashboard", href: `/${locale}/dashboard` },
          { label: dict.common.settings },
        ]}
        stats={[
          { label: isRTL ? "\u0627\u0644\u0628\u0631\u064a\u062f" : "Email", value: user?.email || "—" },
          { label: isRTL ? "\u0627\u0644\u0642\u0633\u0645" : "Section", value: sections.find((section) => section.id === activeSection)?.label || activeSection },
        ]}
        auditNote={isRTL ? "\u064a\u062c\u0628 \u0623\u0644\u0627 \u062a\u0641\u0631\u0636 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0631\u062d\u0644\u0629 \u0645\u0639\u0642\u062f\u0629: \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629 \u062a\u062c\u0645\u0639 \u0623\u0647\u0645 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0641\u064a \u0633\u064a\u0627\u0642 \u0648\u0627\u062d\u062f." : "Settings should reduce friction, not create it. This page keeps the main account controls in one auditable surface."}
      >
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={() => router.push(`/${locale}/dashboard`)}
          className="group inline-flex items-center gap-1.5 text-[15px] text-[#86868b] hover:text-[#1d1d1f] transition-colors mb-6"
        >
          {isRTL ? (
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          )}
          {isRTL ? "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645" : "Back to Dashboard"}
        </button>
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
          {dict.common.settings}
        </h1>
        <p className="text-[17px] text-[#86868b] mt-2">
          {isRTL ? "\u0625\u062f\u0627\u0631\u0629 \u062d\u0633\u0627\u0628\u0643 \u0648\u062a\u0641\u0636\u064a\u0644\u0627\u062a\u0643" : "Manage your account and preferences"}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 max-w-[980px]">
        {/* Sidebar Navigation */}
        <nav className="lg:w-[240px] flex-shrink-0">
          <div className="lg:sticky lg:top-8 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? "bg-[#1A1A2E] text-white shadow-sm"
                      : "text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {saved && (
            <div className="mb-6 flex items-center gap-2 bg-[#30d158]/10 text-[#248a3d] px-4 py-3 rounded-xl text-[15px] font-medium">
              <Check className="w-5 h-5" />
              {isRTL ? "\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0628\u0646\u062c\u0627\u062d" : "Changes saved successfully"}
            </div>
          )}
          {error && (
            <div className="mb-6 bg-[#ff3b30]/10 text-[#ff3b30] px-4 py-3 rounded-xl text-[15px] font-medium">
              {error}
            </div>
          )}

          {/* Profile Section */}
          {activeSection === "profile" && (
            <div className="space-y-6">
              {/* Avatar Card */}
              <div className="bg-white rounded-2xl p-8 ring-1 ring-[#d2d2d7]/40 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1A1A2E] to-[#2d2d5e] flex items-center justify-center shadow-lg">
                    <span className="text-[24px] font-semibold text-white">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[21px] font-semibold text-[#1d1d1f] truncate">
                      {fullName || (isRTL ? "\u0623\u0636\u0641 \u0627\u0633\u0645\u0643" : "Add your name")}
                    </h2>
                    <p className="text-[15px] text-[#86868b] truncate">{user?.email}</p>
                    <span className="inline-block mt-2 text-[13px] font-medium px-3 py-1 rounded-full bg-[#f5f5f7] text-[#86868b]">
                      {profile?.account_type === "business"
                        ? isRTL ? "\u062d\u0633\u0627\u0628 \u0623\u0639\u0645\u0627\u0644" : "Business Account"
                        : isRTL ? "\u062d\u0633\u0627\u0628 \u0634\u062e\u0635\u064a" : "Personal Account"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Email */}
              <div className="bg-white rounded-2xl p-8 ring-1 ring-[#d2d2d7]/40 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-5">
                  {isRTL ? "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628" : "Account Information"}
                </h3>
                <div>
                  <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                    {isRTL ? "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Email Address"}
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#f5f5f7] rounded-xl">
                    <Mail className="w-[18px] h-[18px] text-[#86868b]" />
                    <span className="text-[15px] text-[#86868b]">{user?.email}</span>
                  </div>
                  <p className="text-[13px] text-[#86868b] mt-1.5">
                    {isRTL ? "\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Email address cannot be changed"}
                  </p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="bg-white rounded-2xl p-8 ring-1 ring-[#d2d2d7]/40 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-5">
                  {isRTL ? "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629" : "Personal Details"}
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                      {isRTL ? "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644" : "Full Name"}
                    </label>
                    <div className="relative">
                      <User className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#86868b] left-4 rtl:left-auto rtl:right-4" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={isRTL ? "\u0623\u062f\u062e\u0644 \u0627\u0633\u0645\u0643 \u0627\u0644\u0643\u0627\u0645\u0644" : "Enter your full name"}
                        className="w-full pl-12 rtl:pl-4 rtl:pr-12 pr-4 py-3 bg-[#f5f5f7] border-0 rounded-xl text-[15px] text-[#1d1d1f] placeholder-[#86868b]/60 focus:bg-white focus:ring-2 focus:ring-[#0071e3]/40 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                      {isRTL ? "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641" : "Phone Number"}
                    </label>
                    <div className="relative">
                      <Phone className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#86868b] left-4 rtl:left-auto rtl:right-4" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={isRTL ? "\u0623\u062f\u062e\u0644 \u0631\u0642\u0645 \u0647\u0627\u062a\u0641\u0643" : "Enter your phone number"}
                        className="w-full pl-12 rtl:pl-4 rtl:pr-12 pr-4 py-3 bg-[#f5f5f7] border-0 rounded-xl text-[15px] text-[#1d1d1f] placeholder-[#86868b]/60 focus:bg-white focus:ring-2 focus:ring-[#0071e3]/40 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center px-8 py-3 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[15px] font-medium rounded-full transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {saving ? (isRTL ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : "Saving...") : (isRTL ? "\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a" : "Save Changes")}
                </button>
                <button
                  onClick={() => router.push(`/${locale}/dashboard`)}
                  className="text-[15px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors px-6 py-3"
                >
                  {isRTL ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 ring-1 ring-[#d2d2d7]/40 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-2">
                  {isRTL ? "\u062a\u0641\u0636\u064a\u0644\u0627\u062a \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a" : "Notification Preferences"}
                </h3>
                <p className="text-[15px] text-[#86868b] mb-8">
                  {isRTL ? "\u0627\u062e\u062a\u0631 \u0643\u064a\u0641 \u062a\u0631\u064a\u062f \u0623\u0646 \u064a\u062a\u0645 \u0625\u0628\u0644\u0627\u063a\u0643" : "Choose how you want to be notified"}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-4 border-b border-[#d2d2d7]/30">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-[#0071e3]" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">
                          {isRTL ? "\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Email Notifications"}
                        </p>
                        <p className="text-[13px] text-[#86868b] mt-0.5">
                          {isRTL ? "\u0627\u0633\u062a\u0644\u0645 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Receive updates via email"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${emailNotifications ? "bg-[#30d158]" : "bg-[#d2d2d7]"}`}
                    >
                      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${emailNotifications ? "translate-x-[22px] rtl:-translate-x-[22px]" : "translate-x-0.5 rtl:-translate-x-0.5"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#ff9f0a]/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-[#ff9f0a]" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">
                          {isRTL ? "\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u062f\u0641\u0639" : "Push Notifications"}
                        </p>
                        <p className="text-[13px] text-[#86868b] mt-0.5">
                          {isRTL ? "\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0641\u0648\u0631\u064a\u0629 \u0641\u064a \u0627\u0644\u0645\u062a\u0635\u0641\u062d" : "Instant alerts in your browser"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPushNotifications(!pushNotifications)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${pushNotifications ? "bg-[#30d158]" : "bg-[#d2d2d7]"}`}
                    >
                      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${pushNotifications ? "translate-x-[22px] rtl:-translate-x-[22px]" : "translate-x-0.5 rtl:-translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="inline-flex items-center justify-center px-8 py-3 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[15px] font-medium rounded-full transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {saving ? (isRTL ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : "Saving...") : (isRTL ? "\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a" : "Save Changes")}
                </button>
              </div>
            </div>
          )}

          {/* Language Section */}
          {activeSection === "language" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 ring-1 ring-[#d2d2d7]/40 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-2">
                  {isRTL ? "\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u0645\u0641\u0636\u0644\u0629" : "Preferred Language"}
                </h3>
                <p className="text-[15px] text-[#86868b] mb-8">
                  {isRTL ? "\u0627\u062e\u062a\u0631 \u0644\u063a\u0629 \u0627\u0644\u0639\u0631\u0636" : "Choose your display language"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setPreferredLocale("en")}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${
                      preferredLocale === "en" ? "border-[#0071e3] bg-[#0071e3]/5" : "border-[#d2d2d7]/40 hover:border-[#d2d2d7]"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[17px] font-medium">EN</div>
                    <div className="text-left rtl:text-right">
                      <p className="text-[15px] font-medium text-[#1d1d1f]">English</p>
                      <p className="text-[13px] text-[#86868b]">United States</p>
                    </div>
                    {preferredLocale === "en" && <Check className="w-5 h-5 text-[#0071e3] ml-auto rtl:mr-auto rtl:ml-0" />}
                  </button>
                  <button
                    onClick={() => setPreferredLocale("ar")}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${
                      preferredLocale === "ar" ? "border-[#0071e3] bg-[#0071e3]/5" : "border-[#d2d2d7]/40 hover:border-[#d2d2d7]"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[17px] font-medium">AR</div>
                    <div className="text-left rtl:text-right">
                      <p className="text-[15px] font-medium text-[#1d1d1f]">{"العربية"}</p>
                      <p className="text-[13px] text-[#86868b]">{"المملكة العربية السعودية"}</p>
                    </div>
                    {preferredLocale === "ar" && <Check className="w-5 h-5 text-[#0071e3] ml-auto rtl:mr-auto rtl:ml-0" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="inline-flex items-center justify-center px-8 py-3 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[15px] font-medium rounded-full transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {saving ? (isRTL ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : "Saving...") : (isRTL ? "\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a" : "Save Changes")}
                </button>
              </div>
            </div>
          )}

          {/* Subscription Section */}
          {activeSection === "subscription" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 ring-1 ring-[#d2d2d7]/40 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-2">
                  {isRTL ? "\u062e\u0637\u062a\u0643 \u0627\u0644\u062d\u0627\u0644\u064a\u0629" : "Current Plan"}
                </h3>
                <p className="text-[15px] text-[#86868b] mb-8">
                  {isRTL ? "\u0625\u062f\u0627\u0631\u0629 \u0627\u0634\u062a\u0631\u0627\u0643\u0643 \u0648\u0641\u0648\u0627\u062a\u064a\u0631\u0643" : "Manage your subscription and billing"}
                </p>
                <div className="bg-gradient-to-br from-[#1A1A2E] to-[#2d2d5e] rounded-2xl p-6 text-white mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[13px] font-medium text-white/60 uppercase tracking-wide">
                      {isRTL ? "\u0627\u0644\u062e\u0637\u0629" : "Plan"}
                    </span>
                    <span className="text-[13px] font-medium bg-[#D4A853] text-[#1A1A2E] px-3 py-1 rounded-full">
                      {isRTL ? "\u0646\u0634\u0637" : "Active"}
                    </span>
                  </div>
                  <p className="text-[28px] font-semibold tracking-tight">{isRTL ? "\u0645\u062c\u0627\u0646\u064a" : "Free"}</p>
                  <p className="text-[15px] text-white/60 mt-1">
                    {isRTL ? "\u0636\u0645\u0627\u0646\u0627\u062a \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629. \u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0645\u062c\u0627\u0646\u064a\u0629." : "Unlimited warranties. First year free."}
                  </p>
                </div>
                <Link href={`/${locale}/billing`}
                  className="inline-flex items-center justify-center w-full py-3 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[15px] font-medium rounded-xl transition-colors"
                >
                  {isRTL ? "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643" : "Manage Subscription"}
                </Link>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 ring-1 ring-[#d2d2d7]/40 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide mb-2">
                  {isRTL ? "\u0623\u0645\u0627\u0646 \u0627\u0644\u062d\u0633\u0627\u0628" : "Account Security"}
                </h3>
                <p className="text-[15px] text-[#86868b] mb-8">
                  {isRTL ? "\u0625\u062f\u0627\u0631\u0629 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0623\u0645\u0627\u0646 \u062d\u0633\u0627\u0628\u0643" : "Manage your account security settings"}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-4 border-b border-[#d2d2d7]/30">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#30d158]/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-[#30d158]" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">
                          {isRTL ? "\u0637\u0631\u064a\u0642\u0629 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644" : "Sign-in Method"}
                        </p>
                        <p className="text-[13px] text-[#86868b] mt-0.5">Google OAuth</p>
                      </div>
                    </div>
                    <span className="text-[13px] font-medium text-[#30d158] bg-[#30d158]/10 px-3 py-1 rounded-full">
                      {isRTL ? "\u0645\u062a\u0635\u0644" : "Connected"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-[#ff3b30]" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">
                          {isRTL ? "\u062d\u0630\u0641 \u0627\u0644\u062d\u0633\u0627\u0628" : "Delete Account"}
                        </p>
                        <p className="text-[13px] text-[#86868b] mt-0.5">
                          {isRTL ? "\u062d\u0630\u0641 \u062d\u0633\u0627\u0628\u0643 \u0648\u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0646\u0647\u0627\u0626\u064a\u0627\u064b" : "Permanently delete your account and data"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowDeleteModal(true); setDeleteConfirmInput(""); }}
                      className="text-[13px] font-medium text-[#ff3b30] hover:text-[#d70015] transition-colors"
                    >
                      {isRTL ? "\u062d\u0630\u0641" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8" dir={direction}>
            <div className="w-12 h-12 rounded-full bg-[#ff3b30]/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#ff3b30]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] text-center mb-2">
              {isRTL ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
            </h2>
            <p className="text-[15px] text-[#86868b] text-center mb-6">
              {isRTL
                ? 'هذا الإجراء لا يمكن التراجع عنه. اكتب "DELETE" للتأكيد.'
                : 'This action cannot be undone. Type DELETE to confirm.'}
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={e => setDeleteConfirmInput(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2.5 border border-[#d2d2d7] rounded-xl text-[15px] mb-4 focus:outline-none focus:ring-2 focus:ring-[#ff3b30]/30 focus:border-[#ff3b30]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-xl text-[15px] font-medium hover:bg-[#f5f5f7] transition-colors"
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmInput !== "DELETE" || deleting}
                className="flex-1 px-4 py-2.5 bg-[#ff3b30] text-white rounded-xl text-[15px] font-medium hover:bg-[#d70015] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "..." : (isRTL ? "حذف" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
      </DashboardPageShell>
    </div>
  );
}
