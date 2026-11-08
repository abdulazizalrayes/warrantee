// Self-contained so the build can embed the same sanitizer in external bootstraps.
export function createAnalyticsContextSanitizers() {
  const locales = ["en", "ar", "hi", "ur", "fil", "ml", "ta", "bn", "fr", "id", "tr", "es", "ru", "de", "it", "zh", "ja"];
  const paths = new Set([
    "/", "/about", "/auth", "/login", "/signup", "/reset-password", "/forgot-password", "/pricing",
    "/contact", "/support", "/features", "/faq", "/guide", "/api-docs", "/privacy", "/terms", "/cookies",
    "/security", "/blog", "/verify", "/demo/product-passport", "/approval", "/analytics", "/reports",
    "/claims", "/documents", "/extensions", "/onboarding", "/notifications", "/billing", "/settings",
    "/settings/team", "/settings/notifications", "/warranties", "/warranties/new", "/warranties/import",
    "/warranties/bulk", "/warranties/extend", "/warranties/transfer", "/seller", "/seller/register",
    "/seller/invite", "/seller/accept-invite", "/admin", "/admin/login", "/admin/accept-invite",
    "/admin/ingestion", "/dashboard", "/dashboard/provisional", "/dashboard/claims", "/api/seller/applications",
  ]);
  function path(value) {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return null;
    try {
      const url = new URL(value, "https://warrantee.io");
      const parts = url.pathname.split("/").filter(Boolean).map(part => decodeURIComponent(part));
      if (parts.some(part => /[/\\\u0000-\u0020]/.test(part))) return null;
      const prefix = locales.includes(parts[0]) ? `/${parts.shift()}` : "";
      const pathname = `/${parts.join("/")}`;
      if (paths.has(pathname)) return prefix + (pathname === "/" ? "" : pathname) || "/";
      if (/^\/warranties\/[^/]+(?:\/(?:claim|extend))?$/.test(pathname)) return `${prefix}/warranties/[id]${parts.length === 3 ? `/${parts[2]}` : ""}`;
      if (/^\/(?:approval|verify|documents|claims|resources|compare)\/[^/]+$/.test(pathname)) return `${prefix}/${parts[0]}/[id]`;
      if (/^\/dashboard\/claims\/[^/]+$/.test(pathname)) return `${prefix}/dashboard/claims/[id]`;
      return `${prefix}/[other]`;
    } catch { return null; }
  }
  function referrer(value) {
    if (typeof value !== "string") return null;
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.origin : null;
    } catch { return null; }
  }
  return { path, referrer, locales };
}

const sanitizers = createAnalyticsContextSanitizers();
export const sanitizeAnalyticsPath = sanitizers.path;
export const sanitizeAnalyticsReferrer = sanitizers.referrer;
