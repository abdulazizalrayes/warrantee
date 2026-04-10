// @ts-nocheck
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { CheckCircle2, Clock, ExternalLink, FileWarning, Send } from 'lucide-react';

const APPROVER_ROLES = new Set(['approver', 'company_admin', 'platform_admin', 'admin', 'super_admin']);

const pageText = {
  en: {
    title: 'Approval Workflow',
    subtitleApprover: 'Review pending warranties, inspect details, and approve or reject with reasons.',
    subtitleAuthor: 'Track submitted drafts and open details for review feedback.',
    loading: 'Loading approval items...',
    loginRequired: 'Please log in to access approvals.',
    empty: 'No approval items found.',
    statuses: {
      all: 'All',
      pending: 'Pending Approval',
      draft: 'Draft',
      approved: 'Approved',
      rejected: 'Rejected',
    },
    columns: {
      product: 'Product',
      reference: 'Reference',
      submittedBy: 'Submitted By',
      status: 'Status',
      date: 'Date',
      actions: 'Actions',
    },
    actions: {
      open: 'Open detail',
      approve: 'Approve',
      submit: 'Submit for approval',
      approving: 'Approving...',
      submitting: 'Submitting...',
    },
    badges: {
      pending_approval: 'Pending Approval',
      draft: 'Draft',
      active: 'Approved',
      cancelled: 'Rejected',
    },
  },
  ar: {
    title: '\u0633\u064a\u0631 \u0639\u0645\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a',
    subtitleApprover: '\u0631\u0627\u062c\u0639 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0639\u0644\u0642\u0629 \u0648\u0627\u0641\u062a\u062d \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0623\u0648 \u0627\u0644\u0631\u0641\u0636.',
    subtitleAuthor: '\u062a\u0627\u0628\u0639 \u0645\u0633\u0648\u062f\u0627\u062a\u0643 \u0648\u062d\u0627\u0644\u0629 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u0629.',
    loading: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a...',
    loginRequired: '\u064a\u0631\u062c\u0649 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a.',
    empty: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0646\u0627\u0635\u0631 \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u0629.',
    statuses: {
      all: '\u0627\u0644\u0643\u0644',
      pending: '\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629',
      draft: '\u0645\u0633\u0648\u062f\u0629',
      approved: '\u0645\u0648\u0627\u0641\u0642 \u0639\u0644\u064a\u0647',
      rejected: '\u0645\u0631\u0641\u0648\u0636',
    },
    columns: {
      product: '\u0627\u0644\u0645\u0646\u062a\u062c',
      reference: '\u0627\u0644\u0645\u0631\u062c\u0639',
      submittedBy: '\u0628\u0648\u0627\u0633\u0637\u0629',
      status: '\u0627\u0644\u062d\u0627\u0644\u0629',
      date: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e',
      actions: '\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a',
    },
    actions: {
      open: '\u0641\u062a\u062d \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644',
      approve: '\u0645\u0648\u0627\u0641\u0642\u0629',
      submit: '\u0625\u0631\u0633\u0627\u0644 \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u0629',
      approving: '\u062c\u0627\u0631\u064a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629...',
      submitting: '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0631\u0633\u0627\u0644...',
    },
    badges: {
      pending_approval: '\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629',
      draft: '\u0645\u0633\u0648\u062f\u0629',
      active: '\u0645\u0648\u0627\u0641\u0642 \u0639\u0644\u064a\u0647',
      cancelled: '\u0645\u0631\u0641\u0648\u0636',
    },
  },
};

