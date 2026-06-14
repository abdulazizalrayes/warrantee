// Warrantee — Admin Resolve Fraud Signal / Manual Review
// POST /api/admin/ingestion/[id]/resolve

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/ingestion';

type ResolveAction = "approve" | "reject" | "resolve_fraud";

const RESOLVE_ACTIONS = new Set<ResolveAction>(["approve", "reject", "resolve_fraud"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseAdmin = createSupabaseAdminClient();

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

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action, resolution_note, fraud_signal_ids } = body;
  if (!RESOLVE_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (
    action === 'resolve_fraud' &&
    (!Array.isArray(fraud_signal_ids) ||
      fraud_signal_ids.length === 0 ||
      fraud_signal_ids.some((value) => typeof value !== 'string' || value.length === 0))
  ) {
    return NextResponse.json({ error: 'fraud_signal_ids is required' }, { status: 400 });
  }

  if (action === 'resolve_fraud') {
    // Resolve specific fraud signals
    const { error } = await supabaseAdmin.from('fraud_signals').update({
      resolved: true,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    }).in('id', fraud_signal_ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit(id, 'fraud_resolved', `admin:${user.id}`, {
      fraud_signal_ids,
      resolution_note,
    });
  }

  if (action === 'approve') {
    const { error } = await supabaseAdmin.from('ingestion_jobs').update({
      status: 'confirmed',
    }).eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit(id, 'user_confirmed', `admin:${user.id}`, {
      resolution_note,
      approved_by_admin: true,
    });
  }

  if (action === 'reject') {
    const { error } = await supabaseAdmin.from('ingestion_jobs').update({
      status: 'rejected',
    }).eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit(id, 'user_rejected', `admin:${user.id}`, {
      resolution_note,
      rejected_by_admin: true,
    });
  }

  return NextResponse.json({ status: 'resolved', action });
}
