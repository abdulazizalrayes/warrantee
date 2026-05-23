import { expect, test } from "@playwright/test";

test.describe("SEO and agent-readiness endpoints", () => {
  const indexNowKey = "99975fddf27362d564d730362b73f94d";

  test("robots, sitemap, and agent files are healthy", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const robotsText = await robots.text();
    expect(robotsText).toContain("Sitemap: https://warrantee.io/sitemap.xml");
    expect(robotsText).toContain("Disallow: /api/");
    expect(robotsText).not.toContain("Disallow: /*/dashboard");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("https://warrantee.io/en");

    const indexNow = await request.get(`/${indexNowKey}.txt`);
    expect(indexNow.status()).toBe(200);
    expect((await indexNow.text()).trim()).toBe(indexNowKey);

    for (const path of [
      "/llms.txt",
      "/.well-known/agent-card.json",
      "/.well-known/api-catalog",
      "/.well-known/mcp.json",
      "/.well-known/agent-skills",
    ]) {
      const response = await request.get(path);
      expect(response.status(), `${path} should be available`).toBe(200);
    }
  });

  test("key public pages expose canonical links", async ({ page }) => {
    for (const path of ["/en", "/en/features", "/en/pricing", "/en/api-docs", "/en/support"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute("href", new RegExp(`https://warrantee\\.io${path}$`));
    }
  });
});
