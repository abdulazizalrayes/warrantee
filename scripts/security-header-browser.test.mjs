import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium, firefox, webkit } from "@playwright/test";
import config from "../next.config.ts";
import { randomBytes } from "node:crypto";
import { documentCspHeaderSource } from "../src/lib/csp-styles.mjs";

const rules = await config.headers();
const cspRules = rules.filter((rule) => rule.headers.some((header) => header.key === "Content-Security-Policy"));
assert.equal(cspRules.length, 1);
assert.equal(cspRules[0].source, documentCspHeaderSource);
const policy = cspRules[0].headers
  .find((header) => header.key === "Content-Security-Policy").value;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  test(`${name}: event attributes denied, event listeners preserved`, { timeout: 30000 }, async () => {
    const nonce = randomBytes(24).toString("base64");
    const candidatePolicy = policy.replace(/script-src ([^;]+)/, (_, sources) => `script-src ${sources} 'nonce-${nonce}'`);
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      await page.route("**/*", (route) => {
        assert.equal(route.request().url(), "https://warrantee.test/csp-fixture");
        return route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": candidatePolicy },
          body: `<!doctype html><html lang="en"><title>Local CSP fixture</title>
            <button id="attribute" onclick="window.attributeExecuted=true">Attribute</button>
            <button id="listener">Listener</button><script>window.untrustedExecuted=true;</script><script nonce="${nonce}">
            window.scriptExecuted=true;
            document.getElementById('listener').addEventListener('click', function () {
              window.listenerExecuted=true;
            });
            </script></html>`,
        });
      });
      await page.goto("https://warrantee.test/csp-fixture");
      assert.equal(await page.evaluate(() => window.scriptExecuted), true);
      assert.equal(await page.evaluate(() => window.untrustedExecuted), undefined);
      await page.locator("#attribute").click();
      assert.equal(await page.evaluate(() => window.attributeExecuted), undefined);
      await page.locator("#listener").click();
      assert.equal(await page.evaluate(() => window.listenerExecuted), true);
    } finally {
      await browser.close();
    }
  });
  test(`${name}: trusted hash, nonce and self styles allowed; injected styles blocked; attributes preserved`, { timeout: 30000 }, async () => {
    const nonce = randomBytes(24).toString("base64");
    const candidatePolicy = policy.replace(/style-src-elem ([^;]+)/, (_, sources) => `style-src-elem ${sources} 'nonce-${nonce}'`);
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      await page.route("**/*", (route) => {
        const url = route.request().url();
        if (url === "https://warrantee.test/fixture.css") return route.fulfill({ contentType: "text/css", body: "#self{color:rgb(1,2,3)}" });
        assert.equal(url, "https://warrantee.test/style-fixture");
        return route.fulfill({ status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": candidatePolicy }, body: `<!doctype html><html><head>
          <link rel="stylesheet" href="/fixture.css">
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
          <style nonce="${nonce}">#nonce{color:rgb(4,5,6)}</style>
          <style>#blocked{display:none}</style><style nonce="wrong">#wrong{display:none}</style>
          </head><body><div id="self">self</div><div id="nonce">nonce</div><div id="blocked">blocked</div><div id="wrong">wrong</div><div id="attr" style="color:rgb(7,8,9);animation-name:spin">attribute</div></body></html>` });
      });
      await page.goto("https://warrantee.test/style-fixture");
      assert.equal(await page.locator("#self").evaluate(e => getComputedStyle(e).color), "rgb(1, 2, 3)");
      assert.equal(await page.locator("#nonce").evaluate(e => getComputedStyle(e).color), "rgb(4, 5, 6)");
      assert.equal(await page.locator("#attr").evaluate(e => getComputedStyle(e).color), "rgb(7, 8, 9)");
      assert.equal(await page.evaluate(() => [...document.styleSheets].some(sheet => {
        try { return [...sheet.cssRules].some(rule => rule.cssText.startsWith("@keyframes spin")); } catch { return false; }
      })), true);
      for (const id of ["blocked", "wrong"]) assert.equal(await page.locator(`#${id}`).evaluate(e => getComputedStyle(e).display), "block");
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.textContent = "#blocked{display:none}";
        document.head.appendChild(style);
      });
      assert.equal(await page.locator("#blocked").evaluate(e => getComputedStyle(e).display), "block");
    } finally { await browser.close(); }
  });
}
