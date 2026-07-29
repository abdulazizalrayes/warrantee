import * as cheerio from "cheerio";
import generatedPages from "../src/generated/agent-markdown-pages.json" with { type: "json" };
import {
  CANONICAL_ORIGIN,
  canonicalizeHtmlTree,
  parseSitemap,
} from "./lib/agent-markdown-generator.mjs";
import { createHash } from "node:crypto";

const baseUrl = (process.env.AGENT_MARKDOWN_BASE_URL || CANONICAL_ORIGIN).replace(/\/$/, "");
const expectedContentSignal = "search=yes, ai-input=yes, ai-train=no";
const pageByPath = new Map(generatedPages.pages.map((page) => [page.path, page]));
const failures = [];
const measurements = [];

function fail(path, check, detail) {
  failures.push({ path, check, detail });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function request(path, accept, method = "GET") {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: accept,
      "User-Agent": "warrantee-agent-markdown-validator/1.0",
    },
    redirect: "manual",
  });
}

async function validatePage(entry) {
  const expected = pageByPath.get(entry.pathname);
  if (!expected) {
    fail(entry.pathname, "coverage", "Sitemap page is absent from generated companions");
    return;
  }

  const htmlResponse = await request(entry.pathname, "text/html");
  const html = await htmlResponse.text();
  if (htmlResponse.status !== 200 || !htmlResponse.headers.get("content-type")?.includes("text/html")) {
    fail(entry.pathname, "html", `Expected HTML 200, received ${htmlResponse.status}`);
    return;
  }
  const $ = cheerio.load(html);
  if ($("link[rel='canonical']").first().attr("href") !== entry.canonicalUrl) {
    fail(entry.pathname, "canonical", "HTML canonical does not match sitemap URL");
  }
  const htmlLanguage = ($("html").attr("lang") || "").toLowerCase().split("-")[0];
  if (htmlLanguage !== expected.language) {
    fail(entry.pathname, "html-language", `${htmlLanguage || "missing"} != ${expected.language}`);
  }
  if (sha256(canonicalizeHtmlTree(html)) !== expected.htmlTreeSha256) {
    fail(entry.pathname, "html-tree", "Rendered semantic HTML tree differs from generated source hash");
  }
  const expectedAlternate =
    `<${CANONICAL_ORIGIN}${expected.directSidecarPath}>; rel="alternate"; type="text/markdown"`;
  if (!htmlResponse.headers.get("link")?.includes(expectedAlternate)) {
    fail(entry.pathname, "html-alternate", htmlResponse.headers.get("link"));
  }

  const htmlHeadResponse = await request(entry.pathname, "text/html", "HEAD");
  if (
    htmlHeadResponse.status !== 200 ||
    !htmlHeadResponse.headers.get("content-type")?.includes("text/html")
  ) {
    fail(entry.pathname, "html-head", `status=${htmlHeadResponse.status}`);
  }
  if (!htmlHeadResponse.headers.get("link")?.includes(expectedAlternate)) {
    fail(entry.pathname, "html-head-alternate", htmlHeadResponse.headers.get("link"));
  }

  const markdownResponse = await request(entry.pathname, "text/markdown");
  const markdown = await markdownResponse.text();
  const markdownHeaders = markdownResponse.headers;
  if (markdownResponse.status !== 200) fail(entry.pathname, "markdown-status", markdownResponse.status);
  if (!markdownHeaders.get("content-type")?.startsWith("text/markdown")) {
    fail(entry.pathname, "markdown-content-type", markdownHeaders.get("content-type"));
  }
  if (markdownHeaders.get("access-control-allow-origin") !== "*") {
    fail(entry.pathname, "markdown-cors", markdownHeaders.get("access-control-allow-origin"));
  }
  if (!markdownHeaders.get("vary")?.toLowerCase().includes("accept")) {
    fail(entry.pathname, "vary", markdownHeaders.get("vary"));
  }
  if (
    markdownHeaders.get("content-location") !==
    `${CANONICAL_ORIGIN}${expected.directSidecarPath}`
  ) {
    fail(entry.pathname, "content-location", markdownHeaders.get("content-location"));
  }
  if (markdownHeaders.get("content-language") !== expected.language) {
    fail(entry.pathname, "content-language", markdownHeaders.get("content-language"));
  }
  if (!markdownHeaders.get("link")?.includes(`<${entry.canonicalUrl}>; rel="canonical"`)) {
    fail(entry.pathname, "canonical-link-header", markdownHeaders.get("link"));
  }
  if (markdownHeaders.get("content-signal") !== expectedContentSignal) {
    fail(entry.pathname, "content-signal", markdownHeaders.get("content-signal"));
  }
  if (markdown !== expected.markdown) {
    fail(entry.pathname, "markdown-body", "Negotiated body differs from generated companion");
  }

  const markdownHeadResponse = await request(
    entry.pathname,
    "text/markdown",
    "HEAD",
  );
  if (
    markdownHeadResponse.status !== 200 ||
    !markdownHeadResponse.headers
      .get("content-type")
      ?.startsWith("text/markdown")
  ) {
    fail(
      entry.pathname,
      "markdown-head",
      `status=${markdownHeadResponse.status}`,
    );
  }
  if (
    !markdownHeadResponse.headers.get("vary")?.toLowerCase().includes("accept")
  ) {
    fail(
      entry.pathname,
      "markdown-head-vary",
      markdownHeadResponse.headers.get("vary"),
    );
  }
  if (
    !markdownHeadResponse.headers
      .get("link")
      ?.includes(`<${entry.canonicalUrl}>; rel="canonical"`)
  ) {
    fail(
      entry.pathname,
      "markdown-head-canonical",
      markdownHeadResponse.headers.get("link"),
    );
  }

  const negotiationCases = [
    ["exact-html", "text/html", "text/html"],
    ["stronger-html", "text/markdown;q=0.5, text/html;q=1", "text/html"],
    ["stronger-markdown", "text/markdown;q=1, text/html;q=0.5", "text/markdown"],
    ["equal-explicit", "text/markdown;q=1, text/html;q=1", "text/html"],
    ["q-zero", "text/markdown;q=0, text/html;q=1", "text/html"],
    ["global-wildcard", "*/*", "text/html"],
    ["text-wildcard", "text/*", "text/html"],
    [
      "wildcard-precedence",
      "text/*;q=0.8, text/markdown;q=0.5",
      "text/html",
    ],
    [
      "html-q-zero-wildcard",
      "text/html;q=0, text/*;q=0.8",
      "text/markdown",
    ],
  ];
  for (const [check, accept, expectedType] of negotiationCases) {
    const response = await request(entry.pathname, accept);
    if (!response.headers.get("content-type")?.includes(expectedType)) {
      fail(entry.pathname, check, response.headers.get("content-type"));
    }
  }

  const noRepresentations = await request(
    entry.pathname,
    "text/html;q=0, text/markdown;q=0, text/*;q=0, */*;q=0",
  );
  if (noRepresentations.status !== 406) {
    fail(entry.pathname, "not-acceptable", noRepresentations.status);
  }

  const directResponse = await request(expected.directSidecarPath, "text/markdown");
  const direct = await directResponse.text();
  if (directResponse.status !== 200 || direct !== expected.markdown) {
    fail(entry.pathname, "direct-sidecar", `status=${directResponse.status}`);
  }
  if (directResponse.headers.get("x-robots-tag") !== "noindex, follow") {
    fail(entry.pathname, "direct-sidecar-noindex", directResponse.headers.get("x-robots-tag"));
  }
  if (!directResponse.headers.get("vary")?.toLowerCase().includes("accept")) {
    fail(entry.pathname, "direct-sidecar-vary", directResponse.headers.get("vary"));
  }
  if (directResponse.headers.get("access-control-allow-origin") !== "*") {
    fail(entry.pathname, "direct-sidecar-cors", directResponse.headers.get("access-control-allow-origin"));
  }

  const directHead = await request(expected.directSidecarPath, "text/markdown", "HEAD");
  if (
    directHead.status !== 200 ||
    !directHead.headers.get("content-type")?.includes("text/markdown") ||
    directHead.headers.get("x-robots-tag") !== "noindex, follow"
  ) {
    fail(entry.pathname, "direct-sidecar-head", `status=${directHead.status}`);
  }

  const legacySidecarResponse = await request(expected.sidecarPath, "text/markdown");
  const legacySidecar = await legacySidecarResponse.text();
  if (legacySidecarResponse.status !== 200 || legacySidecar !== expected.markdown) {
    fail(entry.pathname, "legacy-sidecar", `status=${legacySidecarResponse.status}`);
  }
  if (legacySidecarResponse.headers.get("x-robots-tag") !== "noindex, follow") {
    fail(entry.pathname, "legacy-sidecar-noindex", legacySidecarResponse.headers.get("x-robots-tag"));
  }
  if (!legacySidecarResponse.headers.get("vary")?.toLowerCase().includes("accept")) {
    fail(entry.pathname, "legacy-sidecar-vary", legacySidecarResponse.headers.get("vary"));
  }

  measurements.push({ htmlBytes: Buffer.byteLength(html), markdownBytes: Buffer.byteLength(markdown) });
}

