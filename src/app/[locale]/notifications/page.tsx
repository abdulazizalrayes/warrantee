// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import PushNotificationManager from "@/components/PushNotificationManager";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { PageViewTracker } from "@/components/PageViewTracker";
import {
  Bell, Check, CheckCheck, Trash2, AlertTriangle,
  CheckCircle, XCircle, ClipboardList, BellOff,
  Filter, BellRing
} from "lucide-react";

const t: Record<string, Record<string, string>> = {
  en: {
    title: "Notifications",
    markAllRead: "Mark all read",
    noNotifications: "No notifications yet",
    noNotificationsDesc: "You'll see warranty alerts, claim updates, and more here.",
    loading: "Loading notifications...",
    delete: "Delete",
    markRead: "Mark as read",
    today: "Today",
    earlier: "Earlier",
    enablePush: "Enable Push Notifications",
    pushDesc: "Get real-time alerts for warranty expiries, claims, and more.",
    loginRequired: "Please sign in to view notifications.",
  },
  ar: {
    title: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
    markAllRead: "\u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0643\u0644 \u0643\u0645\u0642\u0631\u0648\u0621",
    noNotifications: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0628\u0639\u062f",
    noNotificationsDesc: "\u0633\u062a\u0638\u0647\u0631 \u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0627\u0644\u0636\u0645\u0627\u0646 \u0648\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062a \u0647\u0646\u0627.",
    loading: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a...",
    delete: "\u062d\u0630\u0641",
    markRead: "\u062a\u0639\u064a\u064a\u0646 \u0643\u0645\u0642\u0631\u0648\u0621",
    today: "\u0627\u0644\u064a\u0648\u0645",
    earlier: "\u0633\u0627\u0628\u0642\u0627\u064b",
    enablePush: "\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
    pushDesc: "\u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0641\u0648\u0631\u064a\u0629.",
    loginRequired: "\u064a\u0631\u062c\u0649 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0639\u0631\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a.",
  },
};

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  warranty_id?: string;
}

const iconForType = (type: string) => {
  switch (type) {
    case "warranty_created": return <CheckCircle className="w-5 h-5 text-[#30d158]" />;
    case "warranty_expired": case "expiry_reminder": return <AlertTriangle className="w-5 h-5 text-[#ff9f0a]" />;
    case "warranty_cancelled": return <XCircle className="w-5 h-5 text-[#ff3b30]" />;
    case "claim_opened": case "claim_resolved": return <ClipboardList className="w-5 h-5 text-[#007aff]" />;
    default: return <Bell className="w-5 h-5 text-[#86868b]" />;
  }
};

