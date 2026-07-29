import generatedPages from "@/generated/agent-markdown-pages.json";

export type AgentMarkdownPage = (typeof generatedPages.pages)[number];

export type AgentRouteInfo = Pick<
  AgentMarkdownPage,
  "canonicalUrl" | "language" | "path" | "sidecarPath" | "title"
> & {
  canonicalPath: string;
  directSidecarPath: string;
  locale: "en" | "ar";
};

const pageByPath = new Map(
  generatedPages.pages.map((page) => [page.path, page] as const),
);
const pageByDirectSidecarPath = new Map(
  generatedPages.pages.map((page) => [toDirectSidecarPath(page.path), page] as const),
);

export const PUBLIC_AGENT_PATHS = new Set(pageByPath.keys());

type AgentRepresentation = "html" | "markdown" | "not-acceptable";

type MediaRange = {
  quality: number;
  subtype: string;
  type: string;
};

type RepresentationMatch = {
  quality: number;
  specificity: number;
};

const REPRESENTATION_MEDIA_TYPES = {
  html: ["text/html", "application/xhtml+xml"],
  markdown: ["text/markdown", "text/x-markdown"],
} as const;

function parseQuality(parameters: string[]) {
  const qualityParameter = parameters.find((parameter) =>
    /^q\s*=/i.test(parameter.trim()),
  );
  if (!qualityParameter) return 1;
  const quality = Number(qualityParameter.split("=", 2)[1]?.trim());
  return Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0;
}

function parseAcceptHeader(acceptHeader: string) {
  return acceptHeader
    .split(",")
    .map((range): MediaRange | null => {
      const [rawType, ...parameters] = range.trim().split(";");
      const match = rawType.trim().toLowerCase().match(/^([^/\s]+)\/([^/\s]+)$/);
      if (!match) return null;
      return {
        quality: parseQuality(parameters),
        subtype: match[2],
        type: match[1],
      };
    })
    .filter((range): range is MediaRange => Boolean(range));
}

function mediaRangeSpecificity(range: MediaRange, mediaType: string) {
  const [type, subtype] = mediaType.split("/");
  if (range.type === "*" && range.subtype === "*") return 0;
  if (range.type === type && range.subtype === "*") return 1;
  if (range.type === type && range.subtype === subtype) return 2;
  return -1;
}

function matchRepresentation(
  ranges: MediaRange[],
  mediaTypes: readonly string[],
): RepresentationMatch | null {
  let best: RepresentationMatch | null = null;

  for (const range of ranges) {
    const specificity = Math.max(
      ...mediaTypes.map((mediaType) => mediaRangeSpecificity(range, mediaType)),
    );
    if (specificity < 0) continue;
    if (
      !best ||
      specificity > best.specificity ||
      (specificity === best.specificity && range.quality > best.quality)
    ) {
      best = { quality: range.quality, specificity };
    }
  }

  return best;
}

export function negotiateAgentRepresentation(
  acceptHeader: string | null,
): AgentRepresentation {
  if (!acceptHeader?.trim()) return "html";

  const ranges = parseAcceptHeader(acceptHeader);
  const html = matchRepresentation(ranges, REPRESENTATION_MEDIA_TYPES.html);
  const markdown = matchRepresentation(ranges, REPRESENTATION_MEDIA_TYPES.markdown);

  if (!html && !markdown) return "html";
  if ((html?.quality ?? 0) <= 0 && (markdown?.quality ?? 0) <= 0) {
    return "not-acceptable";
  }
  if ((markdown?.quality ?? 0) <= 0) return "html";
  if ((html?.quality ?? 0) <= 0) return "markdown";
  if (markdown!.quality !== html!.quality) {
    return markdown!.quality > html!.quality ? "markdown" : "html";
  }
  if (markdown!.specificity !== html!.specificity) {
    return markdown!.specificity > html!.specificity ? "markdown" : "html";
  }

  return "html";
}

export function isAgentMarkdownRequest(acceptHeader: string | null): boolean {
  return negotiateAgentRepresentation(acceptHeader) === "markdown";
}

export function getAgentRouteInfo(pathname: string): AgentRouteInfo | null {
  const normalizedPath = normalizePath(pathname);
  const page = pageByPath.get(normalizedPath);
  if (!page) return null;

  return {
    canonicalPath: page.path,
    canonicalUrl: page.canonicalUrl,
    directSidecarPath: toDirectSidecarPath(page.path),
    language: page.language,
    locale: page.language === "ar" ? "ar" : "en",
    path: page.path,
    sidecarPath: page.sidecarPath,
    title: page.title,
  };
}

export function getAgentDirectSidecarRouteInfo(
  pathname: string,
): AgentRouteInfo | null {
  const page = pageByDirectSidecarPath.get(normalizePath(pathname));
  return page ? getAgentRouteInfo(page.path) : null;
}

export function getAgentMarkdownPage(pathname: string): AgentMarkdownPage | null {
  return pageByPath.get(normalizePath(pathname)) ?? null;
}

export function buildAgentMarkdown(pathname: string): string | null {
  return getAgentMarkdownPage(pathname)?.markdown ?? null;
}

export function buildDiscoveryLinkHeader(
  page?: Pick<AgentMarkdownPage, "canonicalUrl" | "path">,
  options: { includeCanonical?: boolean } = {},
): string {
  return [
    page && options.includeCanonical
      ? `<${page.canonicalUrl}>; rel="canonical"`
      : null,
    page
      ? `<https://warrantee.io${toDirectSidecarPath(page.path)}>; rel="alternate"; type="text/markdown"`
      : null,
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

export function toDirectSidecarPath(pathname: string) {
  return `${normalizePath(pathname)}.md`;
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
