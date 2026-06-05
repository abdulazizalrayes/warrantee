import { expect, type Page, type TestInfo } from "@playwright/test";

export function watchForPageErrors(page: Page, testInfo: TestInfo) {
  const errors: string[] = [];

  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 500 || (status >= 400 && !/\/favicon\./i.test(url))) {
      errors.push(`http.${status}: ${response.request().method()} ${url}`);
    }
  });

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/favicon|ResizeObserver loop|hydration|Failed to load resource: the server responded with a status of 404/i.test(text)) return;
    const location = message.location();
    const source = location.url ? ` at ${location.url}:${location.lineNumber}:${location.columnNumber}` : "";
    errors.push(`console.error: ${text}${source}`);
  });

  return {
    async assertClean() {
      await testInfo.attach("browser-errors", {
        body: Buffer.from(errors.join("\n") || "No browser errors captured."),
        contentType: "text/plain",
      });
      expect(errors, "No page errors or unexpected console errors").toEqual([]);
    },
  };
}

export async function expectHealthyPage(page: Page, path: string, heading?: RegExp | string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${path} should not fail`).toBeLessThan(400);
  await expect(page.locator("body")).toBeAttached();

  const main = page.locator("main").first();
  if ((await main.count()) > 0) {
    await expect(main).toBeVisible();
  }

  if (heading) {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
}

export async function expectProtectedRedirect(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${path} should resolve after auth redirect`).toBeLessThan(400);
  await expect(page).toHaveURL(/\/en\/auth/);
  await expect(page.getByRole("heading", { name: /Warrantee/i })).toBeVisible();
}

export async function signInWithPassword(page: Page) {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing E2E_USER_EMAIL or E2E_USER_PASSWORD.");
  }

  await page.goto("/en/auth", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /reject all/i }).click({ timeout: 3_000 }).catch(() => {});
  await page.getByRole("button", { name: /password instead/i }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/\/en\/dashboard/, { timeout: 20_000 });
}
