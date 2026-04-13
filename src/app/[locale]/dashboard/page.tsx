// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Clock, AlertTriangle, FileText, Plus, TrendingUp, Activity, ChevronRight } from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface DashboardStats {
  active_warranties: number;
  expiring_soon: number;
  pending_approval: number;
  total_warranties: number;
  open_claims: number;
  unread_notifications: number;
}

interface RecentWarranty {
  id: string;
  product_name: string;
  product_name_ar: string | null;
  status: string;
  end_date: string;
  reference_number: string;
  seller_name: string | null;
  created_at: string;
}

interface RecentActivity {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function DashboardPage() {
  const params = useParams() ?? {};
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
      setLoading(false);
    };
    fetchDashboardData();
  }, [user, profile, authLoading, locale, router, supabase]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-[#30d158]/10 text-[#248a3d]",
      pending_approval: "bg-[#ff9f0a]/10 text-[#c93400]",
      draft: "bg-[#f5f5f7] text-[#86868b]",
      expired: "bg-[#ff3b30]/10 text-[#ff3b30]",
      claimed: "bg-[#0071e3]/10 text-[#0071e3]",
      cancelled: "bg-[#f5f5f7] text-[#86868b]"
    };
    return colors[status] || "bg-[#f5f5f7] text-[#86868b]";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      active: { en: "Active", ar: "\u0646\u0634\u0637" },
      pending_approval: { en: "Pending", ar: "\u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631" },
      draft: { en: "Draft", ar: "\u0645\u0633\u0648\u062f\u0629" },
      expired: { en: "Expired", ar: "\u0645\u0646\u062a\u0647\u064a" },
      claimed: { en: "Claimed", ar: "\u0645\u0637\u0627\u0644\u0628" },
      cancelled: { en: "Cancelled", ar: "\u0645\u0644\u063a\u064a" }
    };
    const l = labels[status] || { en: status, ar: status };
    return isRTL ? l.ar : l.en;
  };

  const getActivityLabel = (action: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      warranty_created: { en: "Created a warranty", ar: "\u0623\u0646\u0634\u0623 \u0636\u0645\u0627\u0646" },
      warranty_approved: { en: "Approved a warranty", ar: "\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0636\u0645\u0627\u0646" },
      warranty_claimed: { en: "Filed a claim", ar: "\u0642\u062f\u0645 \u0645\u0637\u0627\u0644\u0628\u0629" },
      document_uploaded: { en: "Uploaded a document", ar: "\u0631\u0641\u0639 \u0645\u0633\u062a\u0646\u062f" },
      warranty_extended: { en: "Extended a warranty", ar: "\u0645\u062f\u062f \u0636\u0645\u0627\u0646" },
      certificate_generated: { en: "Generated certificate", ar: "\u0623\u0646\u0634\u0623 \u0634\u0647\u0627\u062f\u0629" }
    };
    const l = labels[action] || { en: action, ar: action };
    return isRTL ? l.ar : l.en;
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  const daysUntilExpiry = (endDate: string) => { const now = new Date(); const end = new Date(endDate); return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); };

  if (!mounted || authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1A1A2E] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[15px] text-[#86868b]">{dict.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
            {dict.dashboard.welcome}, {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}
          </h1>
          <p className="text-[17px] text-[#86868b] mt-1">
            {isRTL ? "\u0625\u0644\u064a\u0643 \u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0636\u0645\u0627\u0646\u0627\u062a\u0643" : "Here\u2019s an overview of your warranties"}
          </p>
        </div>
        <Link
          href={`/${locale}/warranties/new`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[15px] font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md w-fit"
        >
          <Plus size={18} />
          {dict.warranty.create}
        </Link>
      </div>

      <div className="mb-10 rounded-3xl bg-gradient-to-br from-[#1A1A2E] via-[#242446] to-[#2f2f5f] px-6 py-7 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/85">
              <Activity size={14} />
              {isRTL ? "لوحة تشغيل يومية" : "Daily operating view"}
            </div>
            <h2 className="mt-4 text-[28px] font-semibold tracking-tight">
              {isRTL ? "كل ما تحتاجه لإدارة الضمانات في مكان واحد" : "Everything you need to run warranties in one place"}
            </h2>
            <p className="mt-3 max-w-xl text-[15px] text-white/70">
              {isRTL
                ? "راقب الضمانات النشطة، التواريخ القريبة، النشاط الأخير، وابدأ الإجراءات الأساسية بسرعة من نفس الشاشة."
                : "Track active coverage, expiring items, recent activity, and launch key actions from one operating surface."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[440px]">
            <Link href={`/${locale}/warranties/new`} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
              <Plus size={18} className="text-[#f5d76e]" />
              <p className="mt-3 text-[13px] font-medium">{isRTL ? "إضافة ضمان" : "Create warranty"}</p>
              <p className="mt-1 text-[12px] text-white/60">{isRTL ? "إدخال يدوي كامل مع مستندات" : "Full manual entry with documents"}</p>
            </Link>
            <Link href={`/${locale}/warranties/import`} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
              <FileText size={18} className="text-[#5ac8fa]" />
              <p className="mt-3 text-[13px] font-medium">{isRTL ? "استيراد CSV" : "Bulk import"}</p>
              <p className="mt-1 text-[12px] text-white/60">{isRTL ? "رفع دفعات التشغيل أو البيانات القديمة" : "Bring in legacy or batch warranty lists"}</p>
            </Link>
            <Link href={`/${locale}/approval`} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
              <AlertTriangle size={18} className="text-[#30d158]" />
              <p className="mt-3 text-[13px] font-medium">{isRTL ? "الموافقات" : "Approvals"}</p>
              <p className="mt-1 text-[12px] text-white/60">{isRTL ? "راجع ما يحتاج قراراً سريعاً" : "Review items that need a decision"}</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white rounded-2xl p-6 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#30d158]/10 flex items-center justify-center">
              <Shield size={20} className="text-[#30d158]" />
            </div>
            <span className="text-[12px] font-medium text-[#30d158] bg-[#30d158]/10 px-2.5 py-1 rounded-full flex items-center gap-1">
              <TrendingUp size={11} />{isRTL ? "\u0646\u0634\u0637" : "Active"}
            </span>
          </div>
          <p className="text-[32px] font-semibold tracking-tight text-[#1d1d1f]">{stats?.active_warranties ?? 0}</p>
          <p className="text-[13px] text-[#86868b] mt-1">{dict.dashboard.active_warranties}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#ff9f0a]/10 flex items-center justify-center">
              <Clock size={20} className="text-[#ff9f0a]" />
            </div>
            <span className="text-[12px] font-medium text-[#ff9f0a] bg-[#ff9f0a]/10 px-2.5 py-1 rounded-full">
              {isRTL ? "30 \u064a\u0648\u0645" : "30 days"}
            </span>
          </div>
          <p className="text-[32px] font-semibold tracking-tight text-[#1d1d1f]">{stats?.expiring_soon ?? 0}</p>
          <p className="text-[13px] text-[#86868b] mt-1">{dict.dashboard.expiring_soon}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-[#ff3b30]" />
            </div>
          </div>
          <p className="text-[32px] font-semibold tracking-tight text-[#1d1d1f]">{stats?.pending_approval ?? 0}</p>
          <p className="text-[13px] text-[#86868b] mt-1">{dict.dashboard.pending_approval}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
              <FileText size={20} className="text-[#0071e3]" />
            </div>
          </div>
          <p className="text-[32px] font-semibold tracking-tight text-[#1d1d1f]">{stats?.total_warranties ?? 0}</p>
          <p className="text-[13px] text-[#86868b] mt-1">{dict.dashboard.total_managed}</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Warranties */}
        <div className="lg:col-span-2 bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#d2d2d7]/30 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
              {isRTL ? "\u0623\u062d\u062f\u062b \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a" : "Recent Warranties"}
            </h2>
            <Link href={`/${locale}/warranties`} className="text-[13px] font-medium text-[#0071e3] hover:text-[#0077ED] transition-colors flex items-center gap-1">
              {dict.dashboard.view_all}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[#d2d2d7]/20">
            {recentWarranties.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
                  <Shield size={28} className="text-[#86868b]" />
                </div>
                <p className="text-[17px] font-medium text-[#1d1d1f] mb-1">
                  {isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0645\u0627\u0646\u0627\u062a \u0628\u0639\u062f" : "No warranties yet"}
                </p>
                <p className="text-[13px] text-[#86868b] mb-5">
                  {isRTL ? "\u0623\u0646\u0634\u0626 \u0623\u0648\u0644 \u0636\u0645\u0627\u0646 \u0644\u0643" : "Create your first warranty to get started"}
                </p>
                <Link href={`/${locale}/warranties/new`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[14px] font-medium rounded-full transition-all">
                  <Plus size={16} />{dict.warranty.create}
                </Link>
              </div>
            ) : (
              recentWarranties.map((w) => (
                <Link key={w.id} href={`/${locale}/warranties/${w.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-[#f5f5f7]/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-[#1d1d1f] truncate">
                      {isRTL && w.product_name_ar ? w.product_name_ar : w.product_name}
                    </p>
                    <p className="text-[13px] text-[#86868b] mt-0.5">
                      {w.reference_number}{w.seller_name && ` \u2022 ${w.seller_name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[12px] px-2.5 py-1 rounded-full font-medium ${getStatusColor(w.status)}`}>
                      {getStatusLabel(w.status)}
                    </span>
                    <span className="text-[12px] text-[#86868b] hidden sm:block">{formatDate(w.end_date)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Expiring Soon */}
          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#d2d2d7]/30">
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Clock size={16} className="text-[#ff9f0a]" />
                {dict.dashboard.expiring_soon}
              </h2>
            </div>
            <div className="divide-y divide-[#d2d2d7]/20">
              {expiringWarranties.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] text-[#86868b]">
                    {isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0645\u0627\u0646\u0627\u062a \u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b" : "No warranties expiring soon"}
                  </p>
                </div>
              ) : (
                expiringWarranties.map((w) => {
                  const days = daysUntilExpiry(w.end_date);
                  return (
                    <Link key={w.id} href={`/${locale}/warranties/${w.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#f5f5f7]/50 transition-colors">
                      <p className="text-[14px] font-medium text-[#1d1d1f] truncate flex-1">
                        {isRTL && w.product_name_ar ? w.product_name_ar : w.product_name}
                      </p>
                      <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        days <= 7 ? "bg-[#ff3b30]/10 text-[#ff3b30]" : days <= 15 ? "bg-[#ff9f0a]/10 text-[#c93400]" : "bg-[#ff9f0a]/10 text-[#ff9f0a]"
                      }`}>
                        {days} {isRTL ? "\u064a\u0648\u0645" : "days"}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#d2d2d7]/30">
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Activity size={16} className="text-[#0071e3]" />
                {dict.dashboard.recent_activity}
              </h2>
            </div>
            <div className="divide-y divide-[#d2d2d7]/20">
              {recentActivity.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] text-[#86868b]">
                    {isRTL ? "\u0644\u0627 \u064a\u0648\u062c\u062f \u0646\u0634\u0627\u0637 \u0628\u0639\u062f" : "No activity yet"}
                  </p>
                </div>
              ) : (
                recentActivity.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <p className="text-[14px] text-[#1d1d1f]">{getActivityLabel(a.action)}</p>
                    <p className="text-[12px] text-[#86868b] mt-0.5">{formatDate(a.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
