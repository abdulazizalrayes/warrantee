// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  DollarSign,
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  BarChart3,
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

export default function SellerDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  const { user, profile } = useAuth();
  const supabase = createSupabaseBrowserClient();

  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Array<{ id: string; seller_name: string; seller_email: string; status: string; created_at: string }>>([]);

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
        const { data: statsData } = await supabase.rpc("get_seller_dashboard_stats", {
          company_uuid: membership.company_id,
        });
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div dir={direction}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-navy">
          {isRTL ? "لوحة تحكم البائع" : "Seller Dashboard"}
        </h1>
        <Link
          href={`/${locale}/seller/invite`}
          className="bg-gold hover:bg-yellow-500 text-navy font-semibold py-2.5 px-5 rounded-lg transition flex items-center gap-2 w-fit text-sm"
        >
          <Users size={16} />
          {isRTL ? "دعوة بائع" : "Invite Seller"}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <Shield size={24} className="text-green-600 mb-2" />
          <p className="text-3xl font-bold text-navy">{stats?.warranties_issued ?? 0}</p>
          <p className="text-sm text-gray-600">{isRTL ? "ضمانات صادرة" : "Warranties Issued"}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <DollarSign size={24} className="text-gold mb-2" />
          <p className="text-3xl font-bold text-navy">{stats?.total_commission?.toFixed(2) ?? "0.00"}</p>
          <p className="text-sm text-gray-600">{isRTL ? "إجمالي العمولات (SAR)" : "Total Commission (SAR)"}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <TrendingUp size={24} className="text-blue-600 mb-2" />
          <p className="text-3xl font-bold text-navy">{stats?.extensions_sold ?? 0}</p>
          <p className="text-sm text-gray-600">{isRTL ? "تمديدات مباعة" : "Extensions Sold"}</p>
        </div>
      </div>

      {/* Invitations */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-navy">{isRTL ? "دعوات البائعين" : "Seller Invitations"}</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {invitations.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              {isRTL ? "لا توجد دعوات بعد" : "No invitations yet"}
            </div>
          ) : (
            invitations.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy">{inv.seller_name}</p>
                  <p className="text-xs text-gray-500">{inv.seller_email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  inv.status === "accepted" ? "bg-green-100 text-green-800" :
                  inv.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {inv.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
