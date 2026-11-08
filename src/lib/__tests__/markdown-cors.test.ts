import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NodeNextRequest, NodeNextResponse } from "next/dist/server/base-http/node";
import { sendResponse } from "next/dist/server/send-response";
import { buildCustomRoute } from "next/dist/server/lib/router-utils/filesystem";
import { buildAgentMarkdownHeaders, resolveAgentMarkdownPage } from "../agent-markdown-response";

vi.mock("@sentry/nextjs/config", () => ({ withSentryConfig: (config: unknown) => config }));
import nextConfig from "../../../next.config";

afterEach(() => vi.unstubAllEnvs());

async function routingHeaders(pathname: string, restrictedOnly = false) {
  const headers = new Headers();
  const rules = await nextConfig.headers!();
  for (const rule of rules) {
    if (restrictedOnly && rule.source !== "/api/:path*") continue;
    if (buildCustomRoute("header", rule).match(pathname)) {
      for (const header of rule.headers) headers.set(header.key, header.value);
    }
  }
  return headers;
}

async function nodeResponseHeaders(initial: Headers, outgoing: Headers) {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  const socket = new Socket();
  const incoming = new IncomingMessage(socket);
  incoming.method = "HEAD";
  incoming.url = "/api/agent-markdown?path=/en";
  const node = new ServerResponse(incoming);
  const response = new NodeNextResponse(node);
  for (const [key, value] of initial) response.setHeader(key, value);
  try {
    // Exercise the installed Node sender, not a simulation of its header precedence.
    await sendResponse(new NodeNextRequest(incoming), response, new Response(null, { headers: outgoing }));
    return response;
  } finally {
    socket.destroy();
  }
}

describe("public Markdown CORS versus private API defaults", () => {
  it("reproduces the Node header collision even when the Markdown handler returns wildcard", async () => {
    const page = resolveAgentMarkdownPage("/en")!;
    const outgoing = buildAgentMarkdownHeaders(page);
    expect(outgoing.get("access-control-allow-origin")).toBe("*");
    const response = await nodeResponseHeaders(await routingHeaders("/api/agent-markdown", true), outgoing);
    expect(response.getHeader("access-control-allow-origin")).toBe("https://warrantee.io");
  });

  it("gives the exact public Markdown API wildcard precedence before Node response sending", async () => {
    const initial = await routingHeaders("/api/agent-markdown");
    expect(initial.get("access-control-allow-origin")).toBe("*");
    expect(initial.get("access-control-allow-methods")).toBe("GET, HEAD");
    const page = resolveAgentMarkdownPage("/en")!;
    const response = await nodeResponseHeaders(initial, buildAgentMarkdownHeaders(page));
    expect(response.getHeader("access-control-allow-origin")).toBe("*");
    expect(response.getHeader("access-control-allow-credentials")).toBeUndefined();
    expect(response.getHeader("content-type")).toContain("text/markdown");
  });

  it.each(["/api/contact", "/api/funnel/events", "/api/v1/warranties", "/api/agent-markdown-private", "/api/agent-markdown/extra"])("retains restricted origin for %s", async (pathname) => {
    const headers = await routingHeaders(pathname);
    expect(headers.get("access-control-allow-origin")).toBe("https://warrantee.io");
    expect(headers.get("access-control-allow-methods")).toBe("GET, POST, PUT, DELETE, OPTIONS");
  });

  it.each(["/en", "/ar/pricing", "/en/pricing.md", "/agent-markdown/en/pricing.md"])("keeps public representation CORS without broadening HTML/default APIs: %s", async (pathname) => {
    const canonical = pathname.includes("pricing") ? "/en/pricing" : "/en";
    const page = resolveAgentMarkdownPage(canonical)!;
    const response = await nodeResponseHeaders(await routingHeaders(pathname), buildAgentMarkdownHeaders(page, { directSidecar: pathname.endsWith(".md") }));
    expect(response.getHeader("access-control-allow-origin")).toBe("*");
    expect(response.getHeader("access-control-allow-credentials")).toBeUndefined();
    expect(response.getHeader("vary")).toContain("Accept");
  });
});
