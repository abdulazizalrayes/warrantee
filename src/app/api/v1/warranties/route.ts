import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase client environment variables are not configured');
  }

  return createClient(url, key);
}

function validateApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '');
}

// GET /api/v1/warranties - List warranties
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const token = validateApiKey(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized. Provide Bearer token.' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const offset = (page - 1) * limit;

  let query = supabase.from('warranties').select('*', { count: 'exact' }).eq('user_id', user.id);
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
  const token = validateApiKey(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized. Provide Bearer token.' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const required = ['product_name', 'start_date', 'end_date'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const warrantyData = {
      user_id: user.id,
      product_name: body.product_name,
      description: body.description || null,
      serial_number: body.serial_number || null,
      reference_number: body.reference_number || `WR-${Date.now()}`,
      start_date: body.start_date,
      end_date: body.end_date,
      status: body.status || 'active',
      category: body.category || null,
      supplier: body.supplier || null,
      coverage_type: body.coverage_type || 'standard',
      purchase_price: body.purchase_price || null,
      language: body.language || 'en',
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
