"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
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
} from "lucide-react";
import { getDictionary, DIRECTION } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const pathname = usePathname();
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale as Locale];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const isActive = (href: string) => {
    const basePath = `/${locale}/dashboard`;
    if (href === "/dashboard") return pathname === basePath;
    return pathname.includes(href);
  };

  const navigationItems = [
    {
      href: "/dashboard",
      label: dict.nav.dashboard,
      icon: LayoutDashboard,
    },
    {
      href: "/warranties",
      label: dict.nav.warranties,
      icon: Shield,
    },
    {
      href: "/warranties/claims",
      label: isRTL ? "الادعاءات" : "Claims",
      icon: FileText,
    },
    {
      href: "/warranties/extensions",
      label: isRTL ? "التمديدات" : "Extensions",
      icon: Clock,
    },
    {
      href: "/documents",
      label: isRTL ? "المستندات" : "Documents",
      icon: Boxes,
    },
    {
      href: "/chain-tracking",
      label: isRTL ? "تتبع السلسلة" : "Chain Tracking",
      icon: PieChart,
    },
    {
      href: "/analytics",
      label: isRTL ? "التحليلات" : "Analytics",
      icon: PieChart,
    },
    {
      href: "/settings",
      label: dict.common.settings,
      icon: Settings,
    },
  ];

  return (
    <div dir={direction} className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Left: Menu Toggle + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition text-navy"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-navy font-bold">
                W
              </div>
              <span className="font-bold text-navy text-lg hidden sm:inline">
                Warrantee
              </span>
            </div>
          </div>

          {/* Right: Notifications + Language + User Menu */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition text-navy relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Language Toggle */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-navy flex items-center gap-1"
              >
                <Globe size={20} />
                <span className="text-sm font-medium">{locale.toUpperCase()}</span>
                <ChevronDown size={16} />
              </button>
              {langMenuOpen && (
                <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                  <Link
                    href={`/en${pathname.replace(/^/(en|ar)/, "")}`}
                    onClick={() => setLangMenuOpen(false)}
                    className="block px-4 py-2 hover:bg-gray-50 text-navy font-medium"
                  >
                    {dict.common.english}
                  </Link>
                  <Link
                    href={`/ar${pathname.replace(/^/(en|ar)/, "")}`}
                    onClick={() => setLangMenuOpen(false)}
                    className="block px-4 py-2 hover:bg-gray-50 text-navy font-medium"
                  >
                    {dict.common.arabic}
                  </Link>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-gold to-yellow-400 rounded-full flex items-center justify-center text-navy font-bold text-sm">
                  U
                </div>
                <ChevronDown size={16} className="text-navy" />
              </button>
              {userMenuOpen && (
                <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-48">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="font-semibold text-navy">
                      {isRTL ? "محمد أحمد" : "Muhammad Ahmed"}
                    </p>
                    <p className="text-xs text-gray-600">user@warrantee.app</p>
                  </div>
                  <Link
                    href={`/${locale}/settings`}
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-4 py-2 hover:bg-gray-50 text-navy text-sm"
                  >
                    {dict.common.settings}
                  </Link>
                  <button
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 text-sm font-medium border-t border-gray-200 flex items-center gap-2"
                  >
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
        {/* Sidebar */}
        <div
          className={`fixed lg:static inset-0 z-30 bg-navy transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} w-64 pt-20 lg:pt-0 overflow-y-auto`}
        >
          <nav className="p-4 space-y-2 pb-20 lg:pb-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={`/${locale}${item.href}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    active
                      ? "bg-gold text-navy font-semibold"
                      : "text-gray-100 hover:bg-navy-light"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-navy-light bg-navy-dark">
            <div className="text-xs text-gray-300 text-center">
              <p className="font-semibold">Warrantee Pro</p>
              <p className="mt-1">
                {isRTL ? "12 ضمان نشط" : "12 active warranties"}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}