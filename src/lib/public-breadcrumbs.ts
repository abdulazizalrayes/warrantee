import {
  DEFAULT_LOCALE,
  LOCALE_PREFIX_PATTERN,
  getContentLocale,
  isValidLocale,
  type IndexedLocale,
  type Locale,
} from "@/lib/i18n";

const SITE_URL = "https://warrantee.io";

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export type PublicBreadcrumb = {
  locale: Locale;
  items: BreadcrumbItem[];
};

const HOME_LABELS: Record<IndexedLocale, string> = {
  en: "Home",
  ar: "الرئيسية",
};

const PUBLIC_PAGE_LABELS: Record<string, Record<IndexedLocale, string>> = {
  "/about": { en: "About", ar: "عن Warrantee" },
  "/api-docs": { en: "API / CLI / MCP", ar: "API / CLI / MCP" },
  "/blog": { en: "Blog", ar: "المدونة" },
  "/contact": { en: "Contact", ar: "اتصل بنا" },
  "/cookies": { en: "Cookie policy", ar: "سياسة ملفات تعريف الارتباط" },
  "/faq": { en: "FAQ", ar: "الأسئلة الشائعة" },
  "/features": { en: "Features", ar: "المزايا" },
  "/guide": { en: "Guide", ar: "الدليل" },
  "/pricing": { en: "Pricing", ar: "الأسعار" },
  "/privacy": { en: "Privacy policy", ar: "سياسة الخصوصية" },
  "/security": { en: "Security", ar: "الأمان" },
  "/support": { en: "Support", ar: "الدعم" },
  "/terms": { en: "Terms of service", ar: "شروط الخدمة" },
  "/verify": { en: "Verify warranty", ar: "التحقق من الضمان" },
};

function normalizeLocale(locale: string): Locale {
  return isValidLocale(locale) ? locale : DEFAULT_LOCALE;
}

function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return "/";

  const withoutQuery = pathname.split("?")[0]?.split("#")[0] || "/";
  const withoutTrailingSlash =
    withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : withoutQuery;
  const withoutLocale = withoutTrailingSlash.replace(
    new RegExp(`^/(${LOCALE_PREFIX_PATTERN})(?=/|$)`),
    "",
  );

  return withoutLocale || "/";
}

function matchPublicPage(pathname: string): string | null {
  if (PUBLIC_PAGE_LABELS[pathname]) return pathname;

  return (
    Object.keys(PUBLIC_PAGE_LABELS).find((publicPath) =>
      pathname.startsWith(`${publicPath}/`),
    ) || null
  );
}

export function getPublicBreadcrumb(
  localeInput: string,
  pathname: string | null | undefined,
): PublicBreadcrumb | null {
  const locale = normalizeLocale(localeInput);
  const contentLocale = getContentLocale(locale);
  const normalizedPath = normalizePath(pathname);
  const matchedPage = matchPublicPage(normalizedPath);

  if (!matchedPage) return null;

  return {
    locale,
    items: [
      {
        name: HOME_LABELS[contentLocale],
        href: `/${locale}`,
      },
      {
        name: PUBLIC_PAGE_LABELS[matchedPage][contentLocale],
        href: `/${locale}${normalizedPath}`,
      },
    ],
  };
}

export function getBreadcrumbJsonLd(
  locale: string,
  pathname: string | null | undefined,
) {
  const breadcrumb = getPublicBreadcrumb(locale, pathname);
  if (!breadcrumb) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumb.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.href}`,
    })),
  };
}
