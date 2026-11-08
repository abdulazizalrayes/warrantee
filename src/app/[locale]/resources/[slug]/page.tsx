import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoContentTemplate } from "@/components/SeoContentTemplate";
import { LOCALES, isValidLocale } from "@/lib/i18n";
import { buildSeoContentMetadata } from "@/lib/seo-content-metadata";
import { getSeoContentPage, RESOURCE_PAGES } from "@/lib/seo-content";

type ResourcePageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    RESOURCE_PAGES.map((page) => ({ locale, slug: page.slug })),
  );
}

export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = getSeoContentPage("resource", slug);
  if (!page || !isValidLocale(locale)) return {};
  return buildSeoContentMetadata(page, locale);
}

export default async function ResourcePage({ params }: ResourcePageProps) {
  const { locale, slug } = await params;
  const page = getSeoContentPage("resource", slug);

  if (!page || !isValidLocale(locale)) {
    notFound();
  }

  return <SeoContentTemplate locale={locale} page={page} />;
}
