import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveWarrantyAccessOrClause } from "@/lib/warranty-access";
import { isSchemaColumnError } from "@/lib/warranty-document-provenance";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get("q")?.trim() || "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") || 100);
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 100, 1), 200);
  const offsetParam = Number(request.nextUrl.searchParams.get("offset") || 0);
  const offset = Number.isSafeInteger(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
  const access = await resolveWarrantyAccessOrClause(supabase, user.id);

  let query = supabase
    .from("warranty_documents")
    .select(
      "id, file_name, file_type, file_size, file_url, storage_path, version, security_status, security_checked_at, created_at, warranty_id, warranties!inner(product_name, product_name_ar, reference_number)"
    )
    .or(access, { referencedTable: "warranties" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike("file_name", `%${search}%`);
  }

  let { data, error } = await query;
  if (error && isSchemaColumnError(error.message)) {
    const fallbackQuery = supabase
      .from("warranty_documents")
      .select(
        "id, file_name, file_type, file_size, file_url, version, created_at, warranty_id, warranties!inner(product_name, product_name_ar, reference_number)"
      )
      .or(access, { referencedTable: "warranties" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    const fallbackResult = search
      ? await fallbackQuery.ilike("file_name", `%${search}%`)
      : await fallbackQuery;
    data = fallbackResult.data as typeof data;
    error = fallbackResult.error;
  }

  if (error) {
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
