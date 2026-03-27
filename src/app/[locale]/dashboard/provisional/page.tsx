'use client';

// Warrantee — Provisional Inbox Page
// Shows warranties awaiting user confirmation from email ingestion

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';

interface ProvisionalWarranty {
  id: string;
  product_name: string | null;
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  warranty_duration_months: number | null;
  purchase_date: string | null;
  expiry_date: string | null;
  seller_name: string | null;
  confidence_score: number;
  needs_input_fields: string[];
  status: string;
  created_at: string;
  ingestion_attachments?: {
    filename: string;
    content_type: string;
    aggregate_confidence: number;
    storage_path: string;
  };
}

export default function ProvisionalInboxPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const isRtl = locale === 'ar';

  const [warranties, setWarranties] = useState<ProvisionalWarranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarranty, setSelectedWarranty] = useState<ProvisionalWarranty | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string | number>>({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWarranties = useCallback(async () => {
    try {
      const res = await fetch('/api/warranties/provisional?status=pending');
      const json = await res.json();
      setWarranties(json.data || []);
    } catch (err) {
      console.error('Failed to fetch provisional warranties:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchWarranties();
  }, [user, fetchWarranties]);

  const handleConfirm = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/warranties/provisional/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections }),
      });
      if (res.ok) {
        setWarranties((prev) => prev.filter((w) => w.id !== id));
        setSelectedWarranty(null);
        setCorrections({});
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string, action: 'reject' | 'not_warranty') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/warranties/provisional/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setWarranties((prev) => prev.filter((w) => w.id !== id));
        setSelectedWarranty(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return '#22C55E';
    if (score >= 0.50) return '#F59E0B';
    return '#EF4444';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.85) return isRtl ? 'ثقة عالية' : 'High Confidence';
    if (score >= 0.50) return isRtl ? 'ثقة متوسطة' : 'Medium Confidence';
    return isRtl ? 'ثقة منخفضة' : 'Low Confidence';
  };

  const fieldLabels: Record<string, { en: string; ar: string }> = {
    product_name: { en: 'Product Name', ar: 'اسم المنتج' },
    brand: { en: 'Brand', ar: 'العلامة التجارية' },
    model_number: { en: 'Model Number', ar: 'رقم الموديل' },
    serial_number: { en: 'Serial Number', ar: 'الرقم التسلسلي' },
    warranty_duration_months: { en: 'Warranty Duration (months)', ar: 'مدة الضمان (أشهر)' },
    purchase_date: { en: 'Purchase Date', ar: 'تاريخ الشراء' },
    expiry_date: { en: 'Expiry Date', ar: 'تاريخ الانتهاء' },
    seller_name: { en: 'Seller', ar: 'البائع' },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          {isRtl ? 'جارٍ التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>
        {isRtl ? 'صندوق الوارد المؤقت' : 'Provisional Inbox'}
      </h1>
      <p style={{ color: '#64748B', marginBottom: '24px' }}>
        {isRtl
          ? 'ضمانات مُستخرجة من بريدك الإلكتروني تحتاج مراجعتك'
          : 'Warranties extracted from your emails awaiting your review'}
      </p>

      {warranties.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px', background: '#F8FAFC',
          borderRadius: '12px', border: '1px solid #E2E8F0',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p style={{ color: '#64748B' }}>
            {isRtl ? 'لا توجد ضمانات بانتظار المراجعة' : 'No warranties awaiting review'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {warranties.map((w) => (
            <div
              key={w.id}
              onClick={() => { setSelectedWarranty(w); setCorrections({}); }}
              style={{
'use client';
  
  // Warrantee — Provisional Inbox Page
  // Shows warranties awaiting user confirmation from email ingestion
  
  import { useState, useEffect, useCallback } from 'react';
                import { useParams } from 'next/navigation';
                import { useAuth } from '@/lib/auth-context';
              
              interface ProvisionalWarranty {
                  id: string;
                product_name: string | null;
                brand: string | null;
            model_number: string | null;
            serial_number: string | null;
            warranty_duration_months: number | null;
            purchase_date: string | null;
            expiry_date: string | null;
            seller_name: string | null;
            confidence_score: number;
            needs_input_fields: string[];
            status: string;
            created_at: string;
            ingestion_attachments?: {
                  filename: string;
              content_type: string;
              aggregate_confidence: number;
              storage_path: string;
          };
          }
          
          export default function ProvisionalInboxPage() {
              const { user } = useAuth();
            const params = useParams();
            const locale = (params?.locale as string) || 'en';
            const isRtl = locale === 'ar';
          
            const [warranties, setWarranties] = useState<ProvisionalWarranty[]>([]);
            const [loading, setLoading] = useState(true);
            const [selectedWarranty, setSelectedWarranty] = useState<ProvisionalWarranty | null>(null);
            const [corrections, setCorrections] = useState<Record<string, string | number>>({});
            const [actionLoading, setActionLoading] = useState(false);
          
            const fetchWarranties = useCallback(async () => {
                  try {
                          const res = await fetch('/api/warranties/provisional?status=pending');
                const json = await res.json();
                setWarranties(json.data || []);
          } catch (err) {
                  console.error('Failed to fetch provisional warranties:', err);
          } finally {
                  setLoading(false);
          }
          }, []);
          
            useEffect(() => {
                  if (user) fetchWarranties();
          }, [user, fetchWarranties]);
          
            const handleConfirm = async (id: string) => {
                  setActionLoading(true);
              try {
                      const res = await fetch(`/api/warranties/provisional/${id}/confirm`, {
                                method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ corrections }),
          });
                if (res.ok) {
                          setWarranties((prev) => prev.filter((w) => w.id !== id));
                  setSelectedWarranty(null);
                  setCorrections({});
          }
          } finally {
                  setActionLoading(false);
          }
          };
          
            const handleReject = async (id: string, action: 'reject' | 'not_warranty') => {
                  setActionLoading(true);
              try {
                      const res = await fetch(`/api/warranties/provisional/${id}`, {
                                method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action }),
          });
                if (res.ok) {
                          setWarranties((prev) => prev.filter((w) => w.id !== id));
                  setSelectedWarranty(null);
          }
          } finally {
                  setActionLoading(false);
          }
          };
          
            const getConfidenceColor = (score: number) => {
                  if (score >= 0.85) return '#22C55E';
              if (score >= 0.50) return '#F59E0B';
              return '#EF4444';
          };
          
            const getConfidenceLabel = (score: number) => {
                  if (score >= 0.85) return isRtl ? 'ثقة عالية' : 'High Confidence';
              if (score >= 0.50) return isRtl ? 'ثقة متوسطة' : 'Medium Confidence';
              return isRtl ? 'ثقة منخفضة' : 'Low Confidence';
          };
          
            const fieldLabels: Record<string, { en: string; ar: string }> = {
                  product_name: { en: 'Product Name', ar: 'اسم المنتج' },
              brand: { en: 'Brand', ar: 'العلامة التجارية' },
              model_number: { en: 'Model Number', ar: 'رقم الموديل' },
              serial_number: { en: 'Serial Number', ar: 'الرقم التسلسلي' },
              warranty_duration_months: { en: 'Warranty Duration (months)', ar: 'مدة الضمان (أشهر)' },
              purchase_date: { en: 'Purchase Date', ar: 'تاريخ الشراء' },
              expiry_date: { en: 'Expiry Date', ar: 'تاريخ الانتهاء' },
              seller_name: { en: 'Seller', ar: 'البائع' },
          };
          
            if (loading) {
                  return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                          <div style={{ textAlign: 'center', color: '#64748B' }}>
                            {isRtl ? 'جارٍ التحميل...' : 'Loading...'}
                          </div>div>
                </div>div>
              );
          }
          
            return (
              <div dir={isRtl ? 'rtl' : 'ltr'} style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
                      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>
                        {isRtl ? 'صندوق الوارد المؤقت' : 'Provisional Inbox'}
                      </h1>h1>
                      <p style={{ color: '#64748B', marginBottom: '24px' }}>
                        {isRtl
                                    ? 'ضمانات مُستخرجة من بريدك الإلكتروني تحتاج مراجعتك'
                                    : 'Warranties extracted from your emails awaiting your review'}
                      </p>p>
                
                {warranties.length === 0 ? (
                  <div style={{
                              textAlign: 'center', padding: '48px', background: '#F8FAFC',
                              borderRadius: '12px', border: '1px solid #E2E8F0',
                  }}>
                              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>div>
                              <p style={{ color: '#64748B' }}>
                                {isRtl ? 'لا توجد ضمانات بانتظار المراجعة' : 'No warranties awaiting review'}
                              </p>p>
                  </div>div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {warranties.map((w) => (
                                <div
                                                key={w.id}
                                                onClick={() => { setSelectedWarranty(w); setCorrections({}); }}
                                                style={{
                                                                  border: selectedWarranty?.id === w.id ? '2px solid #2563EB' : '1px solid #E2E8F0',
                                                                  borderRadius: '12px',
                                                                  padding: '20px',
                                                                  background: 'white',
                                                                  cursor: 'pointer',
                                                                  transition: 'border-color 0.2s',
                                                }}
                                              >
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                              <div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                                                    <span style={{ fontSize: '18px' }}>📄</span>span>
                                                                                                    <span style={{ fontWeight: 600, fontSize: '16px', color: '#0F172A' }}>
                                                                                                      {w.product_name || (isRtl ? 'مستند غير محدد' : 'Unknown Document')}
                                                                                                      </span>span>
                                                                                </div>div>
                                                                {w.brand && (
                                                                    <span style={{ color: '#64748B', fontSize: '14px' }}>{w.brand}</span>span>
                                                                                )}
                                                              </div>div>
                                                              <div style={{ textAlign: 'right' }}>
                                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '4px 10px',
                                                                    borderRadius: '9999px',
                                                                    fontSize: '12px',
                                                                    fontWeight: 600,
                                                                    color: 'white',
                                                                    background: getConfidenceColor(w.confidence_score),
                                              }}>
                                                                                  {Math.round(w.confidence_score * 100)}% — {getConfidenceLabel(w.confidence_score)}
                                                                                </span>span>
                                                                {w.needs_input_fields.length > 0 && (
                                                                    <div style={{ color: '#F59E0B', fontSize: '12px', marginTop: '4px' }}>
                                                                      {w.needs_input_fields.length} {isRtl ? 'حقول تحتاج مراجعة' : 'fields need review'}
                                                                    </div>div>
                                                                                )}
                                                              </div>div>
                                              </div>div>
                                              <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '8px' }}>
                                                {isRtl ? 'تم الاستلام: ' : 'Received: '}
                                                {new Date(w.created_at).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', {
                                                                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                              })}
                                              </div>div>
                                </div>div>
                              ))}
                  </div>div>
                    )}
              
                {/* Detail / Confirmation Modal */}
                {selectedWarranty && (
                  <div style={{
                              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                              display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50,
                  }}>
                            <div style={{
                                background: 'white', borderRadius: '16px', maxWidth: '600px', width: '90%',
                                maxHeight: '85vh', overflow: 'auto', padding: '32px',
                  }}>
                                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: '#0F172A' }}>
                                          {isRtl ? 'مراجعة وتأكيد الضمان' : 'Review & Confirm Warranty'}
                                        </h2>h2>
                            
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                          {Object.entries(fieldLabels).map(([field, labels]) => {
                                    const value = selectedWarranty[field as keyof ProvisionalWarranty];
                                    const needsInput = selectedWarranty.needs_input_fields.includes(field);
                                    return (
                                                        <div key={field}>
                                                                            <label style={{
                                                                                display: 'block', fontSize: '13px', fontWeight: 600,
                                                                                color: needsInput ? '#F59E0B' : '#374151', marginBottom: '4px',
                                                        }}>
                                                                              {isRtl ? labels.ar : labels.en}
                                                                              {needsInput && (
                                                                                  <span style={{ color: '#EF4444', marginInlineStart: '4px' }}>*</span>span>
                                                                                                  )}
                                                                            </label>label>
                                                                            <input
                                                                                                    type={field === 'warranty_duration_months' ? 'number' : field.includes('date') ? 'date' : 'text'}
                                                                                                    defaultValue={value != null ? String(value) : ''}
                                                                                                    onChange={(e) => setCorrections((prev) => ({
                                                                                                                              ...prev,
                                                                                                                              [field]: field === 'warranty_duration_months'
                                                                                                                                                          ? parseInt(e.target.value, 10) || 0
                                                                                                                                                          : e.target.value,
                                                                                                      }))}
                                                                                                    style={{
                                                                                                                              width: '100%', padding: '10px 12px', borderRadius: '8px',
                                                                                                                              border: needsInput ? '2px solid #F59E0B' : '1px solid #D1D5DB',
                                                                                                                              fontSize: '14px', background: needsInput ? '#FFFBEB' : 'white',
                                                                                                                              direction: isRtl ? 'rtl' : 'ltr',
                                                                                                      }}
                                                                                                    placeholder={needsInput ? (isRtl ? 'مطلوب' : 'Required') : ''}
                                                                                                  />
                                                        </div>div>
                                                      );
                  })}
                                        </div>div>
                            
                                        <div style={{
                                  display: 'flex', gap: '12px', marginTop: '24px',
                                  justifyContent: 'flex-end', flexWrap: 'wrap',
                  }}>
                                                      <button
                                                                        onClick={() => { setSelectedWarranty(null); setCorrections({}); }}
                                                                        style={{
                                                                                            padding: '10px 20px', borderRadius: '8px', border: '1px solid #D1D5DB',
                                                                                            background: 'white', cursor: 'pointer', fontSize: '14px',
                                                                        }}
                                                                      >
                                                        {isRtl ? 'إلغاء' : 'Cancel'}
                                                      </button>button>
                                                      <button
                                                                        onClick={() => handleReject(selectedWarranty.id, 'not_warranty')}
                                                                        disabled={actionLoading}
                                                                        style={{
                                                                                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                                                                                            background: '#FEE2E2', color: '#991B1B', cursor: 'pointer', fontSize: '14px',
                                                                        }}
                                                                      >
                                                        {isRtl ? 'ليس ضمان' : 'Not a Warranty'}
                                                      </button>button>
                                                      <button
                                                                        onClick={() => handleReject(selectedWarranty.id, 'reject')}
                                                                        disabled={actionLoading}
                                                                        style={{
                                                                                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                                                                                            background: '#FEF3C7', color: '#92400E', cursor: 'pointer', fontSize: '14px',
                                                                        }}
                                                                      >
                                                        {isRtl ? 'رفض' : 'Reject'}
                                                      </button>button>
                                                      <button
                                                                        onClick={() => handleConfirm(selectedWarranty.id)}
                                                                        disabled={actionLoading}
                                                                        style={{
                                                                                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                                                                                            background: '#2563EB', color: 'white', cursor: 'pointer',
                                                                                            fontSize: '14px', fontWeight: 600,
                                                                        }}
                                                                      >
                                                        {actionLoading
                                                                            ? (isRtl ? 'جارٍ التأكيد...' : 'Confirming...')
                                                                            : (isRtl ? 'تأكيد الضمان' : 'Confirm Warranty')}
                                                      </button>button>
                                        </div>div>
                            </div>div>
                  </div>div>
                    )}
              </div>div>
          );
          }</div>border: selectedWarranty?.id === w.id ? '2px solid #2563EB' : '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '20px',
                background: 'white',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '18px' }}>📄</span>
                    <span style={{ fontWeight: 600, fontSize: '16px', color: '#0F172A' }}>
                      {w.product_name || (isRtl ? 'مستند غير محدد' : 'Unknown Document')}
                    </span>
                  </div>
                  {w.brand && (
                    <span style={{ color: '#64748B', fontSize: '14px' }}>{w.brand}</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'white',
                    background: getConfidenceColor(w.confidence_score),
                  }}>
                    {Math.round(w.confidence_score * 100)}% — {getConfidenceLabel(w.confidence_score)}
                  </span>
                  {w.needs_input_fields.length > 0 && (
                    <div style={{ color: '#F59E0B', fontSize: '12px', marginTop: '4px' }}>
                      {w.needs_input_fields.length} {isRtl ? 'حقول تحتاج مراجعة' : 'fields need review'}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '8px' }}>
                {isRtl ? 'تم الاستلام: ' : 'Received: '}
                {new Date(w.created_at).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail / Confirmation Modal */}
      {selectedWarranty && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', maxWidth: '600px', width: '90%',
            maxHeight: '85vh', overflow: 'auto', padding: '32px',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: '#0F172A' }}>
              {isRtl ? 'مراجعة وتأكيد الضمان' : 'Review & Confirm Warranty'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(fieldLabels).map(([field, labels]) => {
                const value = selectedWarranty[field as keyof ProvisionalWarranty];
                const needsInput = selectedWarranty.needs_input_fields.includes(field);
                return (
                  <div key={field}>
                    <label style={{
                      display: 'block', fontSize: '13px', fontWeight: 600,
                      color: needsInput ? '#F59E0B' : '#374151', marginBottom: '4px',
                    }}>
                      {isRtl ? labels.ar : labels.en}
                      {needsInput && (
                        <span style={{ color: '#EF4444', marginInlineStart: '4px' }}>*</span>
                      )}
                    </label>
                    <input
                      type={field === 'warranty_duration_months' ? 'number' : field.includes('date') ? 'date' : 'text'}
                      defaultValue={value != null ? String(value) : ''}
                      onChange={(e) => setCorrections((prev) => ({
                        ...prev,
                        [field]: field === 'warranty_duration_months'
                          ? parseInt(e.target.value, 10) || 0
                          : e.target.value,
                      }))}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: needsInput ? '2px solid #F59E0B' : '1px solid #D1D5DB',
                        fontSize: '14px', background: needsInput ? '#FFFBEB' : 'white',
                        direction: isRtl ? 'rtl' : 'ltr',
                      }}
                      placeholder={needsInput ? (isRtl ? 'مطلوب' : 'Required') : ''}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{
              display: 'flex', gap: '12px', marginTop: '24px',
              justifyContent: 'flex-end', flexWrap: 'wrap',
            }}>
              <button
                onClick={() => { setSelectedWarranty(null); setCorrections({}); }}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid #D1D5DB',
                  background: 'white', cursor: 'pointer', fontSize: '14px',
                }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleReject(selectedWarranty.id, 'not_warranty')}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: '#FEE2E2', color: '#991B1B', cursor: 'pointer', fontSize: '14px',
                }}
              >
                {isRtl ? 'ليس ضمان' : 'Not a Warranty'}
              </button>
              <button
                onClick={() => handleReject(selectedWarranty.id, 'reject')}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: '#FEF3C7', color: '#92400E', cursor: 'pointer', fontSize: '14px',
                }}
              >
                {isRtl ? 'رفض' : 'Reject'}
              </button>
              <button
                onClick={() => handleConfirm(selectedWarranty.id)}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: '#2563EB', color: 'white', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600,
                }}
              >
                {actionLoading
                  ? (isRtl ? 'جارٍ التأكيد...' : 'Confirming...')
                  : (isRtl ? 'تأكيد الضمان' : 'Confirm Warranty')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
