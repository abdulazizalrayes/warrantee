import type { Resend } from "resend";

interface SellerInvitationEmailInput {
  invitationId: string;
  sellerEmail: string;
  sellerName: string | null;
  inviterName: string;
  inviteUrl: string;
  from: string;
  bcc: string;
}

export function isInvitationRetryable(
  invitation: { status: string; created_at: string; last_delivery_attempt_at?: string | null },
  now = Date.now(),
) {
  if (invitation.status === "pending_delivery") return true;
  if (invitation.status !== "pending") return false;
  const lastAttempt = invitation.last_delivery_attempt_at || invitation.created_at;
  return now - new Date(lastAttempt).getTime() >= 5 * 60 * 1000;
}

export async function sendSellerInvitationEmail(
  resend: Resend,
  input: SellerInvitationEmailInput,
) {
  const { data, error } = await resend.emails.send({
    from: input.from,
    to: input.sellerEmail,
    bcc: input.bcc,
    subject: `${input.inviterName} invited you to Warrantee`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0F172A; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">Warrantee</h1>
          <p style="color: #94A3B8; margin: 4px 0 0;">Trust the Terms</p>
        </div>
        <div style="padding: 32px 24px;">
          <p>Hi${input.sellerName ? ` ${input.sellerName}` : ""},</p>
          <p><strong>${input.inviterName}</strong> has registered a warranty for one of your products on Warrantee and would like you to join the platform.</p>
          <p>By joining Warrantee, you can:</p>
          <ul>
            <li>Manage warranty claims from your customers</li>
            <li>Build trust with verified warranty records</li>
            <li>Reduce warranty disputes</li>
            <li>Track your products in the field</li>
          </ul>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${input.inviteUrl}" style="background: #2563EB; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #64748B; font-size: 14px;">This invitation expires in 30 days.</p>
        </div>
        <div style="background: #F8FAFC; padding: 16px 24px; text-align: center; color: #94A3B8; font-size: 12px;">
          <p>Warrantee<br>warrantee.io</p>
        </div>
      </div>
    `,
  }, {
    idempotencyKey: `seller-invitation/${input.invitationId}`,
  });

  if (error) throw new Error(error.message || "Resend rejected the invitation");
  if (!data?.id) throw new Error("Resend did not return an email ID");
  return { emailId: data.id };
}
