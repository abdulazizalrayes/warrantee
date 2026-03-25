"use client";
// @ts-nocheck

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { getDictionary } from "@/lib/i18n";

export default function SellerInvitePage() {
  const { locale } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const dict = getDictionary((locale as string) || "en");
  const isRTL = locale === "ar";
  const supabase = createSupabaseBrowserClient();

  const [form, setForm] = useState({ name: "", email: "", cr_number: "", industry: "", contact_person: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("seller_invitations").insert({ ...form, invited_by: user.id, status: "pending" });
    if (!error) setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div className="max-w-lg mx-auto p-8 text-center">
      <div className="bg-green-50 rounded-xl p-8">
        <h2 className="text-xl font-bold text-green-800 mb-2">{isRTL ? "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062f\u0639\u0648\u0629" : "Invitation Sent"}</h2>
        <p className="text-green-600">{isRTL ? "\u0633\u064a\u062a\u0645 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062f\u0639\u0648\u0629 \u0642\u0631\u064a\u0628\u0627\u064b" : "The invitation will be reviewed shortly."}</p>
        <button onClick={() => router.push(`/${locale}/seller`)} className="mt-4 px-4 py-2 bg-[#1A1A2E] text-white rounded-lg">{isRTL ? "\u0639\u0648\u062f\u0629" : "Back"}</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">{isRTL ? "\u062f\u0639\u0648\u0629 \u0628\u0627\u0626\u0639" : "Invite Seller"}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[["name", isRTL ? "\u0627\u0644\u0627\u0633\u0645" : "Name"], ["email", isRTL ? "\u0627\u0644\u0628\u0631\u064a\u062f" : "Email"], ["cr_number", isRTL ? "\u0631\u0642\u0645 \u0627\u0644\u0633\u062c\u0644" : "CR Number"], ["industry", isRTL ? "\u0627\u0644\u0635\u0646\u0627\u0639\u0629" : "Industry"], ["contact_person", isRTL ? "\u0634\u062e\u0635 \u0627\u0644\u062a\u0648\u0627\u0635\u0644" : "Contact Person"], ["phone", isRTL ? "\u0627\u0644\u0647\u0627\u062a\u0641" : "Phone"]].map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type={key === "email" ? "email" : "text"} required={key === "name" || key === "email"} value={form[key as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F5C542] focus:border-transparent" />
          </div>
        ))}
        <button type="submit" disabled={loading} className="w-full py-3 bg-[#F5C542] text-[#1A1A2E] font-semibold rounded-lg hover:bg-[#e5b632] disabled:opacity-50">{loading ? "..." : isRTL ? "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062f\u0639\u0648\u0629" : "Send Invitation"}</button>
      </form>
    </div>
  );
}
