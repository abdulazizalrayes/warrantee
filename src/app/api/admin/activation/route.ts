import { NextRequest } from "next/server";
import { apiJson } from "@/lib/api-response";
import { apiRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rate-limit";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildActivationReport } from "@/lib/server/activation-report";

export async function GET(request: NextRequest) {
  try {
    const rate = await apiRateLimit(getClientIp(request));
    if (!rate.success) return apiJson({ error: "Too many requests" }, { status: 429, headers: getRateLimitHeaders(rate) });
    if (!isTrustedSameOriginRequest(request, request.nextUrl.origin)) return apiJson({ error: "Forbidden" }, { status: 403 });

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiJson({ error: "Unauthorized" }, { status: 401 });
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || !profile || !["admin", "super_admin"].includes(profile.role)) {
      return apiJson({ error: "Forbidden" }, { status: 403 });
    }

    // Do not instantiate a service-role client until the live admin role is verified.
    const report = await buildActivationReport(createSupabaseAdminClient());
    return apiJson(report);
  } catch {
    // No partial counts and no database messages or private records in errors.
    return apiJson({ complete: false, error: "Activation report unavailable; no complete counts returned" }, { status: 503 });
  }
}
