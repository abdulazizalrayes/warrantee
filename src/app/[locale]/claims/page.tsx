"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Search, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, MessageSquare, Eye } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ClaimStatus = "all" | "open" | "in_progress" | "resolved" | "contested" | "closed";

interface ClaimRow {
  id: string;
  claim_number: string;
  title: string;
  status: string;
  claim_amount: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  warranty_id: string;
  warranties: { product_name: string; product_name_ar: string | null; reference_number: string } | null;
}

const PAGE_SIZE = 20;

export default function ClaimsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClaimStatus>("all");

  const fetchClaims = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("warranty_claims").select("id, claim_number, title, status, claim_amount, currency, created_at, updated_at, warranty_id, warranties(product_name, product_name_ar, reference_number)", { count: "exact" }).eq("filed_by", user.id).order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (search) query = query.or(`title.ilike.%${search}%,claim_number.ilike.%${search}%`);
    const { data, count } = await query;
    if (data) { setClaims(data as unknown as ClaimRow[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [user, page, statusFilter, search, supabase]);

  useEffect(() => { if (!authLoading && user) fetchClaims(); }, [authLoading, user, fetchClaims]);

  const getStatusColor = (s: string) => ({ open: "bg-yellow-100 text-yellow-800", in_progress: "bg-blue-100 text-blue-800", resolved: "bg-green-100 text-green-800", contested: "bg-red-100 text-red-800", closed: "bg-gray-100 text-gray-600" }[s] || "bg-gray-100 text-gray-800");
  const getStatusLabel = (s: string) => (isRTL ? { open: "\u0645\u0641\u062A\u0648\u062D", in_progress: "\u0642\u064A\u062F \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629", resolved: "\u062A\u0645 \u0627\u0644\u062D\u0644", contested: "\u0645\u062A\u0646\u0627\u0632\u0639", closed: "\u0645\u063A\u0644\u0642" } : { open: "Open", in_progress: "In Progress", resolved: "Resolved", contested: "Contested", closed: "Closed" })[s] || s;
  const formatDate = (d: string) => new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const statusTabs: { key: ClaimStatus; label: string }[] = [{ key: "all", label: isRTL ? "\u0627\u0644\u0643\u0644" : "All" }, { key: "open", label: isRTL ? "\u0645\u0641\u062A\u0648\u062D" : "Open" }, { key: "in_progress", label: isRTL ? "\u0642\u064A\u062F \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629" : "In Progress" }, { key: "resolved", label: isRTL ? "\u062A\u0645 \u0627\u0644\u062D\u0644" : "Resolved" }, { key: "contested", label: isRTL ? "\u0645\u062A\u0646\u0627\u0632\u0639" : "Contested" }, { key: "closed", label: isRTL ? "\u0645\u063A\u0644\u0642" : "Closed" }];

  return (
    <div dir={direction}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-navy">{isRTL ? "\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A" : "Claims"}</h1>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {statusTabs.map((t) => (<button key={t.key} onClick={() => { setStatusFilter(t.key); setPage(0); }} className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${statusFilter === t.key ? "border-gold text-navy" : "border-transparent text-gray-500 hover:text-navy"}`}>{t.label}</button>))}
        </div>
        <div className="p-4"><div className="relative"><Search size={18} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" /><input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder={isRTL ? "\u0627\u0628\u062D\u062B \u0639\u0646 \u0645\u0637\u0627\u0644\u0628\u0629..." : "Search claims..."} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent text-sm" dir="ltr" /></div></div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div></div>) : claims.length === 0 ? (<div className="py-16 text-center"><AlertCircle size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-600 font-medium">{isRTL ? "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0637\u0627\u0644\u0628\u0627\u062A" : "No claims found"}</p></div>) : (<>
          <div className="hidden md:block overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{isRTL ? "\u0631\u0642\u0645" : "Claim #"}</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{isRTL ? "\u0627\u0644\u0639\u0646\u0648\u0627\u0646" : "Title"}</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{isRTL ? "\u0627\u0644\u0636\u0645\u0627\u0646" : "Warranty"}</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{isRTL ? "\u0627\u0644\u062D\u0627\u0644\u0629" : "Status"}</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{isRTL ? "\u0627\u0644\u0645\u0628\u0644\u063A" : "Amount"}</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{isRTL ? "\u0627\u0644\u062A\u0627\u0631\u064A\u062E" : "Filed"}</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-gray-100">{claims.map((c) => (<tr key={c.id} className="hover:bg-gray-50 transition"><td className="px-4 py-3"><span className="text-sm font-mono text-gray-600">{c.claim_number}</span></td><td className="px-4 py-3 text-sm font-medium text-navy">{c.title}</td><td className="px-4 py-3">{c.warranties && <Link href={`/${locale}/warranties/${c.warranty_id}`} className="text-sm text-gold hover:text-yellow-600">{isRTL && c.warranties.product_name_ar ? c.warranties.product_name_ar : c.warranties.product_name}</Link>}</td><td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(c.status)}`}>{getStatusLabel(c.status)}</span></td><td className="px-4 py-3 text-sm text-gray-600">{c.claim_amount ? `${c.claim_amount.toLocaleString()} ${c.currency}` : "-"}</td><td className="px-4 py-3 text-sm text-gray-600">{formatDate(c.created_at)}</td><td className="px-4 py-3"><Link href={`/${locale}/warranties/${c.warranty_id}`} className="p-1.5 hover:bg-gray-100 rounded inline-block"><Eye size={16} className="text-gray-500" /></Link></td></tr>))}</tbody></table></div>
          <div className="md:hidden divide-y divide-gray-100">{claims.map((c) => (<Link key={c.id} href={`/${locale}/warranties/${c.warranty_id}`} className="block p-4 hover:bg-gray-50"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-navy">{c.title}</span><span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(c.status)}`}>{getStatusLabel(c.status)}</span></div><div className="flex items-center gap-4 text-xs text-gray-500"><span>{c.claim_number}</span><span>{formatDate(c.created_at)}</span></div></Link>))}</div>
          {totalPages > 1 && (<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200"><p className="text-sm text-gray-600">{page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p><div className="flex gap-2"><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"><ChevronLeft size={16} /></button><button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"><ChevronRight size={16} /></button></div></div>)}
        </>)}
      </div>
    </div>
  );
}
