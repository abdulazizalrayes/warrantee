import {
  buildAgentMarkdown,
  buildDiscoveryLinkHeader,
  getAgentRouteInfo,
  isAgentMarkdownRequest,
} from "@/lib/agent-ready";
import { describe, expect, it } from "vitest";

describe("agent-ready helpers", () => {
  it("detects markdown negotiation requests", () => {
    expect(isAgentMarkdownRequest("text/html, text/markdown")).toBe(true);
    expect(isAgentMarkdownRequest("text/markdown;q=0, text/html;q=1")).toBe(false);
    expect(isAgentMarkdownRequest("text/markdown;q=0.5, text/html;q=1")).toBe(false);
    expect(isAgentMarkdownRequest("text/markdown;q=1, text/html;q=0.5")).toBe(true);
    expect(isAgentMarkdownRequest("*/*")).toBe(false);
    expect(isAgentMarkdownRequest("application/json")).toBe(false);
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
  });

  it("builds markdown for public pages", () => {
    const markdown = buildAgentMarkdown("/en/api-docs");
    expect(markdown).toContain('canonical: "https://warrantee.io/en/api-docs"');
    expect(markdown).toContain("# API / CLI / MCP Guide");
  });

  it("builds discovery link headers", () => {
    const header = buildDiscoveryLinkHeader();
    expect(header).toContain('rel="api-catalog"');
    expect(header).toContain("/llms.txt");
    expect(header).toContain('rel="agent-card"');
    expect(header).toContain('rel="mcp-server-card"');
    expect(header).toContain("</api/mcp>");
  });
});
