export interface EmailTemplate {
  subject: { en: string; ar: string };
  html: (data: Record<string, string>, locale: 'en' | 'ar') => string;
}

const baseLayout = (content: string, locale: 'en' | 'ar') => `
<!DOCTYPE html>
<html dir="${locale === 'ar' ? 'rtl' : 'ltr'}" lang="${locale}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#059669,#0d9488);padding:24px 32px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Warrantee</h1>
      <p style="color:#d1fae5;margin:4px 0 0;font-size:13px;">${locale === 'ar' ? '\u062B\u0642 \u0628\u0627\u0644\u0634\u0631\u0648\u0637' : 'Trust the Terms\u2122'}</p>
    </div>
    <div style="padding:32px;">${content}</div>
    <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Warrantee. ${locale === 'ar' ? '\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629' : 'All rights reserved.'}</p>
    </div>
  </div>
</div>
</body>
</html>`;

export const emailTemplates: Record<string, EmailTemplate> = {
  warrantyCreated: {
    subject: {
      en: 'Your warranty has been registered!',
      ar: '\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0636\u0645\u0627\u0646\u0643!',
    },
    html: (data, locale) => baseLayout(locale === 'ar' ? `
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">\u0645\u0631\u062D\u0628\u064B\u0627 ${data.name}\u060C</h2>
      <p style="color:#4b5563;line-height:1.6;">\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0636\u0645\u0627\u0646\u0643 \u0628\u0646\u062C\u0627\u062D \u0644\u0644\u0645\u0646\u062A\u062C <strong>${data.product}</strong>.</p>
      <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;color:#059669;font-weight:600;">\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0636\u0645\u0627\u0646</p>
        <p style="margin:4px 0;color:#374151;">\u0631\u0642\u0645 \u0627\u0644\u0636\u0645\u0627\u0646: <strong>${data.warrantyId}</strong></p>
        <p style="margin:4px 0;color:#374151;">\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621: <strong>${data.expiryDate}</strong></p>
      </div>
      <a href="${data.dashboardUrl}" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">\u0639\u0631\u0636 \u0627\u0644\u0636\u0645\u0627\u0646</a>
    ` : `
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Hi ${data.name},</h2>
      <p style="color:#4b5563;line-height:1.6;">Your warranty for <strong>${data.product}</strong> has been successfully registered.</p>
      <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;color:#059669;font-weight:600;">Warranty Details</p>
        <p style="margin:4px 0;color:#374151;">Warranty ID: <strong>${data.warrantyId}</strong></p>
        <p style="margin:4px 0;color:#374151;">Expiry Date: <strong>${data.expiryDate}</strong></p>
      </div>
      <a href="${data.dashboardUrl}" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Warranty</a>
    `, locale),
  },

  warrantyExpiring: {
    subject: {
      en: 'Your warranty is expiring soon',
      ar: '\u0636\u0645\u0627\u0646\u0643 \u0639\u0644\u0649 \u0648\u0634\u0643 \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621',
    },
    html: (data, locale) => baseLayout(locale === 'ar' ? `
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">\u062A\u0646\u0628\u064A\u0647 \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646</h2>
      <p style="color:#4b5563;line-height:1.6;">\u0636\u0645\u0627\u0646\u0643 \u0644\u0644\u0645\u0646\u062A\u062C <strong>${data.product}</strong> \u0633\u064A\u0646\u062A\u0647\u064A \u0641\u064A <strong>${data.daysLeft} \u064A\u0648\u0645</strong>.</p>
      <div style="background:#fef3c7;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0;color:#92400e;">\u064A\u0645\u0643\u0646\u0643 \u062A\u0645\u062F\u064A\u062F \u0627\u0644\u0636\u0645\u0627\u0646 \u0644\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u062D\u0645\u0627\u064A\u0629 \u0645\u0646\u062A\u062C\u0643.</p>
      </div>
      <a href="${data.extendUrl}" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">\u062A\u0645\u062F\u064A\u062F \u0627\u0644\u0636\u0645\u0627\u0646</a>
    ` : `
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Warranty Expiring Soon</h2>
      <p style="color:#4b5563;line-height:1.6;">Your warranty for <strong>${data.product}</strong> will expire in <strong>${data.daysLeft} days</strong>.</p>
      <div style="background:#fef3c7;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0;color:#92400e;">You can extend your warranty to keep your product protected.</p>
      </div>
      <a href="${data.extendUrl}" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Extend Warranty</a>
    `, locale),
  },

  claimSubmitted: {
    subject: {
      en: 'Warranty claim submitted successfully',
      ar: '\u062A\u0645 \u062A\u0642\u062F\u064A\u0645 \u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u0636\u0645\u0627\u0646 \u0628\u0646\u062C\u0627\u062D',
    },
    html: (data, locale) => baseLayout(locale === 'ar' ? `
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">\u062A\u0645 \u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629</h2>
      <p style="color:#4b5563;line-height:1.6;">\u062A\u0645 \u062A\u0642\u062F\u064A\u0645 \u0645\u0637\u0627\u0644\u0628\u062A\u0643 \u0628\u0646\u062C\u0627\u062D. \u0631\u0642\u0645 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629: <strong>${data.claimId}</strong></p>
      <p style="color:#4b5563;line-height:1.6;">\u0633\u064A\u062A\u0645 \u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u0637\u0627\u0644\u0628\u062A\u0643 \u0648\u0627\u0644\u0631\u062F \u0639\u0644\u064A\u0643 \u0641\u064A \u0623\u0642\u0631\u0628 \u0648\u0642\u062A.</p>
    ` : `
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Claim Submitted</h2>
      <p style="color:#4b5563;line-height:1.6;">Your claim has been submitted successfully. Claim ID: <strong>${data.claimId}</strong></p>
      <p style="color:#4b5563;line-height:1.6;">We will review your claim and get back to you shortly.</p>
    `, locale),
  },

  welcomeSeller: {
    subject: {
      en: 'Welcome to Warrantee for Sellers!',
      ar: '\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643 \u0641\u064A \u0648\u0627\u0631\u0646\u062A\u064A \u0644\u0644\u0628\u0627\u0626\u0639\u064A\u0646!',
    },
    html: (data, locale) => baseLayout(locale === 'ar' ? `
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">\u0645\u0631\u062D\u0628\u064B\u0627 ${data.name}\u060C</h2>
      <p style="color:#4b5563;line-height:1.6;">\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0634\u0631\u0643\u062A\u0643 <strong>${data.company}</strong> \u0628\u0646\u062C\u0627\u062D \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 Warrantee.</p>
      <p style="color:#4b5563;line-height:1.6;">\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u0625\u0635\u062F\u0627\u0631 \u0636\u0645\u0627\u0646\u0627\u062A \u0631\u0642\u0645\u064A\u0629 \u0644\u0639\u0645\u0644\u0627\u0626\u0643.</p>
      <a href="${data.dashboardUrl}" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">\u0627\u0628\u062F\u0623 \u0627\u0644\u0622\u0646</a>
    ` : `
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Welcome ${data.name},</h2>
      <p style="color:#4b5563;line-height:1.6;">Your company <strong>${data.company}</strong> has been successfully registered on Warrantee.</p>
      <p style="color:#4b5563;line-height:1.6;">You can now issue digital warranties for your customers.</p>
      <a href="${data.dashboardUrl}" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Get Started</a>
    `, locale),
  },
};

export default emailTemplates;
