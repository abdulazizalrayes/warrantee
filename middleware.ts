// @ts-nocheck
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, sameSite: "lax", secure: true })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/(en|ar)\//);
  const locale = localeMatch ? localeMatch[1] : "en";

  // Allow auth callback to always pass through
  if (
    pathname === "/auth/callback" ||
    pathname.match(/^\/(en|ar)\/auth\/callback/)
  ) {
    return response;
  }

  // Protect /admin routes - require authentication and admin role
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard/admin") ||
    pathname.match(/^\/(en|ar)\/admin/)
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/" + locale + "/auth";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Server-side admin role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/" + locale + "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Protect /dashboard routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.match(/^\/(en|ar)\/dashboard/)
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/" + locale + "/auth";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect /seller routes
  if (
    pathname.startsWith("/seller") ||
    pathname.match(/^\/(en|ar)\/seller/)
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/" + locale + "/auth";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from auth pages
  if (
    (pathname.startsWith("/auth/") || pathname.match(/^\/(en|ar)\/auth/)) &&
    user
  ) {
    if (!pathname.includes("/auth/callback")) {
      const url = request.nextUrl.clone();
      url.pathname = "/" + locale + "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
