import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://static.hotjar.com https://script.hotjar.com https://js.stripe.com https://checkout.stripe.com https://vercel.live https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://erptubrslnfmkuouczgn.supabase.co https://lh3.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com https://*.hotjar.com",
  "font-src 'self' data:",
  "connect-src 'self' https://erptubrslnfmkuouczgn.supabase.co wss://erptubrslnfmkuouczgn.supabase.co https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.hotjar.com wss://*.hotjar.com https://vitals.vercel-insights.com https://*.sentry.io https://*.ingest.sentry.io https://static.cloudflareinsights.com https://cloudflareinsights.com",
  "frame-src https://js.stripe.com https://checkout.stripe.com https://*.hotjar.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/ocr": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/tesseract.js/src/worker-script/node/index.js",
      "./node_modules/tesseract.js-core/**/*",
    ],
    "/api/ingest/email": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/tesseract.js/src/worker-script/node/index.js",
      "./node_modules/tesseract.js-core/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "erptubrslnfmkuouczgn.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
  headers: async () => {
    return [
      {
        source: "/favicon.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/:path(llms\\.txt|llms-full\\.txt|openapi\\.json|auth\\.md)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/data/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/.well-known/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://warrantee.io" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-api-key, Idempotency-Key" },
        ],
      },
    ];
  },
  redirects: async () => {
    const publicPages = [
      "about",
      "features",
      "pricing",
      "contact",
      "faq",
      "guide",
      "verify",
      "api-docs",
      "support",
      "auth",
      "terms",
      "privacy",
      "cookies",
    ];

    const legacyHtmlPages = [
      "about",
      "features",
      "pricing",
      "contact",
      "contact-us",
      "faq",
      "guide",
      "verify",
      "api-docs",
      "support",
      "terms",
      "privacy",
      "cookies",
    ];

    const protectedPages = [
      "dashboard",
      "seller",
      "admin",
      "warranties",
      "settings",
      "billing",
      "notifications",
      "onboarding",
      "approval",
      "reports",
      "analytics",
      "documents",
      "reset-password",
    ];

    const allPages = [...publicPages, ...protectedPages];

    const redirects = [
      {
        source: "/favicon.ico",
        destination: "/favicon.svg",
        permanent: true,
      },
      {
        source: "/index.html",
        destination: "/en",
        permanent: true,
      },
      {
        source: "/en/index.html",
        destination: "/en",
        permanent: true,
      },
      {
        source: "/ar/index.html",
        destination: "/ar",
        permanent: true,
      },
    ];

    for (const page of legacyHtmlPages) {
      const destinationPage = page === "contact-us" ? "contact" : page;
      redirects.push({
        source: `/${page}.html`,
        destination: `/en/${destinationPage}`,
        permanent: true,
      });
      redirects.push({
        source: `/en/${page}.html`,
        destination: `/en/${destinationPage}`,
        permanent: true,
      });
      redirects.push({
        source: `/ar/${page}.html`,
        destination: `/ar/${destinationPage}`,
        permanent: true,
      });
    }

    // Redirect locale-less exact paths to /en/ prefix
    for (const page of allPages) {
      redirects.push({
        source: `/${page}`,
        destination: `/en/${page}`,
        permanent: true,
      });
    }

    // Redirect locale-less paths with sub-paths to /en/ prefix
    for (const page of allPages) {
      redirects.push({
        source: `/${page}/:path*`,
        destination: `/en/${page}/:path*`,
        permanent: true,
      });
    }

    return redirects;
  },
};

const sentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    disable:
      !process.env.SENTRY_AUTH_TOKEN ||
      !(
        process.env.CI === "true" ||
        process.env.VERCEL === "1" ||
        process.env.WARRANTEE_ENABLE_LOCAL_SENTRY_UPLOAD === "1"
      ),
  },
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

const shouldEnableSentryNextConfig =
  process.env.CI === "true" ||
  process.env.VERCEL === "1" ||
  process.env.WARRANTEE_ENABLE_LOCAL_SENTRY_UPLOAD === "1";

const disableSentryNextConfig =
  process.env.WARRANTEE_DISABLE_SENTRY_NEXT_CONFIG === "1" ||
  !shouldEnableSentryNextConfig;

export default disableSentryNextConfig
  ? nextConfig
  : withSentryConfig(nextConfig, sentryBuildOptions);
