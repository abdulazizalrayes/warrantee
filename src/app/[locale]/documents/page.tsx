'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Search, File, Image, FileSpreadsheet, Eye, FolderOpen } from 'lucide-react';
import { getDictionary } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface DocRow {
  id: string; file_name: string; file_type: string | null; file_size: number | null;
  file_url: string | null; version: number; created_at: string; warranty_id: string;
  warranties: { product_name: string; product_name_ar: string | null; reference_number: string } | null;
}

export default function DocumentsPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const { user, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchDocs = async () => {
      setLoading(true);
      const { data: userWarrantyIds } = await supabase.from('warranties').select('id').or(`created_by.eq.${user.id},recipient_user_id.eq.${user.id}`);
      if (!userWarrantyIds || userWarrantyIds.length === 0) { setDocs([]); setLoading(false); return; }
      const ids = userWarrantyIds.map((w) => w.id);
      let query = supabase.from('warranty_documents').select('id, file_name, file_type, file_size, file_url, version, created_at, warranty_id, warranties(product_name, product_name_ar, reference_number)').in('warranty_id', ids).order('created_at', { ascending: false });
      if (search) query = query.ilike('file_name', `%${search}%`);
      const { data } = await query;
      if (data) setDocs(data as unknown as DocRow[]);
      setLoading(false);
    };
    fetchDocs();
  }, [user, authLoading, search, supabase]);

  const getFileIcon = (type: string | null) => {
    if (!type) return <File className="w-5 h-5 text-[#86868b]" />;
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-[#0071e3]" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-[#ff3b30]" />;
    if (type.includes('sheet') || type.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-[#30d158]" />;
    return <File className="w-5 h-5 text-[#86868b]" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading && docs.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-[#86868b]">{isRTL ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...' : 'Loading documents...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
          {isRTL ? '\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a' : 'Documents'}
        </h1>
        <p className="text-[15px] text-[#86868b] mt-1">
          {isRTL ? '\u062c\u0645\u064a\u0639 \u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0627\u0644\u0636\u0645\u0627\u0646' : 'All warranty documents'}
        </p>
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm mb-6">
        <div className="p-4 sm:p-6">
          <div className="relative w-full sm:w-72">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] ${isRTL ? 'right-3' : 'left-3'}`} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? '\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0633\u062a\u0646\u062f...' : 'Search documents...'}
              className={`w-full bg-[#f5f5f7] border-0 rounded-xl py-2.5 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/40 focus:outline-none transition-all ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`} />
          </div>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-7 h-7 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">{isRTL ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0633\u062a\u0646\u062f\u0627\u062a' : 'No documents found'}</h3>
          <p className="text-[14px] text-[#86868b]">{isRTL ? '\u0623\u0636\u0641 \u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0639\u0646\u062f \u0625\u0646\u0634\u0627\u0621 \u0636\u0645\u0627\u0646' : 'Add documents when creating a warranty'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
          <div className="divide-y divide-[#d2d2d7]/20">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-[#f5f5f7]/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {doc.warranties && (
                      <Link href={`/${locale}/warranties/${doc.warranty_id}`} className="text-[12px] text-[#0071e3] hover:underline">
                        {isRTL && doc.warranties.product_name_ar ? doc.warranties.product_name_ar : doc.warranties.product_name}
                      </Link>
                    )}
                    <span className="text-[12px] text-[#86868b]">{formatSize(doc.file_size)}</span>
                    <span className="text-[12px] text-[#86868b]">v{doc.version}</span>
                  </div>
                </div>
                <span className="text-[12px] text-[#86868b] hidden sm:block">{formatDate(doc.created_at)}</span>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors">
                    <Eye className="w-4 h-4 text-[#86868b]" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
