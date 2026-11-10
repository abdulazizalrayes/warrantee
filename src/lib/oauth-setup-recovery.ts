import { resolveSafeAuthRedirect } from "@/lib/auth-redirect";
import type { Locale } from "@/lib/i18n";

function withFlow(params: URLSearchParams, flowId: string | null | undefined) {
  if (flowId && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(flowId)) {
    params.set("signup_flow", flowId);
  }
  return params;
}

export function buildOAuthSetupErrorPath(locale: Locale, next: string, flowId?: string | null) {
  const params = withFlow(new URLSearchParams({
    error: "business_setup_error", tab: "signup", redirect: resolveSafeAuthRedirect(next, `/${locale}/dashboard`),
  }), flowId);
  return `/${locale}/auth?${params}`;
}

export function buildOAuthSetupRetryPath(next: string, flowId?: string | null) {
  const params = withFlow(new URLSearchParams({
    retry_setup: "1", next: resolveSafeAuthRedirect(next, "/en/dashboard"),
  }), flowId);
  return `/auth/callback?${params}`;
}
