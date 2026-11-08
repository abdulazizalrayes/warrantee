import { test, expect } from "@playwright/test";

for (const locale of ["en", "ar"]) {
  test(`${locale} static CSP blocks injected scripts while consent remains interactive`, async ({ page }) => {
    await page.route("**/api/funnel/events", (route) => route.fulfill({ status: 202, contentType: "application/json", body: '{"accepted":true}' }));
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`/${locale}`);
    const policy = response!.headers()["content-security-policy"];
    const scripts = policy.split(";").find((part) => part.trim().startsWith("script-src "))!;
    expect(scripts).not.toContain("unsafe-inline");
    expect(scripts).not.toContain("nonce-");
    expect(scripts).toContain("sha256-");
    const styles = policy.split(";").find((part) => part.trim().startsWith("style-src-elem "))!;
    expect(styles).toContain("'self'");
    expect(styles).not.toContain("unsafe-inline");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    await page.getByRole("button", { name: locale === "ar" ? "تخصيص" : "Customize", exact: true }).click();
    const toggle = page.getByRole("switch").first();
    const before = await toggle.getAttribute("aria-checked");
    await toggle.click();
    await expect(toggle).not.toHaveAttribute("aria-checked", before!);
    await toggle.click();
    await page.getByRole("button", { name: locale === "ar" ? "حفظ التفضيلات" : "Save Preferences", exact: true }).click();
    expect(errors).toEqual([]);
    await page.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.__warranteeInjectedScriptExecuted=true";
      document.body.appendChild(script);
      const button = document.createElement("button");
      button.setAttribute("onclick", "window.__warranteeInjectedHandlerExecuted=true");
      document.body.appendChild(button);
      button.click();
      const target = document.createElement("div");
      target.id = "csp-style-probe";
      target.setAttribute("style", "width:37px");
      document.body.appendChild(target);
      const style = document.createElement("style");
      style.textContent = "#csp-style-probe{display:none}";
      document.head.appendChild(style);
    });
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__warranteeInjectedScriptExecuted)).toBeUndefined();
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__warranteeInjectedHandlerExecuted)).toBeUndefined();
    await expect(page.locator("#csp-style-probe")).toHaveCSS("display", "block");
    await expect(page.locator("#csp-style-probe")).toHaveCSS("width", "37px");
  });
}

test("dynamic passport uses fresh nonces and cannot share cached HTML", async ({ page, request }) => {
  await page.route("**/api/funnel/events", (route) => route.fulfill({ status: 202, contentType: "application/json", body: '{"accepted":true}' }));
  const path = "/en/verify/00000000-0000-4000-8000-000000000000";
  const first = await request.get(path, { headers: { "x-nonce": "attacker-value", "Content-Security-Policy": "script-src * 'unsafe-inline'" } });
  const second = await request.get(path);
  const extract = (policy: string) => policy.match(/'nonce-([^']+)'/)?.[1];
  const nonce = extract(first.headers()["content-security-policy"]);
  expect(nonce).toBeTruthy();
  expect(nonce).not.toBe("attacker-value");
  expect(nonce).not.toBe(extract(second.headers()["content-security-policy"]));
  expect(first.headers()["cache-control"]).toContain("no-store");
  expect(first.headers()["content-security-policy"]).toContain(`style-src-elem 'self'`);
  expect(first.headers()["content-security-policy"].split(";").find(part => part.trim().startsWith("style-src-elem "))).toContain(`'nonce-${nonce}'`);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/verify/**", (route) => route.fulfill({ status: 404, contentType: "application/json", body: '{"error":"Not found"}' }));
  await page.goto(path);
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect(page.getByRole("switch")).toHaveCount(2);
  expect(errors).toEqual([]);
});

for (const path of ["/web-mcp.js", "/agent-bootstrap/analytics/ga.js", "/agent-bootstrap/analytics/gtm.js"]) {
  test(`${path} stays public JavaScript rather than redirecting through authentication`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/(?:application|text)\/javascript/);
  });
}
