import { expect, test } from "@playwright/test";
import { signInWithPassword, watchForPageErrors } from "./helpers";

const hasCredentials = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe("authenticated operating shell", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!hasCredentials, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to enable signed-in route-shell QA.");

  test.beforeEach(async ({ page }) => {
    await signInWithPassword(page);
  });

  for (const route of [
    "/en/dashboard",
    "/en/warranties",
    "/en/dashboard/claims",
    "/en/extensions",
    "/en/documents",
    "/en/notifications",
    "/en/settings/team",
    "/en/seller",
  ]) {
    test(`${route} keeps the dashboard shell`, async ({ page }, testInfo) => {
      const errors = watchForPageErrors(page, testInfo);

      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("link", { name: /^Dashboard$/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /^Warranties$/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /^Notifications$/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /^Settings$/i }).first()).toBeVisible();

      await errors.assertClean();
    });
  }
});
