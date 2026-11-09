import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import publicManifest from "../../src/generated/agent-markdown-pages.json" with { type: "json" };

export const evidenceDirectory = resolve("qa-safe-artifacts");
export const limits = { images: 8, imageBytes: 512 * 1024, jsonBytes: 128 * 1024, records: 256 } as const;
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const publicPath = /^\/(?:en|ar)(?:\/(?:pricing|about|contact|faq|privacy|terms|features|how-it-works|business|personal))?$/;
export const safeFiles = ["public-routes.spec.ts", "operational-workflows.spec.ts", "release-regression.spec.ts", "business-workflows.spec.ts", "authenticated-shell.spec.ts", "protected-routes.spec.ts", "seo-agent-ready.spec.ts", "searchable-select.spec.ts", "header-footer.spec.ts", "csp.spec.ts", "authenticated-core-flows.spec.ts", "unknown"];
export const safeProjects = ["chromium", "mobile-chrome", "unknown"];
const publicRoutes: string[] = publicManifest.pages.flatMap((page) => {
  const url = new URL(page.canonicalUrl);
  return url.origin === "https://warrantee.io" && !url.search && !url.hash && /^\/(en|ar)(?:\/[a-z0-9-]+)*$/.test(url.pathname) && page.canonicalUrl === `${url.origin}${url.pathname}` ? [url.pathname] : [];
});
const protectedRoutes = ["/dashboard", "/onboarding", "/warranties", "/warranties/new", "/warranties/import", "/warranties/bulk", "/warranties/transfer", "/extensions", "/documents", "/notifications", "/analytics", "/reports", "/settings", "/settings/notifications", "/settings/team", "/seller", "/seller/invite", "/billing", "/approval"];
export const safeRoutes = ["unknown", ...publicRoutes, ...["en", "ar"].flatMap(locale => protectedRoutes.map(path => `/${locale}${path}`))];

export function routeAlias(title: string): string {
  const token = title.split(" ", 1)[0];
  return safeRoutes.includes(token) ? token : "unknown";
}

export function isSafePublicUrl(value: string, allowedPaths: readonly string[], expectedOrigin = "https://warrantee.io"): boolean {
  try {
    const url = new URL(value);
    const expected = new URL(expectedOrigin);
    const trustedOrigin = expected.origin === "https://warrantee.io" || (expected.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(expected.hostname));
    return trustedOrigin && !expected.username && !expected.password && url.origin === expected.origin && !url.username && !url.password
      && !url.search && !url.hash && publicPath.test(url.pathname)
      && allowedPaths.includes(url.pathname) && value === `${url.origin}${url.pathname}`;
  } catch { return false; }
}

export function numericAudit(name: string, body: Buffer): Record<string, number> | null {
  if (body.length > 64 * 1024 || !/^(semantic-audit|geometry-(320|390|768|1024|1280|1440|1920))$/.test(name)) return null;
  try {
    const input = JSON.parse(body.toString());
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    const output: Record<string, number> = {};
    const arrays = name === "semantic-audit" ? ["duplicateIds", "unnamedControls", "unlabelledFields"] : ["outsideViewport", "clippedInteractiveText", "overflowingContainers"];
    const numbers = name === "semantic-audit" ? ["mainCount", "h1Count"] : ["horizontalOverflow"];
    for (const key of arrays) if (Array.isArray(input[key])) output[key] = Math.min(input[key].length, 100000);
    for (const key of numbers) if (typeof input[key] === "number" && Number.isFinite(input[key])) output[key] = Math.max(0, Math.min(100000, Math.round(input[key])));
    return Object.keys(output).length ? output : null;
  } catch { return null; }
}

export function writeSafeImage(image: Buffer, directory = evidenceDirectory): boolean {
  // Only the trusted capture helper produces images; structure checks do not anonymize pixels.
  if (!isBoundedPng(image)) return false;
  if (!existsSync(directory) || !lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) return false;
  for (let index = 0; index < limits.images; index++) {
    try {
      writeFileSync(join(directory, `public-${index}.png`), image, { flag: "wx", mode: 0o600 });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") return false;
    }
  }
  return false;
}

