import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildWarrantyAccessOrClause } from '@/lib/warranty-access';
import { resolveApiRequester } from '@/lib/api-v1';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase client environment variables are not configured');
  }

  return createClient(url, key);
}

// GET /api/v1/warranties/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  const requester = await resolveApiRequester(request);
  if (!requester.ok) return NextResponse.json({ error: requester.error }, { status: requester.status });

  const { id } = await params;
  const { data, error } = await supabase
    .from('warranties')
    .select('*')
    .eq('id', id)
    .or(buildWarrantyAccessOrClause(requester.userId))
    .single();

  if (error || !data) return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
  return NextResponse.json({ data });
}

// PUT /api/v1/warranties/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  const requester = await resolveApiRequester(request);
  if (!requester.ok) return NextResponse.json({ error: requester.error }, { status: requester.status });

  const { id } = await params;
  try {
    const body = await request.json();
    const allowedFields = ['product_name', 'description', 'serial_number', 'start_date', 'end_date', 'status', 'category', 'supplier', 'coverage_type', 'purchase_price'];
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const { data, error } = await supabase
      .from('warranties')
      .update(updateData)
      .eq('id', id)
      .or(buildWarrantyAccessOrClause(requester.userId))
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: 'Warranty not found or update failed' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/v1/warranties/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  const requester = await resolveApiRequester(request);
  if (!requester.ok) return NextResponse.json({ error: requester.error }, { status: requester.status });

  const { id } = await params;
  const { error } = await supabase
    .from('warranties')
    .delete()
    .eq('id', id)
    .or(buildWarrantyAccessOrClause(requester.userId));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Warranty deleted successfully' });
}
