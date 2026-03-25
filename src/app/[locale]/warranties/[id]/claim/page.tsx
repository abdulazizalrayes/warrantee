"use client";
// @ts-nocheck
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
