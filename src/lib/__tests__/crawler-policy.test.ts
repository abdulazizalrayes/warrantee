import { describe, expect, it } from "vitest";
import { GET, HEAD } from "../../app/robots.txt/route";

describe("public crawler policy", () => {
  it("allows retrieval bots together without dropping API exclusions", async () => {
    const text = await GET().text();
    const groups = text.split(/\n\s*\n/);
    const retrieval = groups.find((group) => group.includes("User-Agent: *"))!;
    for (const bot of ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User",
      "Claude-SearchBot", "Claude-User", "Kimi-SearchBot", "Kimi-User",
      "PerplexityBot", "Perplexity-User", "Meta-WebIndexer", "Meta-ExternalFetcher"]) {
      expect(retrieval).toContain(`User-Agent: ${bot}\n`);
    }
    expect(retrieval).toContain("Allow: /\n");
    expect(retrieval).toContain("Disallow: /api/\n");
    expect(retrieval).toContain("Allow: /api/mcp\n");
  });

  it("denies named training crawlers with no conflicting allow rule", async () => {
    const text = await GET().text();
    const training = text.split(/\n\s*\n/).find((group) => group.includes("User-Agent: GPTBot"))!;
    for (const bot of ["GPTBot", "Google-Extended", "ClaudeBot", "KimiBot", "Meta-ExternalAgent", "CCBot"]) {
      expect(training).toContain(`User-Agent: ${bot}\n`);
    }
    expect(training).toContain("Disallow: /\n");
    expect(training).not.toContain("Allow:");
  });

  it("keeps identical no-training policy on GET and HEAD", async () => {
    for (const response of [GET(), HEAD()]) {
      expect(response.headers.get("Content-Signal")).toBe("search=yes, ai-input=yes, ai-train=no");
    }
    expect(await HEAD().text()).toBe("");
    expect(await GET().text()).toContain("Sitemap: https://warrantee.io/sitemap.xml");
  });
});
