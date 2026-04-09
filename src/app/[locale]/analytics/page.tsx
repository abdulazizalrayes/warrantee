// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from 'lucide-react';

const supabase = createSupabaseBrowserClient();

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
    title: 'Analytics',
    subtitle: 'Comprehensive warranty analytics and insights',
    overview: 'Overview',
    totalWarranties: 'Total Warranties',
    active: 'Active',
    expired: 'Expired',
    expiringThisMonth: 'Expiring Soon',
    totalClaims: 'Total Claims',
    pendingClaims: 'Pending Claims',
    avgDuration: 'Avg Duration',
    coverageValue: 'Coverage Value',
    categoryBreakdown: 'Categories',
    monthlyTrend: 'Monthly Trend',
    statusDistribution: 'Status Distribution',
    topSuppliers: 'Top Suppliers',
    exportReport: 'Export',
    noData: 'No data available yet. Add warranties to see analytics.',
    loading: 'Loading analytics...',
    warranties: 'warranties',
    created: 'Created',
    expiredLabel: 'Expired',
    claims: 'claims',
    days: 'days',
  },
  ar: {
    title: '\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a',
    subtitle: '\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0634\u0627\u0645\u0644\u0629 \u0644\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    overview: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629',
    totalWarranties: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
    active: '\u0646\u0634\u0637',
    expired: '\u0645\u0646\u062a\u0647\u064a',
    expiringThisMonth: '\u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b',
    totalClaims: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a',
    pendingClaims: '\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0645\u0639\u0644\u0642\u0629',
    avgDuration: '\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0645\u062f\u0629',
    coverageValue: '\u0642\u064a\u0645\u0629 \u0627\u0644\u062a\u063a\u0637\u064a\u0629',
    categoryBreakdown: '\u0627\u0644\u0641\u0626\u0627\u062a',
    monthlyTrend: '\u0627\u0644\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0634\u0647\u0631\u064a',
    statusDistribution: '\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u062d\u0627\u0644\u0629',
    topSuppliers: '\u0623\u0647\u0645 \u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646',
    exportReport: '\u062a\u0635\u062f\u064a\u0631',
    noData: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0639\u062f. \u0623\u0636\u0641 \u0636\u0645\u0627\u0646\u0627\u062a \u0644\u0639\u0631\u0636 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a.',
    loading: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a...',
    warranties: '\u0636\u0645\u0627\u0646\u0627\u062a',
    created: '\u0645\u0646\u0634\u0623\u0629',
    expiredLabel: '\u0645\u0646\u062a\u0647\u064a\u0629',
    claims: '\u0645\u0637\u0627\u0644\u0628\u0627\u062a',
    days: '\u064a\u0648\u0645',
  },
};

const COLORS = ['#0071e3', '#30d158', '#ff9f0a', '#ff3b30', '#bf5af2', '#ff375f', '#64d2ff', '#30d158'];

