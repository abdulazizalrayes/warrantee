import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const locales = ["en", "ar"];
const defaultLocale = "en";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if path starts with a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith("/" + locale + "/") || pathname === "/" + locale
  );

  // Skip locale redirect for API routes, static files, etc.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Redirect to default locale if no locale in path
  if (!pathnameHasLocale) {
    const url = request.nextUrl.clone();
    url.pathname = "/" + defaultLocale + pathname;
    return NextResponse.redirect(url);
  }

  // Update Supabase session
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
