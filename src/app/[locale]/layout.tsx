import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { isValidLocale, DIRECTION } from "@/lib/i18n";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Warrantee — Trust the Terms™",
  description:
    "Warrantee is the warranty management platform for businesses and consumers. Track, approve, and extend warranties with confidence. Bilingual Arabic and English.",
  keywords: [
    "warranty management",
    "warranty tracking",
    "warranty certificates",
    "Arabic",
    "English",
    "SaaS",
    "warrantee",
  ],
  robots: "index, follow",
  authors: [{ name: "Warrantee" }],
  openGraph: {
    title: "Warrantee — Trust the Terms™",
    description:
      "Warranty management platform with bilingual certificates and smart approvals.",
    url: "https://warrantee.io",
    siteName: "Warrantee",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Warrantee — Trust the Terms™",
    description:
      "Warranty management platform with bilingual certificates and smart approvals.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const direction = DIRECTION[locale];
  const langCode = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <html lang={langCode} dir={direction}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#1A1A2E" />
      </head>
      <body className="bg-[#FAFAFA] text-[#1A1A2E] antialiased">
        {children}
      </body>
    </html>
  );
}
