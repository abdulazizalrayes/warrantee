import { expect, test } from "@playwright/test";
import { expectProtectedRedirect, watchForPageErrors } from "./helpers";

const protectedRoutes = [
  "/en/dashboard",
  "/en/warranties",
  "/en/warranties/new",
  "/en/warranties/import",
  "/en/dashboard/claims",
  "/en/extensions",
  "/en/documents",
  "/en/notifications",
  "/en/settings/team",
  "/en/seller",
  "/en/admin",
];

test.describe("protected app routing", () => {
  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated visitors without breaking`, async ({ page }, testInfo) => {
      const errors = watchForPageErrors(page, testInfo);

      await expectProtectedRedirect(page, route);

      await errors.assertClean();
    });
  }

  test("seller invite auth redirect preserves the token", async ({ page }, testInfo) => {
    const errors = watchForPageErrors(page, testInfo);

    await page.goto("/en/seller/accept-invite?token=smoke-token", { waitUntil: "domcontentloaded" });

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe("/en/auth");
    expect(currentUrl.searchParams.has("token")).toBe(false);
    expect(currentUrl.searchParams.get("redirect")).toBe("/en/seller/accept-invite?token=smoke-token");

    await errors.assertClean();
  });
});
