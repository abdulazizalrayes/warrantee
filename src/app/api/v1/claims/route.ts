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

const CLAIM_SELECT = `
  id,
  warranty_id,
  claim_type,
  description,
  status,
  resolution,
  created_at,
  updated_at,
  warranties (
    id,
    product_name,
    product_name_ar,
    reference_number
  )
`;

const CLAIM_SELECT_WITH_VISIBLE_WARRANTY = CLAIM_SELECT.replace("warranties (", "warranties!inner (");

function cleanOptionalString(value: string | null, maxLength: number) {
  return value && value.trim() ? sanitizeString(value, maxLength) : null;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeApiV1Request(request, "claims:read");
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams.get("page"), 1, 10000);
  const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);
  const status = cleanOptionalString(searchParams.get("status"), 80);
  const warrantyId = cleanOptionalString(searchParams.get("warranty_id"), 120);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("warranty_claims")
    .select(CLAIM_SELECT_WITH_VISIBLE_WARRANTY, { count: "exact" })
    .or(buildWarrantyAccessOrClause(requester.userId), { referencedTable: "warranties" })
    .is("warranties.deleted_at", null);

  if (warrantyId) {
    query = query.eq("warranty_id", warrantyId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 500,
      scope: "claims:read",
      metadata: { reason: "query_error" },
    });
    return apiV1Json({ error: "Failed to load claims" }, { status: 500 });
  }

  await recordApiV1Usage(supabase, request, requester, {
    statusCode: 200,
    scope: "claims:read",
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
