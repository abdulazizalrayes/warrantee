import generatedPages from "@/generated/agent-markdown-pages.json";
import { CONTENT_SIGNAL_HEADER } from "@/lib/agent-content-policy";
import { logAgentUsage } from "@/lib/server/agent-usage-logger";
import { NextResponse } from "next/server";

function manifest() {
  return {
    schemaVersion: generatedPages.schemaVersion,
    canonicalOrigin: generatedPages.canonicalOrigin,
    sitemap: `${generatedPages.canonicalOrigin}${generatedPages.sitemapPath}`,
    negotiation: {
      requestHeader: "Accept: text/markdown",
      fallback: "Ordinary HTML is returned when a canonical Markdown companion is unavailable.",
    },
    pages: generatedPages.pages.map((page) => ({
      canonicalUrl: page.canonicalUrl,
      contentLocation: `${generatedPages.canonicalOrigin}${page.sidecarPath}`,
      description: page.description,
      htmlTreeSha256: page.htmlTreeSha256,
      language: page.language,
      markdownBytes: page.markdownBytes,
      path: page.path,
      reductionPercent: page.reductionPercent,
      title: page.title,
    })),
  };
}

function headers() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "Content-Signal": CONTENT_SIGNAL_HEADER,
    "X-Content-Type-Options": "nosniff",
  };
}

export function GET(request: Request) {
  logAgentUsage(request, "public_data_read", {
    resource: "agent-markdown-manifest.json",
  });
  return NextResponse.json(manifest(), { headers: headers() });
}

export function HEAD() {
  return new NextResponse(null, {
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers() },
  });
}
