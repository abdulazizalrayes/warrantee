// @ts-nocheck
"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function FileClaimPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const warrantyId = params.id as string;
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [severity, setSeverity] = useState("medium");
  const [category, setCategory] = useState("");
  const [contactMethod, setContactMethod] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdClaimId, setCreatedClaimId] = useState("");

  const generateClaimNumber = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `CL-${ts}-${rand}`;
  };

  const t = isRTL ? {
    title: "\u062a\u0642\u062f\u064a\u0645 \u0645\u0637\u0627\u0644\u0628\u0629",
    claimTitle: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629",
    desc: "\u0648\u0635\u0641 \u0627\u0644\u0645\u0634\u0643\u0644\u0629",
    amount: "\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629",
    curr: "\u0627\u0644\u0639\u0645\u0644\u0629",
    sev: "\u0627\u0644\u062e\u0637\u0648\u0631\u0629",
    cat: "\u0627\u0644\u0641\u0626\u0629",
    contact: "\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062a\u0648\u0627\u0635\u0644",
    submit: "\u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629",
    saveDraft: "\u062d\u0641\u0638 \u0643\u0645\u0633\u0648\u062f\u0629",
    success: "\u062a\u0645 \u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629 \u0628\u0646\u062c\u0627\u062d!",
    back: "\u0627\u0644\u0639\u0648\u062f\u0629",
    viewClaim: "\u0639\u0631\u0636 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629",
    low: "\u0645\u0646\u062e\u0641\u0636", medium: "\u0645\u062a\u0648\u0633\u0637", high: "\u0639\u0627\u0644\u064a", critical: "\u062d\u0631\u062c",
    defect: "\u0639\u064a\u0628", damage: "\u062a\u0644\u0641", malfunction: "\u062e\u0644\u0644", missing_parts: "\u0623\u062c\u0632\u0627\u0621 \u0645\u0641\u0642\u0648\u062f\u0629", other: "\u0623\u062e\u0631\u0649",
    email: "\u0628\u0631\u064a\u062f", phone: "\u0647\u0627\u062a\u0641", in_person: "\u0634\u062e\u0635\u064a", otherC: "\u0623\u062e\u0631\u0649",
    selectCat: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0641\u0626\u0629",
  } : {
    title: "File a Claim",
    claimTitle: "Claim Title",
    desc: "Describe the Issue",
    amount: "Claim Amount",
    curr: "Currency",
    sev: "Severity",
    cat: "Category",
    contact: "Preferred Contact",
    submit: "Submit Claim",
    saveDraft: "Save as Draft",
    success: "Claim Filed Successfully!",
    back: "Back to Warranty",
    viewClaim: "View Claim",
    low: "Low", medium: "Medium", high: "High", critical: "Critical",
    defect: "Defect", damage: "Damage", malfunction: "Malfunction", missing_parts: "Missing Parts", other: "Other",
    email: "Email", phone: "Phone", in_person: "In Person", otherC: "Other",
    selectCat: "Select category",
  };

  const handleSubmit = async (asDraft = false) => {
    setLoading(true); setError("");
    const claimNumber = generateClaimNumber();
    const status = asDraft ? "draft" : "submitted";
    const { data: claim, error: insertError } = await supabase.from("warranty_claims").insert({
      warranty_id: warrantyId, claim_number: claimNumber, title, description,
      claim_amount: claimAmount ? parseFloat(claimAmount) : null, currency,
      severity, category: category || null, contact_method: contactMethod,
      status, filed_by: user!.id,
    }).select().single();
    if (insertError) { setError(insertError.message); setLoading(false); return; }
    await supabase.from("claim_events").insert({
      claim_id: claim.id, event_type: "created",
      new_status: status, description: asDraft ? "Claim saved as draft" : "Claim submitted",
      created_by: user!.id,
    });
    await supabase.from("activity_log").insert({
      actor_id: user!.id, entity_type: "claim", entity_id: claim.id,
      action: "warranty_claimed", metadata: { warranty_id: warrantyId, claim_number: claimNumber },
    });
    setCreatedClaimId(claim.id);
    setSuccess(true); setLoading(false);
  };

  if (success) return (
    <div dir={direction} className="max-w-2xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={40} className="text-green-600" /></div>
      <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">{t.success}</h2>
      <div className="flex gap-3 justify-center mt-4">
        <button onClick={() => router.push(`/${locale}/warranties/${warrantyId}`)} className="bg-gray-100 text-[#1A1A2E] font-semibold py-3 px-6 rounded-lg">{t.back}</button>
        <button onClick={() => router.push(`/${locale}/dashboard/claims/${createdClaimId}`)} className="bg-[#4169E1] text-white font-semibold py-3 px-6 rounded-lg">{t.viewClaim}</button>
      </div>
    </div>
  );

  return (
    <div dir={direction} className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">{isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}</button>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{t.title}</h1>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}
        <form onSubmit={e => { e.preventDefault(); handleSubmit(false); }} className="space-y-5">
          <div><label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.claimTitle} *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]" /></div>
          <div><label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.desc} *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1] resize-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.sev}</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]">
                <option value="low">{t.low}</option><option value="medium">{t.medium}</option><option value="high">{t.high}</option><option value="critical">{t.critical}</option></select></div>
            <div><label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.cat}</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]">
                <option value="">{t.selectCat}</option><option value="defect">{t.defect}</option><option value="damage">{t.damage}</option><option value="malfunction">{t.malfunction}</option><option value="missing_parts">{t.missing_parts}</option><option value="other">{t.other}</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.amount}</label>
              <input type="number" value={claimAmount} onChange={e => setClaimAmount(e.target.value)} step="0.01" dir="ltr" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]" /></div>
            <div><label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.curr}</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]">
                <option value="SAR">SAR</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
          </div>
          <div><label className="block text-sm font-medium text-[#1A1A2E] mb-1">{t.contact}</label>
            <select value={contactMethod} onChange={e => setContactMethod(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]">
              <option value="email">{t.email}</option><option value="phone">{t.phone}</option><option value="in_person">{t.in_person}</option><option value="other">{t.otherC}</option></select></div>
          <div className="flex gap-3">
            <button type="button" onClick={() => handleSubmit(true)} disabled={loading || !title || !description}
              className="flex-1 bg-gray-100 text-[#1A1A2E] font-semibold py-3 rounded-lg disabled:opacity-50">{loading ? "..." : t.saveDraft}</button>
            <button type="submit" disabled={loading || !title || !description}
              className="flex-1 bg-[#4169E1] text-white font-semibold py-3 rounded-lg disabled:opacity-50">{loading ? "..." : t.submit}</button>
          </div>
        </form>
      </div>
    </div>
  );
}// @ts-nocheck
"use client";
import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function FileClaimPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const warrantyId = params.id as string;
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const generateClaimNumber = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `CL-${ts}-${rand}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const claimNumber = generateClaimNumber();
    const { data: claim, error: insertError } = await supabase.from("warranty_claims").insert({
      warranty_id: warrantyId, claim_number: claimNumber, title, description,
      claim_amount: claimAmount ? parseFloat(claimAmount) : null, currency, status: "open", filed_by: user!.id,
    }).select().single();
    if (insertError) { setError(insertError.message); setLoading(false); return; }
    await supabase.from("activity_log").insert({
      actor_id: user!.id, entity_type: "claim", entity_id: claim.id, action: "warranty_claimed",
      metadata: { warranty_id: warrantyId, claim_number: claimNumber },
    });
    setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div dir={direction} className="max-w-2xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={40} className="text-green-600" /></div>
      <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">{isRTL ? "\u062a\u0645 \u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629 \u0628\u0646\u062c\u0627\u062d!" : "Claim Filed Successfully!"}</h2>
      <button onClick={() => router.push(`/${locale}/warranties/${warrantyId}`)} className="mt-4 bg-[#F5C542] text-[#1A1A2E] font-semibold py-3 px-6 rounded-lg">{isRTL ? "\u0627\u0644\u0639\u0648\u062f\u0629" : "Back to Warranty"}</button>
    </div>
  );

  return (
    <div dir={direction} className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">{isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}</button>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{dict.warranty.actions.claim}</h1>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{isRTL ? "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629" : "Claim Title"} *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C542]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{isRTL ? "\u0627\u0644\u0648\u0635\u0641" : "Description"} *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C542] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{isRTL ? "\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629" : "Claim Amount"}</label>
              <input type="number" value={claimAmount} onChange={e => setClaimAmount(e.target.value)} step="0.01" dir="ltr" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C542]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{isRTL ? "\u0627\u0644\u0639\u0645\u0644\u0629" : "Currency"}</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C542]">
                <option value="SAR">SAR</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading || !title || !description} className="w-full bg-[#F5C542] text-[#1A1A2E] font-semibold py-3 rounded-lg disabled:opacity-50">{loading ? "..." : isRTL ? "\u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629" : "Submit Claim"}</button>
        </form>
      </div>
    </div>
  );
}
