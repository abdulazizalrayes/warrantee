import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeLocale, type Locale } from "@/lib/i18n";

function getLocaleFromPath(path: string | null): Locale {
  return normalizeLocale(path?.split("/").filter(Boolean)[0]);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams?.get("code");
  const requestedNext = searchParams?.get("next");
  const fallbackLocale = getLocaleFromPath(requestedNext);
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : `/${fallbackLocale}/dashboard`;
  const errorLocale = getLocaleFromPath(next);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL(`/${errorLocale}/auth?error=auth_callback_error`, origin));
}
