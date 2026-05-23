import { createServerClient } from "@supabase/ssr";
import {
  buildAgentMarkdown,
  buildDiscoveryLinkHeader,
  getAgentRouteInfo,
  isAgentMarkdownRequest,
} from "@/lib/agent-ready";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  response.headers.append("Vary", "Accept");

  if (hasAgentRouteInfo) {
    response.headers.set("Link", buildDiscoveryLinkHeader());
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/(en|ar)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : "en";
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
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/");
  const isAdminArea =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard/admin") ||
    pathname.match(/^\/(en|ar)\/admin/);
  const isApprovalArea =
    pathname.match(/^\/(en|ar)\/approval/) ||
    pathname.startsWith("/approval");
  const normalizedPathname = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
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
  const isProtectedAppArea = protectedAppPrefixes.some(
    (prefix) =>
      normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`)
  );

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
          "X-Frame-Options": "SAMEORIGIN",
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
    pathname.match(/^\/(en|ar)\/auth\/callback/)
  ) {
    return response;
  }

  if (isAdminArea || isApprovalArea) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/" + locale + "/auth";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (isAdminArea) {
      if (!profile || !["admin", "super_admin"].includes(profile.role)) {
        const url = request.nextUrl.clone();
        url.pathname = "/" + locale + "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    if (isApprovalArea) {
      const approvalRoles = ["approver", "company_admin", "platform_admin", "admin", "super_admin"];
      if (!profile || !approvalRoles.includes(profile.role)) {
        const url = request.nextUrl.clone();
        url.pathname = "/" + locale + "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  if (isProtectedAppArea && !isAdminArea && !isApprovalArea) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/" + locale + "/auth";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (
    (pathname.startsWith("/auth/") || pathname.match(/^\/(en|ar)\/auth/)) &&
    user
  ) {
    const requestedAuthTab = request.nextUrl.searchParams.get("tab");
    const isExplicitSignupIntent = requestedAuthTab === "signup";

    if (!pathname.includes("/auth/callback") && !isExplicitSignupIntent) {
      const url = request.nextUrl.clone();
      url.pathname = "/" + locale + "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_vercel/|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
