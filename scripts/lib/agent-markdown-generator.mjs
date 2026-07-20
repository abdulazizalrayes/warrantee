import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

export const CANONICAL_ORIGIN = "https://warrantee.io";
export const GENERATED_SCHEMA_VERSION = 1;

const EXCLUDED_LINK_PREFIXES = [
  "/api/",
  "/admin",
  "/dashboard",
  "/settings",
  "/billing",
  "/warranties",
  "/claims",
  "/documents",
  "/notifications",
  "/reports",
  "/analytics",
  "/approval",
];

const REMOVED_MAIN_SELECTORS = [
  "nav",
  "footer",
  "form",
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "canvas",
  "svg",
  "video",
  "audio",
  "dialog:not([open])",
  "input",
  "textarea",
  "select",
  "button",
  "[hidden]",
  "[inert]",
  "[aria-hidden='true']",
  "[role='navigation']",
  "[role='complementary']",
  "[style*='display: none']",
  "[style*='display:none']",
  "[style*='visibility: hidden']",
  "[style*='visibility:hidden']",
].join(",");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function normalizeLanguage(value, pathname) {
  const language = (value || pathname.split("/").filter(Boolean)[0] || "en")
    .toLowerCase()
    .split("-")[0];
  return language === "ar" ? "ar" : "en";
}

function toSidecarPath(pathname) {
  return `/agent-markdown${normalizePath(pathname)}.md`;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

function stableJson(value) {
  return JSON.stringify(stableValue(value), null, 2);
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function normalizeWhitespace(value) {
  return value
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function absolutePublicUrl(value, canonicalUrl) {
  if (!value) return null;
  if (/^(mailto:|tel:)/i.test(value)) return value;
  if (/^(javascript:|data:|blob:)/i.test(value)) return null;

  try {
    const resolved = new URL(value, canonicalUrl);
    if (!/^https?:$/.test(resolved.protocol)) return null;
    return resolved.href;
  } catch {
    return null;
  }
}

function isPrivateApplicationLink(value) {
  try {
    const url = new URL(value);
    if (url.origin !== CANONICAL_ORIGIN) return false;
    const unlocalizedPath = url.pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
    return EXCLUDED_LINK_PREFIXES.some(
      (prefix) =>
        unlocalizedPath === prefix.replace(/\/$/, "") ||
        unlocalizedPath.startsWith(prefix),
    );
  } catch {
    return false;
  }
}

function removeComments($) {
  $("*")
    .contents()
    .each((_, node) => {
      if (node.type === "comment") $(node).remove();
    });
}

function removeHiddenClassElements($) {
  $("[class]").each((_, element) => {
    const classNames = ($(element).attr("class") || "").split(/\s+/);
    if (classNames.includes("hidden") || classNames.includes("invisible") || classNames.includes("sr-only")) {
      $(element).remove();
    }
  });
}

function decodeCloudflareEmail(value) {
  if (!value || value.length < 4 || value.length % 2 !== 0) return null;
  const key = Number.parseInt(value.slice(0, 2), 16);
  if (!Number.isFinite(key)) return null;

  let email = "";
  for (let index = 2; index < value.length; index += 2) {
    const byte = Number.parseInt(value.slice(index, index + 2), 16);
    if (!Number.isFinite(byte)) return null;
    email += String.fromCharCode(byte ^ key);
  }
  return email.includes("@") ? email : null;
}

function normalizeCloudflareEmailProtection($) {
  $("a[href*='/cdn-cgi/l/email-protection']").each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href") || "";
    const encoded = href.split("#")[1] || anchor.attr("data-cfemail") || "";
    const email = decodeCloudflareEmail(encoded);
    if (!email) return;
    anchor.attr("href", `mailto:${email}`);
    anchor.removeAttr("data-cfemail");
    anchor.find(".__cf_email__").replaceWith(email);
    if (!anchor.text().trim()) anchor.text(email);
    if (anchor.hasClass("__cf_email__")) {
      anchor.replaceWith(email);
    }
  });

  $(".__cf_email__[data-cfemail]").each((_, element) => {
    const node = $(element);
    const email = decodeCloudflareEmail(node.attr("data-cfemail"));
    if (email) node.replaceWith(email);
  });
}

function sanitizeMainHtml(mainHtml, canonicalUrl) {
  const $ = cheerio.load(mainHtml, null, false);
  normalizeCloudflareEmailProtection($);
  $(REMOVED_MAIN_SELECTORS).remove();
  removeHiddenClassElements($);
  removeComments($);

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const href = absolutePublicUrl(anchor.attr("href"), canonicalUrl);
    if (!href || isPrivateApplicationLink(href)) {
      anchor.replaceWith(anchor.contents());
      return;
    }
    anchor.attr("href", href);
  });

  $("img").each((_, element) => {
    const image = $(element);
    const alt = (image.attr("alt") || "").trim();
    const src = absolutePublicUrl(image.attr("src"), canonicalUrl);
    if (!alt || !src) {
      image.remove();
      return;
    }
    image.attr("alt", alt);
    image.attr("src", src);
    image.removeAttr("srcset");
    image.removeAttr("sizes");
    image.removeAttr("loading");
    image.removeAttr("decoding");
  });

  return $.html();
}

function createTurndownService() {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**",
  });
  turndown.use(gfm);
  turndown.addRule("details", {
    filter: "details",
    replacement(content) {
      return `\n\n<details>\n${content.trim()}\n</details>\n\n`;
    },
  });
  turndown.addRule("summary", {
    filter: "summary",
    replacement(content) {
      return `<summary>${content.trim()}</summary>\n\n`;
    },
  });
  return turndown;
}

