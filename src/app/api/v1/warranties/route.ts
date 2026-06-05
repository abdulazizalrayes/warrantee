import { NextRequest, NextResponse } from 'next/server';
import { buildWarrantyAccessOrClause, buildWarrantyOwnershipInsert } from '@/lib/warranty-access';
import { getClientIp, getRateLimitHeaders, rateLimit } from '@/lib/rate-limit';
import { isOneOf, isValidDate, sanitizeString, VALID_WARRANTY_STATUSES } from '@/lib/validation';
import {
  type ApiRequester,
  type ApiV1Scope,
  buildIdempotencyReference,
  hasApiScope,
  parsePositiveInt,
  resolveApiRequester,
} from '@/lib/api-v1';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const API_V1_SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  Vary: 'Authorization, x-api-key',
};

const IP_RATE_LIMIT = 300;

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...API_V1_SECURITY_HEADERS,
      ...init?.headers,
    },
  });
}

function rateHeaders(result: { remaining: number; resetIn: number }, limit: number) {
  return {
    ...getRateLimitHeaders(result),
    'X-RateLimit-Limit': String(limit),
  };
}

async function enforceIpRateLimit(request: NextRequest) {
  const result = await rateLimit(getClientIp(request), {
    maxRequests: IP_RATE_LIMIT,
    windowMs: 60_000,
    identifier: 'api-v1-ip',
  });
  if (result.success) return null;

  return json(
    { error: 'Too many requests' },
    { status: 429, headers: rateHeaders(result, IP_RATE_LIMIT) }
  );
}

async function enforceRequesterRateLimit(requester: ApiRequester) {
  const result = await rateLimit(requester.rateLimitSubject, {
    maxRequests: requester.rateLimitPerMinute,
    windowMs: 60_000,
    identifier: 'api-v1-requester',
  });
  if (result.success) return null;

  return json(
    { error: 'Too many requests' },
    { status: 429, headers: rateHeaders(result, requester.rateLimitPerMinute) }
  );
}

async function authorizeApiRequest(request: NextRequest, scope: ApiV1Scope) {
  const ipLimitResponse = await enforceIpRateLimit(request);
  if (ipLimitResponse) return { response: ipLimitResponse };

  const requester = await resolveApiRequester(request);
  if (!requester.ok) {
    return { response: json({ error: requester.error }, { status: requester.status }) };
  }

  if (!hasApiScope(requester, scope)) {
    return { response: json({ error: `Missing required scope: ${scope}` }, { status: 403 }) };
  }

  const requesterLimitResponse = await enforceRequesterRateLimit(requester);
  if (requesterLimitResponse) return { response: requesterLimitResponse };

  return { requester };
}

function cleanOptionalString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim()
    ? sanitizeString(value, maxLength)
    : null;
}

function parsePurchasePrice(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

// GET /api/v1/warranties - List warranties
export async function GET(request: NextRequest) {
  const auth = await authorizeApiRequest(request, 'warranties:read');
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams?.get('page'), 1, 10000);
  const limit = parsePositiveInt(searchParams?.get('limit'), 20, 100);
  const status = searchParams?.get('status');
  const category = cleanOptionalString(searchParams?.get('category'), 80);
  const offset = (page - 1) * limit;

  if (status && !isOneOf(status, VALID_WARRANTY_STATUSES)) {
    return json(
      { error: `Invalid status. Must be one of: ${VALID_WARRANTY_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  let query = supabase
    .from('warranties')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .or(buildWarrantyAccessOrClause(requester.userId));
  if (status === 'active') query = query.eq('status', 'active').gt('end_date', new Date().toISOString());
  else if (status === 'expired') query = query.lte('end_date', new Date().toISOString());
  else if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({
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
  const auth = await authorizeApiRequest(request, 'warranties:write');
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();

  try {
    const body = await request.json();
    const required = ['product_name', 'start_date', 'end_date'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    if (!isValidDate(body.start_date) || !isValidDate(body.end_date)) {
      return json({ error: 'start_date and end_date must be valid dates' }, { status: 400 });
    }

    if (new Date(body.end_date).getTime() <= new Date(body.start_date).getTime()) {
      return json({ error: 'end_date must be after start_date' }, { status: 400 });
    }

    if (body.status !== undefined && !isOneOf(body.status, VALID_WARRANTY_STATUSES)) {
      return json(
        { error: `Invalid status. Must be one of: ${VALID_WARRANTY_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.language !== undefined && body.language !== 'en' && body.language !== 'ar') {
      return json({ error: 'language must be en or ar' }, { status: 400 });
    }

    const purchasePrice = parsePurchasePrice(body.purchase_price);
    if (purchasePrice === undefined) {
      return json({ error: 'purchase_price must be a positive number' }, { status: 400 });
    }

    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    const derivedReferenceNumber = idempotencyKey ? buildIdempotencyReference(idempotencyKey) : null;
    const referenceNumber = cleanOptionalString(body.reference_number, 80) || derivedReferenceNumber || `WR-${Date.now()}`;

    if (idempotencyKey) {
      const { data: existingWarranty } = await supabase
        .from('warranties')
        .select('*')
        .eq('reference_number', referenceNumber)
        .is('deleted_at', null)
        .or(buildWarrantyAccessOrClause(requester.userId))
        .maybeSingle();

      if (existingWarranty) {
        return json({ data: existingWarranty, idempotent_replay: true }, { status: 200 });
      }
    }

    const warrantyData = {
      ...buildWarrantyOwnershipInsert(requester.userId),
      product_name: sanitizeString(String(body.product_name), 200),
      description: cleanOptionalString(body.description, 5000),
      serial_number: cleanOptionalString(body.serial_number, 120),
      reference_number: referenceNumber,
      start_date: body.start_date,
      end_date: body.end_date,
      status: body.status || 'active',
      category: cleanOptionalString(body.category, 80),
      supplier: cleanOptionalString(body.supplier, 200),
      coverage_type: cleanOptionalString(body.coverage_type, 80) || 'standard',
      purchase_price: purchasePrice,
      language: body.language || 'en',
      seller_name: cleanOptionalString(body.seller_name, 200),
      seller_email: cleanOptionalString(body.seller_email, 254),
    };

    const { data, error } = await supabase.from('warranties').insert(warrantyData).select().single();
    if (error) {
      return json({ error: error.message }, { status: 500 });
    }

    return json({ data }, { status: 201 });
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }
}