const sitemapResponse = await request("/sitemap.xml", "application/xml");
if (!sitemapResponse.ok) throw new Error(`Sitemap request failed: HTTP ${sitemapResponse.status}`);
const entries = parseSitemap(await sitemapResponse.text());
const sitemapPaths = new Set(entries.map((entry) => entry.pathname));

for (const path of pageByPath.keys()) {
  if (!sitemapPaths.has(path)) fail(path, "coverage", "Generated companion is not in the sitemap");
}

for (let index = 0; index < entries.length; index += 5) {
  await Promise.all(entries.slice(index, index + 5).map(validatePage));
}

const fallback = await request("/en/demo/product-passport", "text/markdown");
if (fallback.status !== 200 || !fallback.headers.get("content-type")?.includes("text/html")) {
  fail("/en/demo/product-passport", "html-fallback", `status=${fallback.status}, content-type=${fallback.headers.get("content-type")}`);
}

const manifestResponse = await request("/data/agent-markdown-manifest.json", "application/json");
const manifest = await manifestResponse.json().catch(() => null);
if (manifestResponse.status !== 200 || !manifest || manifest.pages?.length !== entries.length) {
  fail("/data/agent-markdown-manifest.json", "manifest", "Manifest is invalid or incomplete");
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, baseUrl, failures }, null, 2));
  process.exit(1);
}

const htmlBytes = measurements.reduce((total, value) => total + value.htmlBytes, 0);
const markdownBytes = measurements.reduce((total, value) => total + value.markdownBytes, 0);
console.log(JSON.stringify({
  ok: true,
  baseUrl,
  pages: entries.length,
  languages: [...new Set(generatedPages.pages.map((page) => page.language))].sort(),
  htmlBytes,
  markdownBytes,
  reductionPercent: Number((((htmlBytes - markdownBytes) / htmlBytes) * 100).toFixed(2)),
  checksPerPage: [
      "html",
      "html-head",
      "canonical",
      "html-tree",
    "page-specific-alternate",
    "markdown-headers",
    "markdown-head",
    "public-cors",
      "markdown-body",
      "accept-negotiation-matrix",
      "direct-sidecar",
      "legacy-sidecar",
      "sidecar-noindex",
      "head",
  ],
}, null, 2));
