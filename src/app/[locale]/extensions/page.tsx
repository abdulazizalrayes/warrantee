"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle, Calendar } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface ExtensionRow { id: string; new_end_date: string; price: number | null; currency: string; commission_rate: number | null; commission_amount: number | null; terms: string | null; is_purchased: boolean; created_at: string; warranty_id: string; warranties: { product_name: string; product_name_ar: string | null; reference_number: string; end_date: string } | null; }

export default function ExtensionsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [extensions, setExtensions] = useState<ExtensionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "purchased" | "available">("all");

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchExtensions = async () => {
      setLoading(true);
      const { data: userWarrantyIds } = await supabase.from("warranties").select("id").or(`created_by.eq.${user.id},recipient_user_id.eq.${user.id}`);
      if (!userWarrantyIds || userWarrantyIds.length === 0) { setExtensions([]); setLoading(false); return; }
      const ids = userWarrantyIds.map((w) => w.id);
      let query = supabase.from("warranty_extensions").select("id, new_end_date, price, currency, commission_rate, commission_amount, terms, is_purchased, created_at, warranty_id, warranties(product_name, product_name_ar, reference_number, end_date)").in("warranty_id", ids).order("created_at", { ascending: false });
      if (filter === "purchased") query = query.eq("is_purchased", true);
      else if (filter === "available") query = query.eq("is_purchased", false);
      const { data } = await query;
      if (data) setExtensions(data as unknown as ExtensionRow[]);
      setLoading(false);
    };
    fetchExtensions();
  }, [user, authLoading, filter, supabase]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  const filterTabs = [{ key: "all" as const, label: isRTL ? "\u0627\u0644\u0643\u0644" : "All" }, { key: "available" as const, label: isRTL ? "\u0645\u062A\u0627\u062D" : "Available" }, { key: "purchased" as const, label: isRTL ? "\u062A\u0645 \u0627\u0644\u0634\u0631\u0627\u0621" : "Purchased" }];

  return (
    <div dir={direction}>
      <h1 className="text-2xl font-bold text-navy mb-6">{isRTL ? "\u0627\u0644\u062A\u0645\u062F\u064A\u062F\u0627\u062A" : "Extensions"}</h1>
      <div className="bg-white rounded-lg border border-gray-200 mb-6"><div className="flex overflow-x-auto border-b border-gray-200">{filterTabs.map((t) => (<button key={t.key} onClick={() => setFilter(t.key)} className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${filter === t.key ? "border-gold text-navy" : "border-transparent text-gray-500 hover:text-navy"}`}>{t.label}</button>))}</div></div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div></div>) : extensions.length === 0 ? (<div className="py-16 text-center"><Clock size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-600 font-medium">{isRTL ? "\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0645\u062F\u064A\u062F\u0627\u062A" : "No extensions found"}</p><p className="text-sm text-gray-400 mt-1">{isRTL ? "\u064A\u0645\u0643\u0646\u0643 \u062A\u0645\u062F\u064A\u062F \u0627\u0644\u0636\u0645\u0627\u0646 \u0645\u0646 \u0635\u0641\u062D\u0629 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644" : "Extend warranties from the warranty detail page"}</p></div>) : (
          <div className="divide-y divide-gray-100">{extensions.map((ext) => (<div key={ext.id} className="p-4 hover:bg-gray-50 transition"><div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1">{ext.is_purchased ? <CheckCircle size={16} className="text-green-600" /> : <Clock size={16} className="text-yellow-600" />}<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ext.is_purchased ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{ext.is_purchased ? (isRTL ? "\u062A\u0645 \u0627\u0644\u0634\u0631\u0627\u0621" : "Purchased") : (isRTL ? "\u0645\u062A\u0627\u062D" : "Available")}</span></div>{ext.warranties && <Link href={`/${locale}/warranties/${ext.warranty_id}`} className="text-sm font-medium text-navy hover:text-gold">{isRTL && ext.warranties.product_name_ar ? ext.warranties.product_name_ar : ext.warranties.product_name}</Link>}<div className="flex items-center gap-4 mt-1 text-xs text-gray-500"><span className="flex items-center gap-1"><Calendar size={12} />{isRTL ? "\u062A\u0645\u062F\u064A\u062F \u062D\u062A\u0649:" : "Extends to:"} {formatDate(ext.new_end_date)}</span></div></div><div className="text-right shrink-0">{ext.price ? <p className="text-lg font-bold text-navy">{ext.price.toLocaleString()} {ext.currency}</p> : <p className="text-sm text-gray-400">{isRTL ? "\u0645\u062C\u0627\u0646\u064A" : "Free"}</p>}<p className="text-xs text-gray-500">{formatDate(ext.created_at)}</p></div></div></div>))}</div>
        )}
      </div>
    </div>
  );
}
