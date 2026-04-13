// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  DollarSign,
  Users,
  TrendingUp,
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface SellerStats {
  warranties_issued: number;
  active_warranties: number;
  open_claims: number;
  extensions_sold: number;
  total_commission: number;
  claims_rate: number;
}

const statusConfig: Record<string, { color: string; bg: string; dot: string; label: { en: string; ar: string } }> = {
  accepted: { color: "text-[#1d7a34]", bg: "bg-[#d4f5dc]", dot: "bg-[#30d158]", label: { en: "Accepted", ar: "\u0645\u0642\u0628\u0648\u0644" } },
  pending: { color: "text-[#7a5a00]", bg: "bg-[#fff4d4]", dot: "bg-[#ff9f0a]", label: { en: "Pending", ar: "\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631" } },
  declined: { color: "text-[#7a1d1d]", bg: "bg-[#fdd]", dot: "bg-[#ff3b30]", label: { en: "Declined", ar: "\u0645\u0631\u0641\u0648\u0636" } },
};

export default function SellerDashboardPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];
  const { user, profile } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<
    Array<{
      id: string;
      seller_name: string;
      seller_email: string;
      status: string;
      created_at: string;
    }>
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: membership } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (membership) {
        const { data: statsData } = await supabase.rpc(
          "get_seller_dashboard_stats",
          { company_uuid: membership.company_id }
        );
        if (statsData) setStats(statsData as unknown as SellerStats);
      }

      const { data: inv } = await supabase
        .from("seller_invitations")
        .select("id, seller_name, seller_email, status, created_at")
        .eq("invited_by", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (inv) setInvitations(inv);
      setLoading(false);
    };
    fetchData();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#1A1A2E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      icon: Shield,
      value: stats?.warranties_issued ?? 0,
      label: isRTL ? "\u0636\u0645\u0627\u0646\u0627\u062a \u0635\u0627\u062f\u0631\u0629" : "Warranties Issued",
      iconColor: "text-[#30d158]",
      iconBg: "bg-[#e8f9ed]",
    },
    {
      icon: DollarSign,
      value: (stats?.total_commission?.toFixed(2) ?? "0.00") + " SAR",
      label: isRTL ? "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062a" : "Total Commission",
      iconColor: "text-[#ff9f0a]",
      iconBg: "bg-[#fff6e5]",
    },
    {
      icon: TrendingUp,
      value: stats?.extensions_sold ?? 0,
      label: isRTL ? "\u062a\u0645\u062f\u064a\u062f\u0627\u062a \u0645\u0628\u0627\u0639\u0629" : "Extensions Sold",
      iconColor: "text-[#0071e3]",
      iconBg: "bg-[#e5f1ff]",
    },
  ];

  return (
    <div dir={direction} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f]">
            {isRTL ? "\u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0627\u0644\u0628\u0627\u0626\u0639" : "Seller Dashboard"}
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            {isRTL
              ? "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u0648\u0627\u0644\u062f\u0639\u0648\u0627\u062a \u0648\u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062a"
              : "Manage warranties, invitations, and commissions"}
          </p>
        </div>
        <Link
          href={`/${locale}/seller/invite`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A2E] hover:bg-[#2d2d5e] text-white text-[15px] font-medium rounded-full transition-colors w-fit"
        >
          <UserPlus size={16} />
          {isRTL ? "\u062f\u0639\u0648\u0629 \u0628\u0627\u0626\u0639" : "Invite Seller"}
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-6 flex items-start gap-4"
          >
            <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
              <card.icon size={20} className={card.iconColor} />
            </div>
            <div className="min-w-0">
              <p className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] leading-tight">
                {card.value}
              </p>
              <p className="text-[13px] text-[#86868b] mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Invitations Section */}
      <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
              {isRTL ? "\u062f\u0639\u0648\u0627\u062a \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646" : "Seller Invitations"}
            </h2>
            <p className="text-[13px] text-[#86868b] mt-0.5">
              {isRTL
                ? `${invitations.length} \u062f\u0639\u0648\u0629`
                : `${invitations.length} invitation${invitations.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Invitations List */}
        {invitations.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-[#86868b]" />
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f]">
              {isRTL ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0639\u0648\u0627\u062a \u0628\u0639\u062f" : "No invitations yet"}
            </p>
            <p className="text-[13px] text-[#86868b] mt-1">
              {isRTL
                ? "\u0627\u0628\u062f\u0623 \u0628\u062f\u0639\u0648\u0629 \u0628\u0627\u0626\u0639\u064a\u0646 \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0641\u0631\u064a\u0642\u0643"
                : "Start by inviting sellers to join your team"}
            </p>
          </div>
        ) : (
          <div>
            {invitations.map((inv, idx) => {
              const sc = statusConfig[inv.status] || statusConfig.pending;
              const date = new Date(inv.created_at);
              const formattedDate = date.toLocaleDateString(
                locale === "ar" ? "ar-SA" : "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              );

              return (
                <div
                  key={inv.id}
                  className={`px-6 py-4 flex items-center justify-between gap-4 ${
                    idx < invitations.length - 1 ? "border-b border-[#f5f5f7]" : ""
                  } hover:bg-[#f5f5f7]/50 transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#f5f5f7] flex items-center justify-center flex-shrink-0">
                      <span className="text-[14px] font-semibold text-[#1d1d1f]">
                        {inv.seller_name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-[#1d1d1f] truncate">
                        {inv.seller_name}
                      </p>
                      <p className="text-[13px] text-[#86868b] truncate">
                        {inv.seller_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[12px] text-[#86868b] hidden sm:inline">
                      {formattedDate}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${sc.bg} ${sc.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label[locale as "en" | "ar"] || inv.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
