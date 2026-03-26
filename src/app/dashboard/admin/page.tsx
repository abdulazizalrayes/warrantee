'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface DashboardStats {
  totalUsers: number;
  totalCompanies: number;
  totalWarranties: number;
  activeWarranties: number;
  archivedWarranties: number;
  legalHoldWarranties: number
  totalClaims: number;
  pendingIngestions: number;
  activeHandoffs: number;
}

interface RecentUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface ArchivedWarranty {
  id: string;
  title: string;
  archived_at: string;
  archived_by: string;
  archive_reason: string;
  legal_hold: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [archivedWarranties, setArchivedWarranties] = useState<ArchivedWarranty[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'archived' | 'ingestion' | 'legal'>('overview');
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { count: totalUsers },
        { count: totalCompanies },
        { count: totalWarranties },
        { count: activeWarranties },
        { count: archivedCount },
        { count: legalHoldCount },
        { count: totalClaims },
        { count: pendingIngestions },
        { count: activeHandoffs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_archived', false),
        supabase.from('warranties').select('*', { count: 'exact', head: true }),
        supabase.from('warranties').select('*', { count: 'exact', head: true }).eq('is_archived', false),
        supabase.from('warranties').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('warranties').select('*', { count: 'exact', head: true }).eq('legal_hold', true),
        supabase.from('warranty_claims').select('*', { count: 'exact', head: true }),
        supabase.from('email_ingestion').select('*', { count: 'exact', head: true }).in('status', ['received', 'processing', 'extracted']),
        supabase.from('warranty_chain_assignments').select('*', { count: 'exact', head: true }).eq('assignment_type', 'servicing_handoff').is('revoked_at', null),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalCompanies: totalCompanies || 0,
        totalWarranties: totalWarranties || 0,
        activeWarranties: activeWarranties || 0,
        archivedWarranties: archivedCount || 0,
        legalHoldWarranties: legalHoldCount || 0,
        totalClaims: totalClaims || 0,
        pendingIngestions: pendingIngestions || 0,
        activeHandoffs: activeHandoffs || 0,
      });

      // Fetch recent users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentUsers(users || []);

      // Fetch archived warranties
      const { data: archived } = await supabase
        .from('warranties')
        .select('id, title, archived_at, archived_by, archive_reason, legal_hold')
        .eq('is_archived', true)
        .order('archived_at', { ascending: false })
        .limit(20);
      setArchivedWarranties(archived || []);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLegalHold = async (warrantyId: string, hold: boolean) => {
    await supabase
      .from('warranties')
      .update({
        legal_hold: hold,
        legal_hold_reason: hold ? 'Set by admin' : null,
      })
      .eq('id', warrantyId);
    fetchStats();
  };

  const handleRestore = async (warrantyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await fetch('/api/warranties/archive', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warranty_id: warrantyId, user_id: user.id }),
    });
    fetchStats();
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Admin Dashboard</h1>
        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ background: '#f3f4f6', borderRadius: '8px', height: '100px', animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Admin Dashboard</h1>
        <span style={{ background: '#dc2626', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
          ADMIN
        </span>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Users', value: stats?.totalUsers, color: '#3b82f6' },
          { label: 'Companies', value: stats?.totalCompanies, color: '#8b5cf6' },
          { label: 'Total Warranties', value: stats?.totalWarranties, color: '#10b981' },
          { label: 'Active Warranties', value: stats?.activeWarranties, color: '#059669' },
          { label: 'Archived', value: stats?.archivedWarranties, color: '#f59e0b' },
          { label: 'Legal Hold', value: stats?.legalHoldWarranties, color: '#dc2626' },
          { label: 'Claims', value: stats?.totalClaims, color: '#6366f1' },
          { label: 'Pending Ingestions', value: stats?.pendingIngestions, color: '#f97316' },
          { label: 'Active Handoffs', value: stats?.activeHandoffs, color: '#14b8a6' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', borderLeft: `4px solid ${stat.color}` }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: stat.color, marginTop: '0.25rem' }}>{stat.value ?? '-'}</div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {(['overview', 'users', 'archived', 'legal'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === tab ? '#1e3a5f' : 'transparent',
              color: activeTab === tab ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Platform Overview</h2>
          <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
            Warrantee admin panel. All admin actions are restricted to abdulaziz.alrayes@gmail.com.
            Use the tabs above to manage users, view archived warranties, and handle legal holds.
          </p>
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fcd34d' }}>
            <strong>Quick Actions:</strong> View pending email ingestions in the{' '}
            <a href="/dashboard/warranties/inbox" style={{ color: '#1e3a5f', textDecoration: 'underline' }}>OCR Inbox</a>.
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>{user.full_name || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{user.email}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      background: user.role === 'admin' ? '#fee2e2' : '#dbeafe',
                      color: user.role === 'admin' ? '#dc2626' : '#2563eb',
                      padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'archived' && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Warranty</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Reason</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Archived</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Hold</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archivedWarranties.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No archived warranties</td></tr>
              ) : archivedWarranties.map((w) => (
                <tr key={w.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{w.title || w.id.slice(0, 8)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{w.archive_reason || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    {w.archived_at ? new Date(w.archived_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {w.legal_hold ? (
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>HOLD</span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button
                      onClick={() => handleRestore(w.id)}
                      disabled={w.legal_hold}
                      style={{
                        background: w.legal_hold ? '#e5e7eb' : '#dbeafe',
                        color: w.legal_hold ? '#9ca3af' : '#2563eb',
                        border: 'none', padding: '4px 10px', borderRadius: '4px',
                        cursor: w.legal_hold ? 'not-allowed' : 'pointer', fontSize: '0.75rem', marginRight: '4px',
                      }}
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'legal' && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Legal Hold Management</h2>
          <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Warranties under legal hold cannot be archived or deleted. Currently {stats?.legalHoldWarranties || 0} warranties are on hold.
          </p>
          {archivedWarranties.filter(w => w.legal_hold).length > 0 ? (
            archivedWarranties.filter(w => w.legal_hold).map((w) => (
              <div key={w.id} style={{ border: '1px solid #fca5a5', borderRadius: '6px', padding: '1rem', marginBottom: '0.5rem', background: '#fef2f2' }}>
                <div style={{ fontWeight: 600 }}>{w.title || w.id.slice(0, 8)}</div>
                <button
                  onClick={() => handleLegalHold(w.id, false)}
                  style={{ marginTop: '0.5rem', background: '#dc2626', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Remove Legal Hold
                </button>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: '6px' }}>
              No warranties currently under legal hold
            </div>
          )}
        </div>
      )}
    </div>
  );
}
