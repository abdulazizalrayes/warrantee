import { expect, test } from "@playwright/test";
import { expectHealthyPage, watchForPageErrors } from "./helpers";

const publicRoutes = [
  "/en",
  "/en/about",
  "/en/features",
  "/en/pricing",
  "/en/contact",
  "/en/faq",
  "/en/guide",
  "/en/api-docs",
  "/en/support",
  "/en/verify",
  "/en/auth",
];

test.describe("public experience", () => {
  for (const path of publicRoutes) {
    test(`${path} loads cleanly`, async ({ page }, testInfo) => {
      const errors = watchForPageErrors(page, testInfo);

      await expectHealthyPage(page, path);
      await expect(page).toHaveTitle(/Warrantee/i);
      await expect(page.locator("body")).not.toContainText(/Something went wrong|Internal error/i);

      errors.assertClean();
    });
  }

  test("legacy marketing URLs redirect to canonical pages", async ({ page }) => {
    await page.goto("/features.html", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/features$/);

    await page.goto("/favicon.ico", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/favicon\.svg$/);
  });
});
