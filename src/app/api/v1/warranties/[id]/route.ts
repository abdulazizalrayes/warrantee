import { NextRequest } from 'next/server';
import { buildWarrantyAccessOrClause, canMutateWarranty } from '@/lib/warranty-access';
import { apiV1Json, authorizeApiV1Request, recordApiV1Usage } from '@/lib/api-v1';
import { isOneOf, isValidDate, sanitizeString, VALID_WARRANTY_STATUSES } from '@/lib/validation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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
  const auth = await authorizeApiV1Request(request, 'warranties:read');
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

  if (error || !data) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 404,
      scope: 'warranties:read',
      metadata: { warranty_id: id, reason: 'not_found' },
    });
    return apiV1Json({ error: 'Warranty not found' }, { status: 404 });
  }
  await recordApiV1Usage(supabase, request, requester, {
    statusCode: 200,
    scope: 'warranties:read',
    metadata: { warranty_id: id },
  });
  return apiV1Json({ data });
}

// PUT /api/v1/warranties/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiV1Request(request, 'warranties:write');
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
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 404,
        scope: 'warranties:write',
        metadata: { warranty_id: id, reason: 'not_found' },
      });
      return apiV1Json({ error: 'Warranty not found' }, { status: 404 });
    }

    if (!canMutateWarranty(existing, requester.userId)) {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 403,
        scope: 'warranties:write',
        metadata: { warranty_id: id, reason: 'forbidden' },
      });
      return apiV1Json(
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
        await recordApiV1Usage(supabase, request, requester, {
          statusCode: 400,
          scope: 'warranties:write',
          metadata: { warranty_id: id, reason: 'invalid_status' },
        });
        return apiV1Json(
          { error: `Invalid status. Must be one of: ${VALID_WARRANTY_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if (body.purchase_price !== undefined) {
      const purchasePrice = parsePurchasePrice(body.purchase_price);
      if (purchasePrice === undefined) {
        await recordApiV1Usage(supabase, request, requester, {
          statusCode: 400,
          scope: 'warranties:write',
          metadata: { warranty_id: id, reason: 'invalid_purchase_price' },
        });
        return apiV1Json({ error: 'purchase_price must be a non-negative number' }, { status: 400 });
      }
      updateData.purchase_price = purchasePrice;
    }

    const nextStartDate = body.start_date ?? existing.start_date;
    const nextEndDate = body.end_date ?? existing.end_date;

    if (body.start_date !== undefined) {
      if (!isValidDate(body.start_date)) {
        await recordApiV1Usage(supabase, request, requester, {
          statusCode: 400,
          scope: 'warranties:write',
          metadata: { warranty_id: id, reason: 'invalid_start_date' },
        });
        return apiV1Json({ error: 'start_date must be a valid date' }, { status: 400 });
      }
      updateData.start_date = body.start_date;
    }

    if (body.end_date !== undefined) {
      if (!isValidDate(body.end_date)) {
        await recordApiV1Usage(supabase, request, requester, {
          statusCode: 400,
          scope: 'warranties:write',
          metadata: { warranty_id: id, reason: 'invalid_end_date' },
        });
        return apiV1Json({ error: 'end_date must be a valid date' }, { status: 400 });
      }
      updateData.end_date = body.end_date;
    }

    if (nextStartDate && nextEndDate && new Date(nextEndDate).getTime() <= new Date(nextStartDate).getTime()) {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 400,
        scope: 'warranties:write',
        metadata: { warranty_id: id, reason: 'invalid_date_order' },
      });
      return apiV1Json({ error: 'end_date must be after start_date' }, { status: 400 });
    }

    if (Object.keys(updateData).length === 0) {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 400,
        scope: 'warranties:write',
        metadata: { warranty_id: id, reason: 'no_allowed_fields' },
      });
      return apiV1Json({ error: 'No allowed fields supplied' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('warranties')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .or(buildWarrantyAccessOrClause(requester.userId))
      .select()
      .single();

    if (error || !data) {
      await recordApiV1Usage(supabase, request, requester, {
        statusCode: 404,
        scope: 'warranties:write',
        metadata: { warranty_id: id, reason: 'update_failed' },
      });
      return apiV1Json({ error: 'Warranty not found or update failed' }, { status: 404 });
    }
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 200,
      scope: 'warranties:write',
      metadata: { warranty_id: id, fields: Object.keys(updateData) },
    });
    return apiV1Json({ data });
  } catch {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 400,
      scope: 'warranties:write',
      metadata: { warranty_id: id, reason: 'invalid_body' },
    });
    return apiV1Json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/v1/warranties/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiV1Request(request, 'warranties:write');
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
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 404,
      scope: 'warranties:write',
      metadata: { warranty_id: id, reason: 'not_found' },
    });
    return apiV1Json({ error: 'Warranty not found' }, { status: 404 });
  }

  if (!canMutateWarranty(existing, requester.userId)) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 403,
      scope: 'warranties:write',
      metadata: { warranty_id: id, reason: 'forbidden' },
    });
    return apiV1Json(
      { error: 'Only the warranty owner, seller, or issuer can delete this warranty' },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('warranties')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id)
    .or(buildWarrantyAccessOrClause(requester.userId))
    .is('deleted_at', null);

  if (error) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 500,
      scope: 'warranties:write',
      metadata: { warranty_id: id, reason: 'delete_failed' },
    });
    return apiV1Json({ error: error.message }, { status: 500 });
  }
  await recordApiV1Usage(supabase, request, requester, {
    statusCode: 200,
    scope: 'warranties:write',
    metadata: { warranty_id: id, action: 'delete' },
  });
  return apiV1Json({ success: true });
}
