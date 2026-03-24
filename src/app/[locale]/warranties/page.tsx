"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getWarranties, deleteWarranty } from "@/lib/warranties";
import Link from "next/link";
import { Shield, Plus, Search, Trash2, Eye, Package } from "lucide-react";

const t = {
  en: {
    title: "My Warranties",
    search: "Search warranties...",
    addNew: "Add New",
    product: "Product",
    brand: "Brand",
    expires: "Expires",
    status: "Status",
    actions: "Actions",
    active: "Active",
    expired: "Expired",
    claimed: "Claimed",
    noWarranties: "No warranties yet. Add your first warranty!",
    delete: "Delete",
    view: "View",
    all: "All",
    back: "Dashboard",
    confirmDelete: "Are you sure you want to delete this warranty?",
  },
  ar: {
    title: "\u0636\u0645\u0627\u0646\u0627\u062A\u064A",
    search: "\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A...",
    addNew: "\u0625\u0636\u0627\u0641\u0629 \u062C\u062F\u064A\u062F",
    product: "\u0627\u0644\u0645\u0646\u062A\u062C",
    brand: "\u0627\u0644\u0639\u0644\u0627\u0645\u0629",
    expires: "\u064A\u0646\u062A\u0647\u064A",
    status: "\u0627\u0644\u062D\u0627\u0644\u0629",
    actions: "\u0625\u062C\u0631\u0627\u0621\u0627\u062A",
    active: "\u0646\u0634\u0637",
    expired: "\u0645\u0646\u062A\u0647\u064A",
    claimed: "\u0645\u0637\u0627\u0644\u0628 \u0628\u0647",
    noWarranties: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0636\u0645\u0627\u0646\u0627\u062A \u0628\u0639\u062F. \u0623\u0636\u0641 \u0623\u0648\u0644 \u0636\u0645\u0627\u0646!",
    delete: "\u062D\u0630\u0641",
    view: "\u0639\u0631\u0636",
    all: "\u0627\u0644\u0643\u0644",
    back: "\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645",
    confirmDelete: "\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0636\u0645\u0627\u0646\u061F",
  },
};

export default function WarrantiesPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const labels = t[locale as keyof typeof t] || t.en;
  const supabase = createClient();

  const [warranties, setWarranties] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWarranties(); }, []);

  useEffect(() => {
    let result = warranties;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(w => w.product_name.toLowerCase().includes(q) || (w.brand || "").toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      const now = new Date();
      if (statusFilter === "active") result = result.filter(w => new Date(w.warranty_end_date) > now);
      else if (statusFilter === "expired") result = result.filter(w => new Date(w.warranty_end_date) <= now);
    }
    setFiltered(result);
  }, [search, statusFilter, warranties]);

  async function loadWarranties() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/" + locale + "/auth"); return; }
      const data = await getWarranties();
      setWarranties(data || []);
      setFiltered(data || []);
    } finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm(labels.confirmDelete)) return;
    await deleteWarranty(id);
    loadWarranties();
  }

  function getStatus(w: any) {
    const now = new Date();
    if (new Date(w.warranty_end_date) <= now) return { label: labels.expired, cls: "bg-red-100 text-red-700" };
    return { label: labels.active, cls: "bg-green-100 text-green-700" };
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4169E1]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#4169E1]" />
            <span className="text-xl font-bold text-[#1A1A2E]">{labels.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={"/" + locale + "/dashboard"} className="text-sm text-gray-500 hover:text-[#4169E1]">{labels.back}</Link>
            <Link href={"/" + locale + "/warranties/new"} className="flex items-center gap-1 bg-[#4169E1] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#3457b5]">
              <Plus className="w-4 h-4" /> {labels.addNew}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={labels.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4169E1] focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-2">
            {["all", "active", "expired"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? "bg-[#4169E1] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                {s === "all" ? labels.all : s === "active" ? labels.active : labels.expired}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{labels.noWarranties}</p>
            <Link href={"/" + locale + "/warranties/new"} className="inline-flex items-center gap-1 mt-4 text-[#4169E1] hover:underline">
              <Plus className="w-4 h-4" /> {labels.addNew}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{labels.product}</th>
                  <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{labels.brand}</th>
                  <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{labels.expires}</th>
                  <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{labels.status}</th>
                  <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">{labels.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const st = getStatus(w);
                  return (
                    <tr key={w.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{w.product_name}</td>
                      <td className="py-3 px-4 text-gray-600">{w.brand || "-"}</td>
                      <td className="py-3 px-4 text-gray-600">{new Date(w.warranty_end_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4"><span className={"px-2 py-1 rounded-full text-xs font-medium " + st.cls}>{st.label}</span></td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleDelete(w.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
