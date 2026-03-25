// @ts-nocheck
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/en/login");
  }

  // Check if user has admin role in profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/en/dashboard");
  }

  return { user, profile };
}

export default async function AdminPortalPage() {
  const { user } = await verifyAdmin();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Admin Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Welcome, {user.email}. You have administrator access.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AdminCard
              title="Users"
              description="Manage user accounts and roles"
              href="/admin-portal-x7k9/users"
            />
            <AdminCard
              title="Companies"
              description="View and manage registered companies"
              href="/admin-portal-x7k9/companies"
            />
            <AdminCard
              title="Warranties"
              description="Overview of all warranties in the system"
              href="/admin-portal-x7k9/warranties"
            />
            <AdminCard
              title="Subscriptions"
              description="Manage billing and subscription plans"
              href="/admin-portal-x7k9/subscriptions"
            />
            <AdminCard
              title="Analytics"
              description="Platform usage and growth metrics"
              href="/admin-portal-x7k9/analytics"
            />
            <AdminCard
              title="Settings"
              description="System configuration and feature flags"
              href="/admin-portal-x7k9/settings"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <a
      href={href}
      className="block p-6 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </a>
  );
}"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Users, Shield, FileText, AlertCircle, TrendingUp, DollarSign, BarChart3, Clock, CheckCircle, Bell, Building2, Mail } from "lucide-react";

const ADMIN_EMAIL = "abdulaziz.alrayes@gmail.com";

interface PlatformStats {
  total_users: number; total_companies: number; total_warranties: number; active_warranties: number; expired_warranties: number; pending_warranties: number; draft_warranties: number; total_claims: number; open_claims: number; resolved_claims: number; total_extensions: number; purchased_extensions: number; total_documents: number; total_notifications: number; unread_notifications: number; total_activity_logs: number; total_seller_invitations: number; contact_submissions: number; users_today: number; users_this_week: number; users_this_month: number; warranties_today: number; warranties_this_week: number; warranties_this_month: number;
}
interface UserRow { id: string; email: string; full_name: string | null; phone: string | null; account_type: string; role: string; preferred_locale: string; onboarding_completed: boolean; created_at: string; plan_id: string | null; subscription_status: string | null; trial_end: string | null; warranty_count: number; claim_count: number; }
interface GrowthData { month: string; month_label: string; new_users: number; }
interface SubStats { plan_id: string; status: string; count: number; }

