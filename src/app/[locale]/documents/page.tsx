"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileText, Search, File, Image, FileSpreadsheet, Eye } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface DocRow { id: string; file_name: string; file_type: string | null; file_size: number | null; file_url: string | null; version: number; created_at: string; warranty_id: string; warranties: { product_name: string; product_name_ar: string | null; reference_number: string } | null; }

export default function DocumentsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchDocs = async () => {
      setLoading(true);
      const { data: userWarrantyIds } = await supabase.from("warranties").select("id").or(`created_by.eq.${user.id},recipient_user_id.eq.${user.id}`);
      if (!userWarrantyIds || userWarrantyIds.length === 0) { setDocs([]); setLoading(false); return; }
      const ids = userWarrantyIds.map((w) => w.id);
      let query = supabase.from("warranty_documents").select("id, file_name, file_type, file_size, file_url, version, created_at, warranty_id, warranties(product_name, product_name_ar, reference_number)").in("warranty_id", ids).order("created_at", { ascending: false });
      if (search) query = query.ilike("file_name", `%${search}%`);
      const { data } = await query;
      if (data) setDocs(data as unknown as DocRow[]);
      setLoading(false);
    };
    fetchDocs();
  }, [user, authLoading, search, supabase]);

  const getFileIcon = (type: string | null) => {
    if (!type) return <File size={20} className="text-gray-400" />;
    if (type.startsWith("image/")) return <Image size={20} className="text-blue-500" />;
    if (type.includes("pdf")) return <FileText size={20} className="text-red-500" />;
    if (type.includes("sheet") || type.includes("csv")) return <FileSpreadsheet size={20} className="text-green-500" />;
    return <File size={20} className="text-gray-400" />;
  };
  const formatSize = (bytes: number | null) => { if (!bytes) return "-"; if (bytes < 1024) return bytes + " B"; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"; return (bytes / 1048576).toFixed(1) + " MB"; };
  const formatDate = (d: string) => new Date(d).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div dir={direction}>
      <h1 className="text-2xl font-bold text-navy mb-6">{isRTL ? "\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A" : "Documents"}</h1>
      <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4"><div className="relative"><Search size={18} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isRTL ? "\u0627\u0628\u062D\u062B \u0639\u0646 \u0645\u0633\u062A\u0646\u062F..." : "Search documents..."} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent text-sm" dir="ltr" /></div></div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div></div>) : docs.length === 0 ? (<div className="py-16 text-center"><FileText size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-600 font-medium">{isRTL ? "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0633\u062A\u0646\u062F\u0627\u062A" : "No documents found"}</p><p className="text-sm text-gray-400 mt-1">{isRTL ? "\u0623\u0636\u0641 \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0639\u0646\u062F \u0625\u0646\u0634\u0627\u0621 \u0636\u0645\u0627\u0646" : "Add documents when creating a warranty"}</p></div>) : (
          <div className="divide-y divide-gray-100">{docs.map((doc) => (<div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"><div className="shrink-0">{getFileIcon(doc.file_type)}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-navy truncate">{doc.file_name}</p><div className="flex items-center gap-3 mt-0.5">{doc.warranties && <Link href={`/${locale}/warranties/${doc.warranty_id}`} className="text-xs text-gold hover:text-yellow-600">{isRTL && doc.warranties.product_name_ar ? doc.warranties.product_name_ar : doc.warranties.product_name}</Link>}<span className="text-xs text-gray-400">{formatSize(doc.file_size)}</span><span className="text-xs text-gray-400">v{doc.version}</span></div></div><span className="text-xs text-gray-500 hidden sm:block">{formatDate(doc.created_at)}</span>{doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 rounded-lg"><Eye size={16} className="text-gray-500" /></a>}</div>))}</div>
        )}
      </div>
    </div>
  );
}
