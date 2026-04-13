'use client';

// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  ArrowLeft, CheckSquare, Trash2, RefreshCw, Edit3,
  AlertTriangle, Check, X, Loader2
} from 'lucide-react';

const supabase = createSupabaseBrowserClient();

const translations = {
  en: {
    title: 'Bulk Operations',
    subtitle: 'Manage multiple warranties at once',
    back: 'Back to Warranties',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    selected: 'selected',
    bulkUpdateStatus: 'Update Status',
    bulkDelete: 'Delete Selected',
    bulkExtend: 'Extend Selected',
    confirmDelete: 'Are you sure you want to delete the selected warranties? This action cannot be undone.',
    newStatus: 'New Status',
    active: 'Active',
    expired: 'Expired',
    pending: 'Pending',
    cancelled: 'Cancelled',
    extensionDays: 'Extension (days)',
    apply: 'Apply',
    cancel: 'Cancel',
    success: 'Operation completed successfully',
    error: 'An error occurred',
    product: 'Product',
    status: 'Status',
    endDate: 'End Date',
    noWarranties: 'No warranties found.',
    loading: 'Loading...',
    processing: 'Processing...',
  },
  ar: {
    title: '\u0639\u0645\u0644\u064a\u0627\u062a \u062c\u0645\u0627\u0639\u064a\u0629',
    subtitle: '\u0625\u062f\u0627\u0631\u0629 \u0639\u062f\u0629 \u0636\u0645\u0627\u0646\u0627\u062a \u0641\u064a \u0648\u0642\u062a \u0648\u0627\u062d\u062f',
    back: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    selectAll: '\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0643\u0644',
    deselectAll: '\u0625\u0644\u063a\u0627\u0621 \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0643\u0644',
    selected: '\u0645\u062d\u062f\u062f',
    bulkUpdateStatus: '\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629',
    bulkDelete: '\u062d\u0630\u0641 \u0627\u0644\u0645\u062d\u062f\u062f',
    bulkExtend: '\u062a\u0645\u062f\u064a\u062f \u0627\u0644\u0645\u062d\u062f\u062f',
    confirmDelete: '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062d\u062f\u062f\u0629\u061f',
    newStatus: '\u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u062c\u062f\u064a\u062f\u0629',
    active: '\u0646\u0634\u0637',
    expired: '\u0645\u0646\u062a\u0647\u064a',
    pending: '\u0645\u0639\u0644\u0642',
    cancelled: '\u0645\u0644\u063a\u0649',
    extensionDays: '\u0627\u0644\u062a\u0645\u062f\u064a\u062f (\u0623\u064a\u0627\u0645)',
    apply: '\u062a\u0637\u0628\u064a\u0642',
    cancel: '\u0625\u0644\u063a\u0627\u0621',
    success: '\u062a\u0645\u062a \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0628\u0646\u062c\u0627\u062d',
    error: '\u062d\u062f\u062b \u062e\u0637\u0623',
    product: '\u0627\u0644\u0645\u0646\u062a\u062c',
    status: '\u0627\u0644\u062d\u0627\u0644\u0629',
    endDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621',
    noWarranties: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0645\u0627\u0646\u0627\u062a.',
    loading: '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...',
    processing: '\u062c\u0627\u0631\u064a \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629...',
  }
};

type BulkAction = 'none' | 'status' | 'delete' | 'extend';

