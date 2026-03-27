// Warrantee — Seller Invitation Token API
// GET /api/invitations/seller/[token] — Validate invitation
// POST /api/invitations/seller/[token] — Accept invitation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: invitation, error } = await supabaseAdmin
    .from('seller_invitations')
    .select(`
      id, seller_email, seller_name, seller_phone, status, expires_at,
      profiles!inviter_id ( full_name, email )
    `)
    .eq('token', token)
    .single();

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  if (invitation.status === 'accepted') {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 410 });
  }

  if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });
  }

  if (invitation.status === 'revoked') {
    return NextResponse.json({ error: 'Invitation revoked' }, { status: 410 });
  }

  return NextResponse.json({
    invitation_id: invitation.id,
    seller_email: invitation.seller_email,
    seller_name: invitation.seller_name,
    inviter_name: (invitation.profiles as any)?.full_name || 'A customer',
    status: invitation.status,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // User must be authenticated
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please register or sign in first' }, { status: 401 });
  }

  // Validate invitation
  const { data: invitation } = await supabaseAdmin
    .from('seller_invitations')
    .select('*')
    .eq('token', token)
    .in('status', ['pending', 'sent'])
    .single();

  if (!invitation || new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
  }

  // Update user role to seller
  await supabaseAdmin.from('profiles').update({
    role: 'seller',
  }).eq('id', user.id);

  // Mark invitation as accepted
  await supabaseAdmin.from('seller_invitations').update({
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  }).eq('id', invitation.id);

  // Link warranty to seller if applicable
  if (invitation.warranty_id) {
    await supabaseAdmin.from('warranties').update({
      seller_id: user.id,
    }).eq('id', invitation.warranty_id);
  }

  return NextResponse.json({
    status: 'accepted',
    message: 'Welcome to Warrantee as a seller!',
  });
}
