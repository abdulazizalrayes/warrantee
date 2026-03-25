"use client";
// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ExtendWarrantyPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const warrantyId = params.id as string;
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [warranty, setWarranty] = useState<{ end_date: string; product_name: string } | null>(null);
  const [extensionMonths, setExtensionMonths] = useState(6);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("warranties").select("end_date, product_name").eq("id", warrantyId).single();
      if (data) setWarranty(data);
    })();
  }, [warrantyId, supabase]);

  const calcNewEnd = () => {
    if (!warranty) return "";
    const d = new Date(warranty.end_date);
    d.setMonth(d.getMonth() + extensionMonths);
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const newEndDate = calcNewEnd();
    const priceVal = price ? parseFloat(price) : 0;
    const commission = priceVal * 0.08;
    const { error: err } = await supabase.from("warranty_extensions").insert({
      warranty_id: warrantyId, new_end_date: newEndDate, price: priceVal, currency,
      commission_rate: 8.0, commission_amount: commission, terms: terms || null, offered_by: user!.id,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    await supabase.from("activity_log").insert({
      actor_id: user!.id, entity_type: "warranty", entity_id: warrantyId, action: "warranty_extended",
      metadata: { extension_months: extensionMonths, new_end_date: newEndDate },
    });
    setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div dir={direction} className="max-w-2xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={40} className="text-green-600" /></div>
      <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">{isRTL ? "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0639\u0631\u0636 \u0627\u0644\u062a\u0645\u062f\u064a\u062f!" : "Extension Offer Created!"}</h2>
      <button onClick={() => router.push(`/${locale}/warranties/${warrantyId}`)} className="mt-4 bg-[#F5C542] text-[#1A1A2E] font-semibold py-3 px-6 rounded-lg">{isRTL ? "\u0627\u0644\u0639\u0648\u062f\u0629" : "Back to Warranty"}</button>
    </div>
  );

  return (
    <div dir={direction} className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">{isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}</button>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{dict.warranty.actions.extend}</h1>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {warranty && <div className="mb-6 p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-600">{isRTL ? "\u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u062d\u0627\u0644\u064a \u064a\u0646\u062a\u0647\u064a \u0641\u064a" : "Current warranty ends"}</p><p className="font-bold text-[#1A1A2E]">{new Date(warranty.end_date).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div>}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{isRTL ? "\u0645\u062f\u0629 \u0627\u0644\u062a\u0645\u062f\u064a\u062f" : "Extension Period"} *</label>
            <select value={extensionMonths} onChange={e => setExtensionMonths(parseInt(e.target.value))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C542]">
              <option value={3}>{isRTL ? "3 \u0623\u0634\u0647\u0631" : "3 months"}</option>
              <option value={6}>{isRTL ? "6 \u0623\u0634\u0647\u0631" : "6 months"}</option>
              <option value={12}>{isRTL ? "12 \u0634\u0647\u0631" : "12 months"}</option>
              <option value={24}>{isRTL ? "24 \u0634\u0647\u0631" : "24 months"}</option>
            </select>
          </div>
          {warranty && <div className="p-4 bg-[#F5C542]/10 rounded-lg"><p className="text-sm text-gray-600">{isRTL ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u062c\u062f\u064a\u062f" : "New end date"}</p><p className="font-bold text-[#1A1A2E]">{new Date(calcNewEnd()).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{isRTL ? "\u0627\u0644\u0633\u0639\u0631" : "Price"}</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} step="0.01" dir="ltr" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C542]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{isRTL ? "\u0627\u0644\u0639\u0645\u0644\u0629" : "Currency"}</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C542]"><option value="SAR">SAR</option><option value="USD">USD</option><option value="EUR">EUR</option></select>
            </div>
          </div>
          {price && parseFloat(price) > 0 && <div className="text-xs text-gray-500">{isRTL ? "\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0645\u0646\u0635\u0629 (8%)" : "Platform commission (8%)"}: {(parseFloat(price) * 0.08).toFixed(2)} {currency}</div>}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">{isRTL ? "\u0634\u0631\u0648\u0637 \u0627\u0644\u062a\u0645\u062f\u064a\u062f" : "Extension Terms"}</label>
            <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C542] resize-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#F5C542] text-[#1A1A2E] font-semibold py-3 rounded-lg disabled:opacity-50">{loading ? "..." : isRTL ? "\u0625\u0646\u0634\u0627\u0621 \u0639\u0631\u0636 \u0627\u0644\u062a\u0645\u062f\u064a\u062f" : "Create Extension Offer"}</button>
        </form>
      </div>
    </div>
  );
}
