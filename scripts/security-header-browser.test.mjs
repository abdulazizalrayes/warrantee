import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium, firefox, webkit } from "@playwright/test";
import config from "../next.config.ts";
import { randomBytes } from "node:crypto";

const rules = await config.headers();
const policy = rules.find((rule) => rule.source === "/:path*").headers
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
}