const statusColors: Record<string, { dot: string; bg: string; text: string }> = {
  active: { dot: 'bg-[#30d158]', bg: 'bg-[#e8f9ed]', text: 'text-[#1d7a34]' },
  pending: { dot: 'bg-[#ff9f0a]', bg: 'bg-[#fff6e5]', text: 'text-[#7a5a00]' },
  expired: { dot: 'bg-[#ff3b30]', bg: 'bg-[#feeeed]', text: 'text-[#7a1d1d]' },
  draft: { dot: 'bg-[#86868b]', bg: 'bg-[#f5f5f7]', text: 'text-[#48484a]' },
  claimed: { dot: 'bg-[#0071e3]', bg: 'bg-[#e5f1ff]', text: 'text-[#003d7a]' },
};

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

      const { data: claims } = await supabase.from('claims').select('*');

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
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      const catMap: Record<string, number> = {};
      warranties.forEach(w => {
        const cat = w.category || 'Uncategorized';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      const categoryBreakdown = Object.entries(catMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      const statusMap: Record<string, number> = {};
      warranties.forEach(w => {
        const status = w.status || 'active';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      const statusBreakdown = Object.entries(statusMap)
        .map(([status, count]) => ({ status, count }));

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

      const suppMap: Record<string, number> = {};
      warranties.forEach(w => {
        if (w.supplier) suppMap[w.supplier] = (suppMap[w.supplier] || 0) + 1;
      });
      const topSuppliers = Object.entries(suppMap)
        .map(([supplier, count]) => ({ supplier, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      const coverageValue = warranties.reduce((sum, w) => sum + (parseFloat(w.purchase_price) || 0), 0);

      setData({
        totalWarranties: warranties.length,
        activeWarranties: active.length,
        expiredWarranties: expired.length,
        expiringThisMonth: expiringThisMonth.length,
        totalClaims: claims?.length || 0,
        pendingClaims: claims?.filter(c => c.status === 'pending').length || 0,
        avgWarrantyDuration: avgDuration,
        categoryBreakdown, monthlyTrend, statusBreakdown, topSuppliers, coverageValue,
      });
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const maxBarValue = data
    ? Math.max(...data.monthlyTrend.map(m => Math.max(m.created, m.expired)), 1) : 1;

  const kpiCards = data ? [
    { icon: BarChart3, label: t.totalWarranties, value: data.totalWarranties, iconColor: 'text-[#0071e3]', iconBg: 'bg-[#e5f1ff]' },
    { icon: CheckCircle2, label: t.active, value: data.activeWarranties, iconColor: 'text-[#30d158]', iconBg: 'bg-[#e8f9ed]' },
    { icon: TrendingDown, label: t.expired, value: data.expiredWarranties, iconColor: 'text-[#ff3b30]', iconBg: 'bg-[#feeeed]' },
    { icon: AlertTriangle, label: t.expiringThisMonth, value: data.expiringThisMonth, iconColor: 'text-[#ff9f0a]', iconBg: 'bg-[#fff6e5]' },
    { icon: Activity, label: t.totalClaims, value: data.totalClaims, iconColor: 'text-[#bf5af2]', iconBg: 'bg-[#f3e8ff]' },
    { icon: Clock, label: t.pendingClaims, value: data.pendingClaims, iconColor: 'text-[#ff9f0a]', iconBg: 'bg-[#fff6e5]' },
    { icon: Calendar, label: t.avgDuration, value: data.avgWarrantyDuration + ' ' + t.days, iconColor: 'text-[#0071e3]', iconBg: 'bg-[#e5f1ff]' },
    { icon: TrendingUp, label: t.coverageValue, value: 'SAR ' + data.coverageValue.toLocaleString(), iconColor: 'text-[#30d158]', iconBg: 'bg-[#e8f9ed]' },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
            {t.title}
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">{t.subtitle}</p>
        </div>
        <Link
          href={`/${locale}/reports`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[15px] font-medium rounded-full transition-colors w-fit"
        >
          <Download size={16} />
          {t.exportReport}
        </Link>
      </div>

      {!data || data.totalWarranties === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={24} className="text-[#86868b]" />
          </div>
          <p className="text-[15px] font-medium text-[#1d1d1f]">{t.noData}</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card, i) => (
              <div key={i} className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-medium text-[#86868b]">{card.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                    <card.icon size={16} className={card.iconColor} />
                  </div>
                </div>
                <p className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Trend */}
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-6">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-6">{t.monthlyTrend}</h3>
              <div className="space-y-4">
                {data.monthlyTrend.map((m, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#1d1d1f] font-medium">{m.month}</span>
                      <span className="text-[#86868b]">{m.created} {t.created} / {m.expired} {t.expiredLabel}</span>
                    </div>
                    <div className="flex gap-1 h-5">
                      <div
                        className="bg-[#0071e3] rounded transition-all duration-500"
                        style={{ width: `${(m.created / maxBarValue) * 50}%` }}
                      />
                      <div
                        className="bg-[#ff3b30]/60 rounded transition-all duration-500"
                        style={{ width: `${(m.expired / maxBarValue) * 50}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-6 mt-5 text-[12px] text-[#86868b]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-[#0071e3] rounded" />
                  {t.created}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-[#ff3b30]/60 rounded" />
                  {t.expiredLabel}
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-6">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-6">{t.categoryBreakdown}</h3>
              <div className="space-y-4">
                {data.categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-[14px] font-medium text-[#1d1d1f]">{cat.category}</span>
                        <span className="text-[13px] text-[#86868b]">{cat.count} {t.warranties}</span>
                      </div>
                      <div className="w-full bg-[#f5f5f7] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${(cat.count / data.totalWarranties) * 100}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Distribution */}
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-6">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-6">{t.statusDistribution}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.statusBreakdown.map((s, i) => {
                  const sc = statusColors[s.status] || statusColors.active;
                  return (
                    <div key={i} className={`rounded-xl p-4 ${sc.bg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        <span className={`text-[12px] font-medium capitalize ${sc.text}`}>{s.status}</span>
                      </div>
                      <p className={`text-[24px] font-semibold tracking-tight ${sc.text}`}>{s.count}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Suppliers */}
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-6">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-6">{t.topSuppliers}</h3>
              {data.topSuppliers.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-3">
                    <Shield size={20} className="text-[#86868b]" />
                  </div>
                  <p className="text-[13px] text-[#86868b]">No supplier data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topSuppliers.map((s, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between py-3 ${
                        i < data.topSuppliers.length - 1 ? 'border-b border-[#f5f5f7]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-[#1A1A2E] text-white rounded-lg flex items-center justify-center text-[12px] font-semibold">
                          {i + 1}
                        </span>
                        <span className="text-[14px] font-medium text-[#1d1d1f]">{s.supplier}</span>
                      </div>
                      <span className="text-[13px] text-[#86868b]">{s.count} {t.warranties}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
