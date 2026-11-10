import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import { resolveSafeAuthRedirect } from "@/lib/auth-redirect";
import { expireOAuthIntent } from "@/lib/server/oauth-flow-intent";
import { boundedAuthRequest } from "@/lib/auth-request";
import { authRedirectOrigin } from "@/lib/isolated-test-origin.mjs";

function getLocaleFromPath(path: string | null): Locale {
  return normalizeLocale(path?.split("/").filter(Boolean)[0]);
}

export async function GET(request: Request) {
  const { searchParams, pathname } = new URL(request.url);
  const origin = authRedirectOrigin(request.url);
  const code = searchParams?.get("code");
  const requestedNext = searchParams?.get("next");
  const fallbackLocale = getLocaleFromPath(pathname);
  const next = resolveSafeAuthRedirect(requestedNext, `/${fallbackLocale}/dashboard`);
  const errorLocale = getLocaleFromPath(next);

  try {
    if (code) {
      const supabase = await createSupabaseServerClient();
      const { error } = await boundedAuthRequest(() => supabase.auth.exchangeCodeForSession(code));
      if (!error) {
        return expireOAuthIntent(NextResponse.redirect(new URL(next, origin)));
      }
    }
  } catch {
    // A provider/network failure follows the same retryable error path.
  }

  return expireOAuthIntent(NextResponse.redirect(new URL(`/${errorLocale}/auth?error=auth_callback_error`, origin)));
}
