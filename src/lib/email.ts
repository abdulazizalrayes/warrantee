// @ts-nocheck
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Warrantee <hello@warrantee.io>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (error) { console.error("Email send error:", error); return { success: false, error: error.message }; }
    return { success: true, id: data?.id };
  } catch (err) { console.error("Email exception:", err); return { success: false, error: "Failed to send email" }; }
}

export function warrantyExpiryEmail(name: string, productName: string, daysLeft: number, warrantyUrl: string, locale: string = "en") {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const subject = isAr ? `\u062a\u0646\u0628\u064a\u0647: \u0636\u0645\u0627\u0646 ${productName} \u064a\u0646\u062a\u0647\u064a \u062e\u0644\u0627\u0644 ${daysLeft} \u064a\u0648\u0645` : `Alert: ${productName} warranty expiring in ${daysLeft} days`;
  const html = `<!DOCTYPE html><html dir="${dir}" lang="${isAr ? "ar" : "en"}"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;"><div style="background:white;border-radius:8px;padding:32px;border:1px solid #e5e5e5;"><h1 style="color:#1A1A2E;font-size:24px;text-align:center;">Warrantee</h1><h2 style="color:#1A1A2E;">${isAr ? "\u0645\u0631\u062d\u0628\u0627\u064b " + name : "Hi " + name}</h2><p style="color:#555;line-height:1.6;">${isAr ? "\u0636\u0645\u0627\u0646 <strong>" + productName + "</strong> \u064a\u0646\u062a\u0647\u064a \u062e\u0644\u0627\u0644 <strong>" + daysLeft + " \u064a\u0648\u0645</strong>." : "Your warranty for <strong>" + productName + "</strong> is expiring in <strong>" + daysLeft + " days</strong>."}</p><div style="text-align:center;margin:24px 0;"><a href="${warrantyUrl}" style="display:inline-block;background:#F5C542;color:#1A1A2E;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${isAr ? "\u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646" : "View Warranty"}</a></div></div></body></html>`;
  return { subject, html };
}

export function welcomeEmail(name: string, locale: string = "en") {
  const isAr = locale === "ar";
  const subject = isAr ? "\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643 \u0641\u064a Warrantee!" : "Welcome to Warrantee!";
  const html = `<!DOCTYPE html><html dir="${isAr ? "rtl" : "ltr"}" lang="${isAr ? "ar" : "en"}"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;"><div style="background:white;border-radius:8px;padding:32px;border:1px solid #e5e5e5;"><h1 style="color:#1A1A2E;font-size:24px;text-align:center;">Warrantee</h1><p style="color:#F5C542;font-size:14px;text-align:center;">Trust the Terms\u2122</p><h2 style="color:#1A1A2E;">${isAr ? "\u0645\u0631\u062d\u0628\u0627\u064b " + name + "!" : "Welcome, " + name + "!"}</h2><p style="color:#555;line-height:1.6;">${isAr ? "\u0634\u0643\u0631\u0627\u064b \u0644\u0627\u0646\u0636\u0645\u0627\u0645\u0643 \u0625\u0644\u0649 Warrantee." : "Thanks for joining Warrantee. You can now manage your warranties with ease."}</p><div style="text-align:center;margin:24px 0;"><a href="https://warrantee.io/en/dashboard" style="display:inline-block;background:#F5C542;color:#1A1A2E;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${isAr ? "\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646" : "Get Started"}</a></div></div></body></html>`;
  return { subject, html };
}

export function claimNotificationEmail(name: string, claimNumber: string, productName: string, claimUrl: string, locale: string = "en") {
  const isAr = locale === "ar";
  const subject = isAr ? `\u0645\u0637\u0627\u0644\u0628\u0629 \u062c\u062f\u064a\u062f\u0629: ${claimNumber}` : `New Claim Filed: ${claimNumber}`;
  const html = `<!DOCTYPE html><html dir="${isAr ? "rtl" : "ltr"}" lang="${isAr ? "ar" : "en"}"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;"><div style="background:white;border-radius:8px;padding:32px;border:1px solid #e5e5e5;"><h1 style="color:#1A1A2E;font-size:24px;text-align:center;">Warrantee</h1><h2 style="color:#1A1A2E;">${isAr ? "\u0645\u0631\u062d\u0628\u0627\u064b " + name : "Hi " + name}</h2><p style="color:#555;line-height:1.6;">${isAr ? "\u062a\u0645 \u062a\u0642\u062f\u064a\u0645 \u0645\u0637\u0627\u0644\u0628\u0629 \u062c\u062f\u064a\u062f\u0629 (<strong>" + claimNumber + "</strong>) \u0639\u0644\u0649 \u0636\u0645\u0627\u0646 <strong>" + productName + "</strong>." : "A new claim (<strong>" + claimNumber + "</strong>) has been filed for <strong>" + productName + "</strong>."}</p><div style="text-align:center;margin:24px 0;"><a href="${claimUrl}" style="display:inline-block;background:#F5C542;color:#1A1A2E;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${isAr ? "\u0639\u0631\u0636 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629" : "View Claim"}</a></div></div></body></html>`;
  return { subject, html };
}
