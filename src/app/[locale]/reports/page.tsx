"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { FileText, Download, Calendar, Filter, BarChart3, PieChart, TrendingUp, Clock, Shield, AlertTriangle, CheckCircle, FileBarChart } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { PageViewTracker } from "@/components/PageViewTracker";
import { trackReportExport } from "@/lib/ga4-events";
import { fixMojibake } from "@/lib/fix-mojibake";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";

type ReportType = "warranty_summary" | "expiry_forecast" | "claims_overview" | "supplier_performance";
type TimeRange = "7d" | "30d" | "90d" | "12m" | "all";

type WarrantyReportRow = {
  id: string;
  status: string | null;
  end_date: string | null;
  created_at: string | null;
  category: string | null;
  seller_name: string | null;
  product_name: string | null;
};

type ClaimReportRow = {
  id: string;
  status: string | null;
  created_at: string | null;
};

type ReportMetric = {
  label: string;
  count: number;
  color: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function getTimeRangeStart(range: TimeRange) {
  if (range === "all") return null;

  const daysByRange: Record<Exclude<TimeRange, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "12m": 365,
  };

  return new Date(Date.now() - daysByRange[range] * DAY_MS);
}

function isDateInRange(value: string | null, range: TimeRange) {
  const start = getTimeRangeStart(range);
  if (!start) return true;
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start;
}

