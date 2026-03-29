// @ts-nocheck
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

type TabId = 'overview' | 'users' | 'warranties' | 'companies' | 'claims' | 'team' | 'audit';

export default function AdminPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';
  const router = useRouter();
  const isRTL = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalWarranties: 0, totalCompanies: 0, totalClaims: 0,
    activeWarranties: 0, expiredWarranties: 0, pendingClaims: 0, recentActivity: [],
  });
  const [users, setUsers] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);

  // Team management state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'support'>('admin');
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamMsg, setTeamMsg] = useState('');
  const [teamError, setTeamError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; name: string } | null>(null);

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const isSuperAdmin = currentUserRole === 'super_admin';

  const t = {
    en: {
      title: 'Admin Panel', overview: 'Overview', usersTab: 'Users', warrantiesTab: 'Warranties',
      companiesTab: 'Companies', claimsTab: 'Claims', teamTab: 'Team', auditTab: 'Audit Trail',
      totalUsers: 'Total Users', totalWarranties: 'Total Warranties', totalCompanies: 'Companies',
      totalClaims: 'Claims', active: 'Active', expired: 'Expired', pending: 'Pending',
      recentActivity: 'Recent Activity', name: 'Name', email: 'Email', role: 'Role',
      joined: 'Joined', product: 'Product', status: 'Status', expiry: 'Expiry',
      company: 'Company', cr: 'CR Number', type: 'Type', date: 'Date',
      unauthorized: 'You do not have admin access.', backToDashboard: 'Back to Dashboard',
      noData: 'No data available', actions: 'Actions',
      // Team tab
      teamTitle: 'Team Management', addAdmin: 'Add Team Member', emailPlaceholder: 'Enter email address',
      invite: 'Add', removeAccess: 'Remove', changeRole: 'Change Role', confirmRemove: 'Confirm Remove',
      confirmRemoveMsg: 'Remove admin access for', cancel: 'Cancel', confirm: 'Confirm',
      promoted: 'User promoted successfully', demoted: 'Admin access removed', inviteSent: 'Team member added',
      userNotFound: 'No account found with this email. They must sign up first.',
      alreadyAdmin: 'This user is already an admin.', cannotRemoveSelf: 'You cannot remove your own access.',
      cannotRemoveSuper: 'Cannot modify the super admin.', superAdmin: 'Super Admin', admin: 'Admin',
      support: 'Support', user: 'User', makeAdmin: 'Make Admin', makeSupport: 'Make Support',
      demoteToUser: 'Demote to User',
      // Audit tab
      auditTitle: 'Audit Trail', actor: 'Actor', action: 'Action', target: 'Target',
      details: 'Details', timestamp: 'Timestamp', riskLevel: 'Risk', noAuditLogs: 'No audit logs yet.',
      high: 'High', medium: 'Medium', low: 'Low',
    },
    ar: {
      title: '\u0644\u0648\u062d\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629', overview: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629',
      usersTab: '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646', warrantiesTab: '\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
      companiesTab: '\u0627\u0644\u0634\u0631\u0643\u0627\u062a', claimsTab: '\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a',
      teamTab: '\u0627\u0644\u0641\u0631\u064a\u0642', auditTab: '\u0633\u062c\u0644 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629',
      totalUsers: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646',
      totalWarranties: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a',
      totalCompanies: '\u0627\u0644\u0634\u0631\u0643\u0627\u062a', totalClaims: '\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a',
      active: '\u0646\u0634\u0637', expired: '\u0645\u0646\u062a\u0647\u064a', pending: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631',
      recentActivity: '\u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u0623\u062e\u064a\u0631',
      name: '\u0627\u0644\u0627\u0633\u0645', email: '\u0627\u0644\u0628\u0631\u064a\u062f', role: '\u0627\u0644\u062f\u0648\u0631',
      joined: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645', product: '\u0627\u0644\u0645\u0646\u062a\u062c',
      status: '\u0627\u0644\u062d\u0627\u0644\u0629', expiry: '\u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629',
      company: '\u0627\u0644\u0634\u0631\u0643\u0629', cr: '\u0631\u0642\u0645 \u0627\u0644\u0633\u062c\u0644',
      type: '\u0627\u0644\u0646\u0648\u0639', date: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e',
      unauthorized: '\u0644\u064a\u0633 \u0644\u062f\u064a\u0643 \u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0648\u0635\u0648\u0644.',
      backToDashboard: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
      noData: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a', actions: '\u0625\u062c\u0631\u0627\u0621\u0627\u062a',
      teamTitle: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0641\u0631\u064a\u0642', addAdmin: '\u0625\u0636\u0627\u0641\u0629 \u0639\u0636\u0648',
      emailPlaceholder: '\u0623\u062f\u062e\u0644 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
      invite: '\u0625\u0636\u0627\u0641\u0629', removeAccess: '\u0625\u0632\u0627\u0644\u0629', changeRole: '\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u062f\u0648\u0631',
      confirmRemove: '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0625\u0632\u0627\u0644\u0629',
      confirmRemoveMsg: '\u0625\u0632\u0627\u0644\u0629 \u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0645\u0646',
      cancel: '\u0625\u0644\u063a\u0627\u0621', confirm: '\u062a\u0623\u0643\u064a\u062f',
      promoted: '\u062a\u0645 \u062a\u0631\u0642\u064a\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0646\u062c\u0627\u062d',
      demoted: '\u062a\u0645 \u0625\u0632\u0627\u0644\u0629 \u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629',
      inviteSent: '\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0639\u0636\u0648',
      userNotFound: '\u0644\u0627 \u064a\u0648\u062c\u062f \u062d\u0633\u0627\u0628 \u0628\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f. \u064a\u062c\u0628 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0623\u0648\u0644\u0627\u064b.',
      alreadyAdmin: '\u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0634\u0631\u0641 \u0628\u0627\u0644\u0641\u0639\u0644.',
      cannotRemoveSelf: '\u0644\u0627 \u064a\u0645\u0643\u0646\u0643 \u0625\u0632\u0627\u0644\u0629 \u0635\u0644\u0627\u062d\u064a\u062a\u0643 \u0627\u0644\u062e\u0627\u0635\u0629.',
      cannotRemoveSuper: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0623\u0639\u0644\u0649.',
      superAdmin: '\u0645\u062f\u064a\u0631 \u0623\u0639\u0644\u0649', admin: '\u0645\u0634\u0631\u0641',
      support: '\u062f\u0639\u0645', user: '\u0645\u0633\u062a\u062e\u062f\u0645',
      makeAdmin: '\u062a\u0631\u0642\u064a\u0629 \u0644\u0645\u0634\u0631\u0641', makeSupport: '\u062a\u0639\u064a\u064a\u0646 \u062f\u0639\u0645',
      demoteToUser: '\u062a\u062e\u0641\u064a\u0636 \u0644\u0645\u0633\u062a\u062e\u062f\u0645',
      auditTitle: '\u0633\u062c\u0644 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629', actor: '\u0627\u0644\u0645\u0646\u0641\u0630',
      action: '\u0627\u0644\u0625\u062c\u0631\u0627\u0621', target: '\u0627\u0644\u0647\u062f\u0641',
      details: '\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644', timestamp: '\u0627\u0644\u0648\u0642\u062a',
      riskLevel: '\u0627\u0644\u062e\u0637\u0648\u0631\u0629', noAuditLogs: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a \u0628\u0639\u062f.',
      high: '\u0639\u0627\u0644\u064a', medium: '\u0645\u062a\u0648\u0633\u0637', low: '\u0645\u0646\u062e\u0641\u0636',
    },
  };
  const text = t[locale as keyof typeof t] || t.en;

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/${locale}/auth`); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      setAuthorized(true);
      setCurrentUserRole(profile.role);
      setCurrentUserId(user.id);
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

  const loadTeam = async () => {
    const { data } = await supabase.from('profiles')
      .select('id, email, full_name, role, created_at')
      .in('role', ['admin', 'super_admin', 'support'])
      .order('created_at', { ascending: true });
    setTeamMembers(data || []);
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    const { data } = await supabase.from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setAuditLogs(data || []);
    setAuditLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'team' && isSuperAdmin) loadTeam();
    if (activeTab === 'audit' && isSuperAdmin) loadAudit();
  }, [activeTab]);

  const logAuditAction = async (action: string, entityType: string, entityId: string, details: any, previousState?: any, newState?: any, riskLevel?: string) => {
    await supabase.from('admin_audit_log').insert({
      admin_id: currentUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      previous_state: previousState || null,
      new_state: newState || null,
      risk_level: riskLevel || 'medium',
    });
  };

  const handleAddMember = async () => {
    if (!inviteEmail.trim()) return;
    setTeamLoading(true);
    setTeamMsg('');
    setTeamError('');

    // Find user by email
    const { data: targetProfile } = await supabase.from('profiles')
      .select('id, email, full_name, role')
      .eq('email', inviteEmail.trim().toLowerCase())
      .single();

    if (!targetProfile) {
      setTeamError(text.userNotFound);
      setTeamLoading(false);
      return;
    }
    if (['admin', 'super_admin'].includes(targetProfile.role)) {
      setTeamError(text.alreadyAdmin);
      setTeamLoading(false);
      return;
    }

    const previousRole = targetProfile.role;
    const { error } = await supabase.from('profiles')
      .update({ role: inviteRole })
      .eq('id', targetProfile.id);

    if (error) {
      setTeamError(error.message);
    } else {
      await logAuditAction('role_change', 'profile', targetProfile.id,
        { email: targetProfile.email, changed_by: currentUserId },
        { role: previousRole }, { role: inviteRole }, 'high');
      setTeamMsg(text.inviteSent);
      setInviteEmail('');
      await loadTeam();
    }
    setTeamLoading(false);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (userId === currentUserId) { setTeamError(text.cannotRemoveSelf); return; }
    const member = teamMembers.find(m => m.id === userId);
    if (member?.role === 'super_admin') { setTeamError(text.cannotRemoveSuper); return; }

    setTeamLoading(true);
    setTeamMsg('');
    setTeamError('');

    const previousRole = member?.role;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);

    if (error) {
      setTeamError(error.message);
    } else {
      await logAuditAction('role_change', 'profile', userId,
        { email: member?.email, new_role: newRole, changed_by: currentUserId },
        { role: previousRole }, { role: newRole },
        newRole === 'user' ? 'high' : 'medium');
      setTeamMsg(newRole === 'user' ? text.demoted : text.promoted);
      setConfirmAction(null);
      await loadTeam();
    }
    setTeamLoading(false);
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = { super_admin: text.superAdmin, admin: text.admin, support: text.support, user: text.user };
    return labels[role] || role;
  };

  const roleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-red-100 text-red-700 border-red-200',
      admin: 'bg-blue-100 text-blue-700 border-blue-200',
      support: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      user: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return colors[role] || colors.user;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full" /></div>;

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <p className="text-gray-600 mb-4">{text.unauthorized}</p>
        <Link href={`/${locale}/dashboard`} className="text-[#D4AF37] hover:underline">{text.backToDashboard}</Link>
      </div>
    </div>
  );

  const statCards = [
    { label: text.totalUsers, value: stats.totalUsers, color: 'bg-[#1A1A2E]', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: text.totalWarranties, value: stats.totalWarranties, color: 'bg-[#D4AF37]', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { label: text.totalCompanies, value: stats.totalCompanies, color: 'bg-purple-600', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: text.totalClaims, value: stats.totalClaims, color: 'bg-orange-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  ];

  const baseTabs = [
    { id: 'overview', label: text.overview },
    { id: 'users', label: text.usersTab },
    { id: 'warranties', label: text.warrantiesTab },
    { id: 'companies', label: text.companiesTab },
    { id: 'claims', label: text.claimsTab },
  ];
  const tabs = isSuperAdmin
    ? [...baseTabs, { id: 'team', label: text.teamTab }, { id: 'audit', label: text.auditTab }]
    : baseTabs;

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-[#1A1A2E] border-b border-[#2d2d5e]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{text.title}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${roleBadgeColor(currentUserRole)}`}>
              {roleLabel(currentUserRole)}
            </span>
          </div>
          <Link href={`/${locale}/dashboard`} className="text-sm text-[#D4AF37] hover:underline">{text.backToDashboard}</Link>
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
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabId)}
              className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>{tab.label}</button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* OVERVIEW TAB */}
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
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37] flex-shrink-0" />
                    <p className="text-sm text-gray-700 flex-1">{a.action}</p>
                    <p className="text-xs text-gray-400">{fmtDate(a.created_at)}</p>
                  </div>
                ))}</div>
              )}
            </div>
          )}

          {/* USERS TAB */}
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
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs border ${roleBadgeColor(u.role || 'user')}`}>{roleLabel(u.role || 'user')}</span></td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(u.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* WARRANTIES TAB */}
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
                    <td className="px-4 py-3 text-gray-500">{fmtDate(w.expiry_date || w.end_date)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(w.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* COMPANIES TAB */}
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

          {/* CLAIMS TAB */}
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

          {/* TEAM MANAGEMENT TAB — Super Admin Only */}
          {activeTab === 'team' && isSuperAdmin && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{text.teamTitle}</h3>

              {/* Add member form */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">{text.addAdmin}</p>
                <div className="flex gap-3 flex-wrap">
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder={text.emailPlaceholder}
                    className="flex-1 min-w-[250px] px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent" dir="ltr" />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]">
                    <option value="admin">{text.admin}</option>
                    <option value="support">{text.support}</option>
                  </select>
                  <button onClick={handleAddMember} disabled={teamLoading || !inviteEmail.trim()}
                    className="px-6 py-2.5 bg-[#D4AF37] hover:bg-yellow-500 text-[#1A1A2E] font-semibold rounded-lg text-sm disabled:opacity-50 transition">
                    {text.invite}
                  </button>
                </div>
                {teamMsg && <p className="mt-2 text-sm text-emerald-600">{teamMsg}</p>}
                {teamError && <p className="mt-2 text-sm text-red-600">{teamError}</p>}
              </div>

              {/* Confirmation dialog */}
              {confirmAction && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800 font-medium">{text.confirmRemoveMsg} <strong>{confirmAction.name}</strong>?</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setConfirmAction(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{text.cancel}</button>
                    <button onClick={() => handleChangeRole(confirmAction.userId, 'user')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">{text.confirm}</button>
                  </div>
                </div>
              )}

              {/* Team members table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b"><tr>
                    <th className="px-4 py-3 text-start font-medium text-gray-500">{text.name}</th>
                    <th className="px-4 py-3 text-start font-medium text-gray-500">{text.email}</th>
                    <th className="px-4 py-3 text-start font-medium text-gray-500">{text.role}</th>
                    <th className="px-4 py-3 text-start font-medium text-gray-500">{text.joined}</th>
                    <th className="px-4 py-3 text-start font-medium text-gray-500">{text.actions}</th>
                  </tr></thead>
                  <tbody className="divide-y">{teamMembers.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{m.full_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600" dir="ltr">{m.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${roleBadgeColor(m.role)}`}>
                          {roleLabel(m.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(m.created_at)}</td>
                      <td className="px-4 py-3">
                        {m.role === 'super_admin' ? (
                          <span className="text-xs text-gray-400">\u2014</span>
                        ) : m.id === currentUserId ? (
                          <span className="text-xs text-gray-400">{isRTL ? '\u0623\u0646\u062a' : 'You'}</span>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            {m.role !== 'admin' && (
                              <button onClick={() => handleChangeRole(m.id, 'admin')}
                                className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition">
                                {text.makeAdmin}
                              </button>
                            )}
                            {m.role !== 'support' && (
                              <button onClick={() => handleChangeRole(m.id, 'support')}
                                className="px-3 py-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-100 transition">
                                {text.makeSupport}
                              </button>
                            )}
                            <button onClick={() => setConfirmAction({ type: 'remove', userId: m.id, name: m.full_name || m.email })}
                              className="px-3 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition">
                              {text.removeAccess}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT TRAIL TAB — Super Admin Only */}
          {activeTab === 'audit' && isSuperAdmin && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{text.auditTitle}</h3>
                <button onClick={loadAudit} className="text-sm text-[#D4AF37] hover:underline">
                  {isRTL ? '\u062a\u062d\u062f\u064a\u062b' : 'Refresh'}
                </button>
              </div>
              {auditLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-3 border-[#D4AF37] border-t-transparent rounded-full" /></div>
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">{text.noAuditLogs}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b"><tr>
                      <th className="px-4 py-3 text-start font-medium text-gray-500">{text.timestamp}</th>
                      <th className="px-4 py-3 text-start font-medium text-gray-500">{text.action}</th>
                      <th className="px-4 py-3 text-start font-medium text-gray-500">{text.target}</th>
                      <th className="px-4 py-3 text-start font-medium text-gray-500">{text.details}</th>
                      <th className="px-4 py-3 text-start font-medium text-gray-500">{text.riskLevel}</th>
                    </tr></thead>
                    <tbody className="divide-y">{auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDateTime(log.created_at)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{log.action?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-gray-600">{log.entity_type}: {log.entity_id?.substring(0, 8)}...</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                          {log.details ? (log.details.email || log.details.reason || JSON.stringify(log.details).substring(0, 60)) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            log.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                            log.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>{log.risk_level === 'high' ? text.high : log.risk_level === 'medium' ? text.medium : text.low}</span>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
