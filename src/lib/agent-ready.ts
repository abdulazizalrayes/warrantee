import generatedPages from "@/generated/agent-markdown-pages.json";

export type AgentMarkdownPage = (typeof generatedPages.pages)[number];

export type AgentRouteInfo = Pick<
  AgentMarkdownPage,
  "canonicalUrl" | "language" | "path" | "sidecarPath" | "title"
> & {
  canonicalPath: string;
  locale: "en" | "ar";
};

const pageByPath = new Map(
  generatedPages.pages.map((page) => [page.path, page] as const),
);

export const PUBLIC_AGENT_PATHS = new Set(pageByPath.keys());

function parseQuality(parameters: string[]) {
  const qualityParameter = parameters.find((parameter) =>
    parameter.trim().toLowerCase().startsWith("q="),
  );
  if (!qualityParameter) return 1;
  const quality = Number(qualityParameter.split("=", 2)[1]);
  return Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0;
}

export function isAgentMarkdownRequest(acceptHeader: string | null): boolean {
  if (!acceptHeader) return false;

  let markdownQuality = -1;
  let htmlQuality = -1;

  for (const range of acceptHeader.split(",")) {
    const [rawType, ...parameters] = range.trim().split(";");
    const mediaType = rawType.trim().toLowerCase();
    const quality = parseQuality(parameters);

    if (mediaType === "text/markdown" || mediaType === "text/x-markdown") {
      markdownQuality = Math.max(markdownQuality, quality);
    }
    if (mediaType === "text/html" || mediaType === "application/xhtml+xml") {
      htmlQuality = Math.max(htmlQuality, quality);
    }
  }

  return markdownQuality > 0 && markdownQuality >= htmlQuality;
}

export function getAgentRouteInfo(pathname: string): AgentRouteInfo | null {
  const normalizedPath = normalizePath(pathname);
  const page = pageByPath.get(normalizedPath);
  if (!page) return null;

  return {
    canonicalPath: page.path,
    canonicalUrl: page.canonicalUrl,
    language: page.language,
    locale: page.language === "ar" ? "ar" : "en",
    path: page.path,
    sidecarPath: page.sidecarPath,
    title: page.title,
  };
}

export function getAgentMarkdownPage(pathname: string): AgentMarkdownPage | null {
  return pageByPath.get(normalizePath(pathname)) ?? null;
}

export function buildAgentMarkdown(pathname: string): string | null {
  return getAgentMarkdownPage(pathname)?.markdown ?? null;
}

export function buildDiscoveryLinkHeader(canonicalUrl?: string): string {
  return [
    canonicalUrl ? `<${canonicalUrl}>; rel="canonical"` : null,
    `</.well-known/api-catalog>; rel="api-catalog"`,
    `</en/api-docs>; rel="service-doc"`,
    `</.well-known/agent-card.json>; rel="agent-card"`,
    `</.well-known/mcp.json>; rel="mcp-server-card"`,
    `</api/mcp>; rel="mcp-server"; type="application/json"`,
    `</llms.txt>; rel="describedby"; type="text/plain"`,
    `</data/agent-markdown-manifest.json>; rel="describedby"; type="application/json"`,
    `</.well-known/agent-skills>; rel="describedby"; type="application/json"`,
  ].filter(Boolean).join(", ");
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
