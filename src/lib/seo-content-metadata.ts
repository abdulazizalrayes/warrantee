import type { Metadata } from "next";
import {
  getLocaleLanguageTag,
  isIndexedLocale,
  type IndexedLocale,
} from "@/lib/i18n";
import {
  buildSeoPagePath,
  getSeoContentLocale,
  shouldNoindexSeoPage,
  type SeoContentPage,
} from "@/lib/seo-content";

const BASE_URL = "https://warrantee.io";

export function getSeoContentUrl(page: SeoContentPage, locale: string) {
  const contentLocale = isIndexedLocale(locale) ? locale : "en";
  return `${BASE_URL}/${contentLocale}${buildSeoPagePath(page.kind, page.slug)}`;
}

export function buildSeoContentMetadata(page: SeoContentPage, locale: string): Metadata {
  const contentLocale = getSeoContentLocale(locale);
  const canonicalUrl = getSeoContentUrl(page, locale);
  const path = buildSeoPagePath(page.kind, page.slug);
  const title = `${page.title[contentLocale]} | Warrantee.io`;
  const description = page.description[contentLocale];
  const languageAlternates: Record<string, string> = {
    en: `${BASE_URL}/en${path}`,
    "en-US": `${BASE_URL}/en${path}`,
    ar: `${BASE_URL}/ar${path}`,
    "ar-SA": `${BASE_URL}/ar${path}`,
    "x-default": `${BASE_URL}/en${path}`,
  };

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    robots: shouldNoindexSeoPage(locale)
      ? {
          index: false,
          follow: true,
          googleBot: { index: false, follow: true },
        }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true },
        },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Warrantee.io",
      locale: getLocaleLanguageTag(contentLocale as IndexedLocale).replace("-", "_"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
