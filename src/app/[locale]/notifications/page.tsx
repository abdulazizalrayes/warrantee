"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

const t: Record<string, Record<string, string>> = {
  en: {
    title: "Notifications",
    markAllRead: "Mark all as read",
    noNotifications: "No notifications yet",
    today: "Today",
    earlier: "Earlier",
    loading: "Loading...",
    loginRequired: "Please log in to view notifications.",
    delete: "Delete",
    markRead: "Mark as read",
    unread: "unread",
  },
  ar: {
    title: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
    markAllRead: "\u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0643\u0644 \u0643\u0645\u0642\u0631\u0648\u0621",
    noNotifications: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0628\u0639\u062f",
    today: "\u0627\u0644\u064a\u0648\u0645",
    earlier: "\u0633\u0627\u0628\u0642\u0627\u064b",
    loading: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
    loginRequired: "\u064a\u0631\u062c\u0649 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0639\u0631\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a.",
    delete: "\u062d\u0630\u0641",
    markRead: "\u062a\u0639\u064a\u064a\u0646 \u0643\u0645\u0642\u0631\u0648\u0621",
    unread: "\u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621\u0629",
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
  const tr = t[locale] || t.en;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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
      case "warranty_expiring": return { color: "text-yellow-500 bg-yellow-50", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" };
      case "warranty_approved": return { color: "text-green-500 bg-green-50", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" };
      case "warranty_rejected": return { color: "text-red-500 bg-red-50", icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" };
      case "claim_update": return { color: "text-blue-500 bg-blue-50", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" };
      default: return { color: "text-[#4169E1] bg-blue-50", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" };
    }
  };

  const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString();
  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4169E1]" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-500">{tr.loginRequired}</div>;

  const todayNotifs = notifications.filter(n => isToday(n.created_at));
  const earlierNotifs = notifications.filter(n => !isToday(n.created_at));

  const renderGroup = (items: Notification[], label: string) => items.length > 0 && (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-500 mb-3">{label}</h3>
      <div className="space-y-2">
        {items.map((n) => {
          const { color, icon } = iconForType(n.type);
          return (
            <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${!n.read ? "bg-blue-50/50 border-blue-200" : "bg-white border-gray-200"}`}>
              <div className={`p-2 rounded-full flex-shrink-0 ${color}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-[#4169E1] rounded-full flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {!n.read && (
                  <button onClick={() => markRead(n.id)} className="p-1 text-gray-400 hover:text-[#4169E1]" title={tr.markRead}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </button>
                )}
                <button onClick={() => deleteNotif(n.id)} className="p-1 text-gray-400 hover:text-red-500" title={tr.delete}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">{tr.title}</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500 mt-1">{unreadCount} {tr.unread}</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="px-4 py-2 text-sm font-medium text-[#4169E1] bg-[#4169E1]/10 rounded-lg hover:bg-[#4169E1]/20 transition-all">
            {tr.markAllRead}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-gray-500">{tr.noNotifications}</p>
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
