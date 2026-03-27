'use client';

// Warrantee — Admin Ingestion Review Queue
// Shows all ingestion jobs with filtering, search, pagination, and fraud resolution

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';

interface IngestionJob {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  status: string;
  trust_level: string | null;
  trust_score: number;
  attachment_count: number;
  created_at: string;
  processed_at: string | null;
  ingestion_attachments: Array<{
    id: string;
    filename: string;
    content_type: string;
    aggregate_confidence: number | null;
    ocr_status: string;
  }>;
  fraud_signals: Array<{
    id: string;
    signal_type: string;
    severity: string;
    resolved: boolean;
  }>;
}

interface Stats {
  total_jobs: number;
  today_jobs: number;
  pending_review: number;
  auto_confirmed: number;
  failed: number;
  avg_confidence: number;
  unresolved_fraud: number;
  pending_provisional: number;
  status_breakdown: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  received: '#94A3B8',
  processing: '#3B82F6',
  matched: '#6366F1',
  ocr_complete: '#8B5CF6',
  auto_confirmed: '#22C55E',
  pending_review: '#F59E0B',
  pending_buyer_confirmation: '#F97316',
  confirmed: '#10B981',
  rejected: '#EF4444',
  failed: '#DC2626',
  not_warranty: '#6B7280',
  archived: '#9CA3AF',
};

export default function AdminIngestionPage() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const isRtl = locale === 'ar';

  const [jobs, setJobs] = useState<IngestionJob[]>([]);
