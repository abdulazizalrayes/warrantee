'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Search, File, Image, FileSpreadsheet, Eye, FolderOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { PageViewTracker } from '@/components/PageViewTracker';
import { ProtectedRouteNotice } from '@/components/dashboard/ProtectedRouteNotice';
import { buildDocumentDownloadHref } from '@/lib/documents';
import { trackDocumentView } from '@/lib/ga4-events';

interface DocRow {
  id: string; file_name: string; file_type: string | null; file_size: number | null;
  file_url: string | null; storage_path?: string | null; version: number; created_at: string; warranty_id: string;
  warranties: { product_name: string; product_name_ar: string | null; reference_number: string } | null;
}

export default function DocumentsPage() {
  const params = useParams() ?? {};
  const locale = (params.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const { user, loading: authLoading } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDocs([]);
      setFetchError('');
      setLoading(false);
      return;
    }
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (search.trim()) query.set('q', search.trim());
        query.set('limit', '200');
        const response = await fetch(`/api/documents?${query.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load documents');
        }

        setDocs((payload?.data || []) as DocRow[]);
        setFetchError('');
      } catch (error) {
        setDocs([]);
        setFetchError(error instanceof Error ? error.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [user, authLoading, search]);

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

  if (!user) {
    return (
      <ProtectedRouteNotice
        locale={locale}
        isRTL={isRTL}
        eyebrow={isRTL ? 'مكتبة المستندات' : 'Document library'}
        title={isRTL ? 'المستندات' : 'Documents'}
        subtitle={isRTL ? 'عرض مرفقات الضمانات يحتاج إلى جلسة نشطة.' : 'Viewing warranty attachments requires an active session.'}
        message={isRTL ? 'سجل الدخول للوصول إلى مكتبة المستندات الكاملة وروابط الإثبات والملفات الداعمة.' : 'Sign in to access the full document library, proof files, and supporting attachments.'}
        crumbs={[
          { label: 'Dashboard', href: `/${locale}/dashboard` },
          { label: isRTL ? 'المستندات' : 'Documents' },
        ]}
      />
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <PageViewTracker
        pageName="documents_library"
        pageType="operations"
        locale={locale}
        extra={{ document_count: docs.length }}
      />
      <DashboardPageShell
        eyebrow={isRTL ? '\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a' : 'Document library'}
        title={isRTL ? '\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a' : 'Documents'}
        subtitle={isRTL ? '\u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f \u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0631\u0641\u0642\u0627\u062a \u0627\u0644\u0636\u0645\u0627\u0646 \u0648\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u062f\u0639\u0645.' : 'One operating surface for warranty attachments, certificates, and supporting files.'}
        crumbs={[
          { label: 'Dashboard', href: `/${locale}/dashboard` },
          { label: isRTL ? '\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a' : 'Documents' },
        ]}
        stats={[
          { label: isRTL ? '\u0627\u0644\u0645\u0644\u0641\u0627\u062a' : 'Files', value: docs.length },
          { label: isRTL ? '\u0627\u0644\u0645\u0628\u062d\u0648\u062b' : 'Filtered', value: search ? docs.length : 'All' },
        ]}
        auditNote={isRTL ? '\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0642\u0628\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a \u0623\u0648 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a.' : 'Use this surface to verify required files are present before approvals, claims, or customer handoff.'}
      >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {fetchError ? (
        <div className="mb-6 rounded-2xl border border-[#ffd7d3] bg-[#fff5f4] px-5 py-4 text-[#7a271a] shadow-sm">
          <p className="text-[15px] font-semibold">{isRTL ? 'تعذر تحميل المستندات الآن' : 'Documents could not load right now'}</p>
          <p className="mt-1 text-[13px] text-[#8a3b2f]">
            {isRTL ? 'نحتاج إلى إعادة المحاولة أو مراجعة إعدادات التخزين.' : 'Retry the request or review the storage configuration for this workspace.'}
          </p>
        </div>
      ) : null}

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
                {(doc.file_url || doc.storage_path) && (
                  <a
                    href={buildDocumentDownloadHref(doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDocumentView({
                      locale,
                      document_id: doc.id,
                      warranty_id: doc.warranty_id,
                      file_type: doc.file_type || 'unknown',
                    })}
                    className="p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors"
                  >
                    <Eye className="w-4 h-4 text-[#86868b]" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
      </DashboardPageShell>
    </div>
  );
}
