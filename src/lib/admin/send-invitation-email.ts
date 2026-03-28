// Warrantee — Admin Invitation Email via Resend
// Sends admin role invitation emails
import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

interface InvitationEmailParams {
  to: string;
  inviterName: string;
  role: string;
  token: string;
  locale?: string;
}

const roleLabels: Record<string, { en: string; ar: string }> = {
  admin: { en: 'Administrator', ar: 'مدير' },
  support: { en: 'Support Agent', ar: 'وكيل دعم' },
  super_admin: { en: 'Super Administrator', ar: 'مدير أعلى' },
};

export async function sendAdminInvitationEmail({
  to,
  inviterName,
  role,
  token,
  locale = 'en',
}: InvitationEmailParams) {
  const isAr = locale === 'ar';
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/admin/accept-invite?token=${token}`;

  const roleLabel = isAr ? roleLabels[role]?.ar || role : roleLabels[role]?.en || role;

  const subject = isAr
    ? `دعوة للانضمام كـ ${roleLabel} في Warrantee`
    : `You've been invited as ${roleLabel} on Warrantee`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${isAr ? 'rtl' : 'ltr'};">
      <div style="background: #0F172A; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Warrantee</h1>
        <p style="color: #94A3B8; margin: 4px 0 0; font-size: 14px;">Trust the Terms™</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="font-size: 20px; color: #0F172A; margin-bottom: 16px;">
          ${isAr ? 'دعوة إدارية' : 'Admin Invitation'}
        </h2>
        <p style="color: #374151; line-height: 1.6;">
          ${isAr
            ? `<strong>${inviterName}</strong> دعاك للانضمام إلى لوحة إدارة Warrantee بصفة <strong>${roleLabel}</strong>.`
            : `<strong>${inviterName}</strong> has invited you to join the Warrantee admin panel as <strong>${roleLabel}</strong>.`}
        </p>
        <p style="color: #374151; line-height: 1.6;">
          ${isAr
            ? 'بقبول هذه الدعوة، ستتمكن من الوصول إلى أدوات إدارة الضمانات والمستخدمين والتحليلات.'
            : 'By accepting, you will have access to warranty management, user administration, and analytics tools.'}
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${acceptUrl}" style="
            display: inline-block;
            padding: 14px 40px;
            border-radius: 8px;
            background: #2563EB;
            color: white;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
          ">
            ${isAr ? 'قبول الدعوة' : 'Accept Invitation'}
          </a>
        </div>
        <p style="color: #94A3B8; font-size: 13px;">
          ${isAr
            ? 'هذه الدعوة صالحة لمدة 7 أيام. إذا لم تقبلها خلال هذه المدة، يمكن لـ ' + inviterName + ' إرسال دعوة جديدة.'
            : `This invitation is valid for 7 days. If you don't accept within that time, ${inviterName} can send a new one.`}
        </p>
      </div>
      <div style="background: #F8FAFC; padding: 16px 24px; text-align: center;">
        <p style="color: #94A3B8; font-size: 12px; margin: 0;">
          Warrantee — Trust the Terms™ | warrantee.io
        </p>
      </div>
    </div>
  `;

  const resend = getResend();
  const result = await resend.emails.send({
    from: 'Warrantee Admin <admin@warrantee.io>',
    to,
    subject,
    html,
  });

  return result;
}
