import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const discoveryLinkHeader = [
  `</.well-known/api-catalog>; rel="api-catalog"`,
  `</en/api-docs>; rel="service-doc"`,
  `</.well-known/agent-card.json>; rel="agent-card"`,
  `</.well-known/mcp.json>; rel="mcp-server-card"`,
  `</llms.txt>; rel="describedby"; type="text/plain"`,
  `</.well-known/agent-skills>; rel="describedby"; type="application/json"`,
].join(", ");

const markdownEnabledPaths = [
  "/",
  "/en",
  "/ar",
  "/en/about",
  "/ar/about",
  "/en/features",
  "/ar/features",
  "/en/pricing",
  "/ar/pricing",
  "/en/contact",
  "/ar/contact",
  "/en/faq",
  "/ar/faq",
  "/en/guide",
  "/ar/guide",
  "/en/verify",
  "/ar/verify",
  "/en/api-docs",
  "/ar/api-docs",
  "/en/support",
  "/ar/support",
  "/en/terms",
  "/ar/terms",
  "/en/privacy",
  "/ar/privacy",
  "/en/cookies",
  "/ar/cookies",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/ocr": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
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
        source: "/llms.txt",
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
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Link", value: discoveryLinkHeader },
          { key: "Vary", value: "Accept" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://warrantee.io" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
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
  rewrites: async () => {
    return markdownEnabledPaths.map((path) => ({
      source: path,
      has: [
        {
          type: "header",
          key: "accept",
          value: ".*text/(x-)?markdown.*",
        },
      ],
      destination: `/api/agent-markdown?path=${encodeURIComponent(path)}`,
    }));
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
