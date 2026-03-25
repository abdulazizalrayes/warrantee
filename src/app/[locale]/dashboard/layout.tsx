// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  FileText,
  Shield,
  Clock,
  PieChart,
  Settings,
  LogOut,
  Bell,
  Globe,
  ChevronDown,
  Boxes,
  Store,
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const pathname = usePathname();
  const router = useRouter();
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  const { user, profile, signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const isActive = (href: string) => {
    const basePath = `/${locale}/dashboard`;
    if (href === "/dashboard") return pathname === basePath;
    return pathname.includes(href);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push(`/${locale}/auth`);
  };

  const navigationItems = [
    { href: "/dashboard", label: dict.nav.dashboard, icon: LayoutDashboard },
    { href: "/warranties", label: dict.nav.warranties, icon: Shield },
    { href: "/warranties/claims", label: isRTL ? "\u0627\u0644\u0627\u062f\u0639\u0627\u0621\u0627\u062a" : "Claims", icon: FileText },
    { href: "/warranties/extensions", label: isRTL ? "\u0627\u0644\u062a\u0645\u062f\u064a\u062f\u0627\u062a" : "Extensions", icon: Clock },
    { href: "/documents", label: isRTL ? "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a" : "Documents", icon: Boxes },
    { href: "/seller", label: isRTL ? "\u0627\u0644\u0628\u0627\u0626\u0639" : "Seller", icon: Store },
    { href: "/analytics", label: isRTL ? "\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a" : "Analytics", icon: PieChart },
    { href: "/settings", label: dict.common.settings, icon: Settings },
  ];

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div dir={direction} className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition text-navy">
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-navy font-bold">W</div>
              <span className="font-bold text-navy text-lg hidden sm:inline">Warrantee</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition text-navy relative"><Bell size={20} /></button>
            <div className="relative">
              <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition text-navy flex items-center gap-1">
                <Globe size={20} /><span className="text-sm font-medium">{locale.toUpperCase()}</span><ChevronDown size={16} />
              </button>
              {langMenuOpen && (
                <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                  <Link href={`/en${pathname.replace(/^\/(en|ar)/, "")}`} onClick={() => setLangMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50 text-navy font-medium">{dict.common.english}</Link>
                  <Link href={`/ar${pathname.replace(/^\/(en|ar)/, "")}`} onClick={() => setLangMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50 text-navy font-medium">{dict.common.arabic}</Link>
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition">
                <div className="w-8 h-8 bg-gradient-to-br from-gold to-yellow-400 rounded-full flex items-center justify-center text-navy font-bold text-sm">{initials}</div>
                <ChevronDown size={16} className="text-navy" />
              </button>
              {userMenuOpen && (
                <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-48">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="font-semibold text-navy">{displayName}</p>
                    <p className="text-xs text-gray-600">{user?.email}</p>
                  </div>
                  <Link href={`/${locale}/settings`} onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 hover:bg-gray-50 text-navy text-sm">{dict.common.settings}</Link>
                  <button onClick={handleSignOut} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 text-sm font-medium border-t border-gray-200 flex items-center gap-2">
                    <LogOut size={16} />{dict.common.logout}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        <div className={`fixed lg:static inset-0 z-30 bg-navy transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} w-64 pt-20 lg:pt-0 overflow-y-auto`}>
          <nav className="p-4 space-y-2 pb-20 lg:pb-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={`/${locale}${item.href}`} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${active ? "bg-gold text-navy font-semibold" : "text-gray-100 hover:bg-navy-light"}`}>
                  <Icon size={20} /><span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        {sidebarOpen && (<div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)}></div>)}
        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
