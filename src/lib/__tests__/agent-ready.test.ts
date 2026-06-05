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
    expect(isAgentMarkdownRequest("application/json")).toBe(false);
  });

  it("maps public routes to agent-aware content", () => {
    expect(getAgentRouteInfo("/en")).toMatchObject({
      locale: "en",
      pageKey: "home",
      canonicalPath: "/en",
    });
    expect(getAgentRouteInfo("/en/support")).toMatchObject({
      locale: "en",
      pageKey: "support",
      canonicalPath: "/en/support",
    });
    expect(getAgentRouteInfo("/en/blog")).toMatchObject({
      locale: "en",
      pageKey: "blog",
      canonicalPath: "/en/blog",
    });
    expect(getAgentRouteInfo("/en/dashboard")).toBeNull();
  });

  it("builds markdown for public pages", () => {
    const markdown = buildAgentMarkdown("/en/api-docs");
    expect(markdown).toContain("# Warrantee API Documentation");
    expect(markdown).toContain("https://warrantee.io/.well-known/api-catalog");
  });

  it("builds discovery link headers", () => {
    const header = buildDiscoveryLinkHeader();
    expect(header).toContain('rel="api-catalog"');
    expect(header).toContain("/llms.txt");
    expect(header).toContain('rel="agent-card"');
    expect(header).toContain('rel="mcp-server-card"');
  });
});
