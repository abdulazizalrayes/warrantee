import { NextRequest } from "next/server";
import { computeAssetIntelligence } from "@/lib/asset-intelligence";
import { apiV1Json, authorizeApiV1Request, parsePositiveInt, recordApiV1Usage } from "@/lib/api-v1";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";

// GET /api/v1/intelligence - Portfolio asset lifecycle intelligence
export async function GET(request: NextRequest) {
  const auth = await authorizeApiV1Request(request, "warranties:read");
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();

  const { searchParams } = new URL(request.url);
  const limit = parsePositiveInt(searchParams.get("limit"), 5000, 10000);

  const { data: warranties, error: warrantiesError } = await supabase
    .from("warranties")
    .select("id, status, start_date, end_date, created_at, category, seller_name, supplier, purchase_price")
    .is("deleted_at", null)
    .or(buildWarrantyAccessOrClause(requester.userId))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (warrantiesError) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 500,
      scope: "warranties:read",
      metadata: { reason: "warranty_query_error" },
    });
    return apiV1Json({ error: warrantiesError.message }, { status: 500 });
  }

  const warrantyRows = warranties || [];
  const warrantyIds = warrantyRows.map((warranty) => warranty.id);
  const { data: claims, error: claimsError } = warrantyIds.length
    ? await supabase
      .from("warranty_claims")
      .select("id, status, warranty_id, created_at")
      .in("warranty_id", warrantyIds)
      .limit(10000)
    : { data: [], error: null };

  if (claimsError) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 500,
      scope: "warranties:read",
      metadata: { reason: "claims_query_error" },
    });
    return apiV1Json({ error: claimsError.message }, { status: 500 });
  }

  const intelligence = computeAssetIntelligence(warrantyRows, claims || []);

  await recordApiV1Usage(supabase, request, requester, {
    statusCode: 200,
    scope: "warranties:read",
    metadata: {
      warranties: warrantyRows.length,
      claims: claims?.length || 0,
      lifecycle_health_score: intelligence.lifecycleHealthScore,
    },
  });

  return apiV1Json({
    data: intelligence,
    generated_at: new Date().toISOString(),
    model: "warrantee_asset_intelligence_v1",
  });
}
