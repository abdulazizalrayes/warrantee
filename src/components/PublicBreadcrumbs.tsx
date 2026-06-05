"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  getBreadcrumbJsonLd,
  getPublicBreadcrumb,
} from "@/lib/public-breadcrumbs";

interface PublicBreadcrumbsProps {
  locale: string;
  visual?: boolean;
  includeJsonLd?: boolean;
}

export function PublicBreadcrumbs({
  locale,
  visual = true,
  includeJsonLd = true,
}: PublicBreadcrumbsProps) {
  const pathname = usePathname();
  const breadcrumb = getPublicBreadcrumb(locale, pathname);
  const jsonLd = getBreadcrumbJsonLd(locale, pathname);

  if (!breadcrumb || !jsonLd) return null;

  const isRTL = breadcrumb.locale === "ar";
  const schemaScript = includeJsonLd ? (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  ) : null;

  if (!visual) return schemaScript;

  return (
    <div className="border-b border-black/[0.04] bg-[#fbfbfd]">
      <nav
        aria-label={isRTL ? "مسار الصفحة" : "Breadcrumb"}
        className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3 text-[13px] font-medium leading-none text-[#6e6e73]"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {breadcrumb.items.map((item, index) => {
          const isCurrent = index === breadcrumb.items.length - 1;

          return (
            <span
              key={`${item.href}-${item.name}`}
              className="inline-flex min-w-0 items-center gap-2"
            >
              {index > 0 && (
                <>
                  <span className="sr-only"> / </span>
                  <ChevronRight
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 flex-none text-[#d2d2d7] ${
                      isRTL ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
              {isCurrent ? (
                <span
                  aria-current="page"
                  className="truncate font-semibold text-[#1d1d1f]"
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="truncate transition-colors hover:text-[#0071e3]"
                >
                  {item.name}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      {schemaScript}
    </div>
  );
}
