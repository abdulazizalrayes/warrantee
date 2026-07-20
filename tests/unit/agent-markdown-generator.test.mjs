import { describe, expect, it } from "vitest";
import {
  pageHtmlToMarkdown,
  parseSitemap,
} from "../../scripts/lib/agent-markdown-generator.mjs";

const canonicalUrl = "https://warrantee.io/en/example";

describe("agent Markdown generator", () => {
  it("uses structured main content and excludes non-public UI", () => {
    const html = `<!doctype html>
      <html lang="en-US">
        <head>
          <title>Example Page</title>
          <meta name="description" content="Example description">
          <link rel="canonical" href="${canonicalUrl}">
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Example"}</script>
        </head>
        <body>
          <nav>Private navigation</nav>
          <main><main><h1>Public heading</h1><p>Public copy with <a href="/en/about">a link</a>.</p>
            <img src="/icons/icon.svg" alt="Warrantee logo">
            <img src="/decorative.svg" alt="">
            <form><label>Private form</label><input></form>
            <div hidden>Hidden note</div>
            <table><thead><tr><th>Plan</th></tr></thead><tbody><tr><td>Free</td></tr></tbody></table>
            <details><summary>More</summary><p>Detail text</p></details>
          </main></main>
          <footer>Private footer</footer>
        </body>
      </html>`;
    const page = pageHtmlToMarkdown({ html, canonicalUrl, expectedPathname: "/en/example" });

    expect(page.markdown).toContain("# Public heading");
    expect(page.markdown).toContain("https://warrantee.io/en/about");
    expect(page.markdown).toContain("![Warrantee logo](https://warrantee.io/icons/icon.svg)");
    expect(page.markdown).toContain("| Plan |");
    expect(page.markdown).toContain("<details>");
    expect(page.markdown).toContain('"@type": "WebPage"');
    expect(page.markdown).not.toContain("Private navigation");
    expect(page.markdown).not.toContain("Private footer");
    expect(page.markdown).not.toContain("Private form");
    expect(page.markdown).not.toContain("Hidden note");
    expect(page.markdown).not.toContain("decorative.svg");
  });

  it("rejects sitemap URLs outside the Warrantee identity lock", () => {
    expect(() => parseSitemap("<urlset><url><loc>https://example.com/en</loc></url></urlset>"))
      .toThrow("another origin");
  });

  it("rejects noindex pages", () => {
    const html = `<html lang="en"><head><title>Noindex</title><meta name="description" content="Noindex"><meta name="robots" content="noindex"><link rel="canonical" href="${canonicalUrl}"></head><body><main><h1>Noindex</h1></main></body></html>`;
    expect(() => pageHtmlToMarkdown({ html, canonicalUrl, expectedPathname: "/en/example" }))
      .toThrow("page is noindex");
  });

  it("normalizes Cloudflare email protection without changing public content", () => {
    const html = `<html lang="en"><head><title>Email</title><meta name="description" content="Email"><link rel="canonical" href="${canonicalUrl}"></head><body><main><p><a href="/cdn-cgi/l/email-protection#3f575a5353507f485e4d4d5e514b5a5a115650">Email us</a></p></main></body></html>`;
    const page = pageHtmlToMarkdown({ html, canonicalUrl, expectedPathname: "/en/example" });

    expect(page.markdown).toContain("[Email us](mailto:hello@warrantee.io)");
    expect(page.markdown).not.toContain("/cdn-cgi/");
  });
});
