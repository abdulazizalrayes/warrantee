// Warrantee — Admin Resolve Fraud Signal / Manual Review
// POST /api/admin/ingestion/[id]/resolve

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/ingestion';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseAdmin = getSupabaseAdmin();

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { action, resolution_note, fraud_signal_ids } = body;
  // action: 'approve' | 'reject' | 'resolve_fraud'

  if (action === 'resolve_fraud' && fraud_signal_ids?.length) {
    // Resolve specific fraud signals
    await supabaseAdmin.from('fraud_signals').update({
      resolved: true,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    }).in('id', fraud_signal_ids);

    await logAudit(id, 'fraud_resolved', `admin:${user.id}`, {
      fraud_signal_ids,
      resolution_note,
    });
  }

  if (action === 'approve') {
    await supabaseAdmin.from('ingestion_jobs').update({
      status: 'confirmed',
    }).eq('id', id);

    await logAudit(id, 'user_confirmed', `admin:${user.id}`, {
      resolution_note,
      approved_by_admin: true,
    });
  }

  if (action === 'reject') {
    await supabaseAdmin.from('ingestion_jobs').update({
      status: 'rejected',
    }).eq('id', id);

    await logAudit(id, 'user_rejected', `admin:${user.id}`, {
      resolution_note,
      rejected_by_admin: true,
    });
  }

  return NextResponse.json({ status: 'resolved', action });
}
