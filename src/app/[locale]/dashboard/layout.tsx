"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  FileText,
  Shield,
  CheckSquare,
  Clock,
  PieChart,
  Settings,
  LogOut,
  Bell,
  Globe,
  ChevronDown,
  Boxes,
  Store,
  FileBarChart,
  Inbox,
} from "lucide-react";
import {
  DIRECTION,
  LOCALES,
  LOCALE_LABELS,
  LOCALE_PREFIX_PATTERN,
  getDictionary,
  normalizeLocale,
} from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type HeaderNotification = {
  id: string;
  title: string;
  body?: string | null;
  message?: string | null;
  is_read?: boolean | null;
  read?: boolean | null;
  created_at: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams() ?? {};
  const locale = normalizeLocale(String(params.locale || "en"));
  const pathname = usePathname();
  const router = useRouter();
  const dict = getDictionary(locale);
  const isRTL = locale === "ar";
  const direction = DIRECTION[locale];
  const supabase = createSupabaseBrowserClient();

  const { user, profile, signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const isActive = (href: string) => {
    const basePath = `/${locale}/dashboard`;
    if (href === "/dashboard") return pathname === basePath;
    return pathname === `/${locale}${href}` || pathname.startsWith(`/${locale}${href}/`);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push(`/${locale}/auth`);
  };

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    let active = true;

    async function loadNotifications() {
      setNotificationsLoading(true);
      setNotificationsError("");

      try {
        const response = await fetch("/api/notifications?limit=5", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!active) return;

        if (!response.ok) {
          setNotifications([]);
          setNotificationsError(
            isRTL
              ? "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0622\u0646."
              : "Notifications could not load right now."
          );
        } else {
          setNotifications((payload.notifications || []) as HeaderNotification[]);
        }
      } catch {
        if (active) {
          setNotifications([]);
          setNotificationsError(
            isRTL
              ? "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0622\u0646."
              : "Notifications could not load right now."
          );
        }
      } finally {
        if (active) {
        setNotificationsLoading(false);
        }
      }
    }

    loadNotifications();

    const channel = supabase
      .channel(`header-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: HeaderNotification }) => {
          setNotifications((prev) => [
            payload.new as HeaderNotification,
            ...prev,
          ].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [isRTL, supabase, user?.id]);

  const unreadNotificationCount = notifications.filter(
    (notification) => !(notification.is_read ?? notification.read)
  ).length;

  const formatNotificationTime = (dateValue: string) => {
    const diffMinutes = Math.floor((Date.now() - new Date(dateValue).getTime()) / 60000);
    if (diffMinutes < 1) return isRTL ? "\u0627\u0644\u0622\u0646" : "Now";
    if (diffMinutes < 60) return isRTL ? `\u0645\u0646\u0630 ${diffMinutes} \u062f` : `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return isRTL ? `\u0645\u0646\u0630 ${diffHours} \u0633` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return isRTL ? `\u0645\u0646\u0630 ${diffDays} \u064a` : `${diffDays}d ago`;
  };

  const navigationItems = [
    { href: "/dashboard", label: dict.nav.dashboard, icon: LayoutDashboard },
    { href: "/warranties", label: dict.nav.warranties, icon: Shield },
    { href: "/approval", label: isRTL ? "الموافقات" : "Approvals", icon: CheckSquare },
    { href: "/dashboard/claims", label: isRTL ? "\u0627\u0644\u0627\u062f\u0639\u0627\u0621\u0627\u062a" : "Claims", icon: FileText },
    { href: "/extensions", label: isRTL ? "\u0627\u0644\u062a\u0645\u062f\u064a\u062f\u0627\u062a" : "Extensions", icon: Clock },
    { href: "/documents", label: isRTL ? "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a" : "Documents", icon: Boxes },
    { href: "/seller", label: isRTL ? "\u0627\u0644\u0628\u0627\u0626\u0639" : "Seller", icon: Store },
    { href: "/analytics", label: isRTL ? "\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a" : "Analytics", icon: PieChart },
    { href: "/reports", label: isRTL ? "التقارير" : "Reports", icon: FileBarChart },
    { href: "/notifications", label: isRTL ? "الإشعارات" : "Notifications", icon: Bell },
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
              <div className="w-8 h-8 bg-[#0071e3] rounded-lg flex items-center justify-center text-white font-bold">W</div>
              <span className="font-bold text-navy text-lg hidden sm:inline">Warrantee</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationMenuOpen(!notificationMenuOpen);
                  setLangMenuOpen(false);
                  setUserMenuOpen(false);
                }}
                aria-haspopup="dialog"
                aria-expanded={notificationMenuOpen}
                aria-label={isRTL ? "الإشعارات" : "Notifications"}
                className="p-2 hover:bg-gray-100 rounded-xl transition text-navy relative focus:outline-none focus:ring-2 focus:ring-[#0a84ff] focus:ring-offset-2"
              >
                <Bell size={20} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-2.5 w-2.5 rounded-full bg-[#ff3b30] ring-2 ring-white" />
                )}
              </button>
              {notificationMenuOpen && (
                <div
                  role="dialog"
                  aria-label={isRTL ? "الإشعارات" : "Notifications"}
                  className={`absolute top-12 ${isRTL ? "left-0" : "right-0"} z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]`}
                >
                  <div className="border-b border-gray-100 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">
                        {isRTL ? "الإشعارات" : "Notifications"}
                      </p>
                      <Link
                        href={`/${locale}/notifications`}
                        onClick={() => setNotificationMenuOpen(false)}
                        className="text-[12px] font-medium text-[#0066cc] hover:underline"
                      >
                        {isRTL ? "عرض الكل" : "View all"}
                      </Link>
                    </div>
                  </div>
                  {notificationsLoading ? (
                    <div className="px-5 py-8 text-center text-[13px] text-[#6e6e73]">
                      {isRTL ? "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a..." : "Loading notifications..."}
                    </div>
                  ) : notificationsError ? (
                    <div className="px-5 py-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3cd] text-[#8a5a00]">
                        <Bell size={22} />
                      </div>
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">
                        {isRTL ? "تعذر تحميل الإشعارات" : "Unable to load notifications"}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-[#6e6e73]">
                        {notificationsError}
                      </p>
                    </div>
                  ) : notifications.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto py-2">
                      {notifications.map((notification) => {
                        const isRead = Boolean(notification.is_read ?? notification.read);
                        return (
                          <Link
                            key={notification.id}
                            href={`/${locale}/notifications`}
                            onClick={() => setNotificationMenuOpen(false)}
                            className="flex gap-3 px-5 py-3 transition hover:bg-[#f5f5f7]"
                          >
                            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isRead ? "bg-[#d2d2d7]" : "bg-[#0a84ff]"}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-[#1d1d1f]">
                                {notification.title}
                              </span>
                              {(notification.body || notification.message) && (
                                <span className="mt-0.5 block line-clamp-2 text-[12px] leading-5 text-[#6e6e73]">
                                  {notification.body || notification.message}
                                </span>
                              )}
                              <span className="mt-1 block text-[11px] text-[#86868b]">
                                {formatNotificationTime(notification.created_at)}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-5 py-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#6e6e73]">
                        <Inbox size={22} />
                      </div>
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">
                        {isRTL ? "لا توجد إشعارات جديدة" : "No new notifications"}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-[#6e6e73]">
                        {isRTL
                          ? "سنظهر هنا التنبيهات المهمة حول الضمانات والمطالبات والموافقات."
                          : "Important warranty, claim, and approval updates will appear here."}
                      </p>
                    </div>
                  )}
                  <div className="bg-[#f5f5f7] px-5 py-3 text-center">
                    <Link
                      href={`/${locale}/settings#notifications`}
                      onClick={() => setNotificationMenuOpen(false)}
                      className="text-[13px] font-medium text-[#1d1d1f] hover:text-[#0066cc]"
                    >
                      {isRTL ? "إعدادات الإشعارات" : "Notification settings"}
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition text-navy flex items-center gap-1">
                <Globe size={20} /><span className="text-sm font-medium">{locale.toUpperCase()}</span><ChevronDown size={16} />
              </button>
              {langMenuOpen && (
                <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                  {LOCALES.map((language) => (
                    <Link
                      key={language}
                      href={`/${language}${(pathname ?? "").replace(new RegExp(`^/(${LOCALE_PREFIX_PATTERN})(?=/|$)`), "")}`}
                      onClick={() => setLangMenuOpen(false)}
                      className="block px-4 py-2 hover:bg-gray-50 text-navy font-medium"
                    >
                      {LOCALE_LABELS[language].native}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition">
                <div className="w-8 h-8 bg-[#0071e3] rounded-full flex items-center justify-center text-white font-bold text-sm">{initials}</div>
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
        <aside className={`fixed lg:sticky lg:top-[73px] inset-y-0 left-0 z-30 w-64 transform overflow-y-auto border-r border-gray-200 bg-white/95 pt-20 shadow-xl backdrop-blur-xl transition-transform duration-300 ease-in-out lg:h-[calc(100vh-73px)] lg:translate-x-0 lg:pt-4 lg:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <nav className="flex flex-col gap-1 px-3 pb-6">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={`/${locale}${item.href}`} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${active ? "bg-[#f5f5f7] text-[#1d1d1f] font-semibold shadow-sm" : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"}`}>
                  <Icon size={20} /><span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        {sidebarOpen && (<div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)}></div>)}
        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
