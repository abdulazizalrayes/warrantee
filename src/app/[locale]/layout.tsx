// @ts-nocheck
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { isValidLocale, DIRECTION } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieConsent";
import { getOrganizationJsonLd } from "@/lib/jsonld";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Warrantee \u2014 Trust the Terms\u2122",
  description: "Warrantee is the warranty management platform for businesses and consumers. Track, approve, and extend warranties with confidence. Bilingual Arabic and English.",
  keywords: ["warranty management", "warranty tracking", "warranty certificates", "Arabic", "English", "SaaS", "warrantee"],
  robots: "index, follow",
  authors: [{ name: "Warrantee" }],
  metadataBase: new URL("https://warrantee.io"),
  alternates: { canonical: "https://warrantee.io", languages: { en: "https://warrantee.io/en", ar: "https://warrantee.io/ar" } },
  openGraph: { title: "Warrantee \u2014 Trust the Terms\u2122", description: "Warranty management platform with bilingual certificates and smart approvals.", url: "https://warrantee.io", siteName: "Warrantee", locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image", title: "Warrantee \u2014 Trust the Terms\u2122", description: "Warranty management platform with bilingual certificates and smart approvals." },
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(getOrganizationJsonLd()) }} />
      </head>
      <body className="bg-[#FAFAFA] text-[#1A1A2E] antialiased">
        <GoogleAnalytics />
        <AuthProvider>{children}</AuthProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
