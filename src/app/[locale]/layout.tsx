// @ts-nocheck
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { isValidLocale, DIRECTION } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { getOrganizationJsonLd } from "@/lib/jsonld";
import "@/app/globals.css";
import dynamic from "next/dynamic";

const GoogleAnalytics = dynamic(() => import("@/components/GoogleAnalytics"));
const Hotjar = dynamic(() => import("@/components/Hotjar"));
const CookieConsent = dynamic(() => import("@/components/CookieConsent"));

export const metadata: Metadata = {
  title: "Warrantee Ã¢ÂÂ Trust the TermsÃ¢ÂÂ¢",
  description: "Warrantee is the warranty management platform for businesses and consumers. Track, approve, and extend warranties with confidence. Bilingual Arabic and English.",
  keywords: [
    "warranty management", "warranty tracking", "warranty tracking app", "warranty reminder",
    "warranty management software", "warranty management platform", "warranty claim management",
    "warranty transfer", "digital warranty", "warranty certificates", "construction warranty",
    "OCR warranty scanning", "bilingual warranty", "Arabic warranty management",
    "ÃÂ¥ÃÂ¯ÃÂ§ÃÂ±ÃÂ© ÃÂ§ÃÂÃÂ¶ÃÂÃÂ§ÃÂÃÂ§ÃÂª", "ÃÂªÃÂªÃÂ¨ÃÂ¹ ÃÂ§ÃÂÃÂ¶ÃÂÃÂ§ÃÂ", "ÃÂªÃÂ°ÃÂÃÂÃÂ± ÃÂ§ÃÂÃÂ¶ÃÂÃÂ§ÃÂ", "ÃÂÃÂÃÂ ÃÂ§ÃÂÃÂ¶ÃÂÃÂ§ÃÂ",
    "warrantee", "warrantee.io", "SaaS", "GCC", "Saudi Arabia", "UAE", "warranty app",
  ],
  robots: "index, follow",
  authors: [{ name: "Warrantee" }],
  metadataBase: new URL("https://warrantee.io"),
  alternates: { canonical: "https://warrantee.io", languages: { en: "https://warrantee.io/en", ar: "https://warrantee.io/ar" } },
  verification: {
    google: "4tG-gxxHOu8AVF1Mm-qHOJIoq1SHqJmvGsx72zR97v8",
  },
  openGraph: {
    title: "Warrantee Ã¢ÂÂ Trust the TermsÃ¢ÂÂ¢",
    description: "Track, manage, transfer, and claim warranties in one place. Bilingual Arabic & English. Free to start.",
    url: "https://warrantee.io",
    siteName: "Warrantee",
    locale: "en_US",
    type: "website",
    images: [{ url: "https://warrantee.io/og-image.png", width: 1200, height: 630, alt: "Warrantee Ã¢ÂÂ Warranty Management Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Warrantee Ã¢ÂÂ Trust the TermsÃ¢ÂÂ¢",
    description: "Track, manage, transfer, and claim warranties. Bilingual AR+EN. Free to start.",
    images: ["https://warrantee.io/og-image.png"],
    creator: "@warrantee_io",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5 };

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const direction = DIRECTION[locale];
  const langCode = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <html lang={langCode} dir={direction}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#1A1A2E" />
        <link rel="alternate" hrefLang="en" href="https://warrantee.io/en" />
        <link rel="alternate" hrefLang="ar" href="https://warrantee.io/ar" />
        <link rel="alternate" hrefLang="x-default" href="https://warrantee.io/en" />
        {/* Bing Webmaster verification */}
        <meta name="msvalidate.01" content="E1C23BBDB660B5FBF84E7E6B1AE1B743" />
        {/* Geo meta tags for Saudi Arabia */}
        <meta name="geo.region" content="SA" />
        <meta name="geo.placename" content="Saudi Arabia" />
        <meta name="geo.position" content="24.7136;46.6753" />
        <meta name="ICBM" content="24.7136, 46.6753" />
        {/* Additional SEO meta */}
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />
        <meta name="revisit-after" content="7 days" />
        <meta name="apple-mobile-web-app-title" content="Warrantee" />
        <meta name="application-name" content="Warrantee" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(getOrganizationJsonLd()) }} />
      </head>
      <body className="bg-[#FAFAFA] text-[#1A1A2E] antialiased">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-blue-700 focus:outline-none">Skip to main content</a>
        <GoogleAnalytics />
          <Hotjar />
        <AuthProvider><main id="main-content">{children}</main></AuthProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