function resolveViewMode(searchParams: URLSearchParams): 'buyer' | 'seller' {
  const view = searchParams.get('view');
  return view === 'seller' ? 'seller' : 'buyer';
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ApprovalPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const t = pageText[locale as 'en' | 'ar'] || pageText.en;
  const viewMode = useMemo(() => resolveViewMode(searchParams), [searchParams]);

  const supabase = createSupabaseBrowserClient();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'draft' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const canApprove = APPROVER_ROLES.has(profile?.role || '');

  const withView = (basePath: string) => `${basePath}${basePath.includes('?') ? '&' : '?'}view=${viewMode}`;

  const mapFilterToStatus = (filter: string) => {
    if (filter === 'pending') return 'pending_approval';
    if (filter === 'draft') return 'draft';
    if (filter === 'approved') return 'active';
    if (filter === 'rejected') return 'cancelled';
    return null;
  };

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('warranties')
      .select('id, reference_number, product_name, product_name_ar, status, created_at, seller_name, issuer_user_id, created_by')
      .order('created_at', { ascending: false })
      .limit(100);

    const mappedStatus = mapFilterToStatus(statusFilter);
    if (mappedStatus) query = query.eq('status', mappedStatus);

    if (!canApprove) {
      query = query.or(`issuer_user_id.eq.${user.id},created_by.eq.${user.id}`);
    }

    const { data } = await query;
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetchItems();
  }, [authLoading, user, profile?.role, statusFilter]);

  const approveItem = async (id: string) => {
    setProcessingId(id);
    await fetch(`/api/warranties/${id}/approve`, { method: 'POST' });
    setProcessingId(null);
    fetchItems();
  };

  const submitItem = async (id: string) => {
    setProcessingId(id);
    await fetch(`/api/warranties/${id}/submit`, { method: 'POST' });
    setProcessingId(null);
    fetchItems();
  };

  const statusBadge = (status: string) => {
    const label = (t.badges as Record<string, string>)[status] || status;
    const classes = status === 'pending_approval'
      ? 'bg-[#fff8e6] text-[#a06800]'
      : status === 'active'
        ? 'bg-[#e8faf0] text-[#1a7d42]'
        : status === 'cancelled'
          ? 'bg-[#fff0f0] text-[#c42b1c]'
          : 'bg-[#f5f5f7] text-[#86868b]';

    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>{label}</span>;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-[#86868b]">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#86868b]" dir={isRTL ? 'rtl' : 'ltr'}>
        {t.loginRequired}
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      <div>
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">{t.title}</h1>
        <p className="text-[15px] text-[#86868b] mt-1">{canApprove ? t.subtitleApprover : t.subtitleAuthor}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: t.statuses.all },
          { key: 'pending', label: t.statuses.pending },
          { key: 'draft', label: t.statuses.draft },
          { key: 'approved', label: t.statuses.approved },
          { key: 'rejected', label: t.statuses.rejected },
        ].map((statusItem) => (
          <button
            key={statusItem.key}
            onClick={() => setStatusFilter(statusItem.key as any)}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition ${
              statusFilter === statusItem.key
                ? 'bg-[#1A1A2E] text-white'
                : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
            }`}
          >
            {statusItem.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-10 text-center">
          <FileWarning className="w-8 h-8 text-[#86868b] mx-auto mb-3" />
          <p className="text-[15px] text-[#86868b]">{t.empty}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#d2d2d7]/30 text-xs font-semibold text-[#86868b] uppercase tracking-wider">
            <div className="col-span-3">{t.columns.product}</div>
            <div className="col-span-2">{t.columns.reference}</div>
            <div className="col-span-2">{t.columns.submittedBy}</div>
            <div className="col-span-2">{t.columns.status}</div>
            <div className="col-span-1">{t.columns.date}</div>
            <div className="col-span-2">{t.columns.actions}</div>
          </div>

          <div className="divide-y divide-[#d2d2d7]/20">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 items-center">
                <div className="md:col-span-3">
                  <p className="text-[14px] font-medium text-[#1d1d1f]">{isRTL && item.product_name_ar ? item.product_name_ar : item.product_name}</p>
                </div>
                <div className="md:col-span-2 text-[13px] text-[#86868b]">{item.reference_number || item.id}</div>
                <div className="md:col-span-2 text-[13px] text-[#86868b]">{item.seller_name || '—'}</div>
                <div className="md:col-span-2">{statusBadge(item.status)}</div>
                <div className="md:col-span-1 text-[13px] text-[#86868b]">{formatDate(item.created_at, locale)}</div>
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <Link
                    href={withView(`/${locale}/approval/${item.id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium hover:bg-[#e8e8ed] transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t.actions.open}
                  </Link>

                  {canApprove && item.status === 'pending_approval' && (
                    <button
                      onClick={() => approveItem(item.id)}
                      disabled={processingId === item.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8faf0] text-[#1a7d42] text-xs font-medium hover:bg-[#d8f5e5] transition disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {processingId === item.id ? t.actions.approving : t.actions.approve}
                    </button>
                  )}

                  {!canApprove && item.status === 'draft' && (
                    <button
                      onClick={() => submitItem(item.id)}
                      disabled={processingId === item.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fff8e6] text-[#a06800] text-xs font-medium hover:bg-[#fff2d1] transition disabled:opacity-60"
                    >
                      {processingId === item.id ? <Clock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      {processingId === item.id ? t.actions.submitting : t.actions.submit}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
