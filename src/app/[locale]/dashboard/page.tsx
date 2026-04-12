// @ts-nocheck
"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  CheckSquare,
  Activity,
  Building2,
  Users,
  ChevronRight,
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const APPROVER_ROLES = new Set(["approver", "company_admin", "platform_admin", "admin", "super_admin"]);

const dashboardUi = {
  en: {
    buyerTitle: "Buyer Dashboard",
    sellerTitle: "Seller Dashboard",
    adminTitle: "Admin Dashboard",
    buyerSubtitle: "Track warranties you received and your claim progress.",
    sellerSubtitle: "Manage issued warranties, approvals, and draft submissions.",
    adminSubtitle: "Monitor company-level warranty and approval health.",
    received: "Warranties Received",
    issued: "Warranties Issued",
    drafts: "Draft Warranties",
    approvalQueue: "Approval Queue",
    companyTotal: "Company Warranties",
    companyExpired: "Company Expired",
    openClaims: "Open Claims",
    expiringSoon: "Expiring Soon",
    activeCoverage: "Active Coverage",
    pendingApproval: "Pending Approval",
    noWarranties: "No warranties found for this view yet.",
    createFirst: "Create your first warranty",
    recentWarranties: "Recent Warranties",
    recentActivity: "Recent Activity",
    noActivity: "No activity yet",
    viewAll: "View all",
    days: "days",
    fromQueue: "Open queue",
    companySnapshot: "Company Snapshot",
    status: {
      active: "Active",
      pending_approval: "Pending Approval",
      draft: "Draft",
      expired: "Expired",
      claimed: "Claimed",
      cancelled: "Cancelled",
    },
  },
  ar: {
    buyerTitle: "\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0634\u062a\u0631\u064a",
    sellerTitle: "\u0644\u0648\u062d\u0629 \u0627\u0644\u0628\u0627\u0626\u0639",
    adminTitle: "\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0634\u0631\u0641",
    buyerSubtitle: "\u062a\u0627\u0628\u0639 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u064a \u0627\u0633\u062a\u0644\u0645\u062a\u0647\u0627 \u0648\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a.",
    sellerSubtitle: "\u0623\u062f\u0631 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0635\u0627\u062f\u0631\u0629 \u0648\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a \u0648\u0627\u0644\u0645\u0633\u0648\u062f\u0627\u062a.",
    adminSubtitle: "\u0631\u0627\u0642\u0628 \u0648\u0636\u0639 \u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629 \u0648\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a.",
    received: "\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0644\u0645\u0629",
    issued: "\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0635\u0627\u062f\u0631\u0629",
    drafts: "\u0627\u0644\u0645\u0633\u0648\u062f\u0627\u062a",
    approvalQueue: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a",
    companyTotal: "\u0636\u0645\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629",
    companyExpired: "\u0645\u0646\u062a\u0647\u064a\u0629 \u0641\u064a \u0627\u0644\u0634\u0631\u0643\u0629",
    openClaims: "\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629",
    expiringSoon: "\u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b",
    activeCoverage: "\u0627\u0644\u062a\u063a\u0637\u064a\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629",
    pendingApproval: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629",
    noWarranties: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0636\u0645\u0627\u0646\u0627\u062a \u0644\u0647\u0630\u0627 \u0627\u0644\u0639\u0631\u0636 \u062d\u062a\u0649 \u0627\u0644\u0622\u0646.",
    createFirst: "\u0623\u0646\u0634\u0626 \u0623\u0648\u0644 \u0636\u0645\u0627\u0646",
    recentWarranties: "\u0623\u062d\u062f\u062b \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a",
    recentActivity: "\u0622\u062e\u0631 \u0627\u0644\u0646\u0634\u0627\u0637",
    noActivity: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0646\u0634\u0627\u0637 \u0628\u0639\u062f",
    viewAll: "\u0639\u0631\u0636 \u0627\u0644\u0643\u0644",
    days: "\u064a\u0648\u0645",
    fromQueue: "\u0627\u0641\u062a\u062d \u0627\u0644\u0642\u0627\u0626\u0645\u0629",
    companySnapshot: "\u0644\u0645\u062d\u0629 \u0639\u0646 \u0627\u0644\u0634\u0631\u0643\u0629",
    status: {
      active: "\u0646\u0634\u0637",
      pending_approval: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629",
      draft: "\u0645\u0633\u0648\u062f\u0629",
      expired: "\u0645\u0646\u062a\u0647\u064a",
      claimed: "\u0645\u0637\u0627\u0644\u0628",
      cancelled: "\u0645\u0644\u063a\u064a",
    },
  },
};

