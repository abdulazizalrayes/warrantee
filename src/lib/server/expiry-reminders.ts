import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail, warrantyExpiryEmail } from "@/lib/email";

const EXPIRY_REMINDER_DAYS = [90, 60, 30, 15, 7] as const;

type ExpiringWarranty = {
  id: string;
  user_id?: string | null;
  created_by?: string | null;
  recipient_user_id?: string | null;
  buyer_id?: string | null;
  product_name?: string | null;
  end_date?: string | null;
  language?: string | null;
};

function dateOnly(date: Date) {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function getRecipientId(warranty: ExpiringWarranty) {
  return warranty.created_by || warranty.user_id || warranty.recipient_user_id || warranty.buyer_id || null;
}

function normalizeLocale(value: unknown) {
  return value === "ar" ? "ar" : "en";
}

async function getRecipientProfile(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, preferred_language, email_notifications")
    .eq("id", userId)
    .maybeSingle();

  return profile as {
    email?: string | null;
    full_name?: string | null;
    preferred_language?: string | null;
    email_notifications?: boolean | null;
  } | null;
}

async function getAuthEmail(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email || null;
  } catch {
    return null;
  }
}

export async function sendExpiryReminders(now = new Date()) {
  const admin = createSupabaseAdminClient();
  let notificationsCreated = 0;
  let emailsSent = 0;
  let warrantiesChecked = 0;

  for (const days of EXPIRY_REMINDER_DAYS) {
    const notificationType = `warranty_expiring_${days}d`;
    const targetStart = dateOnly(addDays(now, days));
    const targetEnd = dateOnly(addDays(now, days + 1));

    const { data: warranties, error } = await admin
      .from("warranties")
      .select("id, user_id, created_by, recipient_user_id, buyer_id, product_name, end_date, language")
      .eq("status", "active")
      .gte("end_date", targetStart)
      .lt("end_date", targetEnd);

    if (error || !warranties?.length) {
      continue;
    }

    warrantiesChecked += warranties.length;

    for (const warranty of warranties as ExpiringWarranty[]) {
      const recipientId = getRecipientId(warranty);
      if (!recipientId) continue;

      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", recipientId)
        .eq("warranty_id", warranty.id)
        .eq("type", notificationType)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      const productName = warranty.product_name || "Warranty";
      const locale = normalizeLocale(warranty.language);
      const warrantyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://warrantee.io"}/${locale}/warranties/${warranty.id}`;

      const { error: insertError } = await admin.from("notifications").insert({
        user_id: recipientId,
        warranty_id: warranty.id,
        type: notificationType,
        title: `Warranty Expiring in ${days} Days`,
        title_ar: `\u0627\u0644\u0636\u0645\u0627\u0646 \u064a\u0646\u062a\u0647\u064a \u062e\u0644\u0627\u0644 ${days} \u064a\u0648\u0645`,
        body: `${productName} warranty expires on ${warranty.end_date}`,
        body_ar: `\u0636\u0645\u0627\u0646 ${productName} \u064a\u0646\u062a\u0647\u064a \u0641\u064a ${warranty.end_date}`,
        action_url: warrantyUrl,
      });

      if (insertError) continue;
      notificationsCreated++;

      const profile = await getRecipientProfile(admin, recipientId);
      if (profile?.email_notifications === false) continue;

      const email = profile?.email || (await getAuthEmail(admin, recipientId));
      if (!email) continue;

      const name = profile?.full_name || email.split("@")[0] || "User";
      const emailLocale = normalizeLocale(profile?.preferred_language || warranty.language);
      const { subject, html } = warrantyExpiryEmail(name, productName, days, warrantyUrl, emailLocale);
      const result = await sendEmail({ to: email, subject, html });
      if (result.success) {
        emailsSent++;
        await admin
          .from("notifications")
          .update({ is_email_sent: true })
          .eq("user_id", recipientId)
          .eq("warranty_id", warranty.id)
          .eq("type", notificationType);
      }
    }
  }

  return {
    success: true,
    reminder_days: [...EXPIRY_REMINDER_DAYS],
    warranties_checked: warrantiesChecked,
    notifications_created: notificationsCreated,
    emails_sent: emailsSent,
    checked_at: now.toISOString(),
  };
}
