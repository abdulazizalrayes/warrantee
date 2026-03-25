import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const localeMatch = pathname.match(/^\/(en|ar)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "en";

  const protectedPaths = ["/dashboard", "/warranties", "/settings", "/onboarding", "/seller"];
  const isProtectedRoute = protectedPaths.some((path) =>
    pathname.startsWith(`/${locale}${path}`)
  );

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname.includes("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/en";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
