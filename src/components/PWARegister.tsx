"use client";
import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(async (registration) => {
        console.log("SW registered:", registration.scope);

        // Check for push notification support
        if ("PushManager" in window) {
          try {
            const res = await fetch("/api/notifications/push");
            const { publicKey, configured } = await res.json();
            if (configured && publicKey) {
              const existingSub = await registration.pushManager.getSubscription();
              if (!existingSub) {
                // Will prompt user for permission when they enable push in settings
                console.log("Push notifications available");
              }
            }
          } catch (e) {
            console.log("Push notification check skipped");
          }
        }
      }).catch((err) => {
        console.log("SW registration failed:", err);
      });
    }
  }, []);

  return null;
}
