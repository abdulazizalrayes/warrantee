// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SettingsPage() {
  const params = useParams();
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

  // Sync state when profile loads or changes
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
      setError(isRTL ? "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u062d\u0641\u0638" : "Error saving settings. Please try again.");
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div dir={direction}>
      {/* Back button */}
      <button
        onClick={() => router.push(`/${locale}/dashboard`)}
        className="flex items-center gap-2 text-gray-600 hover:text-[#1A1A2E] mb-4 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {isRTL ? "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645" : "Back to Dashboard"}
      </button>

      <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">{dict.common.settings}</h1>

      <div className="max-w-2xl space-y-6">
        {/* Account Info - Email display */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-bold text-[#1A1A2E] mb-4">
            {isRTL ? "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628" : "Account"}
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isRTL ? "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Email"}
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              {isRTL ? "\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Email cannot be changed"}
            </p>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-bold text-[#1A1A2E] mb-4">
            {isRTL ? "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a" : "Profile"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? "\u0627\u0644\u0627\u0633\u0645" : "Full Name"}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F5C542]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? "\u0627\u0644\u0647\u0627\u062a\u0641" : "Phone"}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F5C542]"
              />
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-bold text-[#1A1A2E] mb-4">
            {isRTL ? "\u0627\u0644\u0644\u063a\u0629" : "Language"}
          </h2>
          <select
            value={preferredLocale}
            onChange={(e) => setPreferredLocale(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="en">English</option>
            <option value="ar">\u0627\u0644\u0639\u0631\u0628\u064a\u0629</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-bold text-[#1A1A2E] mb-4">
            {isRTL ? "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a" : "Notifications"}
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {isRTL ? "\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0628\u0631\u064a\u062f" : "Email Notifications"}
              </span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-5 h-5 text-[#F5C542] rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {isRTL ? "\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u062f\u0641\u0639" : "Push Notifications"}
              </span>
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="w-5 h-5 text-[#F5C542] rounded"
              />
            </label>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#F5C542] text-[#1A1A2E] font-semibold py-3 px-6 rounded-lg hover:bg-[#e5b632] disabled:opacity-50 transition-colors"
          >
            {saving
              ? "..."
              : saved
              ? isRTL
                ? "\u062a\u0645 \u0627\u0644\u062d\u0641\u0638"
                : "Saved!"
              : isRTL
              ? "\u062d\u0641\u0638"
              : "Save Changes"}
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="text-gray-600 hover:text-[#1A1A2E] font-medium py-3 px-6 transition-colors"
          >
            {isRTL ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