export default function BulkOperationsPage() {
  const params = useParams() ?? {};
  const locale = (params?.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [warranties, setWarranties] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [action, setAction] = useState<BulkAction>('none');
  const [newStatus, setNewStatus] = useState('active');
  const [extDays, setExtDays] = useState(30);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchWarranties = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('warranties').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setWarranties(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWarranties(); }, [fetchWarranties]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === warranties.length) setSelected(new Set());
    else setSelected(new Set(warranties.map(w => w.id)));
  };

  const handleBulkStatus = async () => {
    setProcessing(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase.from('warranties').update({ status: newStatus }).in('id', ids);
      if (error) throw error;
      setMessage({ type: 'success', text: t.success });
      setAction('none');
      setSelected(new Set());
      fetchWarranties();
    } catch { setMessage({ type: 'error', text: t.error }); }
    finally { setProcessing(false); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(t.confirmDelete)) return;
    setProcessing(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase.from('warranties').delete().in('id', ids);
      if (error) throw error;
      setMessage({ type: 'success', text: t.success });
      setSelected(new Set());
      fetchWarranties();
    } catch { setMessage({ type: 'error', text: t.error }); }
    finally { setProcessing(false); setAction('none'); }
  };

  const handleBulkExtend = async () => {
    setProcessing(true);
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        const w = warranties.find(w => w.id === id);
        if (w) {
          const newEnd = new Date(w.end_date);
          newEnd.setDate(newEnd.getDate() + extDays);
          await supabase.from('warranties').update({ end_date: newEnd.toISOString().split('T')[0] }).eq('id', id);
        }
      }
      setMessage({ type: 'success', text: t.success });
      setAction('none');
      setSelected(new Set());
      fetchWarranties();
    } catch { setMessage({ type: 'error', text: t.error }); }
    finally { setProcessing(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4169E1]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href={`/${locale}/warranties`} className="text-[#4169E1] hover:underline flex items-center gap-2 mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
          <button onClick={toggleAll} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            {selected.size === warranties.length ? t.deselectAll : t.selectAll}
          </button>
          <span className="text-sm text-gray-500">{selected.size} {t.selected}</span>
          <div className="flex-1" />
          <button onClick={() => setAction('status')} disabled={selected.size === 0}
            className="px-3 py-2 bg-[#4169E1] text-white rounded-lg hover:bg-[#3457c9] disabled:opacity-50 text-sm flex items-center gap-2">
            <Edit3 className="w-4 h-4" /> {t.bulkUpdateStatus}
          </button>
          <button onClick={() => setAction('extend')} disabled={selected.size === 0}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> {t.bulkExtend}
          </button>
          <button onClick={() => { setAction('delete'); handleBulkDelete(); }} disabled={selected.size === 0}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> {t.bulkDelete}
          </button>
        </div>

        {/* Action Modal */}
        {(action === 'status' || action === 'extend') && (
          <div className="bg-white rounded-xl shadow-sm border border-[#4169E1]/30 p-6 mb-6">
            {action === 'status' && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">{t.newStatus}</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="active">{t.active}</option>
                  <option value="expired">{t.expired}</option>
                  <option value="pending">{t.pending}</option>
                  <option value="cancelled">{t.cancelled}</option>
                </select>
                <button onClick={handleBulkStatus} disabled={processing}
                  className="px-4 py-2 bg-[#4169E1] text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {processing && <Loader2 className="w-4 h-4 animate-spin" />} {t.apply}
                </button>
                <button onClick={() => setAction('none')} className="px-4 py-2 border border-gray-300 rounded-lg">{t.cancel}</button>
              </div>
            )}
            {action === 'extend' && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">{t.extensionDays}</label>
                <input type="number" value={extDays} onChange={e => setExtDays(parseInt(e.target.value) || 0)} min={1} max={365}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg" />
                <button onClick={handleBulkExtend} disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {processing && <Loader2 className="w-4 h-4 animate-spin" />} {t.apply}
                </button>
                <button onClick={() => setAction('none')} className="px-4 py-2 border border-gray-300 rounded-lg">{t.cancel}</button>
              </div>
            )}
          </div>
        )}

        {/* Warranty Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {warranties.length === 0 ? (
            <p className="text-gray-400 text-center py-12">{t.noWarranties}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t.product}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t.status}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t.endDate}</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map(w => (
                  <tr key={w.id} className={`border-b border-gray-50 hover:bg-gray-50 ${selected.has(w.id) ? 'bg-[#4169E1]/5' : ''}`}>
                    <td className="py-3 px-4">
                      <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggleSelect(w.id)}
                        className="w-4 h-4 text-[#4169E1] rounded border-gray-300" />
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{w.product_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        w.status === 'active' ? 'bg-green-100 text-green-700' :
                        w.status === 'expired' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{w.status}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{w.end_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
