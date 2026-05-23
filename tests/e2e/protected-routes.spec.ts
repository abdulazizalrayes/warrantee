import { test } from "@playwright/test";
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

      errors.assertClean();
    });
  }
});
