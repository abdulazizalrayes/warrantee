import { NextRequest } from "next/server";
import { apiV1Json, authorizeApiV1Request, recordApiV1Usage } from "@/lib/api-v1";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildWarrantyAccessOrClause } from "@/lib/warranty-access";

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiV1Request(request, "documents:read");
  if (auth.response) return auth.response;
  const { requester } = auth;
  const supabase = createSupabaseAdminClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("warranty_documents")
    .select(DOCUMENT_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) {
    await recordApiV1Usage(supabase, request, requester, {
      statusCode: 404,
      scope: "documents:read",
      metadata: { document_id: id, reason: "not_found" },
    });
    return apiV1Json({ error: "Document not found" }, { status: 404 });
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
      scope: "documents:read",
      metadata: { document_id: id, reason: "not_visible" },
    });
    return apiV1Json({ error: "Document not found" }, { status: 404 });
  }

  await recordApiV1Usage(supabase, request, requester, {
    statusCode: 200,
    scope: "documents:read",
    metadata: { document_id: id, warranty_id: data.warranty_id },
  });

  return apiV1Json({ data });
}
