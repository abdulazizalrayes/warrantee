import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
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
      "auth",
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

    const redirects = [];

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

export default nextConfig;
