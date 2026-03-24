import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import JsonLd from "@/components/JsonLd";
import CookieConsent from "@/components/CookieConsent";
import PWARegister from "@/components/PWARegister";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Warrantee \u2014 Trust the Terms\u2122",
    template: "%s | Warrantee",
  },
  description: "Digital warranty management platform. Track, manage, and claim your product warranties in one place. Bilingual support for Arabic and English.",
  keywords: ["warranty", "warranty management", "product warranty", "digital warranty", "warranty tracking", "warranty claims", "\u0636\u0645\u0627\u0646", "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062a", "Saudi Arabia", "Middle East"],
  authors: [{ name: "Warrantee" }],
  creator: "Warrantee",
  publisher: "Warrantee",
  metadataBase: new URL("https://warrantee.io"),
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
    title: "Warrantee \u2014 Trust the Terms\u2122",
    description: "Digital warranty management platform for the Middle East. Track, manage, and claim your warranties.",
    url: "https://warrantee.io",
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
    title: "Warrantee \u2014 Trust the Terms\u2122",
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="alternate" hrefLang="en" href="https://warrantee.io/en" />
        <link rel="alternate" hrefLang="ar" href="https://warrantee.io/ar" />
        <link rel="alternate" hrefLang="x-default" href="https://warrantee.io/en" />
        <JsonLd locale={locale} />
      </head>
      <body className={`${inter.className} bg-[#FAFAFA] text-[#1A1A2E] antialiased`}>
        {children}
        <CookieConsent />
        <PWARegister />
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""} />
      </body>
    </html>
  );
}