function resolveViewMode(searchParams: URLSearchParams, profileRole?: string): "buyer" | "seller" {
  const queryView = searchParams.get("view");
  if (queryView === "buyer" || queryView === "seller") {
    return queryView;
  }
  if (profileRole === "seller") {
    return "seller";
  }
  return "buyer";
}

function daysUntil(dateValue?: string) {
  if (!dateValue) return null;
  const end = new Date(dateValue);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateValue: string, locale: string) {
  return new Date(dateValue).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DashboardPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const direction = DIRECTION[locale as Locale];
  const t = dashboardUi[locale as "en" | "ar"] || dashboardUi.en;

  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [companyWarranties, setCompanyWarranties] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  const viewMode = useMemo(() => resolveViewMode(searchParams, profile?.role), [searchParams, profile?.role]);
  const isApprover = APPROVER_ROLES.has(profile?.role || "");
  const isAdmin = profile?.role === "company_admin" || profile?.role === "platform_admin" || profile?.role === "admin" || profile?.role === "super_admin";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/${locale}/auth`);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const sellerFilter = `issuer_user_id.eq.${user.id},created_by.eq.${user.id}`;
      const buyerFilter = `recipient_user_id.eq.${user.id},buyer_id.eq.${user.id},user_id.eq.${user.id}`;
      const ownershipFilter = viewMode === "seller" ? sellerFilter : buyerFilter;

      const { data: warrantyRows } = await supabase
        .from("warranties")
        .select("id, reference_number, product_name, product_name_ar, status, end_date, created_at, issuer_user_id, recipient_user_id, created_by, company_id")
        .or(ownershipFilter)
        .order("created_at", { ascending: false })
        .limit(60);

      const safeWarranties = warrantyRows || [];
      setWarranties(safeWarranties);

      const warrantyIds = safeWarranties.map((entry) => entry.id);
      if (warrantyIds.length > 0) {
        const { data: claimRows } = await supabase
          .from("warranty_claims")
          .select("id, warranty_id, title, status, created_at")
          .in("warranty_id", warrantyIds)
          .order("created_at", { ascending: false })
          .limit(40);
        setClaims(claimRows || []);
      } else {
        setClaims([]);
      }

      const { data: activityRows } = await supabase
        .from("activity_log")
        .select("id, action, created_at")
        .eq("actor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setActivity(activityRows || []);

      if (isAdmin && profile?.company_id) {
        const { data: companyRows } = await supabase
          .from("warranties")
          .select("id, status, end_date, created_at")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false })
          .limit(200);
        setCompanyWarranties(companyRows || []);
      } else {
        setCompanyWarranties([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, profile, authLoading, locale, router, supabase, viewMode, isAdmin]);

  const overview = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const active = warranties.filter((item) => item.status === "active");
    const expiringSoon = active.filter((item) => {
      if (!item.end_date) return false;
      const end = new Date(item.end_date);
      return end <= soon;
    });

    const pendingApproval = warranties.filter((item) => item.status === "pending_approval");
    const drafts = warranties.filter((item) => item.status === "draft");
    const expired = warranties.filter((item) => {
      if (!item.end_date) return false;
      return new Date(item.end_date) <= now || item.status === "expired";
    });

    return {
      total: warranties.length,
      active: active.length,
      expiringSoon: expiringSoon.length,
      pendingApproval: pendingApproval.length,
      drafts: drafts.length,
      expired: expired.length,
      openClaims: claims.filter((item) => item.status !== "resolved" && item.status !== "closed").length,
    };
  }, [warranties, claims]);

  const companyStats = useMemo(() => {
    const now = new Date();
    return {
      total: companyWarranties.length,
      active: companyWarranties.filter((item) => item.status === "active").length,
      pendingApproval: companyWarranties.filter((item) => item.status === "pending_approval").length,
      expired: companyWarranties.filter((item) => item.status === "expired" || (item.end_date && new Date(item.end_date) <= now)).length,
    };
  }, [companyWarranties]);

  const pageTitle = isAdmin
    ? t.adminTitle
    : viewMode === "seller"
      ? t.sellerTitle
      : t.buyerTitle;

  const pageSubtitle = isAdmin
    ? t.adminSubtitle
    : viewMode === "seller"
      ? t.sellerSubtitle
      : t.buyerSubtitle;

  const cards = isAdmin
    ? [
        { icon: Building2, label: t.companyTotal, value: companyStats.total, color: "text-[#0071e3]", bg: "bg-[#e5f1ff]" },
        { icon: Shield, label: dict.dashboard.active_warranties, value: companyStats.active, color: "text-[#30d158]", bg: "bg-[#e8f9ed]" },
        { icon: CheckSquare, label: t.pendingApproval, value: companyStats.pendingApproval, color: "text-[#ff9f0a]", bg: "bg-[#fff6e5]" },
        { icon: AlertTriangle, label: t.companyExpired, value: companyStats.expired, color: "text-[#ff3b30]", bg: "bg-[#feeeed]" },
      ]
    : viewMode === "seller"
      ? [
          { icon: Shield, label: t.issued, value: overview.total, color: "text-[#0071e3]", bg: "bg-[#e5f1ff]" },
          { icon: CheckSquare, label: t.approvalQueue, value: overview.pendingApproval, color: "text-[#ff9f0a]", bg: "bg-[#fff6e5]" },
          { icon: FileText, label: t.drafts, value: overview.drafts, color: "text-[#86868b]", bg: "bg-[#f5f5f7]" },
          { icon: Shield, label: dict.dashboard.active_warranties, value: overview.active, color: "text-[#30d158]", bg: "bg-[#e8f9ed]" },
        ]
      : [
          { icon: Users, label: t.received, value: overview.total, color: "text-[#0071e3]", bg: "bg-[#e5f1ff]" },
          { icon: Shield, label: t.activeCoverage, value: overview.active, color: "text-[#30d158]", bg: "bg-[#e8f9ed]" },
          { icon: Clock, label: t.expiringSoon, value: overview.expiringSoon, color: "text-[#ff9f0a]", bg: "bg-[#fff6e5]" },
          { icon: AlertTriangle, label: t.openClaims, value: overview.openClaims, color: "text-[#ff3b30]", bg: "bg-[#feeeed]" },
        ];

  const queueItems = warranties.filter((entry) => entry.status === "pending_approval").slice(0, 5);
  const recentWarranties = warranties.slice(0, 8);

  if (!mounted || authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir={direction}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1A1A2E] border-t-transparent mx-auto mb-4" />
          <p className="text-[15px] text-[#86868b]">{dict.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={direction} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">{pageTitle}</h1>
          <p className="text-[15px] text-[#86868b] mt-1">{pageSubtitle}</p>
        </div>
        {viewMode === "seller" && (
          <Link
            href={`/${locale}/warranties/new?view=seller`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[15px] font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md w-fit"
          >
            <Plus size={18} />
            {dict.warranty.create}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-6 ring-1 ring-[#d2d2d7]/40 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon size={20} className={card.color} />
              </div>
            </div>
            <p className="text-[32px] font-semibold tracking-tight text-[#1d1d1f]">{card.value}</p>
            <p className="text-[13px] text-[#86868b] mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {isApprover && (
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#d2d2d7]/30 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                  <CheckSquare size={16} className="text-[#ff9f0a]" />
                  {t.approvalQueue}
                </h2>
                <Link href={`/${locale}/approval?view=${viewMode}`} className="text-[13px] font-medium text-[#0071e3] hover:text-[#0077ED] transition-colors">
                  {t.fromQueue}
                </Link>
              </div>
              <div className="divide-y divide-[#d2d2d7]/20">
                {queueItems.length === 0 ? (
                  <div className="p-6 text-[14px] text-[#86868b]">{t.noWarranties}</div>
                ) : (
                  queueItems.map((item) => (
                    <Link key={item.id} href={`/${locale}/approval/${item.id}?view=${viewMode}`} className="flex items-center justify-between px-6 py-4 hover:bg-[#f5f5f7]/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-[#1d1d1f] truncate">{locale === "ar" && item.product_name_ar ? item.product_name_ar : item.product_name}</p>
                        <p className="text-[12px] text-[#86868b] mt-1">{item.reference_number || item.id}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#86868b]" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#d2d2d7]/30 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">{t.recentWarranties}</h2>
              <Link href={`/${locale}/warranties?view=${viewMode}`} className="text-[13px] font-medium text-[#0071e3] hover:text-[#0077ED] transition-colors flex items-center gap-1">
                {t.viewAll}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-[#d2d2d7]/20">
              {recentWarranties.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[15px] text-[#86868b] mb-4">{t.noWarranties}</p>
                  {viewMode === "seller" && (
                    <Link href={`/${locale}/warranties/new?view=seller`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[14px] font-medium rounded-full transition-all">
                      <Plus size={16} />
                      {t.createFirst}
                    </Link>
                  )}
                </div>
              ) : (
                recentWarranties.map((item) => {
                  const remaining = daysUntil(item.end_date);
                  const statusLabel = (t.status as Record<string, string>)[item.status] || item.status;
                  const statusClasses = item.status === "active"
                    ? "bg-[#30d158]/10 text-[#248a3d]"
                    : item.status === "pending_approval"
                      ? "bg-[#ff9f0a]/10 text-[#c93400]"
                      : item.status === "expired"
                        ? "bg-[#ff3b30]/10 text-[#ff3b30]"
                        : "bg-[#f5f5f7] text-[#86868b]";

                  return (
                    <Link key={item.id} href={`/${locale}/warranties/${item.id}?view=${viewMode}`} className="flex items-center justify-between px-6 py-4 hover:bg-[#f5f5f7]/50 transition-colors">
                      <div className="min-w-0 pr-4">
                        <p className="text-[15px] font-medium text-[#1d1d1f] truncate">{locale === "ar" && item.product_name_ar ? item.product_name_ar : item.product_name}</p>
                        <p className="text-[12px] text-[#86868b] mt-1">{item.reference_number || item.id}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[12px] px-2.5 py-1 rounded-full font-medium ${statusClasses}`}>{statusLabel}</span>
                        <span className="text-[12px] text-[#86868b] hidden sm:block">
                          {remaining !== null ? `${remaining} ${t.days}` : formatDate(item.created_at, locale)}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {isAdmin && (
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-[#0071e3]" />
                {t.companySnapshot}
              </h3>
              <div className="space-y-3 text-[14px]">
                <div className="flex items-center justify-between"><span className="text-[#86868b]">{t.companyTotal}</span><span className="font-semibold text-[#1d1d1f]">{companyStats.total}</span></div>
                <div className="flex items-center justify-between"><span className="text-[#86868b]">{dict.dashboard.active_warranties}</span><span className="font-semibold text-[#1d1d1f]">{companyStats.active}</span></div>
                <div className="flex items-center justify-between"><span className="text-[#86868b]">{t.pendingApproval}</span><span className="font-semibold text-[#1d1d1f]">{companyStats.pendingApproval}</span></div>
                <div className="flex items-center justify-between"><span className="text-[#86868b]">{t.companyExpired}</span><span className="font-semibold text-[#1d1d1f]">{companyStats.expired}</span></div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#d2d2d7]/30">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Activity size={16} className="text-[#0071e3]" />
                {t.recentActivity}
              </h3>
            </div>
            <div className="divide-y divide-[#d2d2d7]/20">
              {activity.length === 0 ? (
                <div className="p-6 text-[13px] text-[#86868b]">{t.noActivity}</div>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="px-5 py-3">
                    <p className="text-[14px] text-[#1d1d1f]">{item.action}</p>
                    <p className="text-[12px] text-[#86868b] mt-0.5">{formatDate(item.created_at, locale)}</p>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a06800]" /></div>}>
      <DashboardPageInner />
    </Suspense>
  );
}
