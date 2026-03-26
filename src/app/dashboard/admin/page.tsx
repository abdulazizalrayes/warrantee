// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

/* ── Types ── */
type Role = 'super_admin' | 'admin' | 'support' | 'seller' | 'user'
type Tab = 'command' | 'users' | 'companies' | 'warranties' | 'claims' | 'ocr' | 'fraud' | 'support' | 'archive' | 'analytics' | 'revenue' | 'team' | 'settings' | 'audit'

interface AdminProfile { id: string; email: string; full_name: string; role: Role; created_at: string; }
interface Stats { warranties: any; claims: any; users: any; ingestion: any; companies: any; subscriptions: any; revenue: any; }

/* ── Badge Components ── */
function RoleBadge({ role }: { role: Role }) {
  const colors: Record<string, string> = { super_admin: 'bg-red-100 text-red-800', admin: 'bg-purple-100 text-purple-800', support: 'bg-blue-100 text-blue-800', seller: 'bg-green-100 text-green-800', user: 'bg-gray-100 text-gray-800' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[role] || colors.user}`}>{role.replace('_', ' ').toUpperCase()}</span>
}
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { active: 'bg-green-100 text-green-800', expired: 'bg-red-100 text-red-800', pending: 'bg-yellow-100 text-yellow-800', open: 'bg-blue-100 text-blue-800', resolved: 'bg-green-100 text-green-800', contested: 'bg-orange-100 text-orange-800', verified: 'bg-green-100 text-green-800', unverified: 'bg-gray-100 text-gray-800' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status.toUpperCase()}</span>
}
function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-blue-100 text-blue-800' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[level] || 'bg-gray-100 text-gray-800'}`}>{level.toUpperCase()}</span>
}

