'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Stats {
  totalUsers: number;
  totalWarranties: number;
  totalCompanies: number;
  totalClaims: number;
  activeWarranties: number;
  expiredWarranties: number;
  pendingClaims: number;
  recentActivity: any[];
}

export default function AdminPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const router = useRouter();
  const isRTL = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'warranties' | 'companies' | 'claims'>('overview');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalWarranties: 0, totalCompanies: 0, totalClaims: 0,
    activeWarranties: 0, expiredWarranties: 0, pendingClaims: 0, recentActivity: [],
  });
  const [users, setUsers] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);

  const t = {
    en: {
      title: 'Admin Panel',
      overview: 'Overview',
      usersTab: 'Users',
      warrantiesTab: 'Warranties',
      companiesTab: 'Companies',
      claimsTab: 'Claims',
      totalUsers: 'Total Users',
      totalWarranties: 'Total Warranties',
      totalCompanies: 'Companies',
      totalClaims: 'Claims',
      active: 'Active',
      expired: 'Expired',
      pending: 'Pending',
      recentActivity: 'Recent Activity',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      joined: 'Joined',
      product: 'Product',
      status: 'Status',
      expiry: 'Expiry',
      company: 'Company',
      cr: 'CR Number',
      members: 'Members',
      type: 'Type',
      date: 'Date',
      unauthorized: 'You do not have admin access.',
      backToDashboard: 'Back to Dashboard',
      noData: 'No data available',
    },
    ar: {
      title: '\u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629',
      overview: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629',
      usersTab: '\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646',
      warrantiesTab: '\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A',
      companiesTab: '\u0627\u0644\u0634\u0631\u0643\u0627\u062A',
      claimsTab: '\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A',
      totalUsers: '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646',
      totalWarranties: '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A',
      totalCompanies: '\u0627\u0644\u0634\u0631\u0643\u0627\u062A',
      totalClaims: '\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A',
      active: '\u0646\u0634\u0637',
      expired: '\u0645\u0646\u062A\u0647\u064A',
      pending: '\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631',
      recentActivity: '\u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u0623\u062E\u064A\u0631',
      name: '\u0627\u0644\u0627\u0633\u0645',
      email: '\u0627\u0644\u0628\u0631\u064A\u062F',
      role: '\u0627\u0644\u062F\u0648\u0631',
      joined: '\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645',
      product: '\u0627\u0644\u0645\u0646\u062A\u062C',
      status: '\u0627\u0644\u062D\u0627\u0644\u0629',
      expiry: '\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629',
      company: '\u0627\u0644\u0634\u0631\u0643\u0629',
      cr: '\u0631\u0642\u0645 \u0627\u0644\u0633\u062C\u0644',
      members: '\u0627\u0644\u0623\u0639\u0636\u0627\u0621',
      type: '\u0627\u0644\u0646\u0648\u0639',
      date: '\u0627\u0644\u062A\u0627\u0631\u064A\u062E',
      unauthorized: '\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644.',
      backToDashboard: '\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645',
      noData: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A',
    },
  };
  const text = t[locale as keyof typeof t] || t.en;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/${locale}/auth`); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin') {
      setAuthorized(true);
      await loadData();
    }
    setLoading(false);
  };

  const loadData = async () => {
    const [usersRes, warrantiesRes, companiesRes, claimsRes, activityRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('warranties').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('warranty_claims').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    const now = new Date().toISOString();
    setUsers(usersRes.data || []);
    setWarranties(warrantiesRes.data || []);
    setCompanies(companiesRes.data || []);
    setClaims(claimsRes.data || []);

    const w = warrantiesRes.data || [];
    const c = claimsRes.data || [];
    setStats({
      totalUsers: (usersRes.data || []).length,
      totalWarranties: w.length,
      totalCompanies: (companiesRes.data || []).length,
      totalClaims: c.length,
      activeWarranties: w.filter(x => x.expiry_date > now && x.status === 'active').length,
      expiredWarranties: w.filter(x => x.expiry_date <= now || x.status === 'expired').length,
      pendingClaims: c.filter(x => x.status === 'pending').length,
      recentActivity: activityRes.data || [],
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <p className="text-gray-600 mb-4">{text.unauthorized}</p>
        <Link href={`/${locale}/dashboard`} className="text-emerald-600 hover:underline">{text.backToDashboard}</Link>
      </div>
    </div>
  );

  const statCards = [
    { label: text.totalUsers, value: stats.totalUsers, color: 'bg-blue-500', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: text.totalWarranties, value: stats.totalWarranties, color: 'bg-emerald-500', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { label: text.totalCompanies, value: stats.totalCompanies, color: 'bg-purple-500', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: text.totalClaims, value: stats.totalClaims, color: 'bg-orange-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  ];

  const tabs = [
    { id: 'overview', label: text.overview },
    { id: 'users', label: text.usersTab },
    { id: 'warranties', label: text.warrantiesTab },
    { id: 'companies', label: text.companiesTab },
    { id: 'claims', label: text.claimsTab },
  ];

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{text.title}</h1>
          <Link href={`/${locale}/dashboard`} className="text-sm text-emerald-600 hover:underline">{text.backToDashboard}</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>{tab.label}</button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-emerald-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-emerald-700">{stats.activeWarranties}</p>
                  <p className="text-xs text-emerald-600">{text.active}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-700">{stats.expiredWarranties}</p>
                  <p className="text-xs text-red-600">{text.expired}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-700">{stats.pendingClaims}</p>
                  <p className="text-xs text-yellow-600">{text.pending}</p>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-3">{text.recentActivity}</h3>
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500">{text.noData}</p>
              ) : (
                <div className="space-y-2">{stats.recentActivity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <p className="text-sm text-gray-700 flex-1">{a.action}</p>
                    <p className="text-xs text-gray-400">{fmtDate(a.created_at)}</p>
                  </div>
                ))}</div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.name}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.email}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.role}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.joined}</th>
                </tr></thead>
                <tbody className="divide-y">{users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.full_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email || '-'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">{u.role || 'user'}</span></td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(u.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {activeTab === 'warranties' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.product}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.status}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.expiry}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.date}</th>
                </tr></thead>
                <tbody className="divide-y">{warranties.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{w.product_name || '-'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${w.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(w.expiry_date)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(w.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.company}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.cr}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.date}</th>
                </tr></thead>
                <tbody className="divide-y">{companies.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{c.cr_number || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {activeTab === 'claims' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.type}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.status}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{text.date}</th>
                </tr></thead>
                <tbody className="divide-y">{claims.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.claim_type || '-'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${
                      c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>{c.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}