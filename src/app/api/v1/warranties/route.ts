import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildWarrantyAccessOrClause, buildWarrantyOwnershipInsert } from '@/lib/warranty-access';
import {
  buildIdempotencyReference,
  isValidIsoDate,
  parsePositiveInt,
  resolveApiRequester,
} from '@/lib/api-v1';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase client environment variables are not configured');
  }

  return createClient(url, key);
}

// GET /api/v1/warranties - List warranties
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const requester = await resolveApiRequester(request);
  if (!requester.ok) {
    return NextResponse.json({ error: requester.error }, { status: requester.status });
  }

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams?.get('page'), 1, 10000);
  const limit = parsePositiveInt(searchParams?.get('limit'), 20, 100);
  const status = searchParams?.get('status');
  const category = searchParams?.get('category');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('warranties')
    .select('*', { count: 'exact' })
    .or(buildWarrantyAccessOrClause(requester.userId));
  if (status === 'active') query = query.gt('end_date', new Date().toISOString());
  else if (status === 'expired') query = query.lte('end_date', new Date().toISOString());
  if (category) query = query.eq('category', category);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

// POST /api/v1/warranties - Create warranty
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const requester = await resolveApiRequester(request);
  if (!requester.ok) {
    return NextResponse.json({ error: requester.error }, { status: requester.status });
  }

  try {
    const body = await request.json();
    const required = ['product_name', 'start_date', 'end_date'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    if (!isValidIsoDate(body.start_date) || !isValidIsoDate(body.end_date)) {
      return NextResponse.json({ error: 'start_date and end_date must be valid dates' }, { status: 400 });
    }

    if (new Date(body.end_date).getTime() < new Date(body.start_date).getTime()) {
      return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });
    }

    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    const derivedReferenceNumber = idempotencyKey ? buildIdempotencyReference(idempotencyKey) : null;
    const referenceNumber = body.reference_number || derivedReferenceNumber || `WR-${Date.now()}`;

    if (idempotencyKey) {
      const { data: existingWarranty } = await supabase
        .from('warranties')
        .select('*')
        .eq('reference_number', referenceNumber)
        .or(buildWarrantyAccessOrClause(requester.userId))
        .maybeSingle();

      if (existingWarranty) {
        return NextResponse.json({ data: existingWarranty, idempotent_replay: true }, { status: 200 });
      }
    }

    const warrantyData = {
      ...buildWarrantyOwnershipInsert(requester.userId),
      product_name: body.product_name,
      description: body.description || null,
      serial_number: body.serial_number || null,
      reference_number: referenceNumber,
      start_date: body.start_date,
      end_date: body.end_date,
      status: body.status || 'active',
      category: body.category || null,
      supplier: body.supplier || null,
      coverage_type: body.coverage_type || 'standard',
      purchase_price: body.purchase_price || null,
      language: body.language || 'en',
      seller_name: body.seller_name || null,
      seller_email: body.seller_email || null,
    };

    const { data, error } = await supabase.from('warranties').insert(warrantyData).select().single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
