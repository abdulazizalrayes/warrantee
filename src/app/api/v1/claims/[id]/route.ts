import { NextRequest } from "next/server";
import { apiV1Json, authorizeApiV1Request, recordApiV1Usage } from "@/lib/api-v1";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiV1Request(request, "claims:read");
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("warranty_claims")
    .select(CLAIM_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 404,
      scope: "claims:read",
      metadata: { claim_id: id, reason: "not_found" },
    });
    return apiV1Json({ error: "Claim not found" }, { status: 404 });
  }

  const { data: visibleWarranty, error: warrantyError } = await supabase
    .from("warranties")
    .select("id")
    .eq("id", data.warranty_id)
    .is("deleted_at", null)
    .or(buildWarrantyAccessOrClause(requester.userId))
    .maybeSingle();

  if (warrantyError || !visibleWarranty) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 404,
      scope: "claims:read",
      metadata: { claim_id: id, reason: "not_visible" },
    });
    return apiV1Json({ error: "Claim not found" }, { status: 404 });
  }

  await recordApiV1Usage(supabase, request, requester, {
    statusCode: 200,
    scope: "claims:read",
    metadata: { claim_id: id, warranty_id: data.warranty_id },
  });

  return apiV1Json({ data });
}
