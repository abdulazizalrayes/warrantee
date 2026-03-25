// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Clock, AlertTriangle, FileText, Plus, TrendingUp, Activity, DollarSign } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface DashboardStats { active_warranties: number; expiring_soon: number; pending_approval: number; total_warranties: number; open_claims: number; unread_notifications: number; }
interface RecentWarranty { id: string; product_name: string; product_name_ar: string | null; status: string; end_date: string; reference_number: string; seller_name: string | null; created_at: string; }
interface RecentActivity { id: string; action: string; entity_type: string; entity_id: string; metadata: Record<string, unknown> | null; created_at: string; }

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentWarranties, setRecentWarranties] = useState<RecentWarranty[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [expiringWarranties, setExpiringWarranties] = useState<RecentWarranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push(`/${locale}/auth`); return; }
    if (profile && !profile.onboarding_completed) { router.push(`/${locale}/onboarding`); return; }
    const fetchDashboardData = async () => {
      setLoading(true);
      const { data: statsData } = await supabase.rpc("get_user_dashboard_stats", { user_uuid: user.id });
      if (statsData) setStats(statsData as unknown as DashboardStats);
      const { data: warranties } = await supabase.from("warranties").select("id, product_name, product_name_ar, status, end_date, reference_number, seller_name, created_at").or(`created_by.eq.${user.id},recipient_user_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(5);
      if (warranties) setRecentWarranties(warranties as RecentWarranty[]);
      const { data: expiring } = await supabase.rpc("get_expiring_warranties", { days_ahead: 30 });
      if (expiring) setExpiringWarranties((expiring as RecentWarranty[]).slice(0, 5));
      const { data: activity } = await supabase.from("activity_log").select("id, action, entity_type, entity_id, metadata, created_at").eq("actor_id", user.id).order("created_at", { ascending: false }).limit(8);
      if (activity) setRecentActivity(activity as RecentActivity[]);

      // Fetch total warranty coverage value
      const { data: valueData } = await supabase
        .from("warranties")
        .select("coverage_amount")
        .or(`created_by.eq.${user.id},recipient_user_id.eq.${user.id}`)
        .in("status", ["active", "pending_approval"]);
      if (valueData) {
        const total = valueData.reduce((sum: number, w: { coverage_amount: number | null }) => sum + (w.coverage_amount || 0), 0);
        setTotalValue(total);
      }

      setLoading(false);
    };
    fetchDashboardData();
  }, [user, profile, authLoading, locale, router, supabase]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { active: "bg-green-100 text-green-800", pending_approval: "bg-yellow-100 text-yellow-800", draft: "bg-gray-100 text-gray-800", expired: "bg-red-100 text-red-800", claimed: "bg-blue-100 text-blue-800", cancelled: "bg-gray-100 text-gray-600" };
    return colors[status] || "bg-gray-100 text-gray-800";
  };
  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; ar: string }> = { active: { en: "Active", ar: "\u0646\u0634\u0637" }, pending_approval: { en: "Pending", ar: "\u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631" }, draft: { en: "Draft", ar: "\u0645\u0633\u0648\u062f\u0629" }, expired: { en: "Expired", ar: "\u0645\u0646\u062a\u0647\u064a" }, claimed: { en: "Claimed", ar: "\u0645\u0637\u0627\u0644\u0628" }, cancelled: { en: "Cancelled", ar: "\u0645\u0644\u063a\u064a" } };
    const l = labels[status] || { en: status, ar: status };
    return isRTL ? l.ar : l.en;
  };
  const getActivityLabel = (action: string) => {
    const labels: Record<string, { en: string; ar: string }> = { warranty_created: { en: "Created a warranty", ar: "\u0623\u0646\u0634\u0623 \u0636\u0645\u0627\u0646" }, warranty_approved: { en: "Approved a warranty", ar: "\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0636\u0645\u0627\u0646" }, warranty_claimed: { en: "Filed a claim", ar: "\u0642\u062f\u0645 \u0645\u0637\u0627\u0644\u0628\u0629" }, document_uploaded: { en: "Uploaded a document", ar: "\u0631\u0641\u0639 \u0645\u0633\u062a\u0646\u062f" }, warranty_extended: { en: "Extended a warranty", ar: "\u0645\u062f\u062f \u0636\u0645\u0627\u0646" }, certificate_generated: { en: "Generated certificate", ar: "\u0623\u0646\u0634\u0623 \u0634\u0647\u0627\u062f\u0629" } };
    const l = labels[action] || { en: action, ar: action };
    return isRTL ? l.ar : l.en;
  };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  const daysUntilExpiry = (endDate: string) => { const now = new Date(); const end = new Date(endDate); return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); };

  if (authLoading || loading) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div><p className="text-gray-600">{dict.common.loading}</p></div></div>);
  }

  return (
    <div dir={direction}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div><h1 className="text-2xl font-bold text-navy">{dict.dashboard.welcome}, {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}</h1><p className="text-gray-600 text-sm mt-1">{isRTL ? "\u0625\u0644\u064a\u0643 \u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0636\u0645\u0627\u0646\u0627\u062a\u0643" : "Here's an overview of your warranties"}</p></div>
        <Link href={`/${locale}/warranties/new`} className="bg-gold hover:bg-yellow-500 text-navy font-semibold py-2.5 px-5 rounded-lg transition flex items-center gap-2 w-fit"><Plus size={18} />{dict.warranty.create}</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition"><div className="flex items-center justify-between mb-3"><Shield size={24} className="text-green-600" /><span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1"><TrendingUp size={12} />{isRTL ? "\u0646\u0634\u0637" : "Active"}</span></div><p className="text-3xl font-bold text-navy">{stats?.active_warranties ?? 0}</p><p className="text-sm text-gray-600 mt-1">{dict.dashboard.active_warranties}</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition"><div className="flex items-center justify-between mb-3"><Clock size={24} className="text-yellow-600" /><span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">{isRTL ? "30 \u064a\u0648\u0645" : "30 days"}</span></div><p className="text-3xl font-bold text-navy">{stats?.expiring_soon ?? 0}</p><p className="text-sm text-gray-600 mt-1">{dict.dashboard.expiring_soon}</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition"><div className="flex items-center justify-between mb-3"><AlertTriangle size={24} className="text-orange-600" /></div><p className="text-3xl font-bold text-navy">{stats?.pending_approval ?? 0}</p><p className="text-sm text-gray-600 mt-1">{dict.dashboard.pending_approval}</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition"><div className="flex items-center justify-between mb-3"><FileText size={24} className="text-blue-600" /></div><p className="text-3xl font-bold text-navy">{stats?.total_warranties ?? 0}</p><p className="text-sm text-gray-600 mt-1">{dict.dashboard.total_managed}</p></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between"><h2 className="font-bold text-navy">{isRTL ? "\u0623\u062d\u062f\u062b \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a" : "Recent Warranties"}</h2><Link href={`/${locale}/warranties`} className="text-sm text-gold hover:text-yellow-600 font-medium transition">{dict.dashboard.view_all}</Link></div>
          <div className="divide-y divide-gray-100">
            {recentWarranties.length === 0 ? (<div className="p-8 text-center"><Shield size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-600 font-medium">{isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0645\u0627\u0646\u0627\u062a \u0628\u0639\u062f" : "No warranties yet"}</p><Link href={`/${locale}/warranties/new`} className="inline-flex items-center gap-2 mt-4 bg-gold hover:bg-yellow-500 text-navy font-semibold py-2 px-4 rounded-lg transition text-sm"><Plus size={16} />{dict.warranty.create}</Link></div>) : (
              recentWarranties.map((w) => (<Link key={w.id} href={`/${locale}/warranties/${w.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition"><div className="flex-1 min-w-0"><p className="font-medium text-navy truncate">{isRTL && w.product_name_ar ? w.product_name_ar : w.product_name}</p><p className="text-xs text-gray-500 mt-0.5">{w.reference_number}{w.seller_name && ` \u2022 ${w.seller_name}`}</p></div><div className="flex items-center gap-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(w.status)}`}>{getStatusLabel(w.status)}</span><span className="text-xs text-gray-500 hidden sm:block">{formatDate(w.end_date)}</span></div></Link>))
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200"><h2 className="font-bold text-navy flex items-center gap-2"><Clock size={18} className="text-yellow-600" />{dict.dashboard.expiring_soon}</h2></div>
            <div className="divide-y divide-gray-100">
              {expiringWarranties.length === 0 ? (<div className="p-6 text-center"><p className="text-sm text-gray-500">{isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0645\u0627\u0646\u0627\u062a \u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b" : "No warranties expiring soon"}</p></div>) : (
                expiringWarranties.map((w) => { const days = daysUntilExpiry(w.end_date); return (<Link key={w.id} href={`/${locale}/warranties/${w.id}`} className="flex items-center justify-between p-3 hover:bg-gray-50 transition"><p className="text-sm font-medium text-navy truncate flex-1">{isRTL && w.product_name_ar ? w.product_name_ar : w.product_name}</p><span className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 7 ? "bg-red-100 text-red-800" : days <= 15 ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800"}`}>{days} {isRTL ? "\u064a\u0648\u0645" : "days"}</span></Link>); })
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200"><h2 className="font-bold text-navy flex items-center gap-2"><Activity size={18} className="text-blue-600" />{dict.dashboard.recent_activity}</h2></div>
            <div className="divide-y divide-gray-100">
              {recentActivity.length === 0 ? (<div className="p-6 text-center"><p className="text-sm text-gray-500">{isRTL ? "\u0644\u0627 \u064a\u0648\u062c\u062f \u0646\u0634\u0627\u0637 \u0628\u0639\u062f" : "No activity yet"}</p></div>) : (
                recentActivity.map((a) => (<div key={a.id} className="p-3"><p className="text-sm text-navy">{getActivityLabel(a.action)}</p><p className="text-xs text-gray-400 mt-0.5">{formatDate(a.created_at)}</p></div>))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
