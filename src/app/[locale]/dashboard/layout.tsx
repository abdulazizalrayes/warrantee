// @ts-nocheck
"use client";

import { Suspense } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  FileText,
  Shield,
  PieChart,
  Settings,
  LogOut,
  Bell,
  Globe,
  ChevronDown,
  CheckSquare,
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

const dashboardUi = {
  en: {
    buyer: "Buyer",
    seller: "Seller",
    claims: "Claims",
    approvals: "Approvals",
    documents: "Documents",
    analytics: "Analytics",
    roleView: "View",
  },
  ar: {
    buyer: "\u0627\u0644\u0645\u0634\u062a\u0631\u064a",
    seller: "\u0627\u0644\u0628\u0627\u0626\u0639",
    claims: "\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a",
    approvals: "\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a",
    documents: "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a",
    analytics: "\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a",
    roleView: "\u0627\u0644\u0639\u0631\u0636",
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

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dict = getDictionary(locale);
  const direction = DIRECTION[locale as Locale];
  const text = dashboardUi[locale as "en" | "ar"] || dashboardUi.en;

  const { user, profile, signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const viewMode = useMemo(() => resolveViewMode(searchParams, profile?.role), [searchParams, profile?.role]);

  const withQuery = (basePath: string, nextView?: "buyer" | "seller") => {
    const query = new URLSearchParams(searchParams.toString());
    const targetView = nextView || viewMode;
    query.set("view", targetView);
    const qs = query.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const replaceLocaleInPath = (targetLocale: "en" | "ar") => {
    const normalizedPath = pathname.replace(/^\/(en|ar)/, "");
    return withQuery(`/${targetLocale}${normalizedPath}`);
  };

  const isActive = (href: string) => {
    const normalized = `/${locale}${href}`;
    if (href === "/dashboard") {
      return pathname === normalized;
    }
    return pathname === normalized || pathname.startsWith(`${normalized}/`);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push(`/${locale}/auth`);
  };

  const navItems = [
    { href: "/dashboard", label: dict.nav.dashboard, icon: LayoutDashboard },
    { href: "/warranties", label: dict.nav.warranties, icon: Shield },
    { href: "/approval", label: text.approvals, icon: CheckSquare },
    { href: "/dashboard/claims", label: text.claims, icon: FileText },
    { href: "/documents", label: text.documents, icon: FileText },
    { href: "/analytics", label: text.analytics, icon: PieChart },
    { href: "/settings", label: dict.common.settings, icon: Settings },
  ];

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  const hasSellerAccess = profile?.account_type === "business" || profile?.role === "seller" || profile?.role === "admin" || profile?.role === "super_admin";

  return (
    <div dir={direction} className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition text-navy">
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link href={`/${locale}`} className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-navy font-bold">W</div>
              <span className="font-bold text-navy text-lg hidden sm:inline truncate">Warrantee</span>
            </Link>

            <div className="hidden md:flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
              <span className="text-xs font-semibold text-gray-500 px-2">{text.roleView}</span>
              <button
                onClick={() => router.push(withQuery(pathname, "buyer"))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === "buyer" ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-navy"}`}
              >
                {text.buyer}
              </button>
              {hasSellerAccess && (
                <button
                  onClick={() => router.push(withQuery(pathname, "seller"))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === "seller" ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-navy"}`}
                >
                  {text.seller}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition text-navy relative"><Bell size={20} /></button>

            <div className="relative">
              <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition text-navy flex items-center gap-1">
                <Globe size={20} />
                <span className="text-sm font-medium">{locale.toUpperCase()}</span>
                <ChevronDown size={16} />
              </button>
              {langMenuOpen && (
                <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-40">
                  <Link href={replaceLocaleInPath("en")} onClick={() => setLangMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50 text-navy font-medium">{dict.common.english}</Link>
                  <Link href={replaceLocaleInPath("ar")} onClick={() => setLangMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50 text-navy font-medium">{dict.common.arabic}</Link>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition">
                <div className="w-8 h-8 bg-gradient-to-br from-gold to-yellow-400 rounded-full flex items-center justify-center text-navy font-bold text-sm">{initials}</div>
                <ChevronDown size={16} className="text-navy" />
              </button>
              {userMenuOpen && (
                <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-52">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="font-semibold text-navy truncate">{displayName}</p>
                    <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                  </div>
                  <Link href={withQuery(`/${locale}/settings`)} onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50 text-navy text-sm">{dict.common.settings}</Link>
                  <button onClick={handleSignOut} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 text-sm font-medium border-t border-gray-200 flex items-center gap-2">
                    <LogOut size={16} />
                    {dict.common.logout}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <div className={`fixed lg:static inset-y-0 left-0 z-30 bg-navy transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} w-64 pt-20 lg:pt-0 overflow-y-auto`}>
          <nav className="p-4 space-y-2 pb-20 lg:pb-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={withQuery(`/${locale}${item.href}`)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${active ? "bg-gold text-navy font-semibold" : "text-gray-100 hover:bg-navy-light"}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {sidebarOpen && (<div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />)}

        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a06800]" /></div>}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
