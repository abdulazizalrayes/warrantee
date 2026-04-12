"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { FileText, Download, Calendar, Filter, BarChart3, PieChart, TrendingUp, Clock, Shield, AlertTriangle, CheckCircle, FileBarChart } from "lucide-react";

type ReportType = "warranty_summary" | "expiry_forecast" | "claims_overview" | "supplier_performance";
type TimeRange = "7d" | "30d" | "90d" | "12m" | "all";

export default function ReportsPage() {
  const params = useParams();
  const locale = params?.locale as string || "en";
  const isRTL = locale === "ar";
  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [activeReport, setActiveReport] = useState<ReportType>("warranty_summary");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, expiring: 0, expired: 0, claimed: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("warranties")
        .select("status, end_date, created_at")
        .eq("user_id", user.id);
      if (!error && data) {
        const now = new Date();
        const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        setStats({
          total: data.length,
          active: data.filter((w: any) => w.status === "active").length,
          expiring: data.filter((w: any) => w.status === "active" && new Date(w.end_date) <= soon).length,
          expired: data.filter((w: any) => w.status === "expired").length,
          claimed: data.filter((w: any) => w.status === "claimed").length,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);
  const reportTypes = [
    { id: "warranty_summary" as ReportType, icon: FileBarChart, label: isRTL ? "ÙÙØ®Øµ Ø§ÙØ¶ÙØ§ÙØ§Øª" : "Warranty Summary", desc: isRTL ? "ÙØ¸Ø±Ø© Ø¹Ø§ÙØ© Ø¹ÙÙ Ø¬ÙÙØ¹ Ø§ÙØ¶ÙØ§ÙØ§Øª" : "Overview of all warranties" },
    { id: "expiry_forecast" as ReportType, icon: Clock, label: isRTL ? "ØªÙÙØ¹Ø§Øª Ø§ÙØ§ÙØªÙØ§Ø¡" : "Expiry Forecast", desc: isRTL ? "Ø§ÙØ¶ÙØ§ÙØ§Øª Ø§ÙØªÙ Ø³ØªÙØªÙÙ ÙØ±ÙØ¨Ø§Ù" : "Warranties expiring soon" },
    { id: "claims_overview" as ReportType, icon: Shield, label: isRTL ? "ÙØ¸Ø±Ø© Ø¹ÙÙ Ø§ÙÙØ·Ø§ÙØ¨Ø§Øª" : "Claims Overview", desc: isRTL ? "Ø­Ø§ÙØ© Ø§ÙÙØ·Ø§ÙØ¨Ø§Øª ÙØ§ÙØªÙØ¯Ù" : "Claim status and progress" },
    { id: "supplier_performance" as ReportType, icon: TrendingUp, label: isRTL ? "Ø£Ø¯Ø§Ø¡ Ø§ÙÙÙØ±Ø¯ÙÙ" : "Supplier Performance", desc: isRTL ? "ØªÙÙÙÙ Ø§ÙÙÙØ±Ø¯ÙÙ ÙØ§ÙØ¨Ø§Ø¦Ø¹ÙÙ" : "Vendor and seller ratings" },
  ];

  const timeRanges: { id: TimeRange; label: string }[] = [
    { id: "7d", label: isRTL ? "7 Ø£ÙØ§Ù" : "7 days" },
    { id: "30d", label: isRTL ? "30 ÙÙÙ" : "30 days" },
    { id: "90d", label: isRTL ? "90 ÙÙÙ" : "90 days" },
    { id: "12m", label: isRTL ? "12 Ø´ÙØ±" : "12 months" },
    { id: "all", label: isRTL ? "Ø§ÙÙÙ" : "All time" },
  ];

  const summaryCards = [
    { label: isRTL ? "Ø¥Ø¬ÙØ§ÙÙ Ø§ÙØ¶ÙØ§ÙØ§Øª" : "Total Warranties", value: stats.total, icon: FileText, color: "#007aff" },
    { label: isRTL ? "ÙØ´Ø·Ø©" : "Active", value: stats.active, icon: CheckCircle, color: "#30d158" },
    { label: isRTL ? "ØªÙØªÙÙ ÙØ±ÙØ¨Ø§Ù" : "Expiring Soon", value: stats.expiring, icon: AlertTriangle, color: "#ff9f0a" },
    { label: isRTL ? "ÙÙØªÙÙØ©" : "Expired", value: stats.expired, icon: Clock, color: "#ff453a" },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-8">
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
              {isRTL ? "Ø§ÙØªÙØ§Ø±ÙØ±" : "Reports"}
            </h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              {isRTL ? "ØªØ­ÙÙÙØ§Øª ÙØ±Ø¤Ù Ø­ÙÙ Ø¶ÙØ§ÙØ§ØªÙ" : "Analytics and insights about your warranties"}
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A1A2E] text-white rounded-full text-[14px] font-medium hover:bg-[#2d2d5e] transition-colors">
            <Download className="w-4 h-4" />
            {isRTL ? "ØªØµØ¯ÙØ± PDF" : "Export PDF"}
          </button>
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
                  {isRTL ? "ÙÙØ¹ Ø§ÙØªÙØ±ÙØ±" : "Report Type"}
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

              {/* Visual Chart Placeholder */}
              <div className="relative h-64 bg-gradient-to-br from-[#f5f5f7] to-white rounded-xl overflow-hidden">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-end justify-around px-6 pb-4">
                    {[65, 40, 80, 55, 90, 35, 70, 50, 85, 45, 75, 60].map((h, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1 max-w-[40px]">
                        <div
                          className="w-full rounded-t-lg transition-all duration-700"
                          style={{
                            height: h + "%",
                            backgroundColor: i % 3 === 0 ? "#1A1A2E" : i % 3 === 1 ? "#007aff" : "#30d158",
                            opacity: 0.8 + (i * 0.015),
                          }}
                        />
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
                  {isRTL ? "ØªÙØ§ØµÙÙ Ø§ÙØ­Ø§ÙØ©" : "Status Breakdown"}
                </h2>
                <Filter className="w-4 h-4 text-[#86868b]" />
              </div>
              <div className="divide-y divide-[#d2d2d7]/30">
                {[
                  { label: isRTL ? "ÙØ´Ø·Ø©" : "Active", count: stats.active, pct: stats.total ? Math.round((stats.active / stats.total) * 100) : 0, color: "#30d158" },
                  { label: isRTL ? "ØªÙØªÙÙ ÙØ±ÙØ¨Ø§Ù" : "Expiring Soon", count: stats.expiring, pct: stats.total ? Math.round((stats.expiring / stats.total) * 100) : 0, color: "#ff9f0a" },
                  { label: isRTL ? "ÙÙØªÙÙØ©" : "Expired", count: stats.expired, pct: stats.total ? Math.round((stats.expired / stats.total) * 100) : 0, color: "#ff453a" },
                  { label: isRTL ? "ÙØ·Ø§ÙØ¨Ø§Øª" : "Claimed", count: stats.claimed, pct: stats.total ? Math.round((stats.claimed / stats.total) * 100) : 0, color: "#007aff" },
                ].map((row, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[14px] text-[#1d1d1f]">{row.label}</span>
                        <span className="text-[14px] font-medium text-[#1d1d1f]">{row.count}</span>
                      </div>
                      <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: row.pct + "%", backgroundColor: row.color }} />
                      </div>
                    </div>
                    <span className="text-[13px] text-[#86868b] w-10 text-right">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: BarChart3, label: isRTL ? "ØªÙØ±ÙØ± Ø´ÙØ±Ù" : "Monthly Report", desc: isRTL ? "ÙÙØ®Øµ Ø´ÙØ±Ù ÙØ§ÙÙ" : "Full monthly summary" },
                { icon: PieChart, label: isRTL ? "ØªÙØ²ÙØ¹ Ø§ÙÙØ¦Ø§Øª" : "Category Split", desc: isRTL ? "ØªÙØ³ÙÙ Ø­Ø³Ø¨ Ø§ÙÙØ¦Ø©" : "Breakdown by category" },
                { icon: TrendingUp, label: isRTL ? "ØªØ­ÙÙÙ Ø§ÙØ§ØªØ¬Ø§Ù" : "Trend Analysis", desc: isRTL ? "Ø§ØªØ¬Ø§ÙØ§Øª Ø§ÙØ¶ÙØ§Ù" : "Warranty trends over time" },
              ].map((action, i) => (
                <button key={i} className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-5 text-left hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-3 group-hover:bg-[#1A1A2E] transition-colors">
                    <action.icon className="w-5 h-5 text-[#86868b] group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-[14px] font-medium text-[#1d1d1f]">{action.label}</div>
                  <div className="text-[12px] text-[#86868b] mt-0.5">{action.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
