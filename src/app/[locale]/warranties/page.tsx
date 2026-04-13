'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { Shield, Plus, Search, ChevronLeft, ChevronRight, MoreHorizontal, Eye, Pencil, Trash2, FileText } from 'lucide-react';

const PAGE_SIZE = 20;
type StatusFilter = 'all' | 'active' | 'pending_approval' | 'draft' | 'expired' | 'claimed';
type DashboardView = 'buyer' | 'seller';

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-[#e8faf0]', text: 'text-[#1a7d42]', dot: 'bg-[#30d158]' },
  pending_approval: { bg: 'bg-[#fff8e6]', text: 'text-[#a06800]', dot: 'bg-[#ff9f0a]' },
  draft: { bg: 'bg-[#f5f5f7]', text: 'text-[#86868b]', dot: 'bg-[#86868b]' },
  expired: { bg: 'bg-[#fff0f0]', text: 'text-[#c42b1c]', dot: 'bg-[#ff3b30]' },
  claimed: { bg: 'bg-[#eef2ff]', text: 'text-[#3451b2]', dot: 'bg-[#0071e3]' },
  cancelled: { bg: 'bg-[#f5f5f7]', text: 'text-[#86868b]', dot: 'bg-[#86868b]' },
};

const pageText = {
  en: {
    title: 'Warranties',
    newWarranty: 'New Warranty',
    search: 'Search warranties...',
    loading: 'Loading warranties...',
    noWarranties: 'No warranties found',
    emptyDesc: 'Get started by creating your first warranty.',
    tabs: {
      all: 'All',
      active: 'Active',
      pending_approval: 'Pending Approval',
      draft: 'Draft',
      expired: 'Expired',
      claimed: 'Claimed',
    },
    table: {
      product: 'Product',
      brand: 'Brand',
      status: 'Status',
      startDate: 'Start Date',
      endDate: 'End Date',
    },
    menu: {
      view: 'View Details',
      editDraft: 'Edit Draft',
      deleteDraft: 'Delete Draft',
    },
    pagination: {
      page: 'Page',
      of: 'of',
    },
    modes: {
      buyer: 'Buyer View',
      seller: 'Seller View',
      buyerHint: 'Showing warranties you received.',
      sellerHint: 'Showing warranties you issued.',
    },
  },
  ar: {
    title: '\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    newWarranty: '\u0636\u0645\u0627\u0646 \u062c\u062f\u064a\u062f',
    search: '\u0628\u062d\u062b \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a...',
    loading: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a...',
    noWarranties: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0645\u0627\u0646\u0627\u062a',
    emptyDesc: '\u0627\u0628\u062f\u0623 \u0628\u0625\u0646\u0634\u0627\u0621 \u0623\u0648\u0644 \u0636\u0645\u0627\u0646 \u0644\u0643.',
    tabs: {
      all: '\u0627\u0644\u0643\u0644',
      active: '\u0646\u0634\u0637',
      pending_approval: '\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629',
      draft: '\u0645\u0633\u0648\u062f\u0629',
      expired: '\u0645\u0646\u062a\u0647\u064a',
      claimed: '\u0645\u0637\u0627\u0644\u0628',
    },
    table: {
      product: '\u0627\u0644\u0645\u0646\u062a\u062c',
      brand: '\u0627\u0644\u0639\u0644\u0627\u0645\u0629',
      status: '\u0627\u0644\u062d\u0627\u0644\u0629',
      startDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0621',
      endDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621',
    },
    menu: {
      view: '\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644',
      editDraft: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0645\u0633\u0648\u062f\u0629',
      deleteDraft: '\u062d\u0630\u0641 \u0627\u0644\u0645\u0633\u0648\u062f\u0629',
    },
    pagination: {
      page: '\u0635\u0641\u062d\u0629',
      of: '\u0645\u0646',
    },
    modes: {
      buyer: '\u0639\u0631\u0636 \u0627\u0644\u0645\u0634\u062a\u0631\u064a',
      seller: '\u0639\u0631\u0636 \u0627\u0644\u0628\u0627\u0626\u0639',
      buyerHint: '\u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u064a \u0627\u0633\u062a\u0644\u0645\u062a\u0647\u0627.',
      sellerHint: '\u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u064a \u0623\u0635\u062f\u0631\u062a\u0647\u0627.',
    },
  },
};

