import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams?.get("code");
  const requestedNext = searchParams?.get("next");
  const fallbackLocale = requestedNext?.startsWith("/ar") ? "ar" : "en";
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : `/${fallbackLocale}/dashboard`;
  const errorLocale = next.startsWith("/ar") ? "ar" : "en";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL(`/${errorLocale}/auth?error=auth_callback_error`, origin));
}
