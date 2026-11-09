import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import type { Page, TestInfo } from "@playwright/test";
import { captureSafePublicFailure, isBoundedPng, isSafePublicUrl, limits, numericAudit, routeAlias, validateSafeDirectory, writeSafeImage } from "../e2e/safe-evidence";

const marker = "PRIVATE-marker@example.invalid?token=secret";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==", "base64");
function temporary(run: (directory: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), "warrantee-safe-evidence-"));
  try { run(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

describe("safe QA evidence", () => {
  it("requires exact canonical allowlisted public URLs", () => {
    expect(isSafePublicUrl("https://warrantee.io/en/pricing", ["/en/pricing"])).toBe(true);
    for (const value of ["https://warrantee.io/en/pricing?token=x", "https://warrantee.io/en/pricing#x", "https://warrantee.io/en/auth", "https://warrantee.io/en/dashboard", "https://evil.invalid/en/pricing", "https://user@warrantee.io/en/pricing", "http://warrantee.io/en/pricing", "https://warrantee.io/en/%70ricing"]) {
      expect(isSafePublicUrl(value, [new URL(value).pathname])).toBe(false);
    }
    expect(isSafePublicUrl("https://warrantee.io/en/pricing", [])).toBe(false);
    expect(isSafePublicUrl("http://127.0.0.1:3100/en/pricing", ["/en/pricing"], "http://127.0.0.1:3100")).toBe(true);
    expect(isSafePublicUrl("http://127.0.0.1:3101/en/pricing", ["/en/pricing"], "http://127.0.0.1:3100")).toBe(false);
    expect(isSafePublicUrl("https://evil.invalid/en/pricing", ["/en/pricing"], "https://evil.invalid")).toBe(false);
  });

  it("reduces allowlisted audits to numeric counts only", () => {
    expect(routeAlias(`/en/pricing ${marker}`)).toBe("/en/pricing");
    expect(routeAlias(`/en/documents/${marker} fails`)).toBe("unknown");
    expect(routeAlias(`/en/pricing?${marker} fails`)).toBe("unknown");
    const body = Buffer.from(JSON.stringify({ duplicateIds: [marker], unnamedControls: [marker], h1Count: 1, mainCount: Infinity, secret: marker }));
    expect(numericAudit("semantic-audit", body)).toEqual({ duplicateIds: 1, unnamedControls: 1, h1Count: 1 });
    expect(numericAudit("browser-errors", body)).toBeNull();
    expect(numericAudit("geometry-390", Buffer.from(JSON.stringify({ outsideViewport: [marker], horizontalOverflow: 5, url: marker })))).toEqual({ outsideViewport: 1, horizontalOverflow: 5 });
    expect(numericAudit("semantic-audit", Buffer.alloc(65537))).toBeNull();
    expect(numericAudit("semantic-audit", Buffer.from("null"))).toBeNull();
  });

  it("recognizes every checked-in public path without retaining query or dynamic identifiers", () => {
    const manifest = JSON.parse(readFileSync(resolve("src/generated/agent-markdown-pages.json"), "utf8"));
    expect(manifest.pages).toHaveLength(50);
    for (const page of manifest.pages) {
      const path = new URL(page.canonicalUrl).pathname;
      expect(routeAlias(`${path} contract failed`)).toBe(path);
      expect(routeAlias(`${path}?token=synthetic contract failed`)).toBe("unknown");
      expect(routeAlias(`${path}/synthetic-private-id contract failed`)).toBe("unknown");
    }
  });

  it("bounds images and rejects symlinks, unknown files, and unsafe JSON", () => temporary(directory => {
    expect(isBoundedPng(png)).toBe(true);
    for (const image of [png.subarray(0, 8), Buffer.concat([png.subarray(0, 8), Buffer.from(marker)]), Buffer.concat([png, Buffer.from(marker)]), png.subarray(0, -1)]) expect(isBoundedPng(image)).toBe(false);
    const metadata = Buffer.from(png);
    metadata.write("tEXt", 37, "ascii");
    expect(isBoundedPng(metadata)).toBe(false);
    const oversized = Buffer.from(png);
    oversized.writeUInt32BE(1921, 16);
    expect(isBoundedPng(oversized)).toBe(false);
    expect(writeSafeImage(Buffer.from(marker), directory)).toBe(false);
    expect(writeSafeImage(Buffer.concat([png, Buffer.alloc(limits.imageBytes)]), directory)).toBe(false);
    for (let i = 0; i < 8; i++) expect(writeSafeImage(png, directory)).toBe(true);
    expect(writeSafeImage(png, directory)).toBe(false);
    const summary = { counts: { passed: 0, failed: 1, flaky: 0, skipped: 0 }, records: [], globalErrors: 0, runStatus: "failed" };
    writeFileSync(join(directory, "summary.json"), JSON.stringify(summary));
    expect(validateSafeDirectory(directory)).toBe(true);
    for (const changed of [{ globalErrors: -1 }, { globalErrors: 100001 }, { globalErrors: marker }, { runStatus: marker }]) {
      writeFileSync(join(directory, "summary.json"), JSON.stringify({ ...summary, ...changed }));
      expect(validateSafeDirectory(directory)).toBe(false);
    }
    writeFileSync(join(directory, "summary.json"), JSON.stringify(summary));
    writeFileSync(join(directory, "public-0.png"), Buffer.concat([png.subarray(0, 8), Buffer.from(marker)]));
    expect(validateSafeDirectory(directory)).toBe(false);
    writeFileSync(join(directory, "public-0.png"), png);
    writeFileSync(join(directory, "summary.json"), JSON.stringify({ ...summary, records: [{ file: marker, project: "chromium", route: "/en/pricing", line: 1, audits: [] }] }));
    expect(validateSafeDirectory(directory)).toBe(false);
    writeFileSync(join(directory, "summary.json"), JSON.stringify(summary));
    writeFileSync(join(directory, "raw.html"), marker);
    expect(validateSafeDirectory(directory)).toBe(false);
    rmSync(join(directory, "raw.html"));
    writeFileSync(join(directory, "summary.json"), JSON.stringify({ ...summary, error: marker }));
    expect(validateSafeDirectory(directory)).toBe(false);
    rmSync(join(directory, "public-0.png"));
    symlinkSync(join(directory, "summary.json"), join(directory, "public-0.png"));
    expect(validateSafeDirectory(directory)).toBe(false);
  }));

  it("fails closed before screenshots for cookies, storage, frames, and uncertain provenance", async () => {
    const original = process.env.CI;
    process.env.CI = "1";
    try {
      for (const condition of ["cookies", "storage", "indexedDB", "frames", "query", "session", "throws"]) {
        let captured = false;
        const page = {
          url: () => `https://warrantee.io/en/pricing${condition === "query" ? "?token=private" : ""}`,
          frames: () => condition === "frames" ? [1, 2] : [1],
          context: () => ({ storageState: async () => {
            if (condition === "throws") throw Error(marker);
            return { cookies: condition === "cookies" ? [{}] : [], origins: condition === "storage" ? [{ localStorage: [{ name: marker }] }] : condition === "indexedDB" ? [{ localStorage: [], indexedDB: [{}] }] : [] };
          } }),
          evaluate: async () => condition !== "session",
          screenshot: async () => { captured = true; return png; },
        } as unknown as Page;
        expect(await captureSafePublicFailure(page, { status: "failed", expectedStatus: "passed" } as TestInfo, ["/en/pricing"])).toBe(false);
        expect(captured).toBe(false);
      }
    } finally { if (original === undefined) delete process.env.CI; else process.env.CI = original; }
  });

  it("clips to the visible main and masks controls; discards a navigation race", async () => {
    const original = process.env.CI;
    process.env.CI = "1";
    let url = "https://warrantee.io/en/pricing";
    let options: Record<string, unknown> | undefined;
    const mask = {};
    const page = {
      url: () => url, frames: () => [1],
      context: () => ({ storageState: async () => ({ cookies: [], origins: [] }) }),
      evaluate: async () => true,
      locator: (selector: string) => selector === "main" ? { count: async () => 1, boundingBox: async () => ({ x: 10, y: 100, width: 1500, height: 2000 }) } : mask,
      viewportSize: () => ({ width: 390, height: 844 }),
      screenshot: async (value: Record<string, unknown>) => { options = value; url += "?private=token"; return png; },
    } as unknown as Page;
    try {
      expect(await captureSafePublicFailure(page, { status: "failed", expectedStatus: "passed" } as TestInfo, ["/en/pricing"])).toBe(false);
      expect(options).toMatchObject({ type: "png", scale: "css", fullPage: false, clip: { x: 10, y: 100, width: 380, height: 744 }, mask: [mask] });
    } finally { if (original === undefined) delete process.env.CI; else process.env.CI = original; }
  });

  it("real Playwright retry-pass exits 1 and reporter never emits raw evidence", () => temporary(directory => {
    const reporter = resolve("tests/e2e/safe-evidence-reporter.ts");
    const playwright = resolve("node_modules/@playwright/test/index.mjs");
    writeFileSync(join(directory, "playwright.config.ts"), `export default { testDir: '.', retries: 2, failOnFlakyTests: true, workers: 1, projects:[{name:${JSON.stringify(marker)}}], reporter: [[${JSON.stringify(reporter)}]] };`);
    writeFileSync(join(directory, "control.spec.ts"), `import { test, expect } from ${JSON.stringify(playwright)};
      test(${JSON.stringify(marker)}, async ({}, info) => {
        console.log(${JSON.stringify(marker)}); console.error(${JSON.stringify(marker)});
        await info.attach('semantic-audit', {body: JSON.stringify({duplicateIds:[${JSON.stringify(marker)}],mainCount:1}), contentType:'application/json'});
        await info.attach('geometry-390', {body: JSON.stringify({outsideViewport:[${JSON.stringify(marker)}],horizontalOverflow:2,private:${JSON.stringify(marker)}}), contentType:'application/json'});
        await info.attach('browser-errors', {body:${JSON.stringify(marker)},contentType:'text/plain'});
        expect(info.retry, ${JSON.stringify(marker)}).toBeGreaterThan(0);
      });`);
    const result = spawnSync(process.execPath, [resolve("node_modules/@playwright/test/cli.js"), "test", "--config", join(directory, "playwright.config.ts")], { cwd: directory, encoding: "utf8", timeout: 30000, env: { ...process.env, CI: "1" } });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toContain(marker);
    expect(result.stdout).not.toBe("");
    expect(JSON.parse(result.stdout.trim())).toEqual({ passed: 0, failed: 0, flaky: 1, skipped: 0, globalErrors: 0, runStatus: "failed" });
    const output = join(directory, "qa-safe-artifacts");
    expect(validateSafeDirectory(output)).toBe(true);
    expect(readdirSync(output)).toEqual(["summary.json"]);
    expect(readFileSync(join(output, "summary.json"), "utf8")).not.toContain(marker);
    expect(JSON.parse(readFileSync(join(output, "summary.json"), "utf8")).records[0]).toMatchObject({ file: "unknown", project: "unknown" });
    expect(JSON.parse(readFileSync(join(output, "summary.json"), "utf8")).records[0].audits).toEqual([{ outsideViewport: 1, horizontalOverflow: 2 }]);
  }));

  it.each(["collection", "setup"])("signals a real Playwright global %s failure without private error output", mode => temporary(directory => {
    const reporter = resolve("tests/e2e/safe-evidence-reporter.ts");
    const playwright = resolve("node_modules/@playwright/test/index.mjs");
    writeFileSync(join(directory, "playwright.config.ts"), `export default {testDir:'.',workers:1,reporter:[[${JSON.stringify(reporter)}]]${mode === "setup" ? ",globalSetup:'./setup.ts'" : ""}};`);
    writeFileSync(join(directory, "control.spec.ts"), mode === "collection" ? `throw new Error(${JSON.stringify(marker)});` : `import {test} from ${JSON.stringify(playwright)}; test('static control',async()=>{});`);
    if (mode === "setup") writeFileSync(join(directory, "setup.ts"), `export default async function(){throw new Error(${JSON.stringify(marker)});}`);
    const result = spawnSync(process.execPath, [resolve("node_modules/@playwright/test/cli.js"), "test", "--config", join(directory, "playwright.config.ts")], { cwd: directory, encoding: "utf8", timeout: 30000, env: { ...process.env, CI: "1" } });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toContain(marker);
    const output = JSON.parse(result.stdout.trim());
    expect(output.runStatus).toBe("failed");
    expect(output.globalErrors).toBeGreaterThan(0);
    expect(output.globalErrors).toBeLessThanOrEqual(100000);
    expect(output.passed).toBe(0);
    const artifacts = join(directory, "qa-safe-artifacts");
    expect(validateSafeDirectory(artifacts)).toBe(true);
    const summary = readFileSync(join(artifacts, "summary.json"), "utf8");
    expect(summary).not.toContain(marker);
    expect(JSON.parse(summary)).toMatchObject({ runStatus: "failed", globalErrors: output.globalErrors });
  }));

  it("captures an anonymous local CI page in real Chromium and refuses private provenance", () => temporary(directory => {
    const script = join(directory, "browser.mjs");
    writeFileSync(script, `import { chromium } from ${JSON.stringify(resolve("node_modules/@playwright/test/index.mjs"))};
      import { mkdirSync, readdirSync } from 'node:fs';
      import { captureSafePublicFailure } from ${JSON.stringify(resolve("tests/e2e/safe-evidence.ts"))};
      mkdirSync('qa-safe-artifacts');
      const browser = await chromium.launch({headless:true, args:['--disable-background-networking']});
      try {
        const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
        await context.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:3100/') ? route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><main style="height:600px"><h1>Public fixture</h1><input value="synthetic-private-marker"></main>'}) : route.abort());
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:3100/en/pricing');
        const info = {status:'failed',expectedStatus:'passed',project:{use:{baseURL:'http://127.0.0.1:3100'}}};
        const results = [await captureSafePublicFailure(page,info,['/en/pricing'])];
        await context.addCookies([{name:'session',value:'synthetic',url:'http://127.0.0.1:3100'}]);
        results.push(await captureSafePublicFailure(page,info,['/en/pricing']));
        await context.clearCookies();
        await page.evaluate(() => localStorage.setItem('private','synthetic'));
        results.push(await captureSafePublicFailure(page,info,['/en/pricing']));
        await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem('private','synthetic'); });
        results.push(await captureSafePublicFailure(page,info,['/en/pricing']));
        await page.evaluate(() => sessionStorage.clear());
        await page.goto('http://127.0.0.1:3100/en/pricing?token=synthetic');
        results.push(await captureSafePublicFailure(page,info,['/en/pricing']));
        await page.goto('http://127.0.0.1:3100/en/dashboard');
        results.push(await captureSafePublicFailure(page,info,['/en/dashboard']));
        console.log(JSON.stringify({results,images:readdirSync('qa-safe-artifacts').length}));
      } finally { await browser.close(); }`);
    const result = spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8", timeout: 30000, env: { ...process.env, CI: "1" } });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({ results: [true, false, false, false, false, false], images: 1 });
  }));
});
