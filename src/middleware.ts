import { createServerClient } from "@supabase/ssr";
import {
  buildAgentMarkdown,
  buildDiscoveryLinkHeader,
  getAgentRouteInfo,
  isAgentMarkdownRequest,
} from "@/lib/agent-ready";
import {
  DEFAULT_LOCALE,
  LOCALE_PREFIX_PATTERN,
  normalizeLocale,
} from "@/lib/locales";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALE_PREFIX_RE = new RegExp(`^/(${LOCALE_PREFIX_PATTERN})(/|$)`);

function applySecurityHeaders(response: NextResponse, hasAgentRouteInfo = false) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  response.headers.set("Vary", "Accept");

  if (hasAgentRouteInfo) {
    response.headers.set("Link", buildDiscoveryLinkHeader());
  }

  return response;
}

function applyNoIndexHeader(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function getAuthRedirectTarget(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function buildCleanRedirectUrl(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return url;
}

function buildAuthRedirectUrl(request: NextRequest, locale: string) {
  const url = buildCleanRedirectUrl(request, "/" + locale + "/auth");
  url.searchParams.set("redirect", getAuthRedirectTarget(request));
  return url;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(LOCALE_PREFIX_RE);
  const locale = normalizeLocale(localeMatch?.[1] || DEFAULT_LOCALE);
  const agentRouteInfo = getAgentRouteInfo(pathname);
  const isIndexNowKeyPath = /^\/[A-Za-z0-9-]{8,128}\.txt$/.test(pathname);
  const isPlatformAssetPath =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_vercel/") ||
    pathname.startsWith("/monitoring");
  const isDiscoveryPath =
    isIndexNowKeyPath ||
    isPlatformAssetPath ||
    pathname.startsWith("/.well-known/") ||
    pathname === "/llms.txt" ||
    pathname === "/llms-full.txt" ||
    pathname === "/openapi.json" ||
    pathname === "/auth.md" ||
    pathname.startsWith("/data/") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/");
  const isAdminArea =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard/admin") ||
    pathname.match(new RegExp(`^/(${LOCALE_PREFIX_PATTERN})/admin`));
  const isApprovalArea =
    pathname.match(new RegExp(`^/(${LOCALE_PREFIX_PATTERN})/approval`)) ||
    pathname.startsWith("/approval");
  const normalizedPathname =
    pathname.replace(new RegExp(`^/(${LOCALE_PREFIX_PATTERN})(?=/|$)`), "") || "/";
  const protectedAppPrefixes = [
    "/dashboard",
    "/seller",
    "/warranties",
    "/claims",
    "/extensions",
    "/documents",
    "/analytics",
    "/reports",
    "/notifications",
    "/settings",
    "/billing",
  ];
  const publicAppPaths = ["/seller/register"];
  const isPublicAppPath = publicAppPaths.some(
    (publicPath) =>
      normalizedPathname === publicPath ||
      normalizedPathname.startsWith(`${publicPath}/`),
  );
  const isProtectedAppArea = protectedAppPrefixes.some(
    (prefix) =>
      normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`)
  ) && !isPublicAppPath;
  const isAuthArea =
    normalizedPathname === "/auth" ||
    normalizedPathname.startsWith("/auth/");
  const shouldNoIndexPath =
    isProtectedAppArea ||
    isAdminArea ||
    isApprovalArea ||
    isAuthArea;

  if (
    request.method === "GET" &&
    agentRouteInfo &&
    isAgentMarkdownRequest(request.headers.get("accept"))
  ) {
    const markdown = buildAgentMarkdown(pathname);
    if (markdown) {
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Link: buildDiscoveryLinkHeader(),
          Vary: "Accept",
          "X-Robots-Tag": "noindex",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
          "X-Frame-Options": "DENY",
          "X-XSS-Protection": "1; mode=block",
          "X-DNS-Prefetch-Control": "on",
        },
      });
    }
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  applySecurityHeaders(response, Boolean(agentRouteInfo));

  if (
    !localeMatch &&
    !isDiscoveryPath &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/auth/callback") &&
    pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/en" + pathname;
    return NextResponse.redirect(url, 301);
  }

  if (
    pathname === "/auth/callback" ||
    pathname.match(new RegExp(`^/(${LOCALE_PREFIX_PATTERN})/auth/callback`))
  ) {
    applyNoIndexHeader(response);
    return response;
  }

  const hasSupabaseClientConfig =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasSupabaseClientConfig) {
    if (isProtectedAppArea || isAdminArea || isApprovalArea) {
      return NextResponse.redirect(buildAuthRedirectUrl(request, locale));
    }

    if (shouldNoIndexPath) {
      applyNoIndexHeader(response);
    }

    return response;
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
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          applySecurityHeaders(response, Boolean(agentRouteInfo));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              sameSite: "strict",
              secure: true,
            }),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminArea || isApprovalArea) {
    if (!user) {
      return NextResponse.redirect(buildAuthRedirectUrl(request, locale));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (isAdminArea) {
      if (!profile || !["admin", "super_admin"].includes(profile.role)) {
        const url = buildCleanRedirectUrl(request, "/" + locale + "/dashboard");
        return NextResponse.redirect(url);
      }
    }

    if (isApprovalArea) {
      const approvalRoles = ["approver", "company_admin", "platform_admin", "admin", "super_admin"];
      if (!profile || !approvalRoles.includes(profile.role)) {
        const url = buildCleanRedirectUrl(request, "/" + locale + "/dashboard");
        return NextResponse.redirect(url);
      }
    }
  }

  if (isProtectedAppArea && !isAdminArea && !isApprovalArea) {
    if (!user) {
      return NextResponse.redirect(buildAuthRedirectUrl(request, locale));
    }
  }

  if (
    (pathname.startsWith("/auth/") ||
      pathname.match(new RegExp(`^/(${LOCALE_PREFIX_PATTERN})/auth`))) &&
    user
  ) {
    const requestedAuthTab = request.nextUrl.searchParams.get("tab");
    const isExplicitSignupIntent = requestedAuthTab === "signup";

    if (!pathname.includes("/auth/callback") && !isExplicitSignupIntent) {
      const url = buildCleanRedirectUrl(request, "/" + locale + "/dashboard");
      return NextResponse.redirect(url);
    }
  }

  if (shouldNoIndexPath) {
    applyNoIndexHeader(response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_vercel/|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
