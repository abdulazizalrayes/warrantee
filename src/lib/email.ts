// @ts-nocheck
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = "Warrantee <hello@warrantee.io>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Email exception:", err);
    return { success: false, error: "Failed to send email" };
  }
}

export function warrantyExpiryEmail(
  name: string,
  productName: string,
  daysLeft: number,
  warrantyUrl: string,
  locale: string = "en"
) {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const subject = isAr
    ? `تنبيه: ضمان ${productName} ينتهي خلال ${daysLeft} يوم`
    : `Alert: ${productName} warranty expiring in ${daysLeft} days`;

  const html = `
<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
  <div style="background: white; border-radius: 8px; padding: 32px; border: 1px solid #e5e5e5;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #1A1A2E; font-size: 24px; margin: 0;">Warrantee</h1>
    </div>
    <h2 style="color: #1A1A2E; font-size: 18px;">
      ${isAr ? `مرحباً ${name}` : `Hi ${name}`}
    </h2>
    <p style="color: #555; line-height: 1.6;">
      ${isAr
        ? `ضمان <strong>${productName}</strong> ينتهي خلال <strong>${daysLeft} يوم</strong>. ننصحك بمراجعة خيارات التمديد.`
        : `Your warranty for <strong>${productName}</strong> is expiring in <strong>${daysLeft} days</strong>. We recommend reviewing extension options.`}
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${warrantyUrl}" style="display: inline-block; background: #F5C542; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        ${isAr ? "عرض الضمان" : "View Warranty"}
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">
      ${isAr ? "هذا بريد آلي من Warrantee. لا ترد عليه." : "This is an automated email from Warrantee. Please do not reply."}
    </p>
  </div>
</body>
</html>`;

  return { subject, html };
}

export function welcomeEmail(name: string, locale: string = "en") {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const subject = isAr
    ? "مرحباً بك في Warrantee!"
    : "Welcome to Warrantee!";

  const html = `
<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
  <div style="background: white; border-radius: 8px; padding: 32px; border: 1px solid #e5e5e5;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #1A1A2E; font-size: 24px; margin: 0;">Warrantee</h1>
      <p style="color: #F5C542; font-size: 14px; margin: 4px 0;">Trust the Terms™</p>
    </div>
    <h2 style="color: #1A1A2E; font-size: 18px;">
      ${isAr ? `مرحباً ${name}!` : `Welcome, ${name}!`}
    </h2>
    <p style="color: #555; line-height: 1.6;">
      ${isAr
        ? "شكراً لانضمامك إلى Warrantee. يمكنك الآن إدارة ضماناتك بسهولة."
        : "Thanks for joining Warrantee. You can now manage your warranties with ease."}
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://warrantee.io/en/dashboard" style="display: inline-block; background: #F5C542; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        ${isAr ? "ابدأ الآن" : "Get Started"}
      </a>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export function claimNotificationEmail(
  name: string,
  claimNumber: string,
  productName: string,
  claimUrl: string,
  locale: string = "en"
) {
  const isAr = locale === "ar";

  const subject = isAr
    ? `مطالبة جديدة: ${claimNumber}`
    : `New Claim Filed: ${claimNumber}`;

  const html = `
<!DOCTYPE html>
<html dir="${isAr ? "rtl" : "ltr"}" lang="${isAr ? "ar" : "en"}">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
  <div style="background: white; border-radius: 8px; padding: 32px; border: 1px solid #e5e5e5;">
    <h1 style="color: #1A1A2E; font-size: 24px; text-align: center;">Warrantee</h1>
    <h2 style="color: #1A1A2E;">${isAr ? `مرحباً ${name}` : `Hi ${name}`}</h2>
    <p style="color: #555; line-height: 1.6;">
      ${isAr
        ? `تم تقديم مطالبة جديدة (<strong>${claimNumber}</strong>) على ضمان <strong>${productName}</strong>.`
        : `A new claim (<strong>${claimNumber}</strong>) has been filed for <strong>${productName}</strong>.`}
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${claimUrl}" style="display: inline-block; background: #F5C542; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        ${isAr ? "عرض المطالبة" : "View Claim"}
      </a>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