export function validateSafeDirectory(directory = evidenceDirectory): boolean {
  try {
    if (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory()) return false;
    const entries = readdirSync(directory);
    if (!entries.includes("summary.json") || entries.length > limits.images + 1) return false;
    for (const name of entries) {
      const file = join(directory, name);
      const stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink()) return false;
      if (stat.size > (name === "summary.json" ? limits.jsonBytes : limits.imageBytes)) return false;
      const bytes = readFileSync(file);
      if (name === "summary.json") {
        if (bytes.length > limits.jsonBytes) return false;
        const data = JSON.parse(bytes.toString());
        // Only fixed schema keys and numeric values can cross the CI boundary.
        if (!Array.isArray(data.records) || data.records.length > limits.records || !data.counts || Object.keys(data).sort().join() !== "counts,globalErrors,records,runStatus") return false;
        if (!validNumber(data.globalErrors) || !["passed", "failed", "timedout", "interrupted"].includes(data.runStatus)) return false;
        if (Object.keys(data.counts).sort().join() !== "failed,flaky,passed,skipped" || !Object.values(data.counts).every(validNumber)) return false;
        for (const record of data.records) {
          if (Object.keys(record).sort().join() !== "audits,file,line,project,route" || !safeFiles.includes(record.file) || !safeProjects.includes(record.project) || !safeRoutes.includes(record.route) || !validNumber(record.line) || !Array.isArray(record.audits) || record.audits.length > 16) return false;
          for (const audit of record.audits) if (!audit || typeof audit !== "object" || Object.keys(audit).some(key => !["duplicateIds", "unnamedControls", "unlabelledFields", "mainCount", "h1Count", "outsideViewport", "clippedInteractiveText", "overflowingContainers", "horizontalOverflow"].includes(key)) || !Object.values(audit).every(validNumber)) return false;
        }
      } else if (!/^public-[0-7]\.png$/.test(name) || !isBoundedPng(bytes)) return false;
    }
    return true;
  } catch { return false; }
}

function validNumber(value: unknown): boolean { return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100000; }

export function isBoundedPng(image: Buffer): boolean {
  if (image.length > limits.imageBytes || !image.subarray(0, 8).equals(signature)) return false;
  let offset = 8, chunks = 0, dataChunks = 0;
  while (offset + 12 <= image.length && chunks < 128) {
    const length = image.readUInt32BE(offset);
    const kind = image.toString("latin1", offset + 4, offset + 8);
    const end = offset + length + 12;
    if (end > image.length) return false;
    if (chunks === 0) {
      if (kind !== "IHDR" || length !== 13) return false;
      const width = image.readUInt32BE(offset + 8), height = image.readUInt32BE(offset + 12);
      if (!width || !height || width > 1920 || height > 1200 || image[offset + 16] !== 8 || ![2, 6].includes(image[offset + 17]) || image[offset + 18] !== 0 || image[offset + 19] !== 0 || image[offset + 20] !== 0) return false;
    } else if (kind === "IDAT") {
      if (length === 0) return false;
      dataChunks++;
    } else if (kind === "IEND") {
      return length === 0 && dataChunks > 0 && end === image.length;
    } else return false;
    offset = end;
    chunks++;
  }
  return false;
}

export async function captureSafePublicFailure(page: Page, testInfo: TestInfo, allowedPaths: readonly string[], expectedOrigin = testInfo.project?.use.baseURL || "https://warrantee.io"): Promise<boolean> {
  if (!process.env.CI || testInfo.status === testInfo.expectedStatus || testInfo.status === "skipped") return false;
  try {
    if (testInfo.project?.use.storageState) return false;
    const original = page.url();
    const anonymous = async () => {
      if (page.url() !== original || !isSafePublicUrl(original, allowedPaths, expectedOrigin) || page.frames().length !== 1) return false;
      const state = await page.context().storageState({ indexedDB: true });
      if (state.cookies.length || state.origins.some(origin => origin.localStorage.length || ("indexedDB" in origin && (!Array.isArray(origin.indexedDB) || origin.indexedDB.length > 0)))) return false;
      return page.evaluate(() => sessionStorage.length === 0 && localStorage.length === 0 && window.scrollX === 0 && window.scrollY === 0);
    };
    if (!await anonymous()) return false;
    const main = page.locator("main");
    if (await main.count() !== 1) return false;
    const box = await main.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport || viewport.width > 1920 || viewport.height > 1200) return false;
    const x = Math.max(0, box.x), y = Math.max(0, box.y);
    const width = Math.min(viewport.width, box.x + box.width) - x;
    const height = Math.min(viewport.height, box.y + box.height) - y;
    if (width <= 0 || height <= 0) return false;
    const image = await page.screenshot({ type: "png", scale: "css", fullPage: false, clip: { x, y, width, height }, animations: "disabled", timeout: 3000,
      mask: [page.locator("input, textarea, select, [contenteditable], iframe, canvas, video")],
    });
    if (!await anonymous()) return false;
    return writeSafeImage(image);
  } catch { return false; }
}

export function prepareSafeDirectory() {
  mkdirSync(evidenceDirectory, { recursive: true, mode: 0o700 });
}
