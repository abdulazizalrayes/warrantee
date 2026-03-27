// Warrantee — Confirm Provisional Warranty
// POST /api/warranties/provisional/[id]/confirm
// Converts a provisional warranty into a confirmed warranty

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/ingestion';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .single();

  if (fetchError || !provisional) {
    return NextResponse.json({ error: 'Provisional warranty not found' }, { status: 404 });
  }

  // Get user corrections from request body
  const body = await request.json();
  const corrections = body.corrections || {};

  // Merge OCR data with user corrections (matches warranties table schema)
  const warrantyData = {
    recipient_user_id: user.id,
    product_name: corrections.product_name || provisional.product_name || 'Unknown Product',
    sku: corrections.model_number || provisional.model_number || null,
    serial_number: corrections.serial_number || provisional.serial_number || null,
    start_date: corrections.purchase_date || provisional.purchase_date || null,
    end_date: corrections.expiry_date || provisional.expiry_date || null,
    seller_name: corrections.seller_name || provisional.seller_name || null,
    is_self_registered: true,
    source: 'email_ingestion',
    ingestion_job_id: provisional.ingestion_job_id,
  };

  // Create confirmed warranty
  const { data: warranty, error: createError } = await supabaseAdmin
    .from('warranties')
    .insert(warrantyData)
    .select('id')
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Update provisional warranty status
  await supabase.from('provisional_warranties').update({
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  }).eq('id', id);

  // Link attachment to warranty
  if (provisional.attachment_id) {
    await supabaseAdmin.from('ingestion_attachments').update({
      warranty_id: warranty.id,
    }).eq('id', provisional.attachment_id);
  }

  // Update ingestion job status
  if (provisional.ingestion_job_id) {
    await supabaseAdmin.from('ingestion_jobs').update({
      status: 'confirmed',
    }).eq('id', provisional.ingestion_job_id);

    await logAudit(
      provisional.ingestion_job_id,
      'user_confirmed',
      `user:${user.id}`,
      {
        provisional_id: id,
        warranty_id: warranty.id,
        corrections_applied: Object.keys(corrections),
      },
      provisional.attachment_id
    );
  }

  return NextResponse.json({
    warranty_id: warranty.id,
    status: 'confirmed',
  });
}
