"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { BellOff, BellRing } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PermState = "default" | "granted" | "denied" | "unsupported";

export default function PushNotificationManager() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PermState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermState);

    // Check existing subscription
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PermState);
      if (perm !== "granted") {
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("VAPID public key not configured");
        setLoading(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          endpoint: sub.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        }),
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
    setLoading(false);
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            endpoint: sub.endpoint,
          }),
        });
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    }
    setLoading(false);
  }, [user]);

  if (permission === "unsupported" || !user) return null;

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading || permission === "denied"}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
      style={{
        background: isSubscribed ? "#f5f5f7" : "#1A1A2E",
        color: isSubscribed ? "#1d1d1f" : "#fff",
      }}
      title={
        permission === "denied"
          ? "Notifications blocked in browser settings"
          : isSubscribed
          ? "Disable push notifications"
          : "Enable push notifications"
      }
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isSubscribed ? (
        <BellOff className="w-4 h-4" />
      ) : permission === "denied" ? (
        <BellOff className="w-4 h-4" />
      ) : (
        <BellRing className="w-4 h-4" />
      )}
      {isSubscribed ? "Notifications On" : permission === "denied" ? "Blocked" : "Enable Notifications"}
    </button>
  );
}
