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

  for (const locale of ["en", "ar"]) {
    test(`${locale} pricing uses wide displays without plan overlap`, async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await expectHealthyPage(page, `/${locale}`);
      const homeGeometry = await page.evaluate(() => {
        const personal = document.querySelector<HTMLElement>('[data-testid="home-personal-plan-group"]');
        const business = document.querySelector<HTMLElement>('[data-testid="home-business-plan-group"]');
        const personalCta = personal?.querySelector<HTMLElement>("a");
        if (!personal || !business || !personalCta) return null;
        return {
          viewportWidth: document.documentElement.clientWidth,
          personal: personal.getBoundingClientRect().toJSON(),
          business: business.getBoundingClientRect().toJSON(),
          personalCta: personalCta.getBoundingClientRect().toJSON(),
        };
      });

      expect(homeGeometry).not.toBeNull();
      const home = homeGeometry!;
      const homeCombinedWidth = Math.max(home.personal.right, home.business.right)
        - Math.min(home.personal.left, home.business.left);
      expect(homeCombinedWidth / home.viewportWidth).toBeGreaterThanOrEqual(0.72);
      expect(home.personalCta.bottom).toBeLessThanOrEqual(home.personal.bottom + 1);
      expect(home.personalCta.left).toBeGreaterThanOrEqual(home.personal.left - 1);
      expect(home.personalCta.right).toBeLessThanOrEqual(home.personal.right + 1);
      expect(
        home.personal.right <= home.business.left + 1 || home.business.right <= home.personal.left + 1,
      ).toBe(true);

      await expectHealthyPage(page, `/${locale}/pricing`);
      const pricingGeometry = await page.evaluate(() => {
        const personal = document.querySelector<HTMLElement>('[data-testid="pricing-personal-plan-group"]');
        const business = document.querySelector<HTMLElement>('[data-testid="pricing-business-plan-group"]');
        if (!personal || !business) return null;
        return {
          viewportWidth: document.documentElement.clientWidth,
          personal: personal.getBoundingClientRect().toJSON(),
          business: business.getBoundingClientRect().toJSON(),
        };
      });

      expect(pricingGeometry).not.toBeNull();
      const pricing = pricingGeometry!;
      const pricingCombinedWidth = Math.max(pricing.personal.right, pricing.business.right)
        - Math.min(pricing.personal.left, pricing.business.left);
      expect(pricingCombinedWidth / pricing.viewportWidth).toBeGreaterThanOrEqual(0.72);
      expect(
        pricing.personal.right <= pricing.business.left + 1
          || pricing.business.right <= pricing.personal.left + 1,
      ).toBe(true);

      await page.setViewportSize({ width: 768, height: 1024 });
      for (const path of [`/${locale}`, `/${locale}/pricing`]) {
        await expectHealthyPage(page, path);
        const horizontalOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(horizontalOverflow, `${path} should fit the tablet breakpoint`).toBeLessThanOrEqual(1);
      }
    });
  }
});
