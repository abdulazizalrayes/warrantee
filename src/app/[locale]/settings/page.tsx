"use client";
// @ts-nocheck

import { useState } from "react";
import { useParams } from "next/navigation";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SettingsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [preferredLocale, setPreferredLocale] = useState(profile?.preferred_locale || "en");
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications ?? true);
  const [pushNotifications, setPushNotifications] = useState(profile?.push_notifications ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").update({
      full_name: fullName,
      phone: phone || null,
      preferred_locale: preferredLocale,
      email_notifications: emailNotifications,
      push_notifications: pushNotifications,
    }).eq("id", user!.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div dir={direction}>
      <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">{dict.common.settings}</h1>
      <div className="max-w-2xl space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-bold text-[#1A1A2E] mb-4">{isRTL ? "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a" : "Profile"}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isRTL ? "\u0627\u0644\u0627\u0633\u0645" : "Full Name"}</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F5C542]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isRTL ? "\u0627\u0644\u0647\u0627\u062a\u0641" : "Phone"}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F5C542]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-bold text-[#1A1A2E] mb-4">{isRTL ? "\u0627\u0644\u0644\u063a\u0629" : "Language"}</h2>
          <select value={preferredLocale} onChange={e => setPreferredLocale(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg">
            <option value="en">English</option>
            <option value="ar">\u0627\u0644\u0639\u0631\u0628\u064a\u0629</option>
          </select>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-bold text-[#1A1A2E] mb-4">{isRTL ? "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a" : "Notifications"}</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{isRTL ? "\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0628\u0631\u064a\u062f" : "Email Notifications"}</span>
              <input type="checkbox" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} className="w-5 h-5 text-[#F5C542] rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{isRTL ? "\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u062f\u0641\u0639" : "Push Notifications"}</span>
              <input type="checkbox" checked={pushNotifications} onChange={e => setPushNotifications(e.target.checked)} className="w-5 h-5 text-[#F5C542] rounded" />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleSave} disabled={saving} className="bg-[#F5C542] text-[#1A1A2E] font-semibold py-3 px-6 rounded-lg hover:bg-[#e5b632] disabled:opacity-50">
            {saving ? "..." : saved ? (isRTL ? "\u062a\u0645 \u0627\u0644\u062d\u0641\u0638" : "Saved!") : (isRTL ? "\u062d\u0641\u0638" : "Save Changes")}
          </button>
        </div>
      </div>
    </div>
  );
}
