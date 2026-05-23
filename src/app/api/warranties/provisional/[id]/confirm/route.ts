// Warrantee — Confirm Provisional Warranty
// POST /api/warranties/provisional/[id]/confirm
// Converts a provisional warranty into a confirmed warranty

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { confirmProvisionalWarranty } from '@/lib/provisional-warranties';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check
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

  // Get provisional warranty
  const { data: provisional, error: fetchError } = await supabase
    .from('provisional_warranties')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !provisional) {
    return NextResponse.json({ error: 'Provisional warranty not found' }, { status: 404 });
  }

  // Get user corrections from request body
  const body = await request.json();
  const corrections = body.corrections || {};
  const result = await confirmProvisionalWarranty(id, {
    corrections,
    actor: `user:${user.id}`,
    auditAction: 'user_confirmed',
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    warranty_id: result.warrantyId,
    status: 'confirmed',
  });
}
