// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, CheckCircle, XCircle, ClipboardList, BellOff } from "lucide-react";

const t: Record<string, Record<string, string>> = {
  en: {
    title: "Notifications",
    subtitle: "Stay updated on your warranties",
    markAllRead: "Mark all read",
    noNotifications: "You're all caught up",
    noNotificationsDesc: "When you have new notifications, they'll appear here.",
    today: "Today",
    earlier: "Earlier",
    loading: "Loading...",
    loginRequired: "Please log in to view notifications.",
    delete: "Delete",
    markRead: "Mark as read",
    unread: "unread",
    all: "All",
    unreadFilter: "Unread",
  },
  ar: {
    title: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
    subtitle: "\u0627\u0628\u0642\u064e \u0639\u0644\u0649 \u0627\u0637\u0644\u0627\u0639 \u0628\u0636\u0645\u0627\u0646\u0627\u062a\u0643",
    markAllRead: "\u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0643\u0644 \u0643\u0645\u0642\u0631\u0648\u0621",
    noNotifications: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u062c\u062f\u064a\u062f\u0629",
    noNotificationsDesc: "\u0639\u0646\u062f\u0645\u0627 \u062a\u0643\u0648\u0646 \u0644\u062f\u064a\u0643 \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u062c\u062f\u064a\u062f\u0629\u060c \u0633\u062a\u0638\u0647\u0631 \u0647\u0646\u0627.",
    today: "\u0627\u0644\u064a\u0648\u0645",
    earlier: "\u0633\u0627\u0628\u0642\u0627\u064b",
    loading: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
    loginRequired: "\u064a\u0631\u062c\u0649 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0639\u0631\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a.",
    delete: "\u062d\u0630\u0641",
    markRead: "\u062a\u0639\u064a\u064a\u0646 \u0643\u0645\u0642\u0631\u0648\u0621",
    unread: "\u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621\u0629",
    all: "\u0627\u0644\u0643\u0644",
    unreadFilter: "\u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621\u0629",
  },
};

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  warranty_id?: string;
}
export default function NotificationsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const isRTL = locale === "ar";
  const tr = t[locale] || t.en;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setLoading(false); return; }
      setUser(u);
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications((data as Notification[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const markAllRead = async () => {
    const supabase = createBrowserClient();
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    const supabase = createBrowserClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotif = async (id: string) => {
    const supabase = createBrowserClient();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const iconForType = (type: string) => {
    switch (type) {
      case "warranty_expiring":
        return { color: "bg-[#ff9f0a]/10 text-[#ff9f0a]", Icon: AlertTriangle };
      case "warranty_approved":
        return { color: "bg-[#30d158]/10 text-[#30d158]", Icon: CheckCircle };
      case "warranty_rejected":
        return { color: "bg-[#ff453a]/10 text-[#ff453a]", Icon: XCircle };
      case "claim_update":
        return { color: "bg-[#007aff]/10 text-[#007aff]", Icon: ClipboardList };
      default:
        return { color: "bg-[#1A1A2E]/10 text-[#1A1A2E]", Icon: Bell };
    }
  };

  const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString();
  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = filter === "unread" ? notifications.filter(n => !n.read) : notifications;
  const todayNotifs = filtered.filter(n => isToday(n.created_at));
  const earlierNotifs = filtered.filter(n => !isToday(n.created_at));

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return isRTL ? "\u0627\u0644\u0622\u0646" : "Just now";
    if (mins < 60) return isRTL ? `\u0645\u0646\u0630 ${mins} \u062f\u0642\u064a\u0642\u0629` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return isRTL ? `\u0645\u0646\u0630 ${hrs} \u0633\u0627\u0639\u0629` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return isRTL ? `\u0645\u0646\u0630 ${days} \u064a\u0648\u0645` : `${days}d ago`;
  };
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#1A1A2E]/20 border-t-[#1A1A2E] rounded-full animate-spin" />
        <span className="text-[13px] text-[#86868b]">{tr.loading}</span>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bell size={28} className="text-[#86868b]" />
        </div>
        <p className="text-[15px] text-[#86868b]">{tr.loginRequired}</p>
      </div>
    </div>
  );

  const renderGroup = (items: Notification[], label: string) => items.length > 0 && (
    <div className="mb-8">
      <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-wide mb-3 px-1">{label}</h3>
      <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm overflow-hidden divide-y divide-[#d2d2d7]/30">
        {items.map((n) => {
          const { color, Icon } = iconForType(n.type);
          return (
            <div
              key={n.id}
              className={`group flex items-start gap-3.5 p-4 transition-colors hover:bg-[#f5f5f7]/60 ${!n.read ? "bg-[#007aff]/[0.03]" : ""}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-[14px] font-semibold ${!n.read ? "text-[#1d1d1f]" : "text-[#1d1d1f]/80"}`}>{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-[#007aff] rounded-full flex-shrink-0" />}
                </div>
                <p className="text-[13px] text-[#86868b] mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[12px] text-[#aeaeb2] mt-1.5">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#86868b] hover:text-[#007aff] hover:bg-[#007aff]/10 transition-all"
                    title={tr.markRead}
                  >
                    <Check size={15} />
                  </button>
                )}
                <button
                  onClick={() => deleteNotif(n.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#86868b] hover:text-[#ff453a] hover:bg-[#ff453a]/10 transition-all"
                  title={tr.delete}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight">{tr.title}</h1>
          <p className="text-[15px] text-[#86868b] mt-1">{tr.subtitle}</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#007aff] bg-[#007aff]/10 rounded-full hover:bg-[#007aff]/15 transition-all"
          >
            <CheckCheck size={15} />
            {tr.markAllRead}
          </button>
        )}
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#007aff]/10 text-[#007aff] text-[12px] font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-[#007aff] rounded-full animate-pulse" />
            {unreadCount} {tr.unread}
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-[13px] font-medium rounded-full transition-all ${
              filter === f
                ? "bg-[#1A1A2E] text-white shadow-sm"
                : "bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]"
            }`}
          >
            {f === "all" ? tr.all : tr.unreadFilter}
          </button>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-[#d2d2d7]/40 shadow-sm p-16 text-center">
          <div className="w-20 h-20 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <BellOff size={32} className="text-[#aeaeb2]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">{tr.noNotifications}</h3>
          <p className="text-[14px] text-[#86868b] max-w-xs mx-auto">{tr.noNotificationsDesc}</p>
        </div>
      ) : (
        <>
          {renderGroup(todayNotifs, tr.today)}
          {renderGroup(earlierNotifs, tr.earlier)}
        </>
      )}
    </div>
  );
}
