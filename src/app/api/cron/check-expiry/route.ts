import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const now = new Date();
    const intervals = [
      { days: 30, type: "expiry_30_days" },
      { days: 15, type: "expiry_15_days" },
      { days: 7, type: "expiry_7_days" },
    ];

    let notificationsCreated = 0;

    for (const interval of intervals) {
      const targetDate = new Date(now.getTime() + interval.days * 24 * 60 * 60 * 1000);
      const dayStart = targetDate.toISOString().split("T")[0];
      const dayEnd = dayStart + "T23:59:59.999Z";

      const { data: warranties } = await supabase
        .from("warranties")
        .select("id, user_id, product_name, end_date")
        .eq("status", "active")
        .gte("end_date", dayStart)
        .lte("end_date", dayEnd);

      if (warranties && warranties.length > 0) {
        const notifications = warranties.map(w => ({
          user_id: w.user_id,
          warranty_id: w.id,
          type: "expiry_reminder",
          title: `Warranty Expiring in ${interval.days} Days`,
          body: `${w.product_name} warranty expires in ${interval.days} days`,
        }));

        const { error } = await supabase.from("notifications").insert(notifications);
        if (!error) notificationsCreated += notifications.length;
      }
    }

    return NextResponse.json({
      success: true,
      notifications_created: notificationsCreated,
      checked_at: now.toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
