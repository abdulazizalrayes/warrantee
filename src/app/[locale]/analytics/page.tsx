'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  BarChart3, TrendingUp, TrendingDown, Calendar, Download,
  ArrowLeft, Activity, Clock, AlertTriangle, CheckCircle2
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://erptubrslnfmkuouczgn.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface AnalyticsData {
  totalWarranties: number;
  activeWarranties: number;
  expiredWarranties: number;
  expiringThisMonth: number;
  totalClaims: number;
  pendingClaims: number;
  avgWarrantyDuration: number;
  categoryBreakdown: { category: string; count: number }[];
  monthlyTrend: { month: string; created: number; expired: number }[];
  statusBreakdown: { status: string; count: number }[];
  topSuppliers: { supplier: string; count: number }[];
  coverageValue: number;
}

const translations = {
  en: {
    title: 'Analytics Dashboard',
    subtitle: 'Comprehensive warranty analytics and insights',
    back: 'Back to Dashboard',
    overview: 'Overview',
    totalWarranties: 'Total Warranties',
    active: 'Active',
    expired: 'Expired',
    expiringThisMonth: 'Expiring This Month',
    totalClaims: 'Total Claims',
    pendingClaims: 'Pending Claims',
    avgDuration: 'Avg Duration (days)',
    coverageValue: 'Total Coverage Value',
    categoryBreakdown: 'Category Breakdown',
    monthlyTrend: 'Monthly Trend',
    statusDistribution: 'Status Distribution',
    topSuppliers: 'Top Suppliers',
    exportReport: 'Export Report',
    noData: 'No data available yet. Add warranties to see analytics.',
    loading: 'Loading analytics...',
    warranties: 'warranties',
    created: 'Created',
    expiredLabel: 'Expired',
    claims: 'claims',
  },
  ar: {
    title: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a',
    subtitle: '\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0634\u0627\u0645\u0644\u0629 \u0644\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    back: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
    overview: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629',
    totalWarranties: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    active: '\u0646\u0634\u0637',
    expired: '\u0645\u0646\u062a\u0647\u064a',
    expiringThisMonth: '\u062a\u0646\u062a\u0647\u064a \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631',
    totalClaims: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a',
    pendingClaims: '\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0645\u0639\u0644\u0642\u0629',
    avgDuration: '\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0645\u062f\u0629 (\u0623\u064a\u0627\u0645)',
    coverageValue: '\u0625\u062c\u0645\u0627\u0644\u064a \u0642\u064a\u0645\u0629 \u0627\u0644\u062a\u063a\u0637\u064a\u0629',
    categoryBreakdown: '\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u0641\u0626\u0627\u062a',
    monthlyTrend: '\u0627\u0644\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0634\u0647\u0631\u064a',
    statusDistribution: '\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u062d\u0627\u0644\u0629',
    topSuppliers: '\u0623\u0647\u0645 \u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646',
    exportReport: '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u062a\u0642\u0631\u064a\u0631',
    noData: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0639\u062f. \u0623\u0636\u0641 \u0636\u0645\u0627\u0646\u0627\u062a \u0644\u0639\u0631\u0636 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a.',
    loading: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a...',
    warranties: '\u0636\u0645\u0627\u0646\u0627\u062a',
    created: '\u0645\u0646\u0634\u0623\u0629',
    expiredLabel: '\u0645\u0646\u062a\u0647\u064a\u0629',
    claims: '\u0645\u0637\u0627\u0644\u0628\u0627\u062a',
  }
};

