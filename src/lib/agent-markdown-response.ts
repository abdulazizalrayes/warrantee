import { CONTENT_SIGNAL_HEADER } from "@/lib/agent-content-policy";
import {
  buildDiscoveryLinkHeader,
  getAgentMarkdownPage,
  type AgentMarkdownPage,
} from "@/lib/agent-ready";

export function buildAgentMarkdownHeaders(
  page: AgentMarkdownPage,
  options: { directSidecar?: boolean } = {},
) {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "Content-Language": page.language,
    "Content-Location": `https://warrantee.io${page.sidecarPath}`,
    "Content-Signal": CONTENT_SIGNAL_HEADER,
    "Content-Type": "text/markdown; charset=utf-8",
    Link: buildDiscoveryLinkHeader(page.canonicalUrl),
    Vary: "Accept",
    "X-Content-Type-Options": "nosniff",
  });

  if (options.directSidecar) {
    headers.set("X-Robots-Tag", "noindex, follow");
  }

  return headers;
}

export function resolveAgentMarkdownPage(pathname: string) {
  return getAgentMarkdownPage(pathname);
}
