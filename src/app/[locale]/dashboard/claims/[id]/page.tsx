'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { normalizeLocale } from '@/lib/i18n';
import { CLAIM_TRANSITIONS } from '@/lib/claim-transitions';

const supabase = createSupabaseBrowserClient();

const statusCfg: Record<string,{l:string;a:string;bg:string;tx:string}> = {
  draft:{l:'Draft',a:'مسودة',bg:'bg-gray-100',tx:'text-gray-700'},
  submitted:{l:'Submitted',a:'مقدم',bg:'bg-blue-100',tx:'text-blue-700'},
  under_review:{l:'Under Review',a:'قيد المراجعة',bg:'bg-yellow-100',tx:'text-yellow-700'},
  awaiting_info:{l:'Awaiting Info',a:'بانتظار معلومات',bg:'bg-orange-100',tx:'text-orange-700'},
  approved:{l:'Approved',a:'موافق عليه',bg:'bg-green-100',tx:'text-green-700'},
  rejected:{l:'Rejected',a:'مرفوض',bg:'bg-red-100',tx:'text-red-700'},
  resolved:{l:'Resolved',a:'تم الحل',bg:'bg-emerald-100',tx:'text-emerald-700'},
  closed:{l:'Closed',a:'مغلق',bg:'bg-slate-100',tx:'text-slate-700'},
  open:{l:'Open',a:'مفتوح',bg:'bg-blue-100',tx:'text-blue-700'},
  in_progress:{l:'In Progress',a:'جاري',bg:'bg-yellow-100',tx:'text-yellow-700'},
};

const sevCfg: Record<string,{l:string;c:string;bg:string}> = {low:{l:'Low',c:'text-green-700',bg:'bg-green-50'},medium:{l:'Medium',c:'text-yellow-700',bg:'bg-yellow-50'},high:{l:'High',c:'text-orange-700',bg:'bg-orange-50'},critical:{l:'Critical',c:'text-red-700',bg:'bg-red-50'}};

const evIcons: Record<string,string> = {created:'➕',status_change:'➡️',comment:'💬',attachment_added:'📎',assigned:'👤',escalated:'⚠️',info_requested:'❓',info_provided:'ℹ️',approved:'✅',rejected:'❌',reopened:'🔄',closed:'🔒'};

const actionBtnCfg: Record<string,{bg:string;hover:string}> = {
  approved:{bg:'bg-green-600',hover:'hover:bg-green-700'},
  rejected:{bg:'bg-red-600',hover:'hover:bg-red-700'},
  awaiting_info:{bg:'bg-orange-500',hover:'hover:bg-orange-600'},
  under_review:{bg:'bg-yellow-500',hover:'hover:bg-yellow-600'},
  submitted:{bg:'bg-blue-500',hover:'hover:bg-blue-600'},
  resolved:{bg:'bg-emerald-600',hover:'hover:bg-emerald-700'},
  closed:{bg:'bg-slate-600',hover:'hover:bg-slate-700'},
  in_progress:{bg:'bg-yellow-500',hover:'hover:bg-yellow-600'},
};

function toLocalDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function ClaimDetailPage() {
  const pathname = usePathname();
  const params = useParams() ?? {};
  const locale = normalizeLocale(pathname?.split('/').filter(Boolean)[0]);
  const isRTL = locale === 'ar';
  const claimId = params.id as string;

  const [claim, setClaim] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);
  const [savingServiceLevel, setSavingServiceLevel] = useState(false);
  const [serviceLevel, setServiceLevel] = useState({
    target_response_at: '',
    target_resolution_at: '',
    decision_reason_code: '',
    failure_mode_code: '',
    evidence_requirements: '',
  });

  const t = isRTL ? {
    back:'العودة للمطالبات',summary:'ملخص المطالبة',warranty:'الضمان المرتبط',
    timeline:'الجدول الزمني',evidence:'المستندات',status:'الحالة',severity:'الخطورة',
    filed:'تاريخ التقديم',amount:'المبلغ',assigned:'معيّن إلى',desc:'الوصف',
    noEvents:'لا توجد أحداث',noFiles:'لا توجد مستندات',addComment:'أضف تعليق',
    send:'إرسال',err:'حدث خطأ',retry:'إعادة',notFound:'لم يتم العثور على المطالبة',
    product:'المنتج',ref:'المرجع',resolution:'ملاحظات الحل',
    adminPanel:'إدارة الحالة',changeStatus:'تغيير الحالة',noteOptional:'ملاحظة (اختياري)',
    noTransitions:'لا توجد إجراءات متاحة',filedBy:'مقدم من',serviceLevel:'وضوح الخدمة',
    responseTarget:'موعد الرد المستهدف',resolutionTarget:'موعد الحل المستهدف',decisionReason:'سبب القرار',
    failureMode:'نوع العطل',evidenceNeeded:'الأدلة المطلوبة',saveTargets:'حفظ الأهداف',notConfigured:'غير محدد'
  } : {
    back:'Back to Claims',summary:'Claim Summary',warranty:'Linked Warranty',
    timeline:'Timeline',evidence:'Evidence & Attachments',status:'Status',severity:'Severity',
    filed:'Filed',amount:'Amount',assigned:'Assigned To',desc:'Description',
    noEvents:'No events yet',noFiles:'No attachments',addComment:'Add a comment',
    send:'Send',err:'Something went wrong',retry:'Retry',notFound:'Claim not found',
    product:'Product',ref:'Reference',resolution:'Resolution Notes',
    adminPanel:'Status Management',changeStatus:'Change Status',noteOptional:'Note (optional)',
    noTransitions:'No actions available',filedBy:'Filed By',serviceLevel:'Service transparency',
    responseTarget:'Response target',resolutionTarget:'Resolution target',decisionReason:'Decision reason',
    failureMode:'Failure mode',evidenceNeeded:'Required evidence',saveTargets:'Save targets',notConfigured:'Not configured'
  };

  const loadClaim = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) setCanManage(false);

      const { data: c, error: e1 } = await supabase
        .from('warranty_claims')
        .select('*, warranty:warranties(id,product_name,product_name_ar,reference_number), filer:profiles!warranty_claims_filed_by_fkey(full_name,email), assignee:profiles!warranty_claims_assigned_to_fkey(full_name,email)')
        .eq('id', claimId)
        .single();
      if (e1) throw e1;
      setClaim(c);

      const serviceResponse = await fetch(`/api/claims/${claimId}/service-level`, { cache: 'no-store' });
      if (serviceResponse.ok) {
        const servicePayload = await serviceResponse.json();
        const service = servicePayload.data || {};
        setCanManage(Boolean(servicePayload.canManage));
        setServiceLevel({
          target_response_at: toLocalDateTime(service.target_response_at),
          target_resolution_at: toLocalDateTime(service.target_resolution_at),
          decision_reason_code: service.decision_reason_code || '',
          failure_mode_code: service.failure_mode_code || '',
          evidence_requirements: Array.isArray(service.evidence_requirements) ? service.evidence_requirements.join(', ') : '',
        });
      }

      const { data: ev } = await supabase
        .from('claim_events')
        .select('*, actor:profiles!claim_events_created_by_fkey(full_name,email)')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });
      setEvents(ev || []);

      const { data: att } = await supabase
        .from('claim_attachments')
        .select('*')
        .eq('claim_id', claimId);
      setAttachments(att || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [claimId]);

  useEffect(() => { loadClaim(); }, [loadClaim]);

  const changeStatus = async (newStatus: string) => {
    if (changingStatus) return;
    setChangingStatus(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: statusNote || null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t.err);

      setStatusNote('');
      await loadClaim();
    } catch (e: any) {
      setError(e.message);
    }
    setChangingStatus(false);
  };

  const saveServiceLevel = async () => {
    if (!canManage || savingServiceLevel) return;
    setSavingServiceLevel(true);
    setError('');
    try {
      const response = await fetch(`/api/claims/${claimId}/service-level`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_response_at: serviceLevel.target_response_at ? new Date(serviceLevel.target_response_at).toISOString() : null,
          target_resolution_at: serviceLevel.target_resolution_at ? new Date(serviceLevel.target_resolution_at).toISOString() : null,
          decision_reason_code: serviceLevel.decision_reason_code || null,
          failure_mode_code: serviceLevel.failure_mode_code || null,
          evidence_requirements: serviceLevel.evidence_requirements.split(',').map((item) => item.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t.err);
      await loadClaim();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingServiceLevel(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('claim_events').insert({
      claim_id: claimId,
      event_type: 'comment',
      description: comment,
      created_by: user?.id
    });
    setComment('');
    setSubmitting(false);
    loadClaim();
  };

  const fmtD = (d: string) => d ? new Date(d).toLocaleDateString(
    isRTL ? 'ar-SA' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  ) : '-';

  const Badge = ({ s }: { s: string }) => {
    const c = statusCfg[s] || statusCfg.draft;
    return <span className={'px-3 py-1.5 rounded-full text-sm font-medium ' + c.bg + ' ' + c.tx}>{isRTL ? c.a : c.l}</span>;
  };

  const availableTransitions = claim ? (CLAIM_TRANSITIONS[claim.status] || []) : [];

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#4169E1] border-t-transparent rounded-full" />
    </div>
  );

  if (error && !claim) return (
    <div className="min-h-[60vh] flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
          {isRTL ? 'تعذّر تحميل المطالبة' : 'Claim not accessible'}
        </h2>
        <p className="text-[15px] text-[#86868b] mb-6">
          {isRTL
            ? 'هذه المطالبة غير موجودة أو ليس لديك صلاحية الوصول إليها.'
            : 'This claim does not exist or you do not have permission to view it.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={'/' + locale + '/dashboard/claims'}
            className="px-5 py-2.5 bg-[#4169E1] text-white rounded-xl text-[15px] font-medium hover:bg-[#3558c8] transition-colors"
          >
            {isRTL ? 'العودة للمطالبات' : 'Back to Claims'}
          </Link>
          <button
            onClick={loadClaim}
            className="px-5 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-xl text-[15px] font-medium hover:bg-[#f5f5f7] transition-colors"
          >
            {t.retry}
          </button>
        </div>
      </div>
    </div>
  );

  if (!claim) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-gray-500">{t.notFound}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Link href={'/' + locale + '/dashboard/claims'} className="text-sm text-[#4169E1] hover:underline mb-4 inline-block">
        &larr; {t.back}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-1">{claim.title}</h1>
          <p className="text-sm text-gray-400 font-mono">{claim.claim_number}</p>
        </div>
        <Badge s={claim.status} />
      </div>

      {canManage && availableTransitions.length > 0 && (
        <section className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-5 mb-6">
          <h3 className="font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {t.adminPanel}
          </h3>
          <div className="mb-3">
            <input
              type="text"
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder={t.noteOptional}
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTransitions.map(ns => {
              const cfg = statusCfg[ns] || statusCfg.draft;
              const btn = actionBtnCfg[ns] || { bg: 'bg-[#4169E1]', hover: 'hover:bg-blue-700' };
              return (
                <button
                  key={ns}
                  onClick={() => changeStatus(ns)}
                  disabled={changingStatus}
                  className={'px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors ' + btn.bg + ' ' + btn.hover}
                >
                  {changingStatus ? '...' : (isRTL ? cfg.a : cfg.l)}
                </button>
              );
            })}
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-[#1A1A2E] mb-4">{t.summary}</h2>
            <p className="text-gray-700 text-sm whitespace-pre-wrap mb-4">{claim.description}</p>
            {claim.resolution_notes && (
              <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs font-medium text-emerald-700 mb-1">{t.resolution}</p>
                <p className="text-sm text-emerald-800">{claim.resolution_notes}</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.severity}</p>
                {claim.severity ? (
                  <span className={'text-sm font-medium px-2 py-0.5 rounded ' + (sevCfg[claim.severity]?.bg || '') + ' ' + (sevCfg[claim.severity]?.c || '')}>
                    {sevCfg[claim.severity]?.l || claim.severity}
                  </span>
                ) : <span className="text-sm text-gray-400">-</span>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.filed}</p>
                <p className="text-sm text-gray-900">{fmtD(claim.filed_at || claim.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.amount}</p>
                <p className="text-sm text-gray-900">{claim.claim_amount ? claim.claim_amount + ' ' + claim.currency : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.assigned}</p>
                <p className="text-sm text-gray-900">{claim.assignee?.full_name || claim.assignee?.email || '-'}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-[#1A1A2E] mb-4">{t.timeline}</h2>
            {events.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noEvents}</p>
            ) : (
              <div className="space-y-4">
                {events.map((ev: any, i: number) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">{evIcons[ev.event_type] || '•'}</div>
                      {i < events.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{ev.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                        {ev.old_status && ev.new_status && (
                          <span className="text-xs text-gray-500">{ev.old_status} &rarr; {ev.new_status}</span>
                        )}
                      </div>
                      {ev.description && <p className="text-sm text-gray-600 mb-1">{ev.description}</p>}
                      <p className="text-xs text-gray-400">{fmtD(ev.created_at)} {ev.actor?.full_name ? '• ' + ev.actor.full_name : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">{t.addComment}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={t.addComment + '...'}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#4169E1]/20 focus:border-[#4169E1]"
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                />
                <button
                  onClick={addComment}
                  disabled={!comment.trim() || submitting}
                  className="px-4 py-2 bg-[#4169E1] text-white rounded-lg text-sm font-medium disabled:opacity-40"
                >{t.send}</button>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {claim.warranty && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-[#1A1A2E] mb-3 text-sm">{t.warranty}</h3>
              <Link href={'/' + locale + '/warranties/' + claim.warranty.id} className="block hover:bg-gray-50 rounded-lg p-2 -mx-2 transition">
                <p className="font-medium text-sm text-[#1A1A2E]">
                  {isRTL ? claim.warranty.product_name_ar : claim.warranty.product_name || claim.warranty.product_name_ar}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-1">{claim.warranty.reference_number || '-'}</p>
              </Link>
            </section>
          )}

          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-[#1A1A2E] mb-3 text-sm">{t.evidence}</h3>
            {attachments.length === 0 ? (
              <p className="text-sm text-gray-400">{t.noFiles}</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{a.file_name}</p>
                      <p className="text-xs text-gray-400">{a.file_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-[#1A1A2E] mb-3 text-sm">{t.serviceLevel}</h3>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="mb-1 block text-xs text-gray-500">{t.responseTarget}</span>
                {canManage ? <input type="datetime-local" value={serviceLevel.target_response_at} onChange={(event) => setServiceLevel({ ...serviceLevel, target_response_at: event.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2" /> : <span>{claim.target_response_at ? fmtD(claim.target_response_at) : t.notConfigured}</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-gray-500">{t.resolutionTarget}</span>
                {canManage ? <input type="datetime-local" value={serviceLevel.target_resolution_at} onChange={(event) => setServiceLevel({ ...serviceLevel, target_resolution_at: event.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2" /> : <span>{claim.target_resolution_at ? fmtD(claim.target_resolution_at) : t.notConfigured}</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-gray-500">{t.decisionReason}</span>
                {canManage ? (
                  <select value={serviceLevel.decision_reason_code} onChange={(event) => setServiceLevel({ ...serviceLevel, decision_reason_code: event.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2">
                    <option value="">{t.notConfigured}</option>
                    {['coverage_confirmed','coverage_excluded','insufficient_evidence','duplicate_claim','repair_authorized','replacement_authorized','customer_withdrew','other'].map((reason) => <option key={reason} value={reason}>{reason.replace(/_/g, ' ')}</option>)}
                  </select>
                ) : <span>{claim.decision_reason_code?.replace(/_/g, ' ') || t.notConfigured}</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-gray-500">{t.failureMode}</span>
                {canManage ? <input value={serviceLevel.failure_mode_code} onChange={(event) => setServiceLevel({ ...serviceLevel, failure_mode_code: event.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="component_failure" /> : <span>{claim.failure_mode_code || t.notConfigured}</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-gray-500">{t.evidenceNeeded}</span>
                {canManage ? <input value={serviceLevel.evidence_requirements} onChange={(event) => setServiceLevel({ ...serviceLevel, evidence_requirements: event.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder={isRTL ? 'فاتورة، صورة، تقرير فني' : 'Invoice, photo, service report'} /> : <span>{Array.isArray(claim.evidence_requirements) && claim.evidence_requirements.length ? claim.evidence_requirements.join(', ') : t.notConfigured}</span>}
              </label>
              {canManage && <button onClick={saveServiceLevel} disabled={savingServiceLevel} className="w-full rounded-lg bg-[#4169E1] px-4 py-2 font-medium text-white disabled:opacity-50">{savingServiceLevel ? '...' : t.saveTargets}</button>}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-[#1A1A2E] mb-3 text-sm">{t.filedBy}</h3>
            <p className="text-sm text-gray-700">{claim.filer?.full_name || claim.filer?.email || '-'}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