function extractJsonLd($) {
  const values = [];
  const seen = new Set();

  $("script[type='application/ld+json']").each((_, element) => {
    const source = $(element).text().trim();
    if (!source) return;
    const parsed = JSON.parse(source);
    const normalized = stableJson(parsed);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      values.push(normalized);
    }
  });

  return values;
}

function selectPublicMain($) {
  const deepest = $("main").filter((_, element) => $(element).find("main").length === 0);
  if (deepest.length > 0) return deepest.first();
  return $("main").first();
}

export function canonicalizeHtmlTree(html) {
  const $ = cheerio.load(html);
  normalizeCloudflareEmailProtection($);
  $("script, style, noscript, template, link").remove();
  $("[data-vercel-toolbar], [data-nextjs-toast], nextjs-portal").remove();
  removeComments($);

  $("*").each((_, element) => {
    for (const attribute of Object.keys(element.attribs || {})) {
      if (attribute === "nonce" || attribute.startsWith("data-nextjs-")) {
        $(element).removeAttr(attribute);
      }
    }
  });

  return $.html($("body").first())
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSitemap(xml, expectedOrigin = CANONICAL_ORIGIN) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls = $("url > loc")
    .map((_, element) => $(element).text().trim())
    .get();
  const seen = new Set();

  return urls.map((value) => {
    const url = new URL(value);
    if (url.origin !== expectedOrigin) {
      throw new Error(`Sitemap URL belongs to another origin: ${value}`);
    }
    const pathname = normalizePath(url.pathname);
    if (seen.has(pathname)) throw new Error(`Duplicate sitemap path: ${pathname}`);
    seen.add(pathname);
    return { canonicalUrl: `${expectedOrigin}${pathname}`, pathname };
  });
}

export function pageHtmlToMarkdown({ html, canonicalUrl, expectedPathname }) {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();
  const description = ($("meta[name='description']").first().attr("content") || "").trim();
  const canonical = ($("link[rel='canonical']").first().attr("href") || "").trim();
  const robots = ($("meta[name='robots']").first().attr("content") || "").toLowerCase();
  const language = normalizeLanguage($("html").attr("lang"), expectedPathname);
  const main = selectPublicMain($);

  if (!title) throw new Error(`${expectedPathname}: missing page title`);
  if (!description) throw new Error(`${expectedPathname}: missing meta description`);
  if (canonical !== canonicalUrl) {
    throw new Error(`${expectedPathname}: canonical mismatch (${canonical || "missing"})`);
  }
  if (robots.includes("noindex")) throw new Error(`${expectedPathname}: page is noindex`);
  if (main.length !== 1) throw new Error(`${expectedPathname}: public main content is unavailable`);

  const jsonLd = extractJsonLd($);
  const sanitizedMain = sanitizeMainHtml($.html(main), canonicalUrl);
  const body = normalizeWhitespace(createTurndownService().turndown(sanitizedMain));
  const sidecarPath = toSidecarPath(expectedPathname);
  const frontmatter = [
    "---",
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `canonical: ${yamlString(canonicalUrl)}`,
    `language: ${yamlString(language)}`,
    `content_location: ${yamlString(`${CANONICAL_ORIGIN}${sidecarPath}`)}`,
    "---",
  ].join("\n");
  const sections = [frontmatter, body];

  if (jsonLd.length > 0) {
    sections.push(
      [
        "## Public Structured Data",
        ...jsonLd.map((value) => `\`\`\`json\n${value}\n\`\`\``),
      ].join("\n\n"),
    );
  }

  const markdown = `${sections.filter(Boolean).join("\n\n")}\n`;
  const canonicalHtmlTree = canonicalizeHtmlTree(html);
  const htmlBytes = Buffer.byteLength(canonicalHtmlTree);
  const markdownBytes = Buffer.byteLength(markdown);

  return {
    canonicalUrl,
    description,
    htmlBytes,
    htmlTreeSha256: sha256(canonicalHtmlTree),
    language,
    markdown,
    markdownBytes,
    path: expectedPathname,
    reductionPercent: Number((((htmlBytes - markdownBytes) / htmlBytes) * 100).toFixed(2)),
    sidecarPath,
    title,
  };
}

export async function generateAgentMarkdownPages({ baseUrl, fetchImpl = fetch }) {
  const sourceBase = new URL(baseUrl);
  const sitemapResponse = await fetchImpl(new URL("/sitemap.xml", sourceBase), {
    headers: {
      Accept: "application/xml, text/xml;q=0.9",
      "User-Agent": "warrantee-agent-markdown-generator/1.0",
    },
    redirect: "manual",
  });
  if (!sitemapResponse.ok) {
    throw new Error(`Sitemap request failed: HTTP ${sitemapResponse.status}`);
  }

  const sitemapEntries = parseSitemap(await sitemapResponse.text());
  const pages = [];

  for (const entry of sitemapEntries) {
    const pageUrl = new URL(entry.pathname, sourceBase);
    const response = await fetchImpl(pageUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": "warrantee-agent-markdown-generator/1.0",
        "X-Warrantee-Markdown-Fallback": "html",
      },
      redirect: "manual",
    });
    const contentType = response.headers.get("content-type") || "";
    if (response.status !== 200 || !contentType.includes("text/html")) {
      throw new Error(`${entry.pathname}: expected HTML 200, received ${response.status} ${contentType}`);
    }
    const html = await response.text();
    pages.push(pageHtmlToMarkdown({
      html,
      canonicalUrl: entry.canonicalUrl,
      expectedPathname: entry.pathname,
    }));
  }

  return {
    schemaVersion: GENERATED_SCHEMA_VERSION,
    canonicalOrigin: CANONICAL_ORIGIN,
    sitemapPath: "/sitemap.xml",
    pages,
  };
}
