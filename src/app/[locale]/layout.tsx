import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import JsonLd from "@/components/JsonLd";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Warrantee â Trust the Termsâ¢",
    template: "%s | Warrantee",
  },
  description: "Digital warranty management platform. Track, manage, and claim your product warranties in one place. Bilingual support for Arabic and English.",
  keywords: ["warranty", "warranty management", "product warranty", "digital warranty", "warranty tracking", "warranty claims", "Ø¶ÙØ§Ù", "Ø¥Ø¯Ø§Ø±Ø© Ø§ÙØ¶ÙØ§ÙØ§Øª", "Saudi Arabia", "Middle East"],
  authors: [{ name: "Warrantee" }],
  creator: "Warrantee",
  publisher: "Warrantee",
  metadataBase: new URL("https://warrantee.sa"),
  alternates: {
    canonical: "/",
    languages: {
      "en": "/en",
      "ar": "/ar",
    },
  },
  openGraph: {
    type: "website",
    siteName: "Warrantee",
    title: "Warrantee â Trust the Termsâ¢",
    description: "Digital warranty management platform for the Middle East. Track, manage, and claim your warranties.",
    url: "https://warrantee.sa",
    locale: "en_US",
    alternateLocale: "ar_SA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Warrantee - Trust the Terms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Warrantee â Trust the Termsâ¢",
    description: "Digital warranty management platform for the Middle East.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1A2E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const direction = locale === "ar" ? "rtl" : "ltr";
  const langCode = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <html lang={langCode} dir={direction}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="alternate" hrefLang="en" href="https://warrantee.sa/en" />
        <link rel="alternate" hrefLang="ar" href="https://warrantee.sa/ar" />
        <link rel="alternate" hrefLang="x-default" href="https://warrantee.sa/en" />
        <JsonLd locale={locale} />
      </head>
      <body className={`${inter.className} bg-[#FAFAFA] text-[#1A1A2E] antialiased`}>
        {children}
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""} />
      </body>
    </html>
  );
}
