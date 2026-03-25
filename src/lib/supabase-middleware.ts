import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;
  const localeMatch = pathname.match(/^\/(en|ar)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "en";

  // Root redirect - no auth needed
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/en";
    return NextResponse.redirect(url);
  }

  const protectedPaths = ["/dashboard", "/warranties", "/settings", "/onboarding", "/seller"];
  const isProtectedRoute = protectedPaths.some((path) =>
    pathname.startsWith(`/${locale}${path}`)
  );
  const isAuthRoute = pathname.includes("/auth");

  // Only check auth for protected routes and auth route - skip for public pages
  if (!isProtectedRoute && !isAuthRoute) {
    return supabaseResponse;
  }

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

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isProtectedRoute && !user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/auth`;
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/dashboard`;
      return NextResponse.redirect(url);
    }
  } catch {
    // If auth check fails (timeout/network), redirect protected routes to auth
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/auth`;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
