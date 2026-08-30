import { NextRequest } from 'next/server';
import { resolveWarrantyAccessOrClause, buildWarrantyOwnershipInsert } from '@/lib/warranty-access';
import { isOneOf, isValidDate, sanitizeString, VALID_WARRANTY_STATUSES } from '@/lib/validation';
import {
  apiV1Json,
  authorizeApiV1Request,
  beginApiIdempotency,
  buildIdempotencyReference,
  completeApiIdempotency,
  failApiIdempotency,
  parsePositiveInt,
  recordApiV1Usage,
} from '@/lib/api-v1';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isWarrantyLimitError, warrantyLimitResponseBody } from '@/lib/warranty-entitlements';

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
  const auth = await authorizeApiV1Request(request, 'warranties:read');
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
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 400,
      scope: 'warranties:read',
      metadata: { reason: 'invalid_status' },
    });
    return apiV1Json(
      { error: `Invalid status. Must be one of: ${VALID_WARRANTY_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  let query = supabase
    .from('warranties')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .or(await resolveWarrantyAccessOrClause(supabase, requester.userId));
  if (status === 'active') query = query.eq('status', 'active').gt('end_date', new Date().toISOString());
  else if (status === 'expired') query = query.lte('end_date', new Date().toISOString());
  else if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 500,
      scope: 'warranties:read',
      metadata: { reason: 'query_error' },
    });
    return apiV1Json({ error: error.message }, { status: 500 });
  }

  await recordApiV1Usage(supabase, request, requester, {
    statusCode: 200,
    scope: 'warranties:read',
    metadata: { page, limit, returned: data?.length || 0 },
  });
  return apiV1Json({
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
  const auth = await authorizeApiV1Request(request, 'warranties:write');
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();
  let idempotencyRecordId: string | null = null;

  try {
    const body = await request.json();
    const required = ['product_name', 'start_date', 'end_date'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 400,
        scope: 'warranties:write',
        metadata: { reason: 'missing_fields', missing },
      });
      return apiV1Json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    if (!isValidDate(body.start_date) || !isValidDate(body.end_date)) {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 400,
        scope: 'warranties:write',
        metadata: { reason: 'invalid_dates' },
      });
      return apiV1Json({ error: 'start_date and end_date must be valid dates' }, { status: 400 });
    }

    if (new Date(body.end_date).getTime() <= new Date(body.start_date).getTime()) {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 400,
        scope: 'warranties:write',
        metadata: { reason: 'invalid_date_order' },
      });
      return apiV1Json({ error: 'end_date must be after start_date' }, { status: 400 });
    }

    if (body.status !== undefined && !isOneOf(body.status, VALID_WARRANTY_STATUSES)) {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 400,
        scope: 'warranties:write',
        metadata: { reason: 'invalid_status' },
      });
      return apiV1Json(
        { error: `Invalid status. Must be one of: ${VALID_WARRANTY_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.language !== undefined && body.language !== 'en' && body.language !== 'ar') {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 400,
        scope: 'warranties:write',
        metadata: { reason: 'invalid_language' },
      });
      return apiV1Json({ error: 'language must be en or ar' }, { status: 400 });
    }

    const purchasePrice = parsePurchasePrice(body.purchase_price);
    if (purchasePrice === undefined) {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 400,
        scope: 'warranties:write',
        metadata: { reason: 'invalid_purchase_price' },
      });
      return apiV1Json({ error: 'purchase_price must be a positive number' }, { status: 400 });
    }

    const idempotency = await beginApiIdempotency(supabase, request, requester, body);
    if (idempotency.state === 'invalid_key') {
      return apiV1Json({ error: 'Idempotency-Key must be 8 to 200 characters' }, { status: 400 });
    }
    if (idempotency.state === 'body_mismatch') {
      return apiV1Json({ error: 'Idempotency-Key was already used with a different request body' }, { status: 409 });
    }
    if (idempotency.state === 'processing') {
      return apiV1Json(
        { error: 'A request with this Idempotency-Key is still processing' },
        { status: 409, headers: { 'Retry-After': '5' } },
      );
    }
    if (idempotency.state === 'replay') {
      const { data: replayedWarranty } = await supabase
        .from('warranties')
        .select('*')
        .eq('id', idempotency.resourceId)
        .is('deleted_at', null)
        .or(await resolveWarrantyAccessOrClause(supabase, requester.userId))
        .maybeSingle();
      if (!replayedWarranty) {
        return apiV1Json({ error: 'The original idempotent resource is no longer available' }, { status: 409 });
      }
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 200,
        scope: 'warranties:write',
        metadata: { idempotent_replay: true },
      });
      return apiV1Json({ data: replayedWarranty, idempotent_replay: true }, { status: 200 });
    }
    if (idempotency.state === 'started') idempotencyRecordId = idempotency.recordId;

    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    const derivedReferenceNumber = idempotencyKey
      ? buildIdempotencyReference(idempotencyKey, requester.clientId || requester.userId)
      : null;
    const referenceNumber = cleanOptionalString(body.reference_number, 80) || derivedReferenceNumber || `WR-${Date.now()}`;

    if (idempotencyKey) {
      const { data: existingWarranty } = await supabase
        .from('warranties')
        .select('*')
        .eq('reference_number', referenceNumber)
        .is('deleted_at', null)
        .or(await resolveWarrantyAccessOrClause(supabase, requester.userId))
        .maybeSingle();

      if (existingWarranty) {
        await completeApiIdempotency(supabase, idempotencyRecordId, 'warranty', existingWarranty.id, 200);
        await recordApiV1Usage(supabase, request, requester, {
          statusCode: 200,
          scope: 'warranties:write',
          metadata: { idempotent_replay: true },
        });
        return apiV1Json({ data: existingWarranty, idempotent_replay: true }, { status: 200 });
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
      const statusCode = isWarrantyLimitError(error) ? 409 : 500;
      await failApiIdempotency(supabase, idempotencyRecordId, statusCode);
      await recordApiV1Usage(supabase, request, requester, {
        statusCode,
        scope: 'warranties:write',
        metadata: { reason: statusCode === 409 ? 'warranty_limit_reached' : 'insert_error' },
      });
      return apiV1Json(
        statusCode === 409 ? warrantyLimitResponseBody() : { error: error.message },
        { status: statusCode }
      );
    }

    await completeApiIdempotency(supabase, idempotencyRecordId, 'warranty', data.id, 201);

    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 201,
      scope: 'warranties:write',
      metadata: { warranty_id: data.id },
    });
    return apiV1Json({ data }, { status: 201 });
  } catch (error) {
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    await failApiIdempotency(supabase, idempotencyRecordId, statusCode);
    await recordApiV1Usage(supabase, request, requester, {
      statusCode,
      scope: 'warranties:write',
      metadata: { reason: error instanceof SyntaxError ? 'invalid_body' : 'idempotency_or_insert_failure' },
    });
    if (error instanceof SyntaxError) {
      return apiV1Json({ error: 'Invalid request body' }, { status: 400 });
    }
    return apiV1Json({ error: 'Request could not be completed safely' }, { status: 500 });
  }
}