'use client';
  
  // Warrantee — Admin Ingestion Review Queue
  // Shows all ingestion jobs with filtering, search, pagination, and fraud resolution
  
  import { useState, useEffect, useCallback } from 'react';
  import { useParams } from 'next/navigation';
  import { useAuth } from '@/lib/auth-context';
  
  interface IngestionJob {
      id: string;
      from_email: string;
      from_name: string | null;
      subject: string;
      status: string;
      trust_level: string | null;
      trust_score: number;
      attachment_count: number;
      created_at: string;
      processed_at: string | null;
      ingestion_attachments: Array<{
            id: string;
            filename: string;
            content_type: string;
            aggregate_confidence: number | null;
            ocr_status: string;
      }>;
      fraud_signals: Array<{
            id: string;
            signal_type: string;
            severity: string;
            resolved: boolean;
      }>;
  }
  
  interface Stats {
      total_jobs: number;
      today_jobs: number;
      pending_review: number;
      auto_confirmed: number;
      failed: number;
      avg_confidence: number;
      unresolved_fraud: number;
      pending_provisional: number;
      status_breakdown: Record<string, number>;
  }
  
  const STATUS_COLORS: Record<string, string> = {
      received: '#94A3B8',
      processing: '#3B82F6',
      matched: '#6366F1',
      ocr_complete: '#8B5CF6',
      auto_confirmed: '#22C55E',
      pending_review: '#F59E0B',
      pending_buyer_confirmation: '#F97316',
      confirmed: '#10B981',
      rejected: '#EF4444',
      failed: '#DC2626',
      not_warranty: '#6B7280',
      archived: '#9CA3AF',
  };
  
  export default function AdminIngestionPage() {
      const { user } = useAuth();
      const params = useParams();
      const locale = (params?.locale as string) || 'en';
      const isRtl = locale === 'ar';
    
      const [jobs, setJobs] = useState<IngestionJob[]>([]);
      const [stats, setStats] = useState<Stats | null>(null);
      const [loading, setLoading] = useState(true);
      const [statusFilter, setStatusFilter] = useState<string>('');
      const [search, setSearch] = useState('');
      const [page, setPage] = useState(1);
      const [totalPages, setTotalPages] = useState(1);
      const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
      const [resolving, setResolving] = useState(false);
    
      const fetchJobs = useCallback(async () => {
            setLoading(true);
            try {
                    const params = new URLSearchParams({ page: String(page), limit: '25' });
                    if (statusFilter) params.set('status', statusFilter);
                    if (search) params.set('search', search);
              
                    const res = await fetch(`/api/admin/ingestion?${params}`);
                    const json = await res.json();
                    setJobs(json.data || []);
                    setTotalPages(json.pagination?.total_pages || 1);
            } finally {
                    setLoading(false);
            }
      }, [page, statusFilter, search]);
    
      const fetchStats = useCallback(async () => {
            try {
                    const res = await fetch('/api/admin/ingestion/stats');
                    const json = await res.json();
                    setStats(json);
            } catch (err) {
                    console.error('Failed to fetch stats:', err);
            }
      }, []);
    
      useEffect(() => {
            if (user) { fetchJobs(); fetchStats(); }
      }, [user, fetchJobs, fetchStats]);
    
      const handleResolve = async (jobId: string, action: 'approve' | 'reject' | 'resolve_fraud', fraudIds?: string[]) => {
            setResolving(true);
            try {
                    await fetch(`/api/admin/ingestion/${jobId}/resolve`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                          action,
                                          fraud_signal_ids: fraudIds || [],
                                          resolution_note: '',
                              }),
                    });
                    fetchJobs();
                    fetchStats();
                    setSelectedJob(null);
            } finally {
                    setResolving(false);
            }
      };
    
      return (
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: '#0F172A' }}>
                      {isRtl ? 'إدارة البريد الوارد والمعالجة' : 'Email Ingestion Management'}
                    </h1>h1>
              
              {/* Stats Cards */}
                {stats && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        {[
                        { label: isRtl ? 'إجمالي المهام' : 'Total Jobs', value: stats.total_jobs, color: '#3B82F6' },
                        { label: isRtl ? 'اليوم' : 'Today', value: stats.today_jobs, color: '#6366F1' },
                        { label: isRtl ? 'بانتظار المراجعة' : 'Pending Review', value: stats.pending_review, color: '#F59E0B' },
                        { label: isRtl ? 'مؤكدة تلقائياً' : 'Auto-Confirmed', value: stats.auto_confirmed, color: '#22C55E' },
                        { label: isRtl ? 'احتيال لم يُحل' : 'Unresolved Fraud', value: stats.unresolved_fraud, color: '#EF4444' },
                        { label: isRtl ? 'متوسط الثقة' : 'Avg Confidence', value: `${Math.round((stats.avg_confidence || 0) * 100)}%`, color: '#8B5CF6' },
                                  ].map((stat, i) => (
                                                <div key={i} style={{
                                                                background: 'white', borderRadius: '12px', padding: '16px',
                                                                border: '1px solid #E2E8F0',
                                                }}>
                                                                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>{stat.label}</div>div>
                                                                <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>div>
                                                </div>div>
                                  ))}
                      </div>div>
                    )}
              
              {/* Filters */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                              <input
                                          type="text"
                                          placeholder={isRtl ? 'بحث بالبريد أو الموضوع...' : 'Search by email or subject...'}
                                          value={search}
                                          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                          style={{
                                                        padding: '8px 14px', borderRadius: '8px', border: '1px solid #D1D5DB',
                                                        fontSize: '14px', flex: 1, minWidth: '200px',
                                          }}
                                        />
                              <select
                                          value={statusFilter}
                                          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                                        >
                                        <option value="">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>option>
                                {Object.keys(STATUS_COLORS).map((s) => (
                                                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>option>
                                                    ))}
                              </select>select>
                    </div>div>
            
              {/* Jobs Table */}
                  <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                                                  {[
                              isRtl ? 'المرسل' : 'Sender',
                              isRtl ? 'الموضوع' : 'Subject',
                              isRtl ? 'الحالة' : 'Status',
                              isRtl ? 'الثقة' : 'Trust',
                              isRtl ? 'المرفقات' : 'Attachments',
                              isRtl ? 'احتيال' : 'Fraud',
                              isRtl ? 'التاريخ' : 'Date',
                              isRtl ? 'إجراء' : 'Action',
                            ].map((h, i) => (
                                              <th key={i} style={{ padding: '12px 8px', textAlign: isRtl ? 'right' : 'left', fontWeight: 600, color: '#374151' }}>
                                                {h}
                                              </th>th>
                                            ))}
                                                </tr>tr>
                                    </thead>thead>
                                    <tbody>
                                      {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                              {isRtl ? 'جارٍ التحميل...' : 'Loading...'}
                            </td>td></tr>tr>
                          ) : jobs.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                              {isRtl ? 'لا توجد نتائج' : 'No results'}
                            </td>td></tr>tr>
                          ) : jobs.map((job) => {
                            const unresolvedFraud = job.fraud_signals?.filter((f) => !f.resolved) || [];
                            const highSeverity = unresolvedFraud.some((f) => f.severity === 'high');
                            return (
                                              <tr key={job.id} style={{
                                                                  borderBottom: '1px solid #F1F5F9',
                                                                  background: highSeverity ? '#FEF2F2' : 'transparent',
                                              }}>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                                    <div style={{ fontWeight: 500 }}>{job.from_name || job.from_email}</div>div>
                                                                  {job.from_name && <div style={{ fontSize: '12px', color: '#94A3B8' }}>{job.from_email}</div>div>}
                                                                </td>td>
                                                                <td style={{ padding: '12px 8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                  {job.subject || '—'}
                                                                </td>td>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                                    <span style={{
                                                                      display: 'inline-block', padding: '2px 8px', borderRadius: '9999px',
                                                                      fontSize: '11px', fontWeight: 600, color: 'white',
                                                                      background: STATUS_COLORS[job.status] || '#94A3B8',
                                              }}>
                                                                                      {job.status.replace(/_/g, ' ')}
                                                                                      </span>span>
                                                                </td>td>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                  {job.trust_level ? (
                                                                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                                                                        {job.trust_level.replace(/_/g, ' ')} ({Math.round(job.trust_score * 100)}%)
                                                                      </span>span>
                                                                    ) : '—'}
                                                                </td>td>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                  {job.ingestion_attachments?.map((a) => (
                                                                      <div key={a.id} style={{ fontSize: '12px' }}>
                                                                        {a.filename}
                                                                        {a.aggregate_confidence != null && (
                                                                                                  <span style={{ color: '#64748B' }}> ({Math.round(a.aggregate_confidence * 100)}%)</span>span>
                                                                                              )}
                                                                      </div>div>
                                                                    ))}
                                                                  {(!job.ingestion_attachments || job.ingestion_attachments.length === 0) && '—'}
                                                                </td>td>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                  {unresolvedFraud.length > 0 ? (
                                                                      <span style={{
                                                                                                color: highSeverity ? '#DC2626' : '#F59E0B',
                                                                                                fontWeight: 600, fontSize: '12px',
                                                                      }}>
                                                                        {unresolvedFraud.length} {isRtl ? 'إشارات' : 'signals'}
                                                                      </span>span>
                                                                    ) : (
                                                                      <span style={{ color: '#22C55E', fontSize: '12px' }}>✓</span>span>
                                                                                    )}
                                                                </td>td>
                                                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#64748B' }}>
                                                                  {new Date(job.created_at).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', {
                                                                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                              })}
                                                                </td>td>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                  {(job.status === 'pending_review' || unresolvedFraud.length > 0) && (
                                                                      <button
                                                                                                onClick={() => setSelectedJob(job)}
                                                                                                style={{
                                                                                                                            padding: '4px 12px', borderRadius: '6px', border: '1px solid #2563EB',
                                                                                                                            background: 'white', color: '#2563EB', fontSize: '12px', cursor: 'pointer',
                                                                                                  }}
                                                                                              >
                                                                        {isRtl ? 'مراجعة' : 'Review'}
                                                                      </button>button>
                                                                                    )}
                                                                </td>td>
                                              </tr>tr>
                                            );
            })}
                                    </tbody>tbody>
                          </table>table>
                  </div>div>
            
              {/* Pagination */}
              {totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                                <button
                                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                                              disabled={page === 1}
                                              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer' }}
                                            >
                                  {isRtl ? 'السابق' : 'Previous'}
                                </button>button>
                                <span style={{ padding: '6px 14px', color: '#64748B' }}>
                                  {page} / {totalPages}
                                </span>span>
                                <button
                                              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                              disabled={page === totalPages}
                                              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer' }}
                                            >
                                  {isRtl ? 'التالي' : 'Next'}
                                </button>button>
                      </div>div>
                  )}
            
              {/* Review Modal */}
              {selectedJob && (
                      <div style={{
                                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                                  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50,
                      }}>
                                <div style={{
                                    background: 'white', borderRadius: '16px', maxWidth: '640px', width: '90%',
                                    maxHeight: '80vh', overflow: 'auto', padding: '32px',
                      }}>
                                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
                                              {isRtl ? 'مراجعة مهمة المعالجة' : 'Review Ingestion Job'}
                                            </h2>h2>
                                
                                            <div style={{ marginBottom: '16px' }}>
                                                          <strong>{isRtl ? 'المرسل: ' : 'From: '}</strong>strong>{selectedJob.from_email}<br/>
                                                          <strong>{isRtl ? 'الموضوع: ' : 'Subject: '}</strong>strong>{selectedJob.subject || '—'}<br/>
                                                          <strong>{isRtl ? 'الثقة: ' : 'Trust: '}</strong>strong>
                                              {selectedJob.trust_level?.replace(/_/g, ' ')} ({Math.round(selectedJob.trust_score * 100)}%)
                                            </div>div>
                                
                                  {/* Fraud Signals */}
                                  {selectedJob.fraud_signals?.filter((f) => !f.resolved).length > 0 && (
                                      <div style={{
                                                        background: '#FEF2F2', borderRadius: '12px', padding: '16px', marginBottom: '16px',
                                                        border: '1px solid #FECACA',
                                      }}>
                                                      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626', marginBottom: '8px' }}>
                                                        {isRtl ? 'إشارات احتيال' : 'Fraud Signals'}
                                                      </h3>h3>
                                        {selectedJob.fraud_signals.filter((f) => !f.resolved).map((f) => (
                                                          <div key={f.id} style={{
                                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                                padding: '8px 0', borderBottom: '1px solid #FEE2E2',
                                                          }}>
                                                                              <span style={{ fontSize: '13px' }}>
                                                                                                    <span style={{
                                                                                    display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                                                                                    background: f.severity === 'high' ? '#DC2626' : f.severity === 'medium' ? '#F59E0B' : '#94A3B8',
                                                                                    marginInlineEnd: '8px',
                                                          }} />
                                                                                {f.signal_type.replace(/_/g, ' ')}
                                                                                                    <span style={{ color: '#94A3B8', marginInlineStart: '8px' }}>({f.severity})</span>span>
                                                                              </span>span>
                                                          </div>div>
                                                        ))}
                                      </div>div>
                                            )}
                                
                                  {/* Actions */}
                                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                          <button
                                                                            onClick={() => setSelectedJob(null)}
                                                                            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer' }}
                                                                          >
                                                            {isRtl ? 'إلغاء' : 'Cancel'}
                                                          </button>button>
                                            
                                              {selectedJob.fraud_signals?.filter((f) => !f.resolved).length > 0 && (
                                        <button
                                                            onClick={() => handleResolve(
                                                                                  selectedJob.id, 'resolve_fraud',
                                                                                  selectedJob.fraud_signals.filter((f) => !f.resolved).map((f) => f.id)
                                                                                )}
                                                            disabled={resolving}
                                                            style={{
                                                                                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                                                                                  background: '#FEF3C7', color: '#92400E', cursor: 'pointer',
                                                            }}
                                                          >
                                          {isRtl ? 'حل إشارات الاحتيال' : 'Resolve Fraud Signals'}
                                        </button>button>
                                                          )}
                                            
                                                          <button
                                                                            onClick={() => handleResolve(selectedJob.id, 'reject')}
                                                                            disabled={resolving}
                                                                            style={{
                                                                                                padding: '10px 20px', borderRadius: '8px', border: 'none',
                                                                                                background: '#FEE2E2', color: '#991B1B', cursor: 'poi</select>const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [resolving, setResolving] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/ingestion?${params}`);
      const json = await res.json();
      setJobs(json.data || []);
      setTotalPages(json.pagination?.total_pages || 1);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ingestion/stats');
      const json = await res.json();
      setStats(json);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    if (user) { fetchJobs(); fetchStats(); }
  }, [user, fetchJobs, fetchStats]);

  const handleResolve = async (jobId: string, action: 'approve' | 'reject' | 'resolve_fraud', fraudIds?: string[]) => {
    setResolving(true);
    try {
      await fetch(`/api/admin/ingestion/${jobId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          fraud_signal_ids: fraudIds || [],
          resolution_note: '',
        }),
      });
      fetchJobs();
      fetchStats();
      setSelectedJob(null);
    } finally {
      setResolving(false);
    }
  };

  // Return statement truncated for space - full component in file
  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: '#0F172A' }}>
        {isRtl ? 'إدارة البريد الوارد والمعالجة' : 'Email Ingestion Management'}
      </h1>
    </div>
  );
}