/* ── KPI Card ── */
function KPI({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const border: Record<string, string> = { blue: 'border-blue-500', green: 'border-green-500', red: 'border-red-500', yellow: 'border-yellow-500', purple: 'border-purple-500' }
  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${border[color] || border.blue} p-4`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

/* ── Sidebar Config ── */
const TABS: { key: Tab; label: string; icon: string; superOnly?: boolean }[] = [
  { key: 'command', label: 'Command Center', icon: '⚡' },
  { key: 'users', label: 'Users', icon: '👤' },
  { key: 'companies', label: 'Companies', icon: '🏢' },
  { key: 'warranties', label: 'Warranties', icon: '🛡️' },
  { key: 'claims', label: 'Claims', icon: '📋' },
  { key: 'ocr', label: 'OCR Inbox', icon: '📨' },
  { key: 'fraud', label: 'Fraud Center', icon: '🚨' },
  { key: 'support', label: 'Support', icon: '🎧' },
  { key: 'archive', label: 'Archive & Legal', icon: '📦' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'revenue', label: 'Revenue', icon: '💰' },
  { key: 'team', label: 'Team', icon: '👥', superOnly: true },
  { key: 'settings', label: 'Settings', icon: '⚙️', superOnly: true },
  { key: 'audit', label: 'Audit Log', icon: '📜', superOnly: true },
]

/* ── Main Component ── */
export default function AdminPortal() {
  const supabase = createSupabaseBrowserClient()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('command')
  const [stats, setStats] = useState<Stats>({ warranties: {}, claims: {}, users: {}, ingestion: {}, companies: {}, subscriptions: {}, revenue: {} })
  const [data, setData] = useState<Record<string, any[]>>({})
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  /* ── Auth & Profile ── */
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || !['admin', 'super_admin'].includes(p.role)) { window.location.href = '/dashboard'; return }
      setProfile(p)
      await loadStats()
      await loadTabData('command')
      setLoading(false)
    }
    init()
  }, [])

  /* ── Load Stats from Views ── */
  const loadStats = useCallback(async () => {
    const [w, c, u, i, co, s, r] = await Promise.all([
      supabase.from('v_warranty_stats').select('*').single(),
      supabase.from('v_claim_stats').select('*').single(),
      supabase.from('v_user_stats').select('*').single(),
      supabase.from('v_ingestion_stats').select('*').single(),
      supabase.from('v_company_stats').select('*').single(),
      supabase.from('v_subscription_stats').select('*').single(),
      supabase.from('v_revenue_stats').select('*').single(),
    ])
    setStats({ warranties: w.data || {}, claims: c.data || {}, users: u.data || {}, ingestion: i.data || {}, companies: co.data || {}, subscriptions: s.data || {}, revenue: r.data || {} })
  }, [])

  /* ── Load Tab Data ── */
  const loadTabData = useCallback(async (tab: Tab) => {
    const q: Record<string, () => Promise<any>> = {
      command: async () => {
        const [audit, sessions, tickets] = await Promise.all([
          supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(10),
          supabase.from('admin_sessions').select('*').eq('is_active', true),
          supabase.from('support_tickets').select('*').eq('status', 'open').order('priority_order', { ascending: true }).limit(5),
        ])
        return { recent_audit: audit.data || [], active_sessions: sessions.data || [], open_tickets: tickets.data || [] }
      },
      users: async () => {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50)
        return { users: data || [] }
      },
      companies: async () => {
        const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(50)
        return { companies: data || [] }
      },
      warranties: async () => {
        const { data } = await supabase.from('warranties').select('*, companies(name_en)').order('created_at', { ascending: false }).limit(50)
        return { warranties: data || [] }
      },
      claims: async () => {
        const { data } = await supabase.from('warranty_claims').select('*, warranties(product_name)').order('created_at', { ascending: false }).limit(50)
        return { claims: data || [] }
      },
      ocr: async () => {
        const { data } = await supabase.from('warranty_ingestion').select('*').order('created_at', { ascending: false }).limit(50)
        return { ingestions: data || [] }
      },
      fraud: async () => {
        const { data } = await supabase.from('fraud_signals').select('*').order('detected_at', { ascending: false }).limit(50)
        return { signals: data || [] }
      },
      support: async () => {
        const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(50)
        return { tickets: data || [] }
      },
      archive: async () => {
        const { data } = await supabase.from('warranties').select('*').eq('is_archived', true).order('archived_at', { ascending: false }).limit(50)
        return { archived: data || [] }
      },
      analytics: async () => ({ }),
      revenue: async () => {
        const { data } = await supabase.from('revenue_events').select('*').order('created_at', { ascending: false }).limit(50)
        return { events: data || [] }
      },
      team: async () => {
        const [admins, invites] = await Promise.all([
          supabase.from('profiles').select('*').in('role', ['admin', 'super_admin', 'support']),
          supabase.from('admin_invitations').select('*').order('created_at', { ascending: false }),
        ])
        return { admins: admins.data || [], invitations: invites.data || [] }
      },
      settings: async () => {
        const { data } = await supabase.from('system_config').select('*').order('key')
        return { configs: data || [] }
      },
      audit: async () => {
        const { data } = await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(100)
        return { logs: data || [] }
      },
    }
    if (q[tab]) {
      const result = await q[tab]()
      setData(prev => ({ ...prev, ...result }))
    }
  }, [])

  const switchTab = (tab: Tab) => { setActiveTab(tab); loadTabData(tab) }

  /* ── Admin Actions ── */
  const audit = async (action: string, target: string, details: any, risk: string = 'medium') => {
    await supabase.from('admin_audit_log').insert({ admin_id: profile!.id, action, target_type: target.split(':')[0], target_id: target.split(':')[1] || null, details, risk_level: risk, ip_address: 'browser' })
  }

  const changeUserRole = async (userId: string, newRole: Role) => {
    if (profile!.role !== 'super_admin' && newRole === 'super_admin') return alert('Only super admins can elevate to super_admin')
    setActionLoading(true)
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    await audit('role_change', `profile:${userId}`, { new_role: newRole }, newRole === 'super_admin' ? 'critical' : 'high')
    await loadTabData('users')
    setActionLoading(false)
  }

  const toggleCompanyVerification = async (companyId: string, verified: boolean) => {
    setActionLoading(true)
    await supabase.from('companies').update({ is_verified: verified, verified_at: verified ? new Date().toISOString() : null, verified_by: verified ? profile!.id : null }).eq('id', companyId)
    await audit('company_verify', `company:${companyId}`, { verified }, 'high')
    await loadTabData('companies')
    setActionLoading(false)
  }

  const updateWarrantyStatus = async (warrantyId: string, status: string) => {
    setActionLoading(true)
    await supabase.from('warranties').update({ status }).eq('id', warrantyId)
    await audit('warranty_update', `warranty:${warrantyId}`, { status }, 'medium')
    await loadTabData('warranties')
    setActionLoading(false)
  }

  const confirmIngestion = async (ingestionId: string) => {
    setActionLoading(true)
    await supabase.from('warranty_ingestion').update({ status: 'confirmed', reviewed_by: profile!.id, reviewed_at: new Date().toISOString() }).eq('id', ingestionId)
    await audit('ingestion_confirm', `ingestion:${ingestionId}`, {}, 'low')
    await loadTabData('ocr')
    setActionLoading(false)
  }

  const discardIngestion = async (ingestionId: string) => {
    setActionLoading(true)
    await supabase.from('warranty_ingestion').update({ status: 'discarded', reviewed_by: profile!.id, reviewed_at: new Date().toISOString() }).eq('id', ingestionId)
    await audit('ingestion_discard', `ingestion:${ingestionId}`, {}, 'low')
    await loadTabData('ocr')
    setActionLoading(false)
  }

  const updateFraudSignal = async (signalId: string, status: string) => {
    setActionLoading(true)
    await supabase.from('fraud_signals').update({ status, reviewed_by: profile!.id, reviewed_at: new Date().toISOString() }).eq('id', signalId)
    await audit('fraud_review', `fraud_signal:${signalId}`, { status }, 'high')
    await loadTabData('fraud')
    setActionLoading(false)
  }

  const toggleLegalHold = async (warrantyId: string, hold: boolean) => {
    setActionLoading(true)
    await supabase.from('warranties').update({ legal_hold: hold, legal_hold_by: hold ? profile!.id : null, legal_hold_at: hold ? new Date().toISOString() : null }).eq('id', warrantyId)
    await audit('legal_hold', `warranty:${warrantyId}`, { hold }, 'critical')
    await loadTabData('archive')
    setActionLoading(false)
  }

  const archiveRecord = async (table: string, id: string, reason: string) => {
    setActionLoading(true)
    await supabase.from(table).update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: profile!.id, archive_reason: reason }).eq('id', id)
    await audit('archive', `${table}:${id}`, { reason }, 'high')
    await loadTabData('archive')
    setActionLoading(false)
  }

  const inviteAdmin = async (email: string, role: Role) => {
    if (profile!.role !== 'super_admin') return alert('Only super admins can invite')
    setActionLoading(true)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')
    await supabase.from('admin_invitations').insert({ email, role, invited_by: profile!.id, token, expires_at: new Date(Date.now() + 72 * 3600000).toISOString() })
    await audit('invite_admin', `invitation:${email}`, { role }, 'critical')
    await loadTabData('team')
    setActionLoading(false)
    alert(`Invitation token for ${email}: ${token}`)
  }

  const updateConfig = async (key: string, value: string) => {
    if (profile!.role !== 'super_admin') return alert('Only super admins can change settings')
    setActionLoading(true)
    await supabase.from('system_config').update({ value, updated_by: profile!.id }).eq('key', key)
    await audit('config_update', `config:${key}`, { value }, 'critical')
    await loadTabData('settings')
    setActionLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.from('admin_sessions').update({ is_active: false, ended_at: new Date().toISOString(), end_reason: 'manual_signout' }).eq('admin_id', profile!.id).eq('is_active', true)
    await audit('signout', `profile:${profile!.id}`, {}, 'low')
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  /* ── Loading State ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading Admin Portal...</p>
      </div>
    </div>
  )

  const isSuperAdmin = profile?.role === 'super_admin'
  const visibleTabs = TABS.filter(t => !t.superOnly || isSuperAdmin)
  const fmt = (n: any) => n != null ? Number(n).toLocaleString() : '—'
  const fmtSAR = (n: any) => n != null ? `SAR ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'

  /* ── Render Panels ── */
  const renderPanel = () => {
    switch (activeTab) {
      case 'command': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Command Center</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPI label="Total Warranties" value={fmt(stats.warranties.total)} color="blue" />
            <KPI label="Active Claims" value={fmt(stats.claims.open)} color="red" />
            <KPI label="Total Users" value={fmt(stats.users.total)} color="green" />
            <KPI label="Pending OCR" value={fmt(stats.ingestion.pending)} color="yellow" />
            <KPI label="Expiring 30d" value={fmt(stats.warranties.expiring_30d)} color="red" sub="warranties near expiry" />
            <KPI label="Fraud Signals" value={fmt(stats.warranties.legal_hold)} color="red" />
            <KPI label="Revenue MTD" value={fmtSAR(stats.revenue.mtd_revenue)} color="green" />
            <KPI label="Active Subs" value={fmt(stats.subscriptions.active)} color="purple" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold mb-3">Recent Audit Activity</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(data.recent_audit || []).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <div><span className="font-medium">{log.action}</span> <span className="text-gray-400">on {log.target_type}</span></div>
                    <SeverityBadge level={log.risk_level} />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold mb-3">Active Admin Sessions</h3>
              <div className="space-y-2">
                {(data.active_sessions || []).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <span>{s.admin_id?.slice(0, 8)}...</span>
                    <span className="text-gray-400">{new Date(s.started_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )

      case 'users': return (
        <div>
          <h2 className="text-xl font-bold mb-4">User Management</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPI label="Total Users" value={fmt(stats.users.total)} color="blue" />
            <KPI label="Consumers" value={fmt(stats.users.consumers)} color="green" />
            <KPI label="Businesses" value={fmt(stats.users.businesses)} color="purple" />
            <KPI label="New (7d)" value={fmt(stats.users.new_7d)} color="yellow" />
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Joined</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {(data.users || []).map((u: any) => (
                  <tr key={u.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{u.full_name || '—'}</td>
                    <td className="p-3 text-gray-500">{u.email}</td>
                    <td className="p-3"><RoleBadge role={u.role} /></td>
                    <td className="p-3 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <select className="text-xs border rounded p-1" value={u.role} onChange={e => changeUserRole(u.id, e.target.value as Role)} disabled={actionLoading || (!isSuperAdmin && u.role === 'super_admin')}>
                        <option value="user">User</option><option value="seller">Seller</option><option value="support">Support</option><option value="admin">Admin</option>
                        {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'companies': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Company Management</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPI label="Total Companies" value={fmt(stats.companies.total)} color="blue" />
            <KPI label="Verified" value={fmt(stats.companies.verified)} color="green" />
            <KPI label="Unverified" value={fmt(stats.companies.unverified)} color="red" />
            <KPI label="Saudi-based" value={fmt(stats.companies.saudi)} color="purple" />
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {(data.companies || []).map((c: any) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{c.name_en || c.name_ar}</td>
                    <td className="p-3 text-gray-500">{c.company_role}</td>
                    <td className="p-3"><StatusBadge status={c.is_verified ? 'verified' : 'unverified'} /></td>
                    <td className="p-3">
                      <button onClick={() => toggleCompanyVerification(c.id, !c.is_verified)} disabled={actionLoading} className={`text-xs px-3 py-1 rounded ${c.is_verified ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                        {c.is_verified ? 'Revoke' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'warranties': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Warranty Registry</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPI label="Total" value={fmt(stats.warranties.total)} color="blue" />
            <KPI label="Active" value={fmt(stats.warranties.active)} color="green" />
            <KPI label="Expired" value={fmt(stats.warranties.expired)} color="red" />
            <KPI label="Pending" value={fmt(stats.warranties.pending)} color="yellow" />
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Product</th><th className="p-3 text-left">Company</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Expires</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {(data.warranties || []).map((w: any) => (
                  <tr key={w.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{w.product_name || '—'}</td>
                    <td className="p-3 text-gray-500">{w.companies?.name_en || '—'}</td>
                    <td className="p-3"><StatusBadge status={w.status} /></td>
                    <td className="p-3 text-gray-400">{w.end_date ? new Date(w.end_date).toLocaleDateString() : '—'}</td>
                    <td className="p-3">
                      <select className="text-xs border rounded p-1" value={w.status} onChange={e => updateWarrantyStatus(w.id, e.target.value)} disabled={actionLoading}>
                        <option value="active">Active</option><option value="expired">Expired</option><option value="pending">Pending</option><option value="voided">Voided</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'claims': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Claims Management</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPI label="Total Claims" value={fmt(stats.claims.total)} color="blue" />
            <KPI label="Open" value={fmt(stats.claims.open)} color="red" />
            <KPI label="Resolved" value={fmt(stats.claims.resolved)} color="green" />
            <KPI label="Avg Response" value={stats.claims.avg_response_hours ? `${Number(stats.claims.avg_response_hours).toFixed(1)}h` : '—'} color="yellow" />
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Warranty</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Created</th></tr></thead>
              <tbody>
                {(data.claims || []).map((c: any) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{c.warranties?.product_name || c.warranty_id?.slice(0, 8)}</td>
                    <td className="p-3"><StatusBadge status={c.status} /></td>
                    <td className="p-3 text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'ocr': return (
        <div>
          <h2 className="text-xl font-bold mb-4">OCR Ingestion Inbox</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPI label="Total Ingested" value={fmt(stats.ingestion.total)} color="blue" />
            <KPI label="Pending Review" value={fmt(stats.ingestion.pending)} color="yellow" />
            <KPI label="Confirmed" value={fmt(stats.ingestion.confirmed)} color="green" />
            <KPI label="Avg Confidence" value={stats.ingestion.avg_confidence ? `${(Number(stats.ingestion.avg_confidence) * 100).toFixed(1)}%` : '—'} color="purple" />
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Source</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Confidence</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {(data.ingestions || []).map((i: any) => (
                  <tr key={i.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{i.source_type || 'upload'}</td>
                    <td className="p-3"><StatusBadge status={i.status} /></td>
                    <td className="p-3">{i.confidence_score ? `${(i.confidence_score * 100).toFixed(0)}%` : '—'}</td>
                    <td className="p-3 space-x-2">
                      {i.status === 'pending' && <>
                        <button onClick={() => confirmIngestion(i.id)} disabled={actionLoading} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Confirm</button>
                        <button onClick={() => discardIngestion(i.id)} disabled={actionLoading} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Discard</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'fraud': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Fraud Detection Center</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Signal</th><th className="p-3 text-left">Severity</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Detected</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {(data.signals || []).map((s: any) => (
                  <tr key={s.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{s.signal_type}</td>
                    <td className="p-3"><SeverityBadge level={s.severity} /></td>
                    <td className="p-3"><StatusBadge status={s.status} /></td>
                    <td className="p-3 text-gray-400">{new Date(s.detected_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      {s.status === 'open' && (
                        <select className="text-xs border rounded p-1" onChange={e => e.target.value && updateFraudSignal(s.id, e.target.value)} disabled={actionLoading} defaultValue="">
                          <option value="" disabled>Action...</option>
                          <option value="investigating">Investigate</option>
                          <option value="confirmed">Confirm Fraud</option>
                          <option value="dismissed">Dismiss</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'support': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Support Tickets</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Priority</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Created</th></tr></thead>
              <tbody>
                {(data.tickets || []).map((t: any) => (
                  <tr key={t.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{t.subject}</td>
                    <td className="p-3 text-gray-500">{t.category}</td>
                    <td className="p-3"><SeverityBadge level={t.priority} /></td>
                    <td className="p-3"><StatusBadge status={t.status} /></td>
                    <td className="p-3 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'archive': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Archive & Legal Hold</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Product</th><th className="p-3 text-left">Archived</th><th className="p-3 text-left">Reason</th><th className="p-3 text-left">Legal Hold</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {(data.archived || []).map((a: any) => (
                  <tr key={a.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{a.product_name || '—'}</td>
                    <td className="p-3 text-gray-400">{a.archived_at ? new Date(a.archived_at).toLocaleDateString() : '—'}</td>
                    <td className="p-3 text-gray-500">{a.archive_reason || '—'}</td>
                    <td className="p-3">{a.legal_hold ? <span className="text-red-600 font-semibold">HOLD</span> : '—'}</td>
                    <td className="p-3 space-x-2">
                      <button onClick={() => toggleLegalHold(a.id, !a.legal_hold)} disabled={actionLoading} className={`text-xs px-2 py-1 rounded ${a.legal_hold ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {a.legal_hold ? 'Release Hold' : 'Place Hold'}
                      </button>
                    </td>
                  </tr>
                ))}
                {(data.archived || []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-400">No archived records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'analytics': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Platform Analytics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <KPI label="Warranties Total" value={fmt(stats.warranties.total)} color="blue" />
            <KPI label="Active" value={fmt(stats.warranties.active)} color="green" />
            <KPI label="Expiring 30d" value={fmt(stats.warranties.expiring_30d)} color="red" />
            <KPI label="Expiring 90d" value={fmt(stats.warranties.expiring_90d)} color="yellow" />
            <KPI label="Claims Total" value={fmt(stats.claims.total)} color="blue" />
            <KPI label="Open Claims" value={fmt(stats.claims.open)} color="red" />
            <KPI label="Contested" value={fmt(stats.claims.contested)} color="yellow" />
            <KPI label="Avg Resolve" value={stats.claims.avg_resolution_hours ? `${Number(stats.claims.avg_resolution_hours).toFixed(1)}h` : '—'} color="purple" />
            <KPI label="Users Total" value={fmt(stats.users.total)} color="blue" />
            <KPI label="New 7d" value={fmt(stats.users.new_7d)} color="green" />
            <KPI label="New 30d" value={fmt(stats.users.new_30d)} color="green" />
            <KPI label="Companies" value={fmt(stats.companies.total)} color="purple" />
            <KPI label="Verified Cos" value={fmt(stats.companies.verified)} color="green" />
            <KPI label="OCR Total" value={fmt(stats.ingestion.total)} color="blue" />
            <KPI label="High Confidence" value={fmt(stats.ingestion.high_confidence)} color="green" />
            <KPI label="Low Confidence" value={fmt(stats.ingestion.low_confidence)} color="red" />
          </div>
        </div>
      )

      case 'revenue': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Revenue Dashboard</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPI label="Gross Revenue" value={fmtSAR(stats.revenue.gross_revenue)} color="green" />
            <KPI label="Net Revenue" value={fmtSAR(stats.revenue.net_revenue)} color="blue" />
            <KPI label="MTD Revenue" value={fmtSAR(stats.revenue.mtd_revenue)} color="purple" />
            <KPI label="Refunds" value={fmtSAR(stats.revenue.total_refunds)} color="red" />
            <KPI label="Subscriptions" value={fmtSAR(stats.revenue.subscription_revenue)} color="blue" />
            <KPI label="Extensions" value={fmtSAR(stats.revenue.extension_revenue)} color="green" />
            <KPI label="API Revenue" value={fmtSAR(stats.revenue.api_revenue)} color="purple" />
            <KPI label="Active Subs" value={fmt(stats.subscriptions.active)} sub={`${fmt(stats.subscriptions.paid_active)} paid`} color="green" />
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <h3 className="p-4 font-semibold border-b">Recent Revenue Events</h3>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-100"><th className="p-3 text-left">Type</th><th className="p-3 text-left">Amount</th><th className="p-3 text-left">Currency</th><th className="p-3 text-left">Date</th></tr></thead>
              <tbody>
                {(data.events || []).map((e: any) => (
                  <tr key={e.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{e.event_type}</td>
                    <td className="p-3">{fmtSAR(e.amount)}</td>
                    <td className="p-3 text-gray-500">{e.currency}</td>
                    <td className="p-3 text-gray-400">{new Date(e.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'team': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Team Management</h2>
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 className="font-semibold mb-3">Invite New Admin</h3>
            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); inviteAdmin(fd.get('email') as string, fd.get('role') as Role); e.currentTarget.reset() }} className="flex gap-3">
              <input name="email" type="email" placeholder="Email address" required className="flex-1 border rounded px-3 py-2 text-sm" />
              <select name="role" className="border rounded px-3 py-2 text-sm">
                <option value="admin">Admin</option><option value="support">Support</option>
              </select>
              <button type="submit" disabled={actionLoading} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">Invite</button>
            </form>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <h3 className="p-4 font-semibold border-b">Admin Team</h3>
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Role</th></tr></thead>
                <tbody>
                  {(data.admins || []).map((a: any) => (
                    <tr key={a.id} className="border-b"><td className="p-3">{a.full_name || a.email}</td><td className="p-3"><RoleBadge role={a.role} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <h3 className="p-4 font-semibold border-b">Pending Invitations</h3>
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100"><th className="p-3 text-left">Email</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Status</th></tr></thead>
                <tbody>
                  {(data.invitations || []).map((i: any) => (
                    <tr key={i.id} className="border-b"><td className="p-3">{i.email}</td><td className="p-3"><RoleBadge role={i.role} /></td><td className="p-3"><StatusBadge status={i.status} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )

      case 'settings': return (
        <div>
          <h2 className="text-xl font-bold mb-4">System Configuration</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Key</th><th className="p-3 text-left">Value</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {(data.configs || []).map((c: any) => (
                  <tr key={c.key} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{c.key}</td>
                    <td className="p-3"><input className="border rounded px-2 py-1 text-sm w-full" defaultValue={c.value} onBlur={e => { if (e.target.value !== c.value) updateConfig(c.key, e.target.value) }} /></td>
                    <td className="p-3 text-gray-500 text-xs">{c.description}</td>
                    <td className="p-3"><span className="text-xs text-gray-400">{c.is_sensitive ? '🔒 Sensitive' : ''}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      case 'audit': return (
        <div>
          <h2 className="text-xl font-bold mb-4">Audit Log</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left">Time</th><th className="p-3 text-left">Admin</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Target</th><th className="p-3 text-left">Risk</th></tr></thead>
              <tbody>
                {(data.logs || []).map((l: any) => (
                  <tr key={l.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-gray-400 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="p-3 font-mono text-xs">{l.admin_id?.slice(0, 8)}</td>
                    <td className="p-3 font-medium">{l.action}</td>
                    <td className="p-3 text-gray-500">{l.target_type}{l.target_id ? `:${l.target_id.slice(0,8)}` : ''}</td>
                    <td className="p-3"><SeverityBadge level={l.risk_level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

      default: return <div className="text-gray-400">Select a tab</div>
    }
  }

  /* ── Layout ── */
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-slate-900 text-white transition-all duration-200 flex flex-col`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && <h1 className="font-bold text-lg">Warrantee</h1>}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white">
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
          {sidebarOpen && <p className="text-xs text-slate-400 mt-1">Admin Portal</p>}
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {visibleTabs.map(t => (
            <button key={t.key} onClick={() => switchTab(t.key)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === t.key ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <span>{t.icon}</span>
              {sidebarOpen && <span>{t.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          {sidebarOpen && (
            <div className="mb-3">
              <p className="text-xs text-slate-400">{profile?.email}</p>
              <RoleBadge role={profile?.role || 'user'} />
            </div>
          )}
          <button onClick={handleSignOut} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded transition-colors">
            {sidebarOpen ? 'Sign Out' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{TABS.find(t => t.key === activeTab)?.label}</h2>
            <p className="text-xs text-gray-400">Warrantee — Trust the Terms™</p>
          </div>
          <div className="flex items-center gap-3">
            {actionLoading && <span className="text-xs text-blue-500 animate-pulse">Processing...</span>}
            <button onClick={() => { loadStats(); loadTabData(activeTab) }} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition-colors">Refresh</button>
          </div>
        </header>
        <div className="p-6">{renderPanel()}</div>
      </main>
    </div>
  )
}
