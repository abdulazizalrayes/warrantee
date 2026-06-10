import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getClientIp, getRateLimitHeaders, publicLookupRateLimit } from "@/lib/rate-limit";
import { apiJson } from "@/lib/api-response";

const VERIFICATION_SELECT =
  "id, reference_number, product_name, product_name_ar, serial_number, status, start_date, end_date, category, seller_name, certificate_url, created_at";

const VERIFICATION_QUERY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .:/#-]{0,79}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeVerificationQuery(query: string) {
  const normalized = query.trim().slice(0, 80);
  return VERIFICATION_QUERY_PATTERN.test(normalized) ? normalized : "";
}

async function findPublicWarranty(supabase: SupabaseClient, safeQuery: string) {
  if (UUID_PATTERN.test(safeQuery)) {
    const result = await supabase
      .from("warranties")
      .select(VERIFICATION_SELECT)
      .eq("id", safeQuery)
      .limit(1)
      .maybeSingle();

    if (result.data || result.error) return result;
  }

  const referenceResult = await supabase
    .from("warranties")
    .select(VERIFICATION_SELECT)
    .ilike("reference_number", safeQuery)
    .limit(1)
    .maybeSingle();

  if (referenceResult.data || referenceResult.error) return referenceResult;

  return supabase
    .from("warranties")
    .select(VERIFICATION_SELECT)
    .ilike("serial_number", safeQuery)
    .limit(1)
    .maybeSingle();
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await publicLookupRateLimit(getClientIp(request));
  if (!rateLimitResult.success) {
    return apiJson(
      { success: false, error: "Too many verification attempts" },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  // Require service role key for secure operations
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiJson({ success: false, error: "Internal server error" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { searchParams } = new URL(request.url);
  const query = searchParams?.get("q")?.trim();

  if (!query) {
    return apiJson({ success: false, error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const safeQuery = normalizeVerificationQuery(query);
    if (!safeQuery) {
      return apiJson({ success: false, error: "Invalid verification query" }, { status: 400 });
    }

    // Public verification intentionally returns only proof-safe fields.
    const { data, error } = await findPublicWarranty(supabase, safeQuery);

    if (error || !data) {
      return apiJson({ success: false, error: "Warranty not found" }, { status: 404 });
    }

    return apiJson({ success: true, data });
  } catch {
    return apiJson({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
