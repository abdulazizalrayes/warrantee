"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getDashboardStats, getExpiringWarranties } from "@/lib/warranties";
import Link from "next/link";
import { Shield, Package, AlertTriangle, Clock, Plus, Bell, LogOut, Store } from "lucide-react";

const translations = {
  en: {
    welcome: "Welcome back",
    dashboard: "Dashboard",
    totalWarranties: "Total Warranties",
    activeWarranties: "Active",
    expiringSoon: "Expiring Soon",
    expired: "Expired",
    totalValue: "Total Protected Value",
    addWarranty: "Add Warranty",
    viewAll: "View All",
    expiringWarranties: "Expiring Warranties",
    noExpiring: "No warranties expiring soon",
    daysLeft: "days left",
    signOut: "Sign Out",
    sellerDashboard: "Seller Dashboard",
    notifications: "Notifications",
  },
  ar: {
    welcome: "\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0639\u0648\u062F\u062A\u0643",
    dashboard: "\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645",
    totalWarranties: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A",
    activeWarranties: "\u0646\u0634\u0637\u0629",
    expiringSoon: "\u062A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u064B\u0627",
    expired: "\u0645\u0646\u062A\u0647\u064A\u0629",
    totalValue: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062D\u0645\u064A\u0629",
    addWarranty: "\u0625\u0636\u0627\u0641\u0629 \u0636\u0645\u0627\u0646",
    viewAll: "\u0639\u0631\u0636 \u0627\u0644\u0643\u0644",
    expiringWarranties: "\u0636\u0645\u0627\u0646\u0627\u062A \u062A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u064B\u0627",
    noExpiring: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0636\u0645\u0627\u0646\u0627\u062A \u062A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u064B\u0627",
    daysLeft: "\u064A\u0648\u0645 \u0645\u062A\u0628\u0642\u064A",
    signOut: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C",
    sellerDashboard: "\u0644\u0648\u062D\u0629 \u0627\u0644\u0628\u0627\u0626\u0639",
    notifications: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A",
  },
};

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const t = translations[locale as keyof typeof translations] || translations.en;
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, expiringSoon: 0, expired: 0, totalValue: 0 });
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/" + locale + "/auth");
        return;
      }
      setUser(user);

      const [statsData, expiringData] = await Promise.all([
        getDashboardStats().catch(() => ({ total: 0, active: 0, expiringSoon: 0, expired: 0, totalValue: 0 })),
        getExpiringWarranties(30).catch(() => []),
      ]);
      setStats(statsData);
      setExpiring(expiringData || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/" + locale + "/auth");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4169E1]" /></div>;
  }

  const statCards = [
    { label: t.totalWarranties, value: stats.total, icon: Package, color: "bg-blue-500" },
    { label: t.activeWarranties, value: stats.active, icon: Shield, color: "bg-green-500" },
    { label: t.expiringSoon, value: stats.expiringSoon, icon: AlertTriangle, color: "bg-orange-500" },
    { label: t.expired, value: stats.expired, icon: Clock, color: "bg-red-500" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#4169E1]" />
            <span className="text-xl font-bold text-[#1A1A2E]">{t.dashboard}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={"/" + locale + "/seller"} className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#4169E1]">
              <Store className="w-4 h-4" /> {t.sellerDashboard}
            </Link>
            <Link href={"/" + locale + "/warranties/new"} className="flex items-center gap-1 bg-[#4169E1] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#3457b5]">
              <Plus className="w-4 h-4" /> {t.addWarranty}
            </Link>
            <button onClick={handleSignOut} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500">
              <LogOut className="w-4 h-4" /> {t.signOut}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-1">
          {t.welcome}, {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
        </h1>
        <p className="text-gray-500 mb-8">{t.totalValue}: {stats.totalValue.toLocaleString()} SAR</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-[#1A1A2E] mt-1">{card.value}</p>
                </div>
                <div className={card.color + " p-3 rounded-xl"}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#1A1A2E]">{t.expiringWarranties}</h2>
            <Link href={"/" + locale + "/warranties"} className="text-[#4169E1] text-sm hover:underline">{t.viewAll}</Link>
          </div>
          {expiring.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t.noExpiring}</p>
          ) : (
            <div className="space-y-3">
              {expiring.map((w) => {
                const daysLeft = Math.ceil((new Date(w.warranty_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={w.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <div>
                      <p className="font-medium text-[#1A1A2E]">{w.product_name}</p>
                      <p className="text-sm text-gray-500">{w.brand || ""} {w.model_number || ""}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-orange-600 font-semibold">{daysLeft} {t.daysLeft}</p>
                      <p className="text-xs text-gray-400">{new Date(w.warranty_end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
