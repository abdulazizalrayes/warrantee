// Warrantee — Seller Invitation API
// POST /api/invitations/seller — Send invitation to a seller

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { seller_email, seller_name, seller_phone, warranty_id } = body;

  if (!seller_email) {
    return NextResponse.json({ error: 'seller_email is required' }, { status: 400 });
  }

  // Check if seller is already registered
  const { data: existingSeller } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', seller_email.toLowerCase())
    .single();

  if (existingSeller) {
    return NextResponse.json({
      error: 'Seller is already registered',
      seller_id: existingSeller.id,
    }, { status: 409 });
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from('seller_invitations')
    .select('id, status, created_at')
    .eq('seller_email', seller_email.toLowerCase())
    .eq('inviter_id', user.id)
    .eq('status', 'pending')
    .single();

  if (existingInvite) {
    return NextResponse.json({
      error: 'Invitation already sent',
      invitation_id: existingInvite.id,
    }, { status: 409 });
  }

  // Create invitation
  const { data: invitation, error: createError } = await supabase
    .from('seller_invitations')
    .insert({
      inviter_id: user.id,
      seller_email: seller_email.toLowerCase(),
      seller_name: seller_name || null,
      seller_phone: seller_phone || null,
      warranty_id: warranty_id || null,
      status: 'pending',
    })
    .select('id, token')
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Get inviter's profile for the email
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  // Send invitation email via Resend
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/en/seller/accept-invite?token=${invitation.token}`;

  try {
    await getResend().emails.send({
      from: 'Warrantee <noreply@warrantee.io>',
      to: seller_email,
      bcc: 'hello@warrantee.io',
      subject: `${inviterProfile?.full_name || 'A customer'} invited you to Warrantee`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0F172A; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">Warrantee</h1>
            <p style="color: #94A3B8; margin: 4px 0 0;">Trust the Terms™</p>
          </div>
          <div style="padding: 32px 24px;">
            <p>Hi${seller_name ? ` ${seller_name}` : ''},</p>
            <p><strong>${inviterProfile?.full_name || 'A customer'}</strong> has registered a warranty for one of your products on Warrantee and would like you to join the platform.</p>
            <p>By joining Warrantee, you can:</p>
            <ul>
              <li>Manage warranty claims from your customers</li>
              <li>Build trust with verified warranty records</li>
              <li>Reduce warranty disputes</li>
              <li>Track your products in the field</li>
            </ul>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" style="background: #2563EB; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #64748B; font-size: 14px;">This invitation expires in 30 days.</p>
          </div>
          <div style="background: #F8FAFC; padding: 16px 24px; text-align: center; color: #94A3B8; font-size: 12px;">
            <p>Warrantee — Trust the Terms™<br>warrantee.io</p>
          </div>
        </div>
      `,
    });

    // Update invitation status
    await supabase.from('seller_invitations').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    }).eq('id', invitation.id);

  } catch (emailError) {
    console.error('[Invitation] Email send failed:', emailError);
    // Invitation is created but email failed — can retry later
  }

  return NextResponse.json({
    invitation_id: invitation.id,
    status: 'sent',
  });
}
