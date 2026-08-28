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
  "/en/security",
  "/en/support",
  "/en/privacy",
  "/en/terms",
  "/en/cookies",
  "/en/seller/register",
  "/en/verify",
  "/en/auth",
  "/ar",
  "/ar/pricing",
  "/ar/privacy",
  "/ar/verify",
  "/ar/auth",
];

test.describe("public experience", () => {
  for (const path of publicRoutes) {
    test(`${path} loads cleanly`, async ({ page }, testInfo) => {
      const errors = watchForPageErrors(page, testInfo);

      await expectHealthyPage(page, path);
      await expect(page).toHaveTitle(/Warrantee|وارنتي/i);
      await expect(page.locator("body")).not.toContainText(/Something went wrong|Internal error/i);
      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(horizontalOverflow, `${path} should not overflow the viewport`).toBeLessThanOrEqual(1);

      await errors.assertClean();
    });
  }

  test("legacy marketing URLs redirect to canonical pages", async ({ page }) => {
    await page.goto("/features.html", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/features$/);

    await page.goto("/favicon.ico", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/favicon\.svg$/);
  });

  test("Professional access request opens the contact journey", async ({ page }) => {
    await expectHealthyPage(page, "/en/pricing");
    await page.getByRole("button", { name: "Request pilot access" }).click();
    await expect(page).toHaveURL(/\/en\/contact\?intent=professional-access$/);
  });
});
