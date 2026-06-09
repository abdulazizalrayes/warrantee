import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoContentTemplate } from "@/components/SeoContentTemplate";
import { INDEXED_LOCALES, isValidLocale } from "@/lib/i18n";
import { buildSeoContentMetadata } from "@/lib/seo-content-metadata";
import { COMPARISON_PAGES, getSeoContentPage } from "@/lib/seo-content";

type ComparePageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return INDEXED_LOCALES.flatMap((locale) =>
    COMPARISON_PAGES.map((page) => ({ locale, slug: page.slug })),
  );
}

export async function generateMetadata({ params }: ComparePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = getSeoContentPage("compare", slug);
  if (!page || !isValidLocale(locale)) return {};
  return buildSeoContentMetadata(page, locale);
}

export default async function ComparePage({ params }: ComparePageProps) {
  const { locale, slug } = await params;
  const page = getSeoContentPage("compare", slug);

  if (!page || !isValidLocale(locale)) {
    notFound();
  }

  return <SeoContentTemplate locale={locale} page={page} />;
}