const COLORS = ['#4169E1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function AnalyticsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const isRTL = locale === 'ar';
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: warranties } = await supabase
        .from('warranties')
        .select('*')
        .eq('user_id', user.id);

      const { data: claims } = await supabase
        .from('claims')
        .select('*');

      if (!warranties) { setLoading(false); return; }

      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const active = warranties.filter(w => new Date(w.end_date) > now);
      const expired = warranties.filter(w => new Date(w.end_date) <= now);
      const expiringThisMonth = warranties.filter(w => {
        const end = new Date(w.end_date);
        return end > now && end <= endOfMonth;
      });

      const durations = warranties.map(w => {
        const start = new Date(w.start_date);
        const end = new Date(w.end_date);
        return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      });
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      // Category breakdown
      const catMap: Record<string, number> = {};
      warranties.forEach(w => {
        const cat = w.category || 'Uncategorized';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      const categoryBreakdown = Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

      // Status breakdown
      const statusMap: Record<string, number> = {};
      warranties.forEach(w => {
        const status = w.status || 'active';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

      // Monthly trend (last 6 months)
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthStr = d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' });
        const created = warranties.filter(w => {
          const cd = new Date(w.created_at);
          return cd >= d && cd <= monthEnd;
        }).length;
        const expiredCount = warranties.filter(w => {
          const ed = new Date(w.end_date);
          return ed >= d && ed <= monthEnd;
        }).length;
        monthlyTrend.push({ month: monthStr, created, expired: expiredCount });
      }

      // Top suppliers
      const suppMap: Record<string, number> = {};
      warranties.forEach(w => {
        if (w.supplier) suppMap[w.supplier] = (suppMap[w.supplier] || 0) + 1;
      });
      const topSuppliers = Object.entries(suppMap).map(([supplier, count]) => ({ supplier, count })).sort((a, b) => b.count - a.count).slice(0, 5);

      const coverageValue = warranties.reduce((sum, w) => sum + (parseFloat(w.purchase_price) || 0), 0);

      setData({
        totalWarranties: warranties.length,
        activeWarranties: active.length,
        expiredWarranties: expired.length,
        expiringThisMonth: expiringThisMonth.length,
        totalClaims: claims?.length || 0,
        pendingClaims: claims?.filter(c => c.status === 'pending').length || 0,
        avgWarrantyDuration: avgDuration,
        categoryBreakdown,
        monthlyTrend,
        statusBreakdown,
        topSuppliers,
        coverageValue,
      });
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const maxBarValue = data ? Math.max(...data.monthlyTrend.map(m => Math.max(m.created, m.expired)), 1) : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4169E1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/${locale}/dashboard`} className="text-[#4169E1] hover:underline flex items-center gap-2 mb-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> {t.back}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-500 mt-1">{t.subtitle}</p>
          </div>
          <Link
            href={`/${locale}/reports`}
            className="flex items-center gap-2 px-4 py-2 bg-[#4169E1] text-white rounded-lg hover:bg-[#3457c9] transition"
          >
            <Download className="w-4 h-4" />
            {t.exportReport}
          </Link>
        </div>

        {!data || data.totalWarranties === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t.noData}</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">{t.totalWarranties}</span>
                  <BarChart3 className="w-5 h-5 text-[#4169E1]" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{data.totalWarranties}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">{t.active}</span>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-green-600">{data.activeWarranties}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">{t.expired}</span>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-red-600">{data.expiredWarranties}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">{t.expiringThisMonth}</span>
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-yellow-600">{data.expiringThisMonth}</p>
              </div>
            </div>

            {/* Second Row KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">{t.totalClaims}</span>
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{data.totalClaims}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">{t.pendingClaims}</span>
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-orange-600">{data.pendingClaims}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">{t.avgDuration}</span>
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{data.avgWarrantyDuration}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">{t.coverageValue}</span>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">SAR {data.coverageValue.toLocaleString()}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Monthly Trend Bar Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">{t.monthlyTrend}</h3>
                <div className="space-y-4">
                  {data.monthlyTrend.map((m, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{m.month}</span>
                        <span>{m.created} {t.created} / {m.expired} {t.expiredLabel}</span>
                      </div>
                      <div className="flex gap-1 h-6">
                        <div
                          className="bg-[#4169E1] rounded-sm transition-all duration-500"
                          style={{ width: `${(m.created / maxBarValue) * 50}%` }}
                          title={`${t.created}: ${m.created}`}
                        />
                        <div
                          className="bg-red-400 rounded-sm transition-all duration-500"
                          style={{ width: `${(m.expired / maxBarValue) * 50}%` }}
                          title={`${t.expiredLabel}: ${m.expired}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#4169E1] rounded-sm" /> {t.created}</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-sm" /> {t.expiredLabel}</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">{t.categoryBreakdown}</h3>
                <div className="space-y-4">
                  {data.categoryBreakdown.map((cat, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                          <span className="text-sm text-gray-500">{cat.count} {t.warranties}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(cat.count / data.totalWarranties) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">{t.statusDistribution}</h3>
                <div className="flex flex-wrap gap-4">
                  {data.statusBreakdown.map((s, i) => (
                    <div key={i} className="flex-1 min-w-[120px] bg-gray-50 rounded-lg p-4 text-center">
                      <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                      <p className="text-xs text-gray-500 capitalize">{s.status}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Suppliers */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">{t.topSuppliers}</h3>
                {data.topSuppliers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No supplier data</p>
                ) : (
                  <div className="space-y-3">
                    {data.topSuppliers.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-[#4169E1] text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          <span className="text-sm font-medium text-gray-700">{s.supplier}</span>
                        </div>
                        <span className="text-sm text-gray-500">{s.count} {t.warranties}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