const statusLabels: Record<string, Record<string, string>> = {
  en: {
    active: 'Active',
    pending_approval: 'Pending Approval',
    draft: 'Draft',
    expired: 'Expired',
    claimed: 'Claimed',
    cancelled: 'Cancelled',
  },
  ar: {
    active: '\u0646\u0634\u0637',
    pending_approval: '\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629',
    draft: '\u0645\u0633\u0648\u062f\u0629',
    expired: '\u0645\u0646\u062a\u0647\u064a',
    claimed: '\u0645\u0637\u0627\u0644\u0628',
    cancelled: '\u0645\u0644\u063a\u064a',
  },
};

function resolveViewMode(searchParams: URLSearchParams | null): DashboardView {
  const mode = searchParams?.get('view');
  return mode === 'seller' ? 'seller' : 'buyer';
}

function WarrantiesPageInner() {
  const params = useParams() ?? {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const t = pageText[locale as 'en' | 'ar'] || pageText.en;
  const localizedStatus = statusLabels[locale as 'en' | 'ar'] || statusLabels.en;

  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number; status: string } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const viewMode = useMemo(() => resolveViewMode(searchParams), [searchParams]);

  const withView = (basePath: string) => `${basePath}${basePath.includes('?') ? '&' : '?'}view=${viewMode}`;

  useEffect(() => {
    if (!user) return;

    const fetchWarranties = async () => {
      setLoading(true);

      const sellerFilter = `issuer_user_id.eq.${user.id},created_by.eq.${user.id},seller_id.eq.${user.id}`;
      const buyerFilter = `recipient_user_id.eq.${user.id},buyer_id.eq.${user.id},user_id.eq.${user.id}`;

      let query = supabase
        .from('warranties')
        .select('*', { count: 'exact' })
        .or(viewMode === 'seller' ? sellerFilter : buyerFilter)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (searchQuery.trim()) {
        query = query.or(`product_name.ilike.%${searchQuery}%,product_name_ar.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,serial_number.ilike.%${searchQuery}%,reference_number.ilike.%${searchQuery}%`);
      }

      const { data, count } = await query;
      setWarranties(data || []);
      setTotal(count || 0);
      setLoading(false);
    };

    fetchWarranties();
  }, [user, viewMode, statusFilter, searchQuery, page, supabase]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDelete = async (id: string) => {
    await supabase.from('warranties').delete().eq('id', id);
    setWarranties((prev) => prev.filter((item) => item.id !== id));
    setTotal((prev) => prev - 1);
    setContextMenu(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t.tabs.all },
    { key: 'active', label: t.tabs.active },
    { key: 'pending_approval', label: t.tabs.pending_approval },
    { key: 'draft', label: t.tabs.draft },
    { key: 'expired', label: t.tabs.expired },
    { key: 'claimed', label: t.tabs.claimed },
  ];

  const formatDate = (dateValue?: string) => {
    if (!dateValue) return '—';
    return new Date(dateValue).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {localizedStatus[status] || status}
      </span>
    );
  };

  if (loading && warranties.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-[#86868b]">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">{t.title}</h1>
          <p className="text-[15px] text-[#86868b] mt-1">{`${total} ${viewMode === 'seller' ? t.modes.sellerHint : t.modes.buyerHint}`}</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium">
            {viewMode === 'seller' ? t.modes.seller : t.modes.buyer}
          </div>
        </div>
        {viewMode === 'seller' && (
          <Link
            href={withView(`/${locale}/warranties/new`)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[15px] font-medium rounded-full transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t.newWarranty}
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm mb-6">
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-wrap gap-2 flex-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(0);
                }}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  statusFilter === tab.key
                    ? 'bg-[#1A1A2E] text-white shadow-sm'
                    : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(0);
              }}
              placeholder={t.search}
              className={`w-full bg-[#f5f5f7] border-0 rounded-xl py-2.5 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/40 focus:outline-none transition-all ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
            />
          </div>
        </div>
      </div>

      {!loading && warranties.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">{t.noWarranties}</h3>
          <p className="text-[14px] text-[#86868b] mb-6">{t.emptyDesc}</p>
          {viewMode === 'seller' && (
            <Link
              href={withView(`/${locale}/warranties/new`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[15px] font-medium rounded-full transition-all"
            >
              <Plus className="w-4 h-4" />
              {t.newWarranty}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d2d2d7]/30">
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{t.table.product}</th>
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{t.table.brand}</th>
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{t.table.status}</th>
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{t.table.startDate}</th>
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{t.table.endDate}</th>
                  <th className="py-3.5 px-6 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d2d2d7]/20">
                {warranties.map((warranty) => (
                  <tr
                    key={warranty.id}
                    className="hover:bg-[#f5f5f7]/50 transition-colors cursor-pointer group"
                    onClick={() => router.push(withView(`/${locale}/warranties/${warranty.id}`))}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center flex-shrink-0">
                          <Shield className="w-4 h-4 text-[#1A1A2E]" />
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[#1d1d1f] leading-tight">{isRTL && warranty.product_name_ar ? warranty.product_name_ar : warranty.product_name || '—'}</p>
                          {warranty.reference_number && <p className="text-[12px] text-[#86868b] mt-0.5">{warranty.reference_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[14px] text-[#1d1d1f]">{warranty.brand || '—'}</td>
                    <td className="py-4 px-6">{getStatusBadge(warranty.status)}</td>
                    <td className="py-4 px-6 text-[14px] text-[#86868b]">{formatDate(warranty.start_date || warranty.warranty_start_date)}</td>
                    <td className="py-4 px-6 text-[14px] text-[#86868b]">{formatDate(warranty.end_date || warranty.warranty_end_date)}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setContextMenu({ id: warranty.id, x: event.clientX, y: event.clientY, status: warranty.status });
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#f5f5f7] opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4 text-[#86868b]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {warranties.map((warranty) => (
              <div
                key={warranty.id}
                onClick={() => router.push(withView(`/${locale}/warranties/${warranty.id}`))}
                className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
                      <Shield className="w-5 h-5 text-[#1A1A2E]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">{isRTL && warranty.product_name_ar ? warranty.product_name_ar : warranty.product_name || '—'}</p>
                      {warranty.brand && <p className="text-[13px] text-[#86868b]">{warranty.brand}</p>}
                    </div>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setContextMenu({ id: warranty.id, x: event.clientX, y: event.clientY, status: warranty.status });
                    }}
                    className="p-1.5 rounded-lg hover:bg-[#f5f5f7]"
                  >
                    <MoreHorizontal className="w-4 h-4 text-[#86868b]" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  {getStatusBadge(warranty.status)}
                  <span className="text-[12px] text-[#86868b]">
                    {formatDate(warranty.start_date || warranty.warranty_start_date)} — {formatDate(warranty.end_date || warranty.warranty_end_date)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-1">
              <p className="text-[13px] text-[#86868b]">{`${t.pagination.page} ${page + 1} ${t.pagination.of} ${totalPages}`}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-[#1d1d1f]" />
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-[#1d1d1f]" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white/90 backdrop-blur-xl rounded-xl ring-1 ring-[#d2d2d7]/60 shadow-lg py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              router.push(withView(`/${locale}/warranties/${contextMenu.id}`));
              setContextMenu(null);
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
          >
            <Eye className="w-4 h-4 text-[#86868b]" />
            {t.menu.view}
          </button>
          {contextMenu.status === 'draft' && (
            <>
              <button
                onClick={() => {
                  router.push(withView(`/${locale}/warranties/${contextMenu.id}/edit`));
                  setContextMenu(null);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
              >
                <Pencil className="w-4 h-4 text-[#86868b]" />
                {t.menu.editDraft}
              </button>
              <div className="border-t border-[#d2d2d7]/30 my-1" />
              <button
                onClick={() => handleDelete(contextMenu.id)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[#ff3b30] hover:bg-[#fff0f0] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t.menu.deleteDraft}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function WarrantiesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a06800]" /></div>}>
      <WarrantiesPageInner />
    </Suspense>
  );
}