export default function NotificationsPage() {
  const params = useParams() ?? {};
  const locale = (params?.locale as string) || "en";
  const l = t[locale] || t.en;
  const isRtl = locale === "ar";
  const { user } = useAuth();
  const supabase = createBrowserClient();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchNotifications();
    // Real-time subscription
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function fetchNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user!.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function deleteNotification(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const today = new Date().toDateString();
  const todayNotifs = notifications.filter(
    (n) => new Date(n.created_at).toDateString() === today
  );
  const earlierNotifs = notifications.filter(
    (n) => new Date(n.created_at).toDateString() !== today
  );

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return locale === "ar" ? "\u0627\u0644\u0622\u0646" : "Just now";
    if (mins < 60) return locale === "ar" ? `\u0645\u0646\u0630 ${mins} \u062f\u0642\u064a\u0642\u0629` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return locale === "ar" ? `\u0645\u0646\u0630 ${hrs} \u0633\u0627\u0639\u0629` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return locale === "ar" ? `\u0645\u0646\u0630 ${days} \u064a\u0648\u0645` : `${days}d ago`;
  }

  if (!user) {
    return (
      <div dir={isRtl ? "rtl" : "ltr"}>
        <DashboardPageShell
          eyebrow={isRtl ? "\u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a" : "Notification center"}
          title={l.title}
          subtitle={l.pushDesc}
          crumbs={[
            { label: "Dashboard", href: `/${locale}/dashboard` },
            { label: l.title },
          ]}
        >
          <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-8 text-center max-w-md">
              <BellOff className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
              <p className="text-[#1d1d1f] font-medium">{l.loginRequired}</p>
            </div>
          </div>
        </DashboardPageShell>
      </div>
    );
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"}>
      <PageViewTracker
        pageName="notifications_center"
        pageType="operations"
        locale={locale}
        extra={{ unread_count: unreadCount }}
      />
      <DashboardPageShell
        eyebrow={isRtl ? "\u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a" : "Notification center"}
        title={l.title}
        subtitle={l.pushDesc}
        crumbs={[
          { label: "Dashboard", href: `/${locale}/dashboard` },
          { label: l.title },
        ]}
        stats={[
          { label: isRtl ? "\u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621" : "Unread", value: unreadCount, tone: unreadCount ? "warning" : "default" },
          { label: isRtl ? "\u0627\u0644\u064a\u0648\u0645" : "Today", value: todayNotifs.length },
          { label: isRtl ? "\u0623\u0633\u0628\u0642" : "Earlier", value: earlierNotifs.length },
        ]}
        auditNote={isRtl ? "\u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629 \u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0627\u0644\u062d\u0631\u062c\u0629 \u0648\u0627\u0644\u0623\u062d\u062f\u0627\u062b \u0627\u0644\u0645\u0647\u0645\u0629." : "This should function as the operating inbox for expiry alerts, claims, approvals, and customer-critical events."}
      >
      <div className="max-w-3xl space-y-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1d1d1f]">{l.title}</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-[#86868b] mt-1">
                {unreadCount} {locale === "ar" ? "\u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621" : "unread"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <PushNotificationManager />
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#007aff] hover:bg-[#007aff]/10 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                {l.markAllRead}
              </button>
            )}
          </div>
        </div>

        {/* Push notification banner */}
        {"Notification" in (typeof window !== "undefined" ? window : {}) &&
          typeof window !== "undefined" &&
          Notification.permission === "default" && (
          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#007aff]/10 flex items-center justify-center flex-shrink-0">
              <BellRing className="w-5 h-5 text-[#007aff]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1d1d1f]">{l.enablePush}</p>
              <p className="text-xs text-[#86868b] mt-0.5">{l.pushDesc}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#007aff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#86868b]">{l.loading}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-12 text-center">
            <Bell className="w-12 h-12 text-[#d2d2d7] mx-auto mb-4" />
            <p className="text-lg font-semibold text-[#1d1d1f]">{l.noNotifications}</p>
            <p className="text-sm text-[#86868b] mt-2">{l.noNotificationsDesc}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayNotifs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-2 px-1">{l.today}</h2>
                <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm divide-y divide-[#d2d2d7]/30">
                  {todayNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-4 transition-colors ${!n.is_read ? "bg-[#007aff]/[0.03]" : ""}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">{iconForType(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.is_read ? "font-semibold text-[#1d1d1f]" : "text-[#1d1d1f]"}`}>{n.title}</p>
                        {n.body && <p className="text-xs text-[#86868b] mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-xs text-[#86868b] mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.is_read && (
                          <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors" title={l.markRead}>
                            <Check className="w-4 h-4 text-[#007aff]" />
                          </button>
                        )}
                        <button onClick={() => deleteNotification(n.id)} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors" title={l.delete}>
                          <Trash2 className="w-4 h-4 text-[#86868b]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {earlierNotifs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-2 px-1">{l.earlier}</h2>
                <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm divide-y divide-[#d2d2d7]/30">
                  {earlierNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-4 transition-colors ${!n.is_read ? "bg-[#007aff]/[0.03]" : ""}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">{iconForType(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.is_read ? "font-semibold text-[#1d1d1f]" : "text-[#1d1d1f]"}`}>{n.title}</p>
                        {n.body && <p className="text-xs text-[#86868b] mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-xs text-[#86868b] mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.is_read && (
                          <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors" title={l.markRead}>
                            <Check className="w-4 h-4 text-[#007aff]" />
                          </button>
                        )}
                        <button onClick={() => deleteNotification(n.id)} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors" title={l.delete}>
                          <Trash2 className="w-4 h-4 text-[#86868b]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      </DashboardPageShell>
    </div>
  );
}