function warrantyEndDate(warranty: WarrantyReportRow) {
  if (!warranty.end_date) return null;

  const date = new Date(warranty.end_date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function effectiveStatus(warranty: WarrantyReportRow, now = new Date()) {
  const status = warranty.status || "active";
  const endDate = warrantyEndDate(warranty);

  if (status === "claimed") return "claimed";
  if (endDate && endDate < now) return "expired";

  return status;
}

function isExpiringSoon(warranty: WarrantyReportRow, now = new Date()) {
  const endDate = warrantyEndDate(warranty);
  return effectiveStatus(warranty, now) === "active" && !!endDate && endDate <= new Date(now.getTime() + 30 * DAY_MS);
}

function groupCounts(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export default function ReportsPage() {
  const params = useParams() ?? {};
  const locale = params?.locale as string || "en";
  const isRTL = locale === "ar";
  const { user } = useAuth();

  const [activeReport, setActiveReport] = useState<ReportType>("warranty_summary");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, expiring: 0, expired: 0, claimed: 0 });
  const [warranties, setWarranties] = useState<WarrantyReportRow[]>([]);
  const [claims, setClaims] = useState<ClaimReportRow[]>([]);
  const tr = (value: string) => (isRTL ? fixMojibake(value) : value);

  useEffect(() => {
    if (!user) {
      setWarranties([]);
      setClaims([]);
      setStats({ total: 0, active: 0, expiring: 0, expired: 0, claimed: 0 });
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("warranties")
        .select("id, status, end_date, created_at, category, seller_name, product_name")
        .or(buildWarrantyAccessOrClause(user.id));
      if (!error && data) {
        const now = new Date();
        const rows = data as WarrantyReportRow[];
        const warrantyIds = rows.map((warranty) => warranty.id);
        const { data: claimsData } = warrantyIds.length > 0
          ? await supabase
              .from("warranty_claims")
              .select("id, status, created_at, warranty_id")
              .in("warranty_id", warrantyIds)
          : { data: [] };
        setWarranties(rows);
        setClaims((claimsData || []) as ClaimReportRow[]);
        setStats({
          total: rows.length,
          active: rows.filter((w) => effectiveStatus(w, now) === "active").length,
          expiring: rows.filter((w) => isExpiringSoon(w, now)).length,
          expired: rows.filter((w) => effectiveStatus(w, now) === "expired").length,
          claimed: (claimsData || []).length,
        });
      } else {
        setWarranties([]);
        setClaims([]);
      }
      setLoading(false);
    };
    load();
  }, [user]);
  const reportTypes = [
    { id: "warranty_summary" as ReportType, icon: FileBarChart, label: isRTL ? tr("ÙÙØ®Øµ Ø§ÙØ¶ÙØ§ÙØ§Øª") : "Warranty Summary", desc: isRTL ? tr("ÙØ¸Ø±Ø© Ø¹Ø§ÙØ© Ø¹ÙÙ Ø¬ÙÙØ¹ Ø§ÙØ¶ÙØ§ÙØ§Øª") : "Overview of all warranties" },
    { id: "expiry_forecast" as ReportType, icon: Clock, label: isRTL ? tr("ØªÙÙØ¹Ø§Øª Ø§ÙØ§ÙØªÙØ§Ø¡") : "Expiry Forecast", desc: isRTL ? tr("Ø§ÙØ¶ÙØ§ÙØ§Øª Ø§ÙØªÙ Ø³ØªÙØªÙÙ ÙØ±ÙØ¨Ø§Ù") : "Warranties expiring soon" },
    { id: "claims_overview" as ReportType, icon: Shield, label: isRTL ? tr("ÙØ¸Ø±Ø© Ø¹ÙÙ Ø§ÙÙØ·Ø§ÙØ¨Ø§Øª") : "Claims Overview", desc: isRTL ? tr("Ø­Ø§ÙØ© Ø§ÙÙØ·Ø§ÙØ¨Ø§Øª ÙØ§ÙØªÙØ¯Ù") : "Claim status and progress" },
    { id: "supplier_performance" as ReportType, icon: TrendingUp, label: isRTL ? tr("Ø£Ø¯Ø§Ø¡ Ø§ÙÙÙØ±Ø¯ÙÙ") : "Supplier Performance", desc: isRTL ? tr("ØªÙÙÙÙ Ø§ÙÙÙØ±Ø¯ÙÙ ÙØ§ÙØ¨Ø§Ø¦Ø¹ÙÙ") : "Vendor and seller ratings" },
  ];

  const timeRanges: { id: TimeRange; label: string }[] = [
    { id: "7d", label: isRTL ? tr("7 Ø£ÙØ§Ù") : "7 days" },
    { id: "30d", label: isRTL ? tr("30 ÙÙÙ") : "30 days" },
    { id: "90d", label: isRTL ? tr("90 ÙÙÙ") : "90 days" },
    { id: "12m", label: isRTL ? tr("12 Ø´ÙØ±") : "12 months" },
    { id: "all", label: isRTL ? tr("Ø§ÙÙÙ") : "All time" },
  ];

  const summaryCards = [
    { label: isRTL ? tr("Ø¥Ø¬ÙØ§ÙÙ Ø§ÙØ¶ÙØ§ÙØ§Øª") : "Total Warranties", value: stats.total, icon: FileText, color: "#007aff" },
    { label: isRTL ? tr("ÙØ´Ø·Ø©") : "Active", value: stats.active, icon: CheckCircle, color: "#30d158" },
    { label: isRTL ? tr("ØªÙØªÙÙ ÙØ±ÙØ¨Ø§Ù") : "Expiring Soon", value: stats.expiring, icon: AlertTriangle, color: "#ff9f0a" },
    { label: isRTL ? tr("ÙÙØªÙÙØ©") : "Expired", value: stats.expired, icon: Clock, color: "#ff453a" },
  ];

  const filteredWarranties = warranties.filter((warranty) => isDateInRange(warranty.created_at, timeRange));
  const filteredClaims = claims.filter((claim) => isDateInRange(claim.created_at, timeRange));
  const statusRows: ReportMetric[] = [
    { label: isRTL ? tr("ÙØ´Ø·Ø©") : "Active", count: filteredWarranties.filter((w) => effectiveStatus(w) === "active" && !isExpiringSoon(w)).length, color: "#30d158" },
    { label: isRTL ? tr("ØªÙØªÙÙ ÙØ±ÙØ¨Ø§Ù") : "Expiring Soon", count: filteredWarranties.filter((w) => isExpiringSoon(w)).length, color: "#ff9f0a" },
    { label: isRTL ? tr("ÙÙØªÙÙØ©") : "Expired", count: filteredWarranties.filter((w) => effectiveStatus(w) === "expired").length, color: "#ff453a" },
    { label: isRTL ? tr("ÙØ·Ø§ÙØ¨Ø§Øª") : "Claimed", count: filteredWarranties.filter((w) => effectiveStatus(w) === "claimed").length, color: "#007aff" },
  ];
  const expiryRows: ReportMetric[] = [
    { label: isRTL ? "\u062e\u0644\u0627\u0644 7 \u0623\u064a\u0627\u0645" : "Next 7 days", count: filteredWarranties.filter((w) => {
      const endDate = warrantyEndDate(w);
      return !!endDate && endDate >= new Date() && endDate <= new Date(Date.now() + 7 * DAY_MS);
    }).length, color: "#ff9f0a" },
    { label: isRTL ? "\u062e\u0644\u0627\u0644 30 \u064a\u0648\u0645" : "Next 30 days", count: filteredWarranties.filter((w) => {
      const endDate = warrantyEndDate(w);
      return !!endDate && endDate >= new Date() && endDate <= new Date(Date.now() + 30 * DAY_MS);
    }).length, color: "#007aff" },
    { label: isRTL ? "\u062e\u0644\u0627\u0644 90 \u064a\u0648\u0645" : "Next 90 days", count: filteredWarranties.filter((w) => {
      const endDate = warrantyEndDate(w);
      return !!endDate && endDate >= new Date() && endDate <= new Date(Date.now() + 90 * DAY_MS);
    }).length, color: "#1A1A2E" },
    { label: isRTL ? tr("ÙÙØªÙÙØ©") : "Already expired", count: filteredWarranties.filter((w) => effectiveStatus(w) === "expired").length, color: "#ff453a" },
  ];
  const supplierCounts = groupCounts(filteredWarranties.map((warranty) => warranty.seller_name || (isRTL ? "\u063a\u064a\u0631 \u0645\u062d\u062f\u062f" : "Unspecified")));
  const supplierRows: ReportMetric[] = Object.entries(supplierCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, count], index) => ({ label, count, color: ["#1A1A2E", "#007aff", "#30d158", "#ff9f0a", "#ff453a", "#64d2ff"][index] || "#86868b" }));
  const claimCounts = groupCounts(filteredClaims.map((claim) => claim.status || (isRTL ? "\u063a\u064a\u0631 \u0645\u062d\u062f\u062f" : "Unspecified")));
  const claimRows: ReportMetric[] = Object.entries(claimCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count], index) => ({ label, count, color: ["#007aff", "#ff9f0a", "#30d158", "#ff453a", "#1A1A2E"][index] || "#86868b" }));
  const reportRows: ReportMetric[] = activeReport === "expiry_forecast"
    ? expiryRows
    : activeReport === "claims_overview"
      ? claimRows
      : activeReport === "supplier_performance"
        ? supplierRows
        : statusRows;
  const maxReportCount = Math.max(...reportRows.map((row) => row.count), 1);
  const reportTotal = activeReport === "claims_overview" ? filteredClaims.length : filteredWarranties.length;
  const exportType = activeReport === "claims_overview" ? "claims" : "warranties";
  const hasExportableData = !!user && !loading && (exportType === "claims" ? claims.length > 0 : stats.total > 0);

  const handleCsvExport = () => {
    if (!hasExportableData) return;

    trackReportExport({ locale, source: "reports_hub", report_type: activeReport, time_range: timeRange });
    window.location.href = `/api/export?format=csv&type=${exportType}`;
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-8">
      {!user && !loading ? (
        <DashboardPageShell
          eyebrow={isRTL ? "\u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631" : "Reporting hub"}
          title={isRTL ? "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631" : "Reports"}
          subtitle={isRTL ? "\u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0648\u0644\u0627\u064b \u0644\u0639\u0631\u0636 \u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631." : "Sign in to access reporting and export workflows."}
          crumbs={[
            { label: "Dashboard", href: `/${locale}/dashboard` },
            { label: isRTL ? "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631" : "Reports" },
          ]}
        >
          <div className="min-h-[40vh] flex items-center justify-center rounded-2xl bg-white ring-1 ring-[#d2d2d7]/40 shadow-sm">
            <p className="text-[15px] font-medium text-[#1d1d1f]">
              {isRTL ? "\u064a\u0631\u062c\u0649 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0639\u0631\u0636 \u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631." : "Please sign in to view reports."}
            </p>
          </div>
        </DashboardPageShell>
      ) : null}
      {!user && !loading ? null : (
      <>
      <PageViewTracker
        pageName="reports_hub"
        pageType="analytics"
        locale={locale}
        extra={{ report_type: activeReport, time_range: timeRange }}
      />
      <DashboardPageShell
        eyebrow={isRTL ? "\u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631" : "Reporting hub"}
        title={isRTL ? "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631" : "Reports"}
        subtitle={isRTL ? "\u062a\u0642\u0627\u0631\u064a\u0631 \u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0644\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0648\u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621 \u0648\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a." : "Operational reporting for warranty coverage, expiries, claims, and portfolio health."}
        crumbs={[
          { label: "Dashboard", href: `/${locale}/dashboard` },
          { label: isRTL ? "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631" : "Reports" },
        ]}
        stats={[
          { label: isRTL ? "\u0625\u062c\u0645\u0627\u0644\u064a" : "Total", value: stats.total },
          { label: isRTL ? "\u0646\u0634\u0637\u0629" : "Active", value: stats.active, tone: "success" },
          { label: isRTL ? "\u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b" : "Expiring", value: stats.expiring, tone: "warning" },
          { label: isRTL ? "\u0645\u0637\u0627\u0644\u0628\u0627\u062a" : "Claimed", value: stats.claimed },
        ]}
        auditNote={isRTL ? "\u062d\u0631\u0643\u0629 \u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631 \u0648\u0627\u0644\u062a\u0635\u062f\u064a\u0631 \u0645\u0631\u0635\u0648\u062f\u0629 \u0644\u062a\u062d\u0644\u064a\u0644 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0625\u062f\u0627\u0631\u0629." : "Report navigation and export intent are now tracked so this surface can be audited before rollout."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCsvExport}
              disabled={!hasExportableData}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A1A2E] text-white rounded-full text-[14px] font-medium hover:bg-[#2d2d5e] transition-colors disabled:cursor-not-allowed disabled:bg-[#d2d2d7] disabled:text-[#6e6e73]"
              title={!hasExportableData ? (isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631" : "No warranty data to export") : undefined}
            >
              <Download className="w-4 h-4" />
              {isRTL ? "\u062a\u0646\u0632\u064a\u0644 CSV" : "Download CSV"}
            </button>
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-[#86868b] ring-1 ring-[#d2d2d7]/60"
              title={isRTL ? "\u062a\u0635\u062f\u064a\u0631 PDF \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u062d\u0627\u0644\u064a\u0627\u064b" : "PDF export is not available yet"}
            >
              <FileText className="w-4 h-4" />
              {isRTL ? "PDF \u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "PDF unavailable"}
            </button>
          </div>
        }
      >
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
              {isRTL ? tr("Ø§ÙØªÙØ§Ø±ÙØ±") : "Reports"}
            </h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              {isRTL ? tr("ØªØ­ÙÙÙØ§Øª ÙØ±Ø¤Ù Ø­ÙÙ Ø¶ÙØ§ÙØ§ØªÙ") : "Analytics and insights about your warranties"}
            </p>
          </div>
        </div>

        {/* Time Range Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {timeRanges.map((tr) => (
            <button
              key={tr.id}
              onClick={() => setTimeRange(tr.id)}
              className={"px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all " + (timeRange === tr.id ? "bg-[#1A1A2E] text-white shadow-sm" : "bg-white text-[#1d1d1f] ring-1 ring-[#d2d2d7]/40 hover:bg-[#f0f0f2]")}
            >
              {tr.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryCards.map((card, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 ring-1 ring-[#d2d2d7]/40 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + "14" }}>
                  <card.icon className="w-[18px] h-[18px]" style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                {loading ? <div className="h-8 w-16 bg-[#f5f5f7] rounded-lg animate-pulse" /> : card.value}
              </div>
              <div className="text-[13px] text-[#86868b] mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Report Type Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#d2d2d7]/30">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f]">
                  {isRTL ? tr("ÙÙØ¹ Ø§ÙØªÙØ±ÙØ±") : "Report Type"}
                </h2>
              </div>
              <div className="p-2">
                {reportTypes.map((rt) => {
                  const Icon = rt.icon;
                  return (
                    <button
                      key={rt.id}
                      onClick={() => setActiveReport(rt.id)}
                      className={"w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all " + (activeReport === rt.id ? "bg-[#1A1A2E] text-white" : "text-[#1d1d1f] hover:bg-[#f5f5f7]")}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className={"text-[14px] font-medium " + (activeReport === rt.id ? "text-white" : "text-[#1d1d1f]")}>{rt.label}</div>
                        <div className={"text-[12px] " + (activeReport === rt.id ? "text-white/70" : "text-[#86868b]")}>{rt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Chart Area */}
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                  {reportTypes.find((r) => r.id === activeReport)?.label}
                </h2>
                <div className="flex items-center gap-2 text-[13px] text-[#86868b]">
                  <Calendar className="w-4 h-4" />
                  {timeRanges.find((t) => t.id === timeRange)?.label}
                </div>
              </div>

              {/* Dynamic report bars */}
              <div className="relative h-64 bg-gradient-to-br from-[#f5f5f7] to-white rounded-xl overflow-hidden">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportRows.length === 0 || reportRows.every((row) => row.count === 0) ? (
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] text-[#86868b]">
                    {isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u062d\u0642\u064a\u0642\u064a\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0641\u064a \u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0645\u062d\u062f\u062f." : "No real data is available for this report in the selected range."}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-end justify-around gap-3 px-6 pb-4 pt-8">
                    {reportRows.map((row) => (
                      <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <span className="text-[12px] font-medium text-[#1d1d1f]">{row.count}</span>
                        <div
                          className="w-full max-w-[56px] rounded-t-lg transition-all duration-700"
                          style={{
                            height: `${Math.max((row.count / maxReportCount) * 150, 8)}px`,
                            backgroundColor: row.color,
                          }}
                        />
                        <span className="w-full truncate text-center text-[11px] text-[#86868b]" title={row.label}>{row.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#d2d2d7]/30 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f]">
                  {isRTL ? tr("ØªÙØ§ØµÙÙ Ø§ÙØ­Ø§ÙØ©") : "Report Breakdown"}
                </h2>
                <Filter className="w-4 h-4 text-[#86868b]" />
              </div>
              <div className="divide-y divide-[#d2d2d7]/30">
                {reportRows.map((row) => {
                  const pct = reportTotal ? Math.round((row.count / reportTotal) * 100) : 0;

                  return (
                    <div key={row.label} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[14px] text-[#1d1d1f]">{row.label}</span>
                          <span className="text-[14px] font-medium text-[#1d1d1f]">{row.count}</span>
                        </div>
                        <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + "%", backgroundColor: row.color }} />
                        </div>
                      </div>
                      <span className="text-[13px] text-[#86868b] w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: BarChart3, label: isRTL ? tr("ØªÙØ±ÙØ± Ø´ÙØ±Ù") : "Monthly Report", desc: isRTL ? tr("ÙÙØ®Øµ Ø´ÙØ±Ù ÙØ§ÙÙ") : "Full monthly summary" },
                { icon: PieChart, label: isRTL ? tr("ØªÙØ²ÙØ¹ Ø§ÙÙØ¦Ø§Øª") : "Category Split", desc: isRTL ? tr("ØªÙØ³ÙÙ Ø­Ø³Ø¨ Ø§ÙÙØ¦Ø©") : "Breakdown by category" },
                { icon: TrendingUp, label: isRTL ? tr("ØªØ­ÙÙÙ Ø§ÙØ§ØªØ¬Ø§Ù") : "Trend Analysis", desc: isRTL ? tr("Ø§ØªØ¬Ø§ÙØ§Øª Ø§ÙØ¶ÙØ§Ù") : "Warranty trends over time" },
              ].map((action, i) => (
                <button
                  key={i}
                  disabled
                  className="cursor-not-allowed bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5 text-left opacity-75"
                  title={isRTL ? "\u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u062d\u0627\u0644\u064a\u0627\u064b" : "This report action is not available yet"}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-3">
                    <action.icon className="w-5 h-5 text-[#86868b]" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[14px] font-medium text-[#1d1d1f]">{action.label}</div>
                    <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[11px] font-medium text-[#86868b]">
                      {isRTL ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "Unavailable"}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#86868b] mt-0.5">{action.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </DashboardPageShell>
      </>
      )}
    </div>
  );
}
