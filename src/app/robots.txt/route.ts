import { NextResponse } from "next/server";
import { CONTENT_SIGNAL_HEADER } from "@/lib/agent-content-policy";

const ROBOTS_TXT = `User-Agent: *
Allow: /
Allow: /api/mcp
Allow: /api/health
Disallow: /api/
Content-Signal: ${CONTENT_SIGNAL_HEADER}

User-Agent: GPTBot
Allow: /
Allow: /api/mcp
Disallow: /api/
Content-Signal: ${CONTENT_SIGNAL_HEADER}

User-Agent: Google-Extended
Allow: /
Allow: /api/mcp
Disallow: /api/
Content-Signal: ${CONTENT_SIGNAL_HEADER}

User-Agent: anthropic-ai
Allow: /
Allow: /api/mcp
Disallow: /api/
Content-Signal: ${CONTENT_SIGNAL_HEADER}

Sitemap: https://warrantee.io/sitemap.xml
`;

function robotsResponse(body: string | null = ROBOTS_TXT) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function GET() {
  return robotsResponse();
}

export function HEAD() {
  return robotsResponse(null);
}
