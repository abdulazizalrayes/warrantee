import { NextRequest } from "next/server";
import {
  apiV1Json,
  authorizeApiV1Request,
  parsePositiveInt,
  recordApiV1Usage,
} from "@/lib/api-v1";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";
import { sanitizeString } from "@/lib/validation";

const DOCUMENT_SELECT = `
  id,
  warranty_id,
  file_name,
  file_type,
  file_size,
  version,
  security_status,
  security_checked_at,
  created_at,
  warranties (
    id,
    product_name,
    product_name_ar,
    reference_number
  )
`;

function cleanOptionalString(value: string | null, maxLength: number) {
  return value && value.trim() ? sanitizeString(value, maxLength) : null;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeApiV1Request(request, "documents:read");
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams.get("page"), 1, 10000);
  const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);
  const warrantyId = cleanOptionalString(searchParams.get("warranty_id"), 120);
  const queryText = cleanOptionalString(searchParams.get("q"), 120);
  const offset = (page - 1) * limit;

  const { data: visibleWarranties, error: warrantyError } = await supabase
    .from("warranties")
    .select("id")
    .is("deleted_at", null)
    .or(buildWarrantyAccessOrClause(requester.userId))
    .limit(1000);

  if (warrantyError) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 500,
      scope: "documents:read",
      metadata: { reason: "warranty_scope_error" },
    });
    return apiV1Json({ error: "Failed to resolve visible warranties" }, { status: 500 });
  }

  const warrantyIds = (visibleWarranties || []).map((warranty) => warranty.id).filter(Boolean);
  if (warrantyIds.length === 0 || (warrantyId && !warrantyIds.includes(warrantyId))) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 200,
      scope: "documents:read",
      metadata: { page, limit, returned: 0 },
    });
    return apiV1Json({
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  let query = supabase
    .from("warranty_documents")
    .select(DOCUMENT_SELECT, { count: "exact" })
    .in("warranty_id", warrantyId ? [warrantyId] : warrantyIds);

  if (queryText) {
    query = query.ilike("file_name", `%${queryText}%`);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 500,
      scope: "documents:read",
      metadata: { reason: "query_error" },
    });
    return apiV1Json({ error: "Failed to load document metadata" }, { status: 500 });
  }

  await recordApiV1Usage(supabase, request, requester, {
    statusCode: 200,
    scope: "documents:read",
    metadata: { page, limit, returned: data?.length || 0 },
  });

  return apiV1Json({
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}
