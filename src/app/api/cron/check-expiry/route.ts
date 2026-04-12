import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, warrantyExpiryEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const now = new Date();

    // BRD requires 30/60/90 day expiry reminder emails
    const intervals = [
      { days: 30, type: "expiry_reminder" },
      { days: 60, type: "expiry_reminder" },
      { days: 90, type: "expiry_reminder" },
    ];

    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const interval of intervals) {
      const targetDate = new Date(now.getTime() + interval.days * 24 * 60 * 60 * 1000);
      const dayStart = targetDate.toISOString().split("T")[0];
      const dayEnd = dayStart + "T23:59:59.999Z";

      const { data: warranties } = await supabase
        .from("warranties")
        .select("id, user_id, product_name, end_date, language")
        .eq("status", "active")
        .gte("end_date", dayStart)
        .lte("end_date", dayEnd);

      if (!warranties || warranties.length === 0) continue;

      for (const w of warranties) {
        // Dedup: skip if notification already created for this warranty + interval today
        const todayStart = now.toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("warranty_id", w.id)
          .eq("type", interval.type)
          .gte("created_at", todayStart)
          .limit(1)
          .maybeSingle();

        if (existing) continue;

        // Create in-app notification
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: w.user_id,
          warranty_id: w.id,
          type: interval.type,
          title: `Warranty Expiring in ${interval.days} Days`,
          body: `${w.product_name} warranty expires in ${interval.days} days`,
        });
        if (!notifError) notificationsCreated++;

        // Send email via Resend
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(w.user_id);
          const userEmail = userData?.user?.email;
          const userMeta = userData?.user?.user_metadata;
          const userName = userMeta?.full_name || userMeta?.name || userEmail?.split("@")[0] || "User";
          const locale = w.language || "en";
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://warrantee.io";
          const warrantyUrl = `${baseUrl}/${locale}/warranties/${w.id}`;

          if (userEmail) {
            const { subject, html } = warrantyExpiryEmail(userName, w.product_name, interval.days, warrantyUrl, locale);
            const result = await sendEmail({ to: userEmail, subject, html });
            if (result.success) emailsSent++;
          }
        } catch {
          // Non-fatal: in-app notification was still created
        }
      }
    }

    return NextResponse.json({
      success: true,
      notifications_created: notificationsCreated,
      emails_sent: emailsSent,
      checked_at: now.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
