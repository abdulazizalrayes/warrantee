// Warrantee — Admin Invitation API
// POST /api/admin/invitations — Send admin invitation via Resend
// GET /api/admin/invitations — List admin invitations

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { sendAdminInvitationEmail } from '@/lib/admin/send-invitation-email';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return null;
  return { ...user, role: profile.role, full_name: profile.full_name };
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.json();
  const { email, role, locale } = body;

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }

  if (!['admin', 'support', 'super_admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Only super_admin can invite other admins/super_admins
  if (role !== 'support' && authUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can invite administrators' }, { status: 403 });
  }

  // Check if user is already an admin
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('email', email.toLowerCase())
    .single();

  if (existingProfile && ['admin', 'super_admin'].includes(existingProfile.role)) {
    return NextResponse.json({ error: 'User is already an administrator' }, { status: 409 });
  }

  // Create invitation record
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  const { data: invitation, error: createError } = await supabaseAdmin
    .from('admin_invitations')
    .insert({
      email: email.toLowerCase(),
      role,
      token,
      invited_by: authUser.id,
      invited_by_name: authUser.full_name || 'Admin',
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Send email via Resend
  try {
    await sendAdminInvitationEmail({
      to: email,
      inviterName: authUser.full_name || 'Admin',
      role,
      token,
      locale: locale || 'en',
    });

    await supabaseAdmin.from('admin_invitations').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    }).eq('id', invitation.id);

  } catch (emailError) {
    console.error('[AdminInvite] Email send failed:', emailError);
    // Invitation created but email failed
  }

  return NextResponse.json({
    invitation_id: invitation.id,
    status: 'sent',
  });
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('admin_invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
