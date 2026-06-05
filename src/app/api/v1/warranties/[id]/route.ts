import { NextRequest, NextResponse } from 'next/server';
import { buildWarrantyAccessOrClause, canMutateWarranty } from '@/lib/warranty-access';
import { getClientIp, getRateLimitHeaders, rateLimit } from '@/lib/rate-limit';
import { type ApiRequester, type ApiV1Scope, hasApiScope, resolveApiRequester } from '@/lib/api-v1';
import { isOneOf, isValidDate, sanitizeString, VALID_WARRANTY_STATUSES } from '@/lib/validation';
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

// GET /api/v1/warranties/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest(request, 'warranties:read');
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();

  const { id } = await params;
  const { data, error } = await supabase
    .from('warranties')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .or(buildWarrantyAccessOrClause(requester.userId))
    .single();

  if (error || !data) return json({ error: 'Warranty not found' }, { status: 404 });
  return json({ data });
}

// PUT /api/v1/warranties/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest(request, 'warranties:write');
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();

  const { id } = await params;
  try {
    const { data: existing, error: existingError } = await supabase
      .from('warranties')
      .select('id, user_id, created_by, seller_id, issuer_user_id, start_date, end_date')
      .eq('id', id)
      .is('deleted_at', null)
      .or(buildWarrantyAccessOrClause(requester.userId))
      .single();

    if (existingError || !existing) {
      return json({ error: 'Warranty not found' }, { status: 404 });
    }

    if (!canMutateWarranty(existing, requester.userId)) {
      return json(
        { error: 'Only the warranty owner, seller, or issuer can update this warranty' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.product_name !== undefined) updateData.product_name = sanitizeString(String(body.product_name), 200);
    if (body.description !== undefined) updateData.description = cleanOptionalString(body.description, 5000);
    if (body.serial_number !== undefined) updateData.serial_number = cleanOptionalString(body.serial_number, 120);
    if (body.category !== undefined) updateData.category = cleanOptionalString(body.category, 80);
    if (body.supplier !== undefined) updateData.supplier = cleanOptionalString(body.supplier, 200);
    if (body.coverage_type !== undefined) updateData.coverage_type = cleanOptionalString(body.coverage_type, 80);

    if (body.status !== undefined) {
      if (!isOneOf(body.status, VALID_WARRANTY_STATUSES)) {
        return json(
          { error: `Invalid status. Must be one of: ${VALID_WARRANTY_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if (body.purchase_price !== undefined) {
      const purchasePrice = parsePurchasePrice(body.purchase_price);
      if (purchasePrice === undefined) {
        return json({ error: 'purchase_price must be a non-negative number' }, { status: 400 });
      }
      updateData.purchase_price = purchasePrice;
    }

    const nextStartDate = body.start_date ?? existing.start_date;
    const nextEndDate = body.end_date ?? existing.end_date;

    if (body.start_date !== undefined) {
      if (!isValidDate(body.start_date)) return json({ error: 'start_date must be a valid date' }, { status: 400 });
      updateData.start_date = body.start_date;
    }

    if (body.end_date !== undefined) {
      if (!isValidDate(body.end_date)) return json({ error: 'end_date must be a valid date' }, { status: 400 });
      updateData.end_date = body.end_date;
    }

    if (nextStartDate && nextEndDate && new Date(nextEndDate).getTime() <= new Date(nextStartDate).getTime()) {
      return json({ error: 'end_date must be after start_date' }, { status: 400 });
    }

    if (Object.keys(updateData).length === 0) {
      return json({ error: 'No allowed fields supplied' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('warranties')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return json({ error: 'Warranty not found or update failed' }, { status: 404 });
    return json({ data });
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/v1/warranties/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiRequest(request, 'warranties:write');
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();

  const { id } = await params;
  const { data: existing, error: existingError } = await supabase
    .from('warranties')
    .select('id, user_id, created_by, seller_id, issuer_user_id')
    .eq('id', id)
    .is('deleted_at', null)
    .or(buildWarrantyAccessOrClause(requester.userId))
    .single();

  if (existingError || !existing) {
    return json({ error: 'Warranty not found' }, { status: 404 });
  }

  if (!canMutateWarranty(existing, requester.userId)) {
    return json(
      { error: 'Only the warranty owner, seller, or issuer can delete this warranty' },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('warranties')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) return json({ error: error.message }, { status: 500 });
  return json({ success: true });
}
