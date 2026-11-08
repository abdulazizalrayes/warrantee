import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "cheerio";
import { trustedInlineStyleHashes } from "./csp-finalize-build.mjs";

export function inspectHtml(html) {
  const $ = load(html);
  const hashes = new Set();
  let styleAttributes = 0;
  let eventAttributes = 0;
  $("script:not([src])").each((_, element) => {
    const body = $(element).html();
    if (body) hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
  });
  $("*").each((_, element) => {
    for (const name of Object.keys(element.attribs || {})) {
      if (name === "style") styleAttributes++;
      if (/^on[a-z]+$/i.test(name)) eventAttributes++;
    }
  });
  return { hashes: [...hashes].sort(), styleHashes: trustedInlineStyleHashes(html), styleAttributes, eventAttributes };
}

export function auditBuild(root = ".next/server/app") {
  const pages = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Build audit rejects symlinks");
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith(".html")) {
        const html = readFileSync(file, "utf8");
        pages.push({ file: relative(root, file), htmlSha256: createHash("sha256").update(html).digest("hex"), ...inspectHtml(html) });
      }
    }
  }
  walk(root);
  if (!pages.length) throw new Error("No emitted HTML found; run npm run build first");
  return { purpose: "offline inventory only; not a deployable or enforced CSP", pages };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = auditBuild();
  console.log(JSON.stringify({
    purpose: report.purpose,
    pages: report.pages.length,
    uniqueInlineHashes: new Set(report.pages.flatMap((page) => page.hashes)).size,
    maximumPerPageHashes: Math.max(...report.pages.map((page) => page.hashes.length)),
    inlineStyleAttributes: report.pages.reduce((n, page) => n + page.styleAttributes, 0),
    inlineEventAttributes: report.pages.reduce((n, page) => n + page.eventAttributes, 0),
    enforcementReady: false,
    remaining: ["final-artifact header binding", "client-inserted script inventory", "dynamic-route nonces", "cache and rollback atomicity", "browser compatibility gates"],
  }, null, 2));
}
