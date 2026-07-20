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

async function request(path, accept) {
  return fetch(`${baseUrl}${path}`, {
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
  if (markdownHeaders.get("content-location") !== `${CANONICAL_ORIGIN}${expected.sidecarPath}`) {
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

  const qZeroResponse = await request(entry.pathname, "text/markdown;q=0, text/html;q=1");
  if (!qZeroResponse.headers.get("content-type")?.includes("text/html")) {
    fail(entry.pathname, "q-zero", qZeroResponse.headers.get("content-type"));
  }

  const sidecarResponse = await request(expected.sidecarPath, "text/markdown");
  const sidecar = await sidecarResponse.text();
  if (sidecarResponse.status !== 200 || sidecar !== expected.markdown) {
    fail(entry.pathname, "direct-sidecar", `status=${sidecarResponse.status}`);
  }
  if (sidecarResponse.headers.get("x-robots-tag") !== "noindex, follow") {
    fail(entry.pathname, "sidecar-noindex", sidecarResponse.headers.get("x-robots-tag"));
  }
  if (sidecarResponse.headers.get("access-control-allow-origin") !== "*") {
    fail(entry.pathname, "sidecar-cors", sidecarResponse.headers.get("access-control-allow-origin"));
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
    "canonical",
    "html-tree",
    "markdown-headers",
    "public-cors",
    "markdown-body",
    "q-zero",
    "direct-sidecar-noindex",
  ],
}, null, 2));
