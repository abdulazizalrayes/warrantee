// @ts-nocheck
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { CheckCircle2, ExternalLink, FileText, Send, XCircle } from 'lucide-react';

const APPROVER_ROLES = new Set(['approver', 'company_admin', 'platform_admin', 'admin', 'super_admin']);

const detailText = {
  en: {
    title: 'Approval Detail',
    loading: 'Loading warranty details...',
    loginRequired: 'Please log in to view this approval item.',
    notFound: 'Warranty not found.',
    labels: {
      product: 'Product',
      reference: 'Reference',
      status: 'Status',
      submittedBy: 'Submitted By',
      createdAt: 'Created At',
      rejectReason: 'Rejection reason (required)',
      documents: 'Attachments',
      certificate: 'Certificate Preview',
    },
    actions: {
      back: 'Back to workflow',
      openCertificate: 'Open certificate preview',
      approve: 'Approve warranty',
      reject: 'Reject with reason',
      submit: 'Submit for approval',
      approving: 'Approving...',
      rejecting: 'Rejecting...',
      submitting: 'Submitting...',
    },
    emptyDocs: 'No attachments uploaded for this warranty.',
    status: {
      pending_approval: 'Pending Approval',
      draft: 'Draft',
      active: 'Approved',
      cancelled: 'Rejected',
      expired: 'Expired',
      claimed: 'Claimed',
    },
  },
  ar: {
    title: '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629',
    loading: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644...',
    loginRequired: '\u064a\u0631\u062c\u0649 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0639\u0631\u0636 \u0647\u0630\u0627 \u0627\u0644\u0639\u0646\u0635\u0631.',
    notFound: '\u0627\u0644\u0636\u0645\u0627\u0646 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f.',
    labels: {
      product: '\u0627\u0644\u0645\u0646\u062a\u062c',
      reference: '\u0627\u0644\u0645\u0631\u062c\u0639',
      status: '\u0627\u0644\u062d\u0627\u0644\u0629',
      submittedBy: '\u0628\u0648\u0627\u0633\u0637\u0629',
      createdAt: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621',
      rejectReason: '\u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636 (\u0645\u0637\u0644\u0648\u0628)',
      documents: '\u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a',
      certificate: '\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0634\u0647\u0627\u062f\u0629',
    },
    actions: {
      back: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0633\u064a\u0631',
      openCertificate: '\u0641\u062a\u062d \u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0634\u0647\u0627\u062f\u0629',
      approve: '\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646',
      reject: '\u0631\u0641\u0636 \u0645\u0639 \u0630\u0643\u0631 \u0627\u0644\u0633\u0628\u0628',
      submit: '\u0625\u0631\u0633\u0627\u0644 \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u0629',
      approving: '\u062c\u0627\u0631\u064a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629...',
      rejecting: '\u062c\u0627\u0631\u064a \u0627\u0644\u0631\u0641\u0636...',
      submitting: '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0631\u0633\u0627\u0644...',
    },
    emptyDocs: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0631\u0641\u0642\u0627\u062a \u0645\u0636\u0627\u0641\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0636\u0645\u0627\u0646.',
    status: {
      pending_approval: '\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629',
      draft: '\u0645\u0633\u0648\u062f\u0629',
      active: '\u0645\u0648\u0627\u0641\u0642 \u0639\u0644\u064a\u0647',
      cancelled: '\u0645\u0631\u0641\u0648\u0636',
      expired: '\u0645\u0646\u062a\u0647\u064a',
      claimed: '\u0645\u0637\u0627\u0644\u0628',
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

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const t = detailText[locale as 'en' | 'ar'] || detailText.en;
  const viewMode = useMemo(() => resolveViewMode(searchParams), [searchParams]);

  const itemId = params?.id as string;
  const supabase = createSupabaseBrowserClient();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [warranty, setWarranty] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [actionState, setActionState] = useState<'approve' | 'reject' | 'submit' | null>(null);

  const canApprove = APPROVER_ROLES.has(profile?.role || '');

  const withView = (basePath: string) => `${basePath}${basePath.includes('?') ? '&' : '?'}view=${viewMode}`;

  const loadData = async () => {
    if (!user || !itemId) return;
    setLoading(true);

    const { data: warrantyData } = await supabase
      .from('warranties')
      .select('id, reference_number, product_name, product_name_ar, status, created_at, seller_name, created_by')
      .eq('id', itemId)
      .single();

    setWarranty(warrantyData || null);

    const { data: docs } = await supabase
      .from('warranty_documents')
      .select('id, file_name, file_type, file_size, file_url, created_at')
      .eq('warranty_id', itemId)
      .order('created_at', { ascending: false });
    setDocuments(docs || []);

    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadData();
  }, [authLoading, user, itemId]);

  const performAction = async (action: 'approve' | 'reject' | 'submit') => {
    if (!itemId) return;
    if (action === 'reject' && !rejectReason.trim()) return;

    setActionState(action);

    if (action === 'approve') {
      await fetch(`/api/warranties/${itemId}/approve`, { method: 'POST' });
    } else if (action === 'reject') {
      await fetch(`/api/warranties/${itemId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
    } else {
      await fetch(`/api/warranties/${itemId}/submit`, { method: 'POST' });
    }

    setActionState(null);
    loadData();
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

  if (!warranty) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#86868b]" dir={isRTL ? 'rtl' : 'ltr'}>
        {t.notFound}
      </div>
    );
  }

  const statusLabel = (t.status as Record<string, string>)[warranty.status] || warranty.status;
  const statusClasses = warranty.status === 'pending_approval'
    ? 'bg-[#fff8e6] text-[#a06800]'
    : warranty.status === 'active'
      ? 'bg-[#e8faf0] text-[#1a7d42]'
      : warranty.status === 'cancelled'
        ? 'bg-[#fff0f0] text-[#c42b1c]'
        : 'bg-[#f5f5f7] text-[#86868b]';

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[30px] sm:text-[36px] font-semibold tracking-tight text-[#1d1d1f]">{t.title}</h1>
          <p className="text-[14px] text-[#86868b] mt-1">{warranty.reference_number || warranty.id}</p>
        </div>
        <Link
          href={withView(`/${locale}/approval`)}
          className="px-4 py-2 rounded-lg bg-[#f5f5f7] text-[#1d1d1f] text-sm font-medium hover:bg-[#e8e8ed] transition"
        >
          {t.actions.back}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#86868b]">{t.labels.product}</p>
                <p className="text-[#1d1d1f] font-medium mt-1">{isRTL && warranty.product_name_ar ? warranty.product_name_ar : warranty.product_name}</p>
              </div>
              <div>
                <p className="text-[#86868b]">{t.labels.reference}</p>
                <p className="text-[#1d1d1f] font-medium mt-1">{warranty.reference_number || '—'}</p>
              </div>
              <div>
                <p className="text-[#86868b]">{t.labels.status}</p>
                <span className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusClasses}`}>{statusLabel}</span>
              </div>
              <div>
                <p className="text-[#86868b]">{t.labels.createdAt}</p>
                <p className="text-[#1d1d1f] font-medium mt-1">{formatDate(warranty.created_at, locale)}</p>
              </div>
              <div>
                <p className="text-[#86868b]">{t.labels.submittedBy}</p>
                <p className="text-[#1d1d1f] font-medium mt-1">{warranty.seller_name || '—'}</p>
              </div>
              <div>
                <p className="text-[#86868b]">{t.labels.certificate}</p>
                <a
                  href={`/api/warranties/${itemId}/certificate`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#0071e3] hover:text-[#0077ED] text-sm font-medium mt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t.actions.openCertificate}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-6">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">{t.labels.documents}</h2>
            {documents.length === 0 ? (
              <p className="text-[14px] text-[#86868b]">{t.emptyDocs}</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-[#f5f5f7] transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                      <span className="text-[14px] text-[#1d1d1f] truncate">{doc.file_name}</span>
                    </div>
                    <span className="text-[12px] text-[#86868b]">{Math.round((doc.file_size || 0) / 1024)} KB</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {canApprove && warranty.status === 'pending_approval' && (
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5 space-y-3">
              <button
                onClick={() => performAction('approve')}
                disabled={actionState !== null}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#e8faf0] text-[#1a7d42] font-medium hover:bg-[#d8f5e5] transition disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                {actionState === 'approve' ? t.actions.approving : t.actions.approve}
              </button>

              <label className="block text-[13px] text-[#86868b]">{t.labels.rejectReason}</label>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
              />

              <button
                onClick={() => performAction('reject')}
                disabled={actionState !== null || !rejectReason.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#fff0f0] text-[#c42b1c] font-medium hover:bg-[#ffe4e4] transition disabled:opacity-60"
              >
                <XCircle className="w-4 h-4" />
                {actionState === 'reject' ? t.actions.rejecting : t.actions.reject}
              </button>
            </div>
          )}

          {!canApprove && warranty.status === 'draft' && (
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5">
              <button
                onClick={() => performAction('submit')}
                disabled={actionState !== null}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#fff8e6] text-[#a06800] font-medium hover:bg-[#fff2d1] transition disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {actionState === 'submit' ? t.actions.submitting : t.actions.submit}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
