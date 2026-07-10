import { expect, test } from "@playwright/test";

test.describe("SEO and agent-readiness endpoints", () => {
  const indexNowKey = "99975fddf27362d564d730362b73f94d";

  test("robots, sitemap, and agent files are healthy", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const robotsText = await robots.text();
    expect(robotsText).toContain("Sitemap: https://warrantee.io/sitemap.xml");
    expect(robotsText).toContain("Disallow: /api/");
    expect(robotsText).toContain("Allow: /api/mcp");
    expect(robotsText).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=no");
    expect(robotsText).not.toContain("Disallow: /*/dashboard");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain("https://warrantee.io/en");
    expect(sitemapText).toContain("https://warrantee.io/en/support");
    expect(sitemapText).toContain("https://warrantee.io/en/security");
    expect(sitemapText).not.toContain("<lastmod>");

    const indexNow = await request.get(`/${indexNowKey}.txt`);
    expect(indexNow.status()).toBe(200);
    expect((await indexNow.text()).trim()).toBe(indexNowKey);

    for (const path of [
      "/llms.txt",
      "/llms-full.txt",
      "/auth.md",
      "/openapi.json",
      "/data/company.json",
      "/data/services.json",
      "/data/capabilities.json",
      "/data/service-areas.json",
      "/data/project-inquiry-schema.json",
      "/data/agent-routing.json",
      "/.well-known/agent-card.json",
      "/.well-known/api-catalog",
      "/.well-known/mcp.json",
      "/.well-known/mcp/server-card.json",
      "/.well-known/mcp/server-cards.json",
      "/.well-known/agent-skills/index.json",
    ]) {
      const response = await request.get(path);
      expect(response.status(), `${path} should be available`).toBe(200);
    }

    const llms = await request.get("/llms.txt");
    const llmsText = await llms.text();
    expect(llmsText).toContain("Support: https://warrantee.io/en/support");
    expect(llmsText).toContain("/data/company.json");
    expect(llmsText).toContain("/llms-full.txt");
    expect(llmsText).toContain("Account dashboards, warranty records, claims, billing, settings, seller workspaces, admin pages, and private APIs require authentication.");

    const openapi = await request.get("/openapi.json");
    const openapiJson = await openapi.json();
    expect(openapiJson.paths["/data/company.json"]).toBeTruthy();
    expect(openapiJson.paths["/api/mcp"]).toBeTruthy();

    const authGuide = await request.get("/auth.md");
    expect(await authGuide.text()).toContain("# auth.md - Warrantee API / CLI / MCP Authentication");
  });

  test("key public pages expose canonical links", async ({ page }) => {
    for (const path of ["/en", "/en/blog", "/en/features", "/en/pricing", "/en/api-docs", "/en/security", "/en/support"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute("href", new RegExp(`https://warrantee\\.io${path}$`));
    }
  });

  test("home page exposes the generated Open Graph image", async ({ page }) => {
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://warrantee.io/opengraph-image",
    );
  });

  test("public pages expose visible breadcrumbs and breadcrumb schema", async ({ page }) => {
    await page.goto("/en/pricing", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Pricing");
    const breadcrumbSchemaCount = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) =>
        scripts.filter((script) => script.textContent?.includes("BreadcrumbList")).length,
      );
    expect(breadcrumbSchemaCount).toBe(1);

    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
  });
});
