// Warrantee — Update/Reject Provisional Warranty
// PATCH /api/warranties/provisional/[id]

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { logAudit } from '@/lib/ingestion';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
  const { action } = body; // 'reject' | 'not_warranty' | 'update_fields'

  const { data: provisional } = await supabase
    .from('provisional_warranties')
    .select('*, ingestion_job_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!provisional) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (action === 'reject') {
    await supabase.from('provisional_warranties').update({
      status: 'rejected',
    }).eq('id', id);

    if (provisional.ingestion_job_id) {
      await logAudit(provisional.ingestion_job_id, 'user_rejected', `user:${user.id}`, {
        provisional_id: id,
      });
    }

    return NextResponse.json({ status: 'rejected' });
  }

  if (action === 'not_warranty') {
    await supabase.from('provisional_warranties').update({
      status: 'not_warranty',
    }).eq('id', id);

    if (provisional.ingestion_job_id) {
      await logAudit(provisional.ingestion_job_id, 'user_rejected', `user:${user.id}`, {
        provisional_id: id,
        reason: 'not_warranty',
      });
    }

    return NextResponse.json({ status: 'not_warranty' });
  }

  if (action === 'update_fields') {
    const allowedFields = [
      'product_name', 'brand', 'model_number', 'serial_number',
      'warranty_duration_months', 'purchase_date', 'expiry_date', 'seller_name',
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('provisional_warranties').update(updates).eq('id', id);
    }

    return NextResponse.json({ status: 'updated', fields: Object.keys(updates) });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
