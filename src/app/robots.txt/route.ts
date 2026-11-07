import { NextResponse } from "next/server";
import { CONTENT_SIGNAL_HEADER } from "@/lib/agent-content-policy";

const ROBOTS_TXT = `# Public search and user-directed retrieval are allowed; AI training is not.
User-Agent: *
User-Agent: Googlebot
User-Agent: Bingbot
User-Agent: OAI-SearchBot
User-Agent: ChatGPT-User
User-Agent: Claude-SearchBot
User-Agent: Claude-User
User-Agent: Kimi-SearchBot
User-Agent: Kimi-User
User-Agent: PerplexityBot
User-Agent: Perplexity-User
User-Agent: Meta-WebIndexer
User-Agent: Meta-ExternalFetcher
User-Agent: facebookexternalhit
Allow: /
Allow: /api/mcp
Allow: /api/agent-concierge
Allow: /api/a2a
Allow: /api/health
Disallow: /api/
Content-Signal: ${CONTENT_SIGNAL_HEADER}

User-Agent: GPTBot
User-Agent: Google-Extended
User-Agent: ClaudeBot
User-Agent: anthropic-ai
User-Agent: KimiBot
User-Agent: Meta-ExternalAgent
User-Agent: CCBot
Disallow: /
Content-Signal: ${CONTENT_SIGNAL_HEADER}

Sitemap: https://warrantee.io/sitemap.xml
`;

function robotsResponse(body: string | null = ROBOTS_TXT) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Signal": CONTENT_SIGNAL_HEADER,
    },
  });
}

export function GET() {
  return robotsResponse();
}

export function HEAD() {
  return robotsResponse(null);
}
