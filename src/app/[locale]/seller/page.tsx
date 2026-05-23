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
import { ProtectedRouteNotice } from "@/components/dashboard/ProtectedRouteNotice";

interface SellerStats {
  warranties_issued: number;
  active_warranties: number;
  open_claims: number;
  extensions_sold: number;
  total_commission: number;
  claims_rate: number;
}

interface SellerOpportunitySummary {
  potentialWarranties: number;
  extensionCandidates: number;
  openIssueSignals: number;
  topProducts: Array<{ name: string; count: number }>;
  recent: Array<{
    id: string;
    product_name: string;
    seller_name: string | null;
    status: string | null;
    end_date: string | null;
    seller_id: string | null;
    claim_count: number;
  }>;
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
  const [opportunities, setOpportunities] = useState<SellerOpportunitySummary>({
    potentialWarranties: 0,
    extensionCandidates: 0,
    openIssueSignals: 0,
    topProducts: [],
    recent: [],
  });
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
      if (!user) {
        setStats(null);
        setInvitations([]);
        setLoading(false);
        return;
      }

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

      const normalizedEmail = (user.email || "").toLowerCase();
      const companyName = profile?.company_name?.trim() || "";
      const matchedWarranties = new Map<string, any>();

      const { data: directWarrantyMatches } = await supabase
        .from("warranties")
        .select("id, product_name, seller_name, status, end_date, seller_id, seller_email, recipient_user_id, buyer_id")
        .eq("seller_email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(50);

      (directWarrantyMatches || []).forEach((warranty) => matchedWarranties.set(warranty.id, warranty));

      if (companyName) {
        const { data: companyNameMatches } = await supabase
          .from("warranties")
          .select("id, product_name, seller_name, status, end_date, seller_id, seller_email, recipient_user_id, buyer_id")
          .ilike("seller_name", `%${companyName}%`)
          .order("created_at", { ascending: false })
          .limit(50);

        (companyNameMatches || []).forEach((warranty) => matchedWarranties.set(warranty.id, warranty));
      }

      const matchedWarrantyList = Array.from(matchedWarranties.values());
      const warrantyIds = matchedWarrantyList.map((warranty) => warranty.id);
      let claimMap = new Map<string, number>();

      if (warrantyIds.length > 0) {
        const { data: claimSignals } = await supabase
          .from("warranty_claims")
          .select("id, warranty_id, status")
          .in("warranty_id", warrantyIds);

        claimMap = new Map<string, number>();
        (claimSignals || []).forEach((claim) => {
          const current = claimMap.get(claim.warranty_id) || 0;
          claimMap.set(claim.warranty_id, current + 1);
        });
      }

      const productCounts = new Map<string, number>();
      matchedWarrantyList.forEach((warranty) => {
        const key = warranty.product_name || "Unknown product";
        productCounts.set(key, (productCounts.get(key) || 0) + 1);
      });

      const recentOpportunities = matchedWarrantyList
        .slice(0, 8)
        .map((warranty) => ({
          ...warranty,
          claim_count: claimMap.get(warranty.id) || 0,
        }));

      setOpportunities({
        potentialWarranties: matchedWarrantyList.filter((warranty) => !warranty.seller_id).length,
        extensionCandidates: matchedWarrantyList.filter((warranty) => warranty.status === "active").length,
        openIssueSignals: Array.from(claimMap.values()).reduce((sum, count) => sum + count, 0),
        topProducts: Array.from(productCounts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3),
        recent: recentOpportunities,
      });
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

  if (!user) {
    return (
      <ProtectedRouteNotice
        locale={locale}
        isRTL={isRTL}
        eyebrow={isRTL ? "مركز البائعين" : "Seller workspace"}
        title={isRTL ? "\u0644\u0648\u062d\u0629 \u0627\u0644\u0628\u0627\u0626\u0639" : "Seller Dashboard"}
        subtitle={isRTL ? "\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062a \u0648\u0627\u0644\u062f\u0639\u0648\u0627\u062a \u0648\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a \u062a\u062d\u062a\u0627\u062c \u0625\u0644\u0649 \u062d\u0633\u0627\u0628 \u0645\u0633\u062c\u0644." : "Commission, invitation, and seller activity data are available after sign-in."}
        message={isRTL ? "\u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0623\u062f\u0627\u0621 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646 \u0648\u062f\u0639\u0648\u0627\u062a \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0648\u0627\u0644\u0639\u0645\u0648\u0644\u0627\u062a." : "Sign in to review seller performance, invitations, and commission activity in one place."}
        crumbs={[
          { label: "Dashboard", href: `/${locale}/dashboard` },
          { label: isRTL ? "\u0627\u0644\u0628\u0627\u0626\u0639" : "Seller" },
        ]}
      />
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
    {
      icon: Users,
      value: opportunities.potentialWarranties,
      label: isRTL ? "فرص ضمانات من العملاء" : "Buyer-Recorded Opportunities",
      iconColor: "text-[#7c3aed]",
      iconBg: "bg-[#f3e8ff]",
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

      <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#f5f5f7]">
          <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
            {isRTL ? "فرص البائع" : "Seller Opportunity Pipeline"}
          </h2>
          <p className="text-[13px] text-[#86868b] mt-0.5">
            {isRTL
              ? "ضمانات سجّلها العملاء ويمكن تحويلها إلى تمديد أو خدمة أو علاقة مباشرة مع البائع."
              : "Client-recorded warranties that can turn into extensions, service relationships, and seller growth."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-6">
          <div className="rounded-2xl bg-[#f5f7ff] p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-[#6b7280]">
              {isRTL ? "ضمانات محتملة" : "Potential Warranties"}
            </p>
            <p className="mt-2 text-[30px] font-semibold text-[#1d1d1f]">
              {opportunities.potentialWarranties}
            </p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {isRTL ? "سجلها العملاء ولم تُربط بعد بحساب البائع." : "Recorded by clients and not yet linked to a seller account."}
            </p>
          </div>

          <div className="rounded-2xl bg-[#fff8e8] p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-[#6b7280]">
              {isRTL ? "فرص تمديد" : "Extension Opportunities"}
            </p>
            <p className="mt-2 text-[30px] font-semibold text-[#1d1d1f]">
              {opportunities.extensionCandidates}
            </p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {isRTL ? "ضمانات نشطة يمكن للبائع تصميم عروض تمديد لها." : "Active warranties the seller can convert into extension offers."}
            </p>
          </div>

          <div className="rounded-2xl bg-[#fff1f2] p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-[#6b7280]">
              {isRTL ? "إشارات مشاكل" : "Issue Signals"}
            </p>
            <p className="mt-2 text-[30px] font-semibold text-[#1d1d1f]">
              {opportunities.openIssueSignals}
            </p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {isRTL ? "مطالبات أو مؤشرات تساعد البائع على اكتشاف مشاكل المنتج مبكراً." : "Claims and issue patterns that help sellers spot product problems early."}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-[1.1fr,1.4fr] gap-6">
          <div className="rounded-2xl border border-[#e5e7eb] p-5">
            <h3 className="text-[16px] font-semibold text-[#1d1d1f]">
              {isRTL ? "المنتجات الأكثر حضوراً" : "Product Hotspots"}
            </h3>
            {opportunities.topProducts.length === 0 ? (
              <p className="mt-3 text-[13px] text-[#86868b]">
                {isRTL ? "لا توجد إشارات كافية بعد." : "No opportunity signals yet."}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {opportunities.topProducts.map((product) => (
                  <div key={product.name} className="flex items-center justify-between rounded-2xl bg-[#f9fafb] px-4 py-3">
                    <span className="text-[14px] font-medium text-[#1d1d1f]">{product.name}</span>
                    <span className="text-[13px] text-[#6b7280]">{product.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#e5e7eb] p-5">
            <h3 className="text-[16px] font-semibold text-[#1d1d1f]">
              {isRTL ? "فرص حديثة من العملاء" : "Recent Buyer-Recorded Opportunities"}
            </h3>
            {opportunities.recent.length === 0 ? (
              <p className="mt-3 text-[13px] text-[#86868b]">
                {isRTL ? "لم يتم العثور على ضمانات مرتبطة بالبائع بعد." : "No customer-recorded seller opportunities found yet."}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {opportunities.recent.map((opportunity) => (
                  <div key={opportunity.id} className="rounded-2xl bg-[#f9fafb] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-medium text-[#1d1d1f]">{opportunity.product_name || (isRTL ? "منتج غير محدد" : "Unknown product")}</p>
                        <p className="text-[12px] text-[#86868b] mt-1">
                          {opportunity.seller_name || (isRTL ? "بائع غير محدد" : "Seller not specified")}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${opportunity.seller_id ? "bg-[#e8f9ed] text-[#1d7a34]" : "bg-[#fff4d4] text-[#7a5a00]"}`}>
                        {opportunity.seller_id
                          ? (isRTL ? "مرتبطة" : "Linked")
                          : (isRTL ? "غير مرتبطة" : "Unclaimed")}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-[#6b7280]">
                      <span>{isRTL ? "الحالة:" : "Status:"} {opportunity.status || "—"}</span>
                      <span>{isRTL ? "المطالبات:" : "Claims:"} {opportunity.claim_count}</span>
                      <span>{isRTL ? "الانتهاء:" : "Ends:"} {opportunity.end_date || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
