'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Search, ChevronLeft, ChevronRight, Eye, FileWarning } from 'lucide-react';
import { getDictionary } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type ClaimStatus = 'all' | 'open' | 'in_progress' | 'resolved' | 'contested' | 'closed';

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

/* ── Apple-style status config ── */
const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  open:        { bg: 'bg-[#fff8e6]', text: 'text-[#a06800]', dot: 'bg-[#ff9f0a]' },
  in_progress: { bg: 'bg-[#eef2ff]', text: 'text-[#3451b2]', dot: 'bg-[#0071e3]' },
  resolved:    { bg: 'bg-[#e8faf0]', text: 'text-[#1a7d42]', dot: 'bg-[#30d158]' },
  contested:   { bg: 'bg-[#fff0f0]', text: 'text-[#c42b1c]', dot: 'bg-[#ff3b30]' },
  closed:      { bg: 'bg-[#f5f5f7]', text: 'text-[#86868b]', dot: 'bg-[#86868b]' },
};

export default function ClaimsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const dict = getDictionary(locale);
  const { user, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClaimStatus>('all');

  const fetchClaims = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('warranty_claims')
      .select('id, claim_number, title, status, claim_amount, currency, created_at, updated_at, warranty_id, warranties(product_name, product_name_ar, reference_number)', { count: 'exact' })
      .eq('filed_by', user.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (search) query = query.or(`title.ilike.%${search}%,claim_number.ilike.%${search}%`);

    const { data, count } = await query;
    if (data) {
      setClaims(data as unknown as ClaimRow[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [user, page, statusFilter, search, supabase]);

  useEffect(() => {
    if (!authLoading && user) fetchClaims();
  }, [authLoading, user, fetchClaims]);

  const getStatusLabel = (s: string) =>
    (isRTL
      ? { open: '\u0645\u0641\u062a\u0648\u062d', in_progress: '\u0642\u064a\u062f \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629', resolved: '\u062a\u0645 \u0627\u0644\u062d\u0644', contested: '\u0645\u062a\u0646\u0627\u0632\u0639', closed: '\u0645\u063a\u0644\u0642' }
      : { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', contested: 'Contested', closed: 'Closed' }
    )[s] || s;

  const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status] || statusConfig.closed;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {getStatusLabel(status)}
      </span>
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusTabs: { key: ClaimStatus; label: string }[] = [
    { key: 'all', label: isRTL ? '\u0627\u0644\u0643\u0644' : 'All' },
    { key: 'open', label: isRTL ? '\u0645\u0641\u062a\u0648\u062d' : 'Open' },
    { key: 'in_progress', label: isRTL ? '\u0642\u064a\u062f \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629' : 'In Progress' },
    { key: 'resolved', label: isRTL ? '\u062a\u0645 \u0627\u0644\u062d\u0644' : 'Resolved' },
    { key: 'contested', label: isRTL ? '\u0645\u062a\u0646\u0627\u0632\u0639' : 'Contested' },
    { key: 'closed', label: isRTL ? '\u0645\u063a\u0644\u0642' : 'Closed' },
  ];

  /* ── Loading ── */
  if (loading && claims.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-[#86868b]">{isRTL ? '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a...' : 'Loading claims...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
          {isRTL ? '\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a' : 'Claims'}
        </h1>
        <p className="text-[15px] text-[#86868b] mt-1">
          {isRTL ? `${total} \u0645\u0637\u0627\u0644\u0628\u0629 \u0625\u062c\u0645\u0627\u0644\u064a` : `${total} total claims`}
        </p>
      </div>

      {/* ── Filters & Search ── */}
      <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm mb-6">
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-wrap gap-2 flex-1">
            {statusTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setStatusFilter(t.key); setPage(0); }}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  statusFilter === t.key
                    ? 'bg-[#1A1A2E] text-white shadow-sm'
                    : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={isRTL ? '\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0637\u0627\u0644\u0628\u0629...' : 'Search claims...'}
              className={`w-full bg-[#f5f5f7] border-0 rounded-xl py-2.5 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/40 focus:outline-none transition-all ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
            />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {claims.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
            <FileWarning className="w-7 h-7 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">
            {isRTL ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0637\u0627\u0644\u0628\u0627\u062a' : 'No claims found'}
          </h3>
          <p className="text-[14px] text-[#86868b]">
            {isRTL ? '\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0647\u0646\u0627 \u0639\u0646\u062f \u062a\u0642\u062f\u064a\u0645\u0647\u0627.' : 'Claims will appear here when filed.'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d2d2d7]/30">
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{isRTL ? '\u0631\u0642\u0645' : 'Claim #'}</th>
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{isRTL ? '\u0627\u0644\u0639\u0646\u0648\u0627\u0646' : 'Title'}</th>
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{isRTL ? '\u0627\u0644\u0636\u0645\u0627\u0646' : 'Warranty'}</th>
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{isRTL ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status'}</th>
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{isRTL ? '\u0627\u0644\u0645\u0628\u0644\u063a' : 'Amount'}</th>
                  <th className={`text-${isRTL ? 'right' : 'left'} py-3.5 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider`}>{isRTL ? '\u0627\u0644\u062a\u0627\u0631\u064a\u062e' : 'Filed'}</th>
                  <th className="py-3.5 px-6 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d2d2d7]/20">
                {claims.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f5f5f7]/50 transition-colors cursor-pointer group" onClick={() => router.push(`/${locale}/warranties/${c.warranty_id}`)}>
                    <td className="py-4 px-6">
                      <span className="text-[13px] font-mono text-[#86868b]">{c.claim_number}</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-[14px] font-medium text-[#1d1d1f]">{c.title}</p>
                    </td>
                    <td className="py-4 px-6">
                      {c.warranties && (
                        <span className="text-[13px] text-[#0071e3]">
                          {isRTL && c.warranties.product_name_ar ? c.warranties.product_name_ar : c.warranties.product_name}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(c.status)}</td>
                    <td className="py-4 px-6 text-[14px] text-[#86868b]">
                      {c.claim_amount ? `${c.claim_amount.toLocaleString()} ${c.currency}` : '—'}
                    </td>
                    <td className="py-4 px-6 text-[14px] text-[#86868b]">{formatDate(c.created_at)}</td>
                    <td className="py-4 px-6">
                      <button className="p-1.5 rounded-lg hover:bg-[#f5f5f7] opacity-0 group-hover:opacity-100 transition-all">
                        <Eye className="w-4 h-4 text-[#86868b]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3">
            {claims.map((c) => (
              <Link
                key={c.id}
                href={`/${locale}/warranties/${c.warranty_id}`}
                className="block bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[15px] font-semibold text-[#1d1d1f]">{c.title}</p>
                    <p className="text-[13px] text-[#86868b] mt-0.5">{c.claim_number}</p>
                  </div>
                  {getStatusBadge(c.status)}
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#86868b]">
                  <span>{c.claim_amount ? `${c.claim_amount.toLocaleString()} ${c.currency}` : '—'}</span>
                  <span>{formatDate(c.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-1">
              <p className="text-[13px] text-[#86868b]">
                {isRTL ? `\u0635\u0641\u062d\u0629 ${page + 1} \u0645\u0646 ${totalPages}` : `Page ${page + 1} of ${totalPages}`}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4 text-[#1d1d1f]" />
                </button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-2 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4 text-[#1d1d1f]" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