export default function AdminPortal() {
  const supabase = createSupabaseBrowserClient();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [growth, setGrowth] = useState<GrowthData[]>([]);
  const [subStats, setSubStats] = useState<SubStats[]>([]);
  const [tab, setTab] = useState<"overview" | "users">("overview");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === ADMIN_EMAIL) {
        setAuthed(true);
        const [s, u, g, ss] = await Promise.all([
          supabase.rpc("get_admin_platform_stats"),
          supabase.rpc("get_admin_users_list"),
          supabase.rpc("get_admin_user_growth"),
          supabase.rpc("get_admin_subscription_stats"),
        ]);
        if (s.data) setStats(s.data as unknown as PlatformStats);
        if (u.data) setUsers(u.data as unknown as UserRow[]);
        if (g.data) setGrowth(g.data as GrowthData[]);
        if (ss.data) setSubStats(ss.data as SubStats[]);
      }
      setLoading(false);
    };
    checkAuth();
  }, [supabase]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/admin-portal-x7k9" } });
  };

  if (loading) return (<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div></div>);

  if (!authed) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-sm w-full text-center">
        <Shield size={40} className="mx-auto text-yellow-400 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Admin Portal</h1>
        <p className="text-sm text-gray-400 mb-6">Warrantee Platform Administration</p>
        <button onClick={handleGoogleSignIn} disabled={signingIn} className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          {signingIn ? "Signing in..." : "Sign in with Google"}
        </button>
        <p className="text-xs text-gray-600 mt-4">Authorized administrators only</p>
      </div>
    </div>
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const maxGrowth = Math.max(...growth.map(g => g.new_users), 1);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><Shield size={24} className="text-yellow-400" /><h1 className="text-lg font-bold">Warrantee Admin</h1></div>
        <div className="flex gap-2">
          <button onClick={() => setTab("overview")} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === "overview" ? "bg-yellow-400 text-gray-900" : "text-gray-400 hover:text-white"}`}>Overview</button>
          <button onClick={() => setTab("users")} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === "users" ? "bg-yellow-400 text-gray-900" : "text-gray-400 hover:text-white"}`}>Users</button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {tab === "overview" && stats && (<>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><Users size={18} className="text-blue-400 mb-2" /><p className="text-2xl font-bold">{stats.total_users}</p><p className="text-xs text-gray-500">Total Users</p><p className="text-xs text-green-400 mt-1">+{stats.users_this_month} this month</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><Shield size={18} className="text-yellow-400 mb-2" /><p className="text-2xl font-bold">{stats.total_warranties}</p><p className="text-xs text-gray-500">Warranties</p><p className="text-xs text-green-400 mt-1">+{stats.warranties_this_month} this month</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><CheckCircle size={18} className="text-green-400 mb-2" /><p className="text-2xl font-bold">{stats.active_warranties}</p><p className="text-xs text-gray-500">Active</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><AlertCircle size={18} className="text-red-400 mb-2" /><p className="text-2xl font-bold">{stats.total_claims}</p><p className="text-xs text-gray-500">Claims</p><p className="text-xs text-yellow-400 mt-1">{stats.open_claims} open</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><Building2 size={18} className="text-purple-400 mb-2" /><p className="text-2xl font-bold">{stats.total_companies}</p><p className="text-xs text-gray-500">Companies</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><FileText size={18} className="text-cyan-400 mb-2" /><p className="text-2xl font-bold">{stats.total_documents}</p><p className="text-xs text-gray-500">Documents</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6"><h2 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-green-400" />User Growth</h2>{growth.length === 0 ? <p className="text-gray-500 text-sm">No data</p> : <div className="space-y-2">{growth.map(g => (<div key={g.month} className="flex items-center gap-3"><span className="text-xs text-gray-500 w-10">{g.month_label}</span><div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden"><div className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.max((g.new_users / maxGrowth) * 100, 8)}%` }}><span className="text-xs font-bold text-white">{g.new_users}</span></div></div></div>))}</div>}</div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6"><h2 className="font-bold mb-4 flex items-center gap-2"><DollarSign size={18} className="text-yellow-400" />Subscriptions</h2>{subStats.length === 0 ? <p className="text-gray-500 text-sm">No data</p> : <div className="space-y-3">{subStats.map((s, i) => (<div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"><div><span className="text-sm font-medium capitalize">{s.plan_id}</span><span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-green-900 text-green-400" : s.status === "trialing" ? "bg-blue-900 text-blue-400" : "bg-gray-700 text-gray-400"}`}>{s.status}</span></div><span className="text-lg font-bold">{s.count}</span></div>))}</div>}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><Clock size={18} className="text-orange-400 mb-2" /><p className="text-xl font-bold">{stats.pending_warranties}</p><p className="text-xs text-gray-500">Pending Approval</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><TrendingUp size={18} className="text-purple-400 mb-2" /><p className="text-xl font-bold">{stats.total_extensions}</p><p className="text-xs text-gray-500">Extensions ({stats.purchased_extensions} purchased)</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><Bell size={18} className="text-pink-400 mb-2" /><p className="text-xl font-bold">{stats.total_notifications}</p><p className="text-xs text-gray-500">Notifications ({stats.unread_notifications} unread)</p></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4"><Mail size={18} className="text-teal-400 mb-2" /><p className="text-xl font-bold">{stats.contact_submissions}</p><p className="text-xs text-gray-500">Contact Submissions</p></div>
          </div>
        </>)}
        {tab === "users" && (<div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"><div className="p-4 border-b border-gray-800"><h2 className="font-bold">All Users ({users.length})</h2></div><div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-800"><tr><th className="text-left px-4 py-3 text-xs text-gray-400">User</th><th className="text-left px-4 py-3 text-xs text-gray-400">Plan</th><th className="text-left px-4 py-3 text-xs text-gray-400">Type</th><th className="text-left px-4 py-3 text-xs text-gray-400">Warranties</th><th className="text-left px-4 py-3 text-xs text-gray-400">Claims</th><th className="text-left px-4 py-3 text-xs text-gray-400">Joined</th></tr></thead><tbody className="divide-y divide-gray-800">{users.map(u => (<tr key={u.id} className="hover:bg-gray-800/50"><td className="px-4 py-3"><p className="text-sm font-medium">{u.full_name || "—"}</p><p className="text-xs text-gray-500">{u.email}</p></td><td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.plan_id === "pro" ? "bg-yellow-900 text-yellow-400" : u.plan_id === "enterprise" ? "bg-purple-900 text-purple-400" : "bg-gray-700 text-gray-400"}`}>{u.plan_id || "free"}</span></td><td className="px-4 py-3 text-sm text-gray-400">{u.account_type}</td><td className="px-4 py-3 text-sm">{u.warranty_count}</td><td className="px-4 py-3 text-sm">{u.claim_count}</td><td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.created_at)}</td></tr>))}</tbody></table></div></div>)}
      </div>
    </div>
  );
}
