import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  FileCheck,
  KeyRound,
  Shield,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { DIRECTION, getDictionary, normalizeLocale } from "@/lib/i18n";
import {
  buildSeoPagePath,
  getSeoContentLocale,
  type SeoContentPage,
} from "@/lib/seo-content";

const BASE_URL = "https://warrantee.io";

type SeoContentTemplateProps = {
  locale: string;
  page: SeoContentPage;
};

function buildArticleJsonLd(page: SeoContentPage, contentLocale: "en" | "ar") {
  const path = buildSeoPagePath(page.kind, page.slug);
  return {
    "@context": "https://schema.org",
    "@type": page.kind === "compare" ? "TechArticle" : "Article",
    headline: page.title[contentLocale],
    description: page.description[contentLocale],
    inLanguage: contentLocale === "ar" ? "ar-SA" : "en-US",
    mainEntityOfPage: `${BASE_URL}/${contentLocale}${path}`,
    author: { "@id": `${BASE_URL}/#organization` },
    publisher: { "@id": `${BASE_URL}/#organization` },
  };
}

function buildFaqJsonLd(page: SeoContentPage, contentLocale: "en" | "ar") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question[contentLocale],
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer[contentLocale],
      },
    })),
  };
}

function buildBreadcrumbJsonLd(page: SeoContentPage, contentLocale: "en" | "ar") {
  const path = buildSeoPagePath(page.kind, page.slug);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: contentLocale === "ar" ? "الرئيسية" : "Home",
        item: `${BASE_URL}/${contentLocale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: page.kind === "compare" ? (contentLocale === "ar" ? "مقارنات" : "Comparisons") : (contentLocale === "ar" ? "موارد" : "Resources"),
        item: `${BASE_URL}/${contentLocale}${page.kind === "compare" ? "/compare" : "/resources"}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: page.title[contentLocale],
        item: `${BASE_URL}/${contentLocale}${path}`,
      },
    ],
  };
}

export function SeoContentTemplate({ locale: localeParam, page }: SeoContentTemplateProps) {
  const locale = normalizeLocale(localeParam);
  const contentLocale = getSeoContentLocale(locale);
  const dictionary = getDictionary(locale);
  const isRTL = DIRECTION[locale] === "rtl";
  const isApiPage = page.slug === "erp-warranty-api-integration";
  const primaryHref = isApiPage ? `/${locale}/api-docs` : `/${locale}/auth?tab=signup`;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd(page, contentLocale)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(page, contentLocale)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(page, contentLocale)) }}
      />
      <Navbar locale={locale} dictionary={dictionary} />
      <main>
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-3xl">
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0071e3]">
                {page.eyebrow[contentLocale]}
              </p>
              <h1 className="mt-5 text-[40px] font-semibold leading-[1.06] tracking-tight text-[#1d1d1f] sm:text-[56px]">
                {page.title[contentLocale]}
              </h1>
              <p className="mt-6 text-[19px] leading-8 text-[#6e6e73]">
                {page.intro[contentLocale]}
              </p>
              <p className="mt-5 rounded-2xl border border-black/[0.06] bg-white p-5 text-[15px] leading-7 text-[#1d1d1f] shadow-sm">
                {page.audience[contentLocale]}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#0077ED]"
                >
                  {page.cta[contentLocale].primary}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href={`/${locale}/contact`}
                  className="inline-flex items-center justify-center rounded-full border border-[#d2d2d7] px-6 py-3 text-[15px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                >
                  {contentLocale === "ar" ? "تواصل معنا" : "Contact us"}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            {page.proof[contentLocale].map((proof, index) => {
              const icons = [Shield, BadgeCheck, KeyRound];
              const Icon = icons[index % icons.length];
              return (
                <div key={proof} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
                  <Icon className="h-5 w-5 text-[#0071e3]" aria-hidden="true" />
                  <p className="mt-4 text-[15px] font-medium leading-7 text-[#1d1d1f]">{proof}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-6">
            {page.sections.map((section) => (
              <article key={section.title.en} className="rounded-3xl bg-[#f5f5f7] p-6 sm:p-8">
                <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr]">
                  <div>
                    <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#0071e3]">
                      {contentLocale === "ar" ? "نقطة قرار" : "Decision point"}
                    </p>
                    <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
                      {section.title[contentLocale]}
                    </h2>
                    <p className="mt-4 text-[16px] leading-8 text-[#6e6e73]">{section.body[contentLocale]}</p>
                  </div>
                  <ul className="grid gap-3">
                    {section.bullets[contentLocale].map((bullet) => (
                      <li key={bullet} className="flex gap-3 rounded-2xl bg-white p-4 text-[15px] leading-7 text-[#1d1d1f]">
                        <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-[#30d158]" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0071e3]/10">
                <FileCheck className="h-6 w-6 text-[#0071e3]" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[26px] font-semibold tracking-tight text-[#1d1d1f]">
                  {page.cta[contentLocale].title}
                </h2>
                <p className="mt-3 text-[16px] leading-8 text-[#6e6e73]">{page.cta[contentLocale].body}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
              {contentLocale === "ar" ? "أسئلة شائعة" : "Frequently Asked Questions"}
            </h2>
            <div className="mt-6 grid gap-4">
              {page.faq.map((item) => (
                <div key={item.question.en} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{item.question[contentLocale]}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-[#6e6e73]">{item.answer[contentLocale]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </div>
  );
}
