// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft, Download, FileText, FileSpreadsheet, Calendar,
  Filter, BarChart3, Table
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://erptubrslnfmkuouczgn.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const translations = {
  en: {
    title: 'Reports',
    subtitle: 'Generate and export warranty reports',
    back: 'Back to Dashboard',
    reportType: 'Report Type',
    allWarranties: 'All Warranties',
    activeOnly: 'Active Only',
    expiredOnly: 'Expired Only',
    expiringNext30: 'Expiring in 30 Days',
    claimsReport: 'Claims Report',
    dateRange: 'Date Range',
    from: 'From',
    to: 'To',
    generate: 'Generate Report',
    exportCSV: 'Export CSV',
    exportJSON: 'Export JSON',
    preview: 'Report Preview',
    totalRecords: 'Total Records',
    product: 'Product',
    status: 'Status',
    startDate: 'Start Date',
    endDate: 'End Date',
    supplier: 'Supplier',
    category: 'Category',
    noData: 'No records found for the selected filters.',
    loading: 'Generating report...',
    generated: 'Report generated successfully',
  },
  ar: {
    title: '\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631',
    subtitle: '\u0625\u0646\u0634\u0627\u0621 \u0648\u062a\u0635\u062f\u064a\u0631 \u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    back: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
    reportType: '\u0646\u0648\u0639 \u0627\u0644\u062a\u0642\u0631\u064a\u0631',
    allWarranties: '\u062c\u0645\u064a\u0639 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    activeOnly: '\u0627\u0644\u0646\u0634\u0637\u0629 \u0641\u0642\u0637',
    expiredOnly: '\u0627\u0644\u0645\u0646\u062a\u0647\u064a\u0629 \u0641\u0642\u0637',
    expiringNext30: '\u062a\u0646\u062a\u0647\u064a \u062e\u0644\u0627\u0644 30 \u064a\u0648\u0645',
    claimsReport: '\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a',
    dateRange: '\u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u0632\u0645\u0646\u064a',
    from: '\u0645\u0646',
    to: '\u0625\u0644\u0649',
    generate: '\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u0642\u0631\u064a\u0631',
    exportCSV: '\u062a\u0635\u062f\u064a\u0631 CSV',
    exportJSON: '\u062a\u0635\u062f\u064a\u0631 JSON',
    preview: '\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u062a\u0642\u0631\u064a\u0631',
    totalRecords: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u062c\u0644\u0627\u062a',
    product: '\u0627\u0644\u0645\u0646\u062a\u062c',
    status: '\u0627\u0644\u062d\u0627\u0644\u0629',
    startDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629',
    endDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621',
    supplier: '\u0627\u0644\u0645\u0648\u0631\u062f',
    category: '\u0627\u0644\u0641\u0626\u0629',
    noData: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a.',
    loading: '\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u0642\u0631\u064a\u0631...',
    generated: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0628\u0646\u062c\u0627\u062d',
  }
};

type ReportType = 'all' | 'active' | 'expired' | 'expiring30' | 'claims';

export default function ReportsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [reportType, setReportType] = useState<ReportType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();

      if (reportType === 'claims') {
        const { data } = await supabase.from('claims').select('*, warranties(product_name)');
        setRecords(data || []);
      } else {
        let query = supabase.from('warranties').select('*').eq('user_id', user.id);
        if (dateFrom) query = query.gte('start_date', dateFrom);
        if (dateTo) query = query.lte('end_date', dateTo);

        const { data } = await query;
        let filtered = data || [];

        if (reportType === 'active') {
          filtered = filtered.filter(w => new Date(w.end_date) > now);
        } else if (reportType === 'expired') {
          filtered = filtered.filter(w => new Date(w.end_date) <= now);
        } else if (reportType === 'expiring30') {
          const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(w => {
            const end = new Date(w.end_date);
            return end > now && end <= thirtyDays;
          });
        }
        setRecords(filtered);
      }
      setGenerated(true);
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  }, [reportType, dateFrom, dateTo]);

  const exportCSV = () => {
    if (records.length === 0) return;
    const headers = reportType === 'claims'
      ? ['id', 'warranty_id', 'claim_type', 'description', 'status', 'created_at']
      : ['id', 'product_name', 'serial_number', 'reference_number', 'category', 'supplier', 'start_date', 'end_date', 'status', 'purchase_price'];
    const rows = records.map(r => headers.map(h => r[h] || ''));
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warrantee-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (records.length === 0) return;
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warrantee-report-${reportType}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/${locale}/dashboard`} className="text-[#4169E1] hover:underline flex items-center gap-2 mb-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> {t.back}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-500 mt-1">{t.subtitle}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.reportType}</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1] focus:border-transparent"
              >
                <option value="all">{t.allWarranties}</option>
                <option value="active">{t.activeOnly}</option>
                <option value="expired">{t.expiredOnly}</option>
                <option value="expiring30">{t.expiringNext30}</option>
                <option value="claims">{t.claimsReport}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.from}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.to}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4169E1]" />
            </div>
            <div className="flex items-end">
              <button onClick={generateReport} disabled={loading}
                className="w-full px-4 py-2 bg-[#4169E1] text-white rounded-lg hover:bg-[#3457c9] disabled:opacity-50 flex items-center justify-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {loading ? t.loading : t.generate}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {generated && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">{t.preview}</h3>
                <span className="bg-[#4169E1]/10 text-[#4169E1] px-3 py-1 rounded-full text-sm">
                  {records.length} {t.totalRecords}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  <FileSpreadsheet className="w-4 h-4" /> {t.exportCSV}
                </button>
                <button onClick={exportJSON} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  <FileText className="w-4 h-4" /> {t.exportJSON}
                </button>
              </div>
            </div>

            {records.length === 0 ? (
              <p className="text-gray-400 text-center py-12">{t.noData}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {reportType === 'claims' ? (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">ID</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">{t.status}</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">{t.product}</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">{t.category}</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">{t.supplier}</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">{t.startDate}</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">{t.endDate}</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">{t.status}</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        {reportType === 'claims' ? (
                          <>
                            <td className="py-3 px-4 text-gray-600">{r.id?.substring(0, 8)}</td>
                            <td className="py-3 px-4 text-gray-900">{r.claim_type}</td>
                            <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{r.description}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span></td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 text-gray-900 font-medium">{r.product_name}</td>
                            <td className="py-3 px-4 text-gray-600">{r.category || '-'}</td>
                            <td className="py-3 px-4 text-gray-600">{r.supplier || '-'}</td>
                            <td className="py-3 px-4 text-gray-600">{r.start_date}</td>
                            <td className="py-3 px-4 text-gray-600">{r.end_date}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs ${new Date(r.end_date) > new Date() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{new Date(r.end_date) > new Date() ? 'Active' : 'Expired'}</span></td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
