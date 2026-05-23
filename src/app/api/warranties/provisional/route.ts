// Warrantee â Provisional Warranties API
// GET /api/warranties/provisional â List user's provisional warranties
// PATCH /api/warranties/provisional â Batch update (not used yet)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getUser(_request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function GET(request: NextRequest) {
  const { user, supabase } = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams?.get('status') || 'pending';
  const page = parseInt(searchParams?.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams?.get('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('provisional_warranties')
    .select(`
      *,
      ingestion_attachments (
        filename,
        content_type,
        aggregate_confidence,
        extracted_fields,
        storage_path
      )
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const confidenceScore = Number(body.confidence_score || 0);
  const payload = {
    user_id: user.id,
    product_name: body.product_name || null,
    brand: body.brand || null,
    model_number: body.model_number || null,
    serial_number: body.serial_number || null,
    warranty_duration_months:
      typeof body.warranty_duration_months === 'number' ? body.warranty_duration_months : null,
    purchase_date: body.purchase_date || null,
    expiry_date: body.expiry_date || null,
    seller_name: body.seller_name || null,
    confidence_score: Number.isFinite(confidenceScore) ? confidenceScore : 0,
    needs_input_fields: Array.isArray(body.needs_input_fields) ? body.needs_input_fields : [],
    status: 'pending',
  };

  const { data, error } = await supabase
    .from('provisional_warranties')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to create provisional warranty' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
