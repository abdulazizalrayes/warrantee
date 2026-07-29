import {
  buildAgentMarkdown,
  buildDiscoveryLinkHeader,
  getAgentDirectSidecarRouteInfo,
  getAgentRouteInfo,
  isAgentMarkdownRequest,
  negotiateAgentRepresentation,
} from "@/lib/agent-ready";
import { describe, expect, it } from "vitest";

describe("agent-ready helpers", () => {
  it("detects markdown negotiation requests", () => {
    expect(isAgentMarkdownRequest("text/html, text/markdown")).toBe(false);
    expect(isAgentMarkdownRequest("text/markdown;q=0, text/html;q=1")).toBe(false);
    expect(isAgentMarkdownRequest("text/markdown;q=0.5, text/html;q=1")).toBe(false);
    expect(isAgentMarkdownRequest("text/markdown;q=1, text/html;q=0.5")).toBe(true);
    expect(isAgentMarkdownRequest("*/*")).toBe(false);
    expect(isAgentMarkdownRequest("text/*")).toBe(false);
    expect(
      isAgentMarkdownRequest("text/*;q=0.8, text/markdown;q=0.5"),
    ).toBe(false);
    expect(
      isAgentMarkdownRequest("*/*;q=0.8, text/markdown;q=0.5"),
    ).toBe(false);
    expect(
      isAgentMarkdownRequest("text/html;q=0, text/*;q=0.8"),
    ).toBe(true);
    expect(isAgentMarkdownRequest("application/json")).toBe(false);
  });

  it("rejects requests that explicitly disallow every representation", () => {
    expect(
      negotiateAgentRepresentation(
        "text/html;q=0, text/markdown;q=0, text/*;q=0, */*;q=0",
      ),
    ).toBe("not-acceptable");
  });

  it("maps public routes to agent-aware content", () => {
    expect(getAgentRouteInfo("/en")).toMatchObject({
      locale: "en",
      canonicalPath: "/en",
    });
    expect(getAgentRouteInfo("/en/support")).toMatchObject({
      locale: "en",
      canonicalPath: "/en/support",
    });
    expect(getAgentRouteInfo("/en/blog")).toMatchObject({
      locale: "en",
      canonicalPath: "/en/blog",
    });
    expect(getAgentRouteInfo("/en/security")).toMatchObject({
      locale: "en",
      canonicalPath: "/en/security",
    });
    expect(getAgentRouteInfo("/en/dashboard")).toBeNull();
    expect(getAgentDirectSidecarRouteInfo("/en/pricing.md")).toMatchObject({
      canonicalPath: "/en/pricing",
      directSidecarPath: "/en/pricing.md",
      locale: "en",
    });
    expect(getAgentDirectSidecarRouteInfo("/ar/pricing.md")).toMatchObject({
      canonicalPath: "/ar/pricing",
      directSidecarPath: "/ar/pricing.md",
      locale: "ar",
    });
    expect(getAgentDirectSidecarRouteInfo("/en/dashboard.md")).toBeNull();
  });

  it("builds markdown for public pages", () => {
    const markdown = buildAgentMarkdown("/en/api-docs");
    expect(markdown).toContain('canonical: "https://warrantee.io/en/api-docs"');
    expect(markdown).toContain("# API / CLI / MCP Guide");
  });

  it("builds discovery link headers", () => {
    const page = getAgentRouteInfo("/en/pricing");
    expect(page).not.toBeNull();
    const header = buildDiscoveryLinkHeader(page!);
    expect(header).toContain(
      '<https://warrantee.io/en/pricing.md>; rel="alternate"; type="text/markdown"',
    );
    expect(header).toContain('rel="api-catalog"');
    expect(header).toContain("/llms.txt");
    expect(header).toContain('rel="agent-card"');
    expect(header).toContain('rel="mcp-server-card"');
    expect(header).toContain("</api/mcp>");
  });
});
