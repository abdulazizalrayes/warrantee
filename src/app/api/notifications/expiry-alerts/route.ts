// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, warrantyExpiryEmail } from "@/lib/email";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const alertDays = [30, 15, 7];
  let totalSent = 0;

  for (const days of alertDays) {
    const { data: expiring } = await supabaseAdmin.rpc("get_expiring_warranties", {
      days_ahead: days,
    });

    if (!expiring) continue;

    for (const warranty of expiring) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name, preferred_locale, email_notifications")
        .eq("id", warranty.created_by)
        .single();

      if (!profile || !profile.email_notifications) continue;

      const locale = profile.preferred_locale || "en";
      const warrantyUrl = `https://warrantee.io/${locale}/warranties/${warranty.id}`;

      const { subject, html } = warrantyExpiryEmail(
        profile.full_name || "User",
        warranty.product_name,
        days,
        warrantyUrl,
        locale
      );

      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", warranty.created_by)
        .eq("warranty_id", warranty.id)
        .eq("type", `warranty_expiring_${days}d`)
        .single();

      if (existing) continue;

      const emailResult = await sendEmail({ to: profile.email, subject, html });

      await supabaseAdmin.from("notifications").insert({
        user_id: warranty.created_by,
        type: `warranty_expiring_${days}d`,
        title: `Warranty Expiring in ${days} Days`,
        title_ar: `\u0627\u0644\u0636\u0645\u0627\u0646 \u064a\u0646\u062a\u0647\u064a \u062e\u0644\u0627\u0644 ${days} \u064a\u0648\u0645`,
        body: `${warranty.product_name} warranty expires on ${warranty.end_date}`,
        body_ar: `\u0636\u0645\u0627\u0646 ${warranty.product_name} \u064a\u0646\u062a\u0647\u064a \u0641\u064a ${warranty.end_date}`,
        warranty_id: warranty.id,
        action_url: warrantyUrl,
        is_email_sent: emailResult.success,
      });

      totalSent++;
    }
  }

  return NextResponse.json({ success: true, notifications_sent: totalSent });
}
