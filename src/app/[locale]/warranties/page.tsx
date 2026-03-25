// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Plus, Search, Filter, Download, Upload, ChevronLeft, ChevronRight, MoreVertical, Eye, Edit2, Trash2, FileText } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type WarrantyStatus = "all" | "active" | "draft" | "pending_approval" | "expired" | "claimed" | "cancelled";
interface WarrantyRow { id: string; reference_number: string; product_name: string; product_name_ar: string | null; category: string | null; status: string; start_date: string; end_date: string; seller_name: string | null; seller_email: string | null; created_at: string; issuer_company_id: string | null; }
const PAGE_SIZE = 20;

export default function WarrantiesPage() {
  const params = useParams(); const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale); const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WarrantyStatus>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchWarranties = useCallback(async () => {
    if (!user) return; setLoading(true);
    let query = supabase.from("warranties").select("id, reference_number, product_name, product_name_ar, category, status, start_date, end_date, seller_name, seller_email, created_at, issuer_company_id", { count: "exact" }).or(`created_by.eq.${user.id},recipient_user_id.eq.${user.id}`).order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (search) query = query.or(`product_name.ilike.%${search}%,reference_number.ilike.%${search}%,seller_name.ilike.%${search}%`);
    const { data, count, error } = await query;
    if (!error && data) { setWarranties(data as WarrantyRow[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [user, page, statusFilter, search, supabase]);

  useEffect(() => { if (!authLoading && user) fetchWarranties(); }, [authLoading, user, fetchWarranties]);

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u062d\u0630\u0641\u061f" : "Are you sure you want to delete this warranty?")) return;
    await supabase.from("warranties").delete().eq("id", id); fetchWarranties(); setOpenMenu(null);
  };
  const getStatusColor = (status: string) => { const c: Record<string,string> = { active: "bg-green-100 text-green-800", pending_approval: "bg-yellow-100 text-yellow-800", draft: "bg-gray-100 text-gray-800", expired: "bg-red-100 text-red-800", claimed: "bg-blue-100 text-blue-800", cancelled: "bg-gray-100 text-gray-600", renewed: "bg-purple-100 text-purple-800" }; return c[status] || "bg-gray-100 text-gray-800"; };
  const getStatusLabel = (status: string) => { const m: Record<string,string> = isRTL ? { active: "\u0646\u0634\u0637", pending_approval: "\u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631", draft: "\u0645\u0633\u0648\u062f\u0629", expired: "\u0645\u0646\u062a\u0647\u064a", claimed: "\u0645\u0637\u0627\u0644\u0628", cancelled: "\u0645\u0644\u063a\u064a", renewed: "\u0645\u062c\u062f\u062f" } : { active: "Active", pending_approval: "Pending", draft: "Draft", expired: "Expired", claimed: "Claimed", cancelled: "Cancelled", renewed: "Renewed" }; return m[status] || status; };
  const formatDate = (d: string) => new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const statusTabs: { key: WarrantyStatus; label: string }[] = [
    { key: "all", label: isRTL ? "\u0627\u0644\u0643\u0644" : "All" }, { key: "active", label: isRTL ? "\u0646\u0634\u0637" : "Active" }, { key: "pending_approval", label: isRTL ? "\u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631" : "Pending" }, { key: "draft", label: isRTL ? "\u0645\u0633\u0648\u062f\u0629" : "Draft" }, { key: "expired", label: isRTL ? "\u0645\u0646\u062a\u0647\u064a" : "Expired" }, { key: "claimed", label: isRTL ? "\u0645\u0637\u0627\u0644\u0628" : "Claimed" },
  ];

  return (
    <div dir={direction}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-navy">{dict.nav.warranties}</h1>
        <div className="flex gap-2">
          <Link href={`/${locale}/warranties/import`} className="border border-gray-300 text-navy font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 text-sm"><Upload size={16} />{isRTL ? "\u0627\u0633\u062a\u064a\u0631\u0627\u062f CSV" : "Import CSV"}</Link>
          <Link href={`/${locale}/warranties/new`} className="bg-gold hover:bg-yellow-500 text-navy font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2 text-sm"><Plus size={16} />{dict.warranty.create}</Link>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {statusTabs.map((t) => (<button key={t.key} onClick={() => { setStatusFilter(t.key); setPage(0); }} className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${statusFilter === t.key ? "border-gold text-navy" : "border-transparent text-gray-500 hover:text-navy"}`}>{t.label}</button>))}
        </div>
        <div className="p-4"><div className="relative"><Search size={18} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" /><input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder={isRTL ? "\u0627\u0628\u062d\u062b \u0639\u0646 \u0636\u0645\u0627\u0646..." : "Search warranties..."} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent text-sm" dir="ltr" /></div></div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div></div>) : warranties.length === 0 ? (
          <div className="py-16 text-center"><Shield size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-600 font-medium">{isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0645\u0627\u0646\u0627\u062a" : "No warranties found"}</p><Link href={`/${locale}/warranties/new`} className="inline-flex items-center gap-2 mt-4 bg-gold hover:bg-yellow-500 text-navy font-semibold py-2 px-4 rounded-lg transition text-sm"><Plus size={16} />{dict.warranty.create}</Link></div>
        ) : (<>
          <div className="hidden md:block overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 border-b border-gray-200"><tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{isRTL ? "\u0627\u0644\u0645\u0631\u062c\u0639" : "Reference"}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{dict.warranty.fields.product_name}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{isRTL ? "\u0627\u0644\u062d\u0627\u0644\u0629" : "Status"}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{dict.warranty.fields.start_date}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{dict.warranty.fields.warranty_end_date}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{isRTL ? "\u0627\u0644\u0628\u0627\u0626\u0639" : "Seller"}</th>
            <th className="px-4 py-3"></th>
          </tr></thead><tbody className="divide-y divide-gray-100">
            {warranties.map((w) => (<tr key={w.id} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3"><span className="text-sm font-mono text-gray-600">{w.reference_number}</span></td>
              <td className="px-4 py-3"><Link href={`/${locale}/warranties/${w.id}`} className="text-sm font-medium text-navy hover:text-gold transition">{isRTL && w.product_name_ar ? w.product_name_ar : w.product_name}</Link></td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(w.status)}`}>{getStatusLabel(w.status)}</span></td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(w.start_date)}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(w.end_date)}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{w.seller_name || "\u2014"}</td>
              <td className="px-4 py-3 relative">
                <button onClick={() => setOpenMenu(openMenu === w.id ? null : w.id)} className="p-1 hover:bg-gray-100 rounded transition"><MoreVertical size={16} className="text-gray-500" /></button>
                {openMenu === w.id && (<div className="absolute right-4 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-40">
                  <Link href={`/${locale}/warranties/${w.id}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-navy" onClick={() => setOpenMenu(null)}><Eye size={14} /> {isRTL ? "\u0639\u0631\u0636" : "View"}</Link>
                  <Link href={`/${locale}/warranties/${w.id}/edit`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-navy" onClick={() => setOpenMenu(null)}><Edit2 size={14} /> {dict.warranty.actions.edit}</Link>
                  {w.status === "draft" && (<button onClick={() => handleDelete(w.id)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-red-600 w-full"><Trash2 size={14} /> {dict.warranty.actions.delete}</button>)}
                </div>)}
              </td>
            </tr>))}
          </tbody></table></div>
          <div className="md:hidden divide-y divide-gray-100">
            {warranties.map((w) => (<Link key={w.id} href={`/${locale}/warranties/${w.id}`} className="block p-4 hover:bg-gray-50 transition"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-navy">{isRTL && w.product_name_ar ? w.product_name_ar : w.product_name}</span><span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(w.status)}`}>{getStatusLabel(w.status)}</span></div><div className="flex items-center gap-4 text-xs text-gray-500"><span>{w.reference_number}</span><span>{formatDate(w.end_date)}</span></div></Link>))}
          </div>
          {totalPages > 1 && (<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200"><p className="text-sm text-gray-600">{isRTL ? `${total} \u0645\u0646 ${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, total)}` : `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}</p><div className="flex gap-2"><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"><ChevronLeft size={16} /></button><button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"><ChevronRight size={16} /></button></div></div>)}
        </>)}
      </div>
    </div>
  );
}
