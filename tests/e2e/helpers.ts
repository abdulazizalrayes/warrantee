import { expect, type Page, type TestInfo } from "@playwright/test";

export function watchForPageErrors(page: Page, testInfo: TestInfo) {
  const errors: string[] = [];
  const boundaries = new Set<string>();

  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 500 || (status >= 400 && !/\/favicon\./i.test(url))) {
      errors.push(`http.${status}: ${response.request().method()} ${url}`);
      boundaries.add(status >= 500 ? 'server_http' : 'client_http');
    }
  });

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
    boundaries.add('page_error');
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/ResizeObserver loop/i.test(text)) return;
    boundaries.add(/Content Security Policy|violates.*directive|Refused to execute/i.test(text) ? 'csp' : 'console_error');
    const location = message.location();
    const source = location.url ? ` at ${location.url}:${location.lineNumber}:${location.columnNumber}` : "";
    errors.push(`console.error: ${text}${source}`);
  });

  return {
    async assertClean() {
      if (process.env.E2E_SUITE === 'isolated-regression' && errors.length) {
        throw new Error(`isolated_browser_boundaries:${[...boundaries].sort().join(',')}`);
      }
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
  await expect(page.getByRole("heading", { name: /Access your warranty workspace/i })).toBeVisible();
}

export async function signInWithPassword(page: Page) {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing E2E_USER_EMAIL or E2E_USER_PASSWORD.");
  }

  async function dismissCookiePreferences() {
    await page.getByRole("button", { name: /reject all/i }).click({ timeout: 3_000 }).catch(() => {});
  }

  await page.goto("/en/auth", { waitUntil: "domcontentloaded" });
  await dismissCookiePreferences();
  await page.getByRole("button", { name: /password instead/i }).click();
  await dismissCookiePreferences();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/\/en\/dashboard/, { timeout: 20_000 });
}

export async function openDashboardNavigationOnMobile(page: Page) {
  if ((page.viewportSize()?.width ?? 1024) >= 1024) return;

  const toggle = page.locator('button[aria-controls="dashboard-navigation"]');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#dashboard-navigation")).not.toHaveAttribute("inert", "");
}
