import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Lazy-init VAPID to avoid build-time crash when env vars are missing
let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) {
    webpush.setVapidDetails("mailto:support@warrantee.io", pub, priv);
    vapidConfigured = true;
  }
}

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

export async function POST(req: NextRequest) {
  try {
    ensureVapid();

    if (!vapidConfigured) {
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 503 }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload: PushPayload = await req.json();
    const { userId, title, body, url, icon, tag } = payload;

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: "userId, title, and body are required" },
        { status: 400 }
      );
    }

    // Get all push subscriptions for this user
    const { data: subscriptions, error } = await getSupabaseAdmin()
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: "No subscriptions found" });
    }

    const pushPayload = JSON.stringify({
      title,
      body,
      url: url || "/notifications",
      icon: icon || "/icon-192x192.png",
      tag: tag || "warrantee-notification",
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload
        );
        sent++;
      } catch (err: unknown) {
        const pushErr = err as { statusCode?: number };
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
        failed++;
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await getSupabaseAdmin()
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return NextResponse.json({
      sent,
      failed,
      cleaned: expiredEndpoints.length,
      total: subscriptions.length,
    });
  } catch (err) {
    console.error("Push send error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
