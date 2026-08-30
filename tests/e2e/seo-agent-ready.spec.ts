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
      "/data/agent-markdown-manifest.json",
      "/.well-known/agent-card.json",
      "/.well-known/ai-catalog.json",
      "/.well-known/api-catalog",
      "/.well-known/oauth-protected-resource/api",
      "/.well-known/mcp.json",
      "/.well-known/mcp/server-card.json",
      "/.well-known/mcp/server-cards.json",
      "/.well-known/http-message-signatures-directory",
      "/.well-known/acp.json",
      "/.well-known/ucp",
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
    expect(openapiJson.paths["/.well-known/ai-catalog.json"]).toBeTruthy();
    expect(openapiJson.paths["/.well-known/oauth-protected-resource/api"]).toBeTruthy();
    expect(openapiJson.paths["/api/mcp"]).toBeTruthy();
    expect(openapiJson.paths["/api/agent-concierge"]).toBeTruthy();
    expect(openapiJson.paths["/api/a2a"]).toBeTruthy();
    expect(openapiJson.paths["/api/a2a/message:send"]).toBeTruthy();
    expect(openapiJson.paths["/.well-known/http-message-signatures-directory"]).toBeTruthy();
    expect(openapiJson.paths["/.well-known/acp.json"]).toBeTruthy();
    expect(openapiJson.paths["/.well-known/ucp"]).toBeTruthy();

    const authGuide = await request.get("/auth.md");
    expect(await authGuide.text()).toContain("# auth.md - Warrantee API / CLI / MCP Authentication");

    const agentCard = await request.get("/.well-known/agent-card.json");
    const agentCardJson = await agentCard.json();
    expect(agentCardJson.supportedInterfaces[0]).toMatchObject({
      url: "https://warrantee.io/api/a2a",
      protocolBinding: "HTTP+JSON",
      protocolVersion: "1.0",
    });

    const concierge = await request.post("/api/agent-concierge", {
      data: { question: "How does Warrantee MCP work without a password?", locale: "en" },
      headers: { "user-agent": "warrantee-agent-readiness-check/1.0" },
    });
    expect(concierge.status()).toBe(200);
    const conciergeJson = await concierge.json();
    expect(conciergeJson.intent).toBe("api_cli_mcp_integration");
    expect(conciergeJson.boundaries.readOnly).toBe(true);

    const a2a = await request.post("/api/a2a/message:send", {
      headers: {
        "A2A-Version": "1.0",
        "user-agent": "warrantee-agent-readiness-check/1.0",
      },
      data: {
        message: {
          messageId: "e2e-agent-question",
          role: "ROLE_USER",
          parts: [{ text: "Which plan is for a small business?" }],
        },
      },
    });
    expect(a2a.status()).toBe(200);
    expect((await a2a.json()).message.role).toBe("ROLE_AGENT");

    const aiCatalog = await request.get("/.well-known/ai-catalog.json");
    expect(aiCatalog.headers()["content-type"]).toContain("application/ai-catalog+json");
    const aiCatalogJson = await aiCatalog.json();
    expect(aiCatalogJson.specVersion).toBe("1.0");
    expect(aiCatalogJson.host.identifier).toBe("warrantee.io");
    expect(aiCatalogJson.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "application/mcp-server-card+json" }),
        expect.objectContaining({ type: "application/agent-skills+json" }),
        expect.objectContaining({ type: "application/agent-card+json" }),
        expect.objectContaining({ type: "application/openapi+json" }),
      ]),
    );

    const oauthResource = await request.get("/.well-known/oauth-protected-resource/api");
    const oauthResourceJson = await oauthResource.json();
    expect(oauthResourceJson.resource).toBe("https://warrantee.io/api");

    const protectedApi = await request.get("/api/v1/status");
    expect(protectedApi.status()).toBe(401);
    expect(protectedApi.headers()["www-authenticate"]).toContain(
      'resource_metadata="https://warrantee.io/.well-known/oauth-protected-resource/api"',
    );

    const webBotAuth = await request.get("/.well-known/http-message-signatures-directory");
    const webBotAuthJson = await webBotAuth.json();
    expect(Array.isArray(webBotAuthJson.keys)).toBe(true);

    const acp = await request.get("/.well-known/acp.json");
    expect((await acp.json()).protocol.status).toBe("not_enabled");

    const ucp = await request.get("/.well-known/ucp");
    expect((await ucp.json()).protocol.status).toBe("not_enabled");
  });

  test("canonical sitemap pages negotiate deterministic Markdown safely", async ({ request }) => {
    test.setTimeout(120_000);

    const sitemap = await request.get("/sitemap.xml");
    const sitemapText = await sitemap.text();
    const paths = [...sitemapText.matchAll(/<loc>https:\/\/warrantee\.io([^<]+)<\/loc>/g)]
      .map((match) => match[1]);
    const manifestResponse = await request.get("/data/agent-markdown-manifest.json");
    const manifest = await manifestResponse.json();

    expect(manifest.pages).toHaveLength(paths.length);
    expect(new Set(manifest.pages.map((page: { path: string }) => page.path))).toEqual(new Set(paths));

    for (const page of manifest.pages) {
      const markdown = await request.get(page.path, {
        headers: { Accept: "text/markdown" },
      });
      expect(markdown.status(), page.path).toBe(200);
      expect(markdown.headers()["content-type"]).toContain("text/markdown");
      expect(markdown.headers()["access-control-allow-origin"]).toBe("*");
      expect(markdown.headers()["content-location"]).toBe(page.contentLocation);
      expect(markdown.headers()["content-language"]).toBe(page.language);
      expect(markdown.headers()["vary"]?.toLowerCase()).toContain("accept");
      expect(markdown.headers()["link"]).toContain(`<${page.canonicalUrl}>; rel="canonical"`);
      expect(markdown.headers()["content-signal"]).toBe("search=yes, ai-input=yes, ai-train=no");

      const direct = await request.get(new URL(page.contentLocation).pathname);
      expect(direct.status(), page.contentLocation).toBe(200);
      expect(direct.headers()["access-control-allow-origin"]).toBe("*");
      expect(direct.headers()["x-robots-tag"]).toBe("noindex, follow");
      expect(direct.headers()["vary"]?.toLowerCase()).toContain("accept");

      const legacy = await request.get(
        new URL(page.legacyContentLocation).pathname,
      );
      expect(legacy.status(), page.legacyContentLocation).toBe(200);
      expect(legacy.headers()["x-robots-tag"]).toBe("noindex, follow");
      expect(legacy.headers()["vary"]?.toLowerCase()).toContain("accept");

      const html = await request.get(page.path, {
        headers: { Accept: "text/markdown;q=0, text/html;q=1" },
      });
      expect(html.headers()["content-type"]).toContain("text/html");
      expect(html.headers()["link"]).toContain(
        `<${page.contentLocation}>; rel="alternate"; type="text/markdown"`,
      );
      expect(html.headers()["link"]).toContain(
        '</.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/ai-catalog+json"',
      );
    }

    const negotiationCases = [
      ["text/markdown", "text/markdown"],
      ["text/html", "text/html"],
      ["text/markdown;q=0.5, text/html;q=1", "text/html"],
      ["text/markdown;q=1, text/html;q=0.5", "text/markdown"],
      ["text/markdown;q=1, text/html;q=1", "text/html"],
      ["text/markdown;q=0, text/html;q=1", "text/html"],
      ["*/*", "text/html"],
      ["text/*", "text/html"],
      ["text/*;q=0.8, text/markdown;q=0.5", "text/html"],
      ["text/html;q=0, text/*;q=0.8", "text/markdown"],
    ];
    for (const path of ["/en/pricing", "/ar/pricing"]) {
      const manifestPage = manifest.pages.find(
        (page: { path: string }) => page.path === path,
      );
      expect(manifestPage).toBeTruthy();

      for (const [accept, expectedType] of negotiationCases) {
        const response = await request.get(path, { headers: { Accept: accept } });
        expect(response.headers()["content-type"], `${path}: ${accept}`).toContain(
          expectedType,
        );
      }

      const head = await request.head(path, {
        headers: { Accept: "text/html" },
      });
      expect(head.status()).toBe(200);
      expect(head.headers()["content-type"]).toContain("text/html");
      expect(head.headers()["link"]).toContain(
        `<${manifestPage.contentLocation}>; rel="alternate"; type="text/markdown"`,
      );

      const markdownHead = await request.head(path, {
        headers: { Accept: "text/markdown" },
      });
      expect(markdownHead.status()).toBe(200);
      expect(markdownHead.headers()["content-type"]).toContain("text/markdown");
      expect(markdownHead.headers()["vary"]?.toLowerCase()).toContain("accept");
      expect(markdownHead.headers()["link"]).toContain(
        `<${manifestPage.canonicalUrl}>; rel="canonical"`,
      );

      const unavailable = await request.get(path, {
        headers: {
          Accept: "text/html;q=0, text/markdown;q=0, text/*;q=0, */*;q=0",
        },
      });
      expect(unavailable.status()).toBe(406);
    }

    const fallback = await request.get("/en/demo/product-passport", {
      headers: { Accept: "text/markdown" },
    });
    expect(fallback.status()).toBe(200);
    expect(fallback.headers()["content-type"]).toContain("text/html");
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
