import { expect, test, type Page, type TestInfo } from "@playwright/test";
import sitemap from "../../src/app/sitemap";
import { expectHealthyPage, signInWithPassword, watchForPageErrors } from "./helpers";

const publicPaths = sitemap().map(({ url }) => new URL(url).pathname);
const publicWidths = [320, 390, 768, 1440, 1920] as const;
const authenticatedWidths = [390, 1440] as const;
const authenticatedRoutes = [
  "/dashboard",
  "/onboarding",
  "/warranties",
  "/warranties/new",
  "/warranties/import",
  "/warranties/bulk",
  "/warranties/transfer",
  "/extensions",
  "/documents",
  "/notifications",
  "/analytics",
  "/reports",
  "/settings",
  "/settings/notifications",
  "/settings/team",
  "/seller",
  "/seller/invite",
  "/billing",
  "/approval",
] as const;

type SemanticAudit = {
  duplicateIds: string[];
  h1Count: number;
  mainCount: number;
  unnamedControls: string[];
  unlabelledFields: string[];
};

async function settleLayout(page: Page) {
  await page.addStyleTag({
    content: "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;scroll-behavior:auto!important}",
  });
  await page.evaluate(async () => {
    await document.fonts?.ready;
    window.scrollTo(0, 0);
  });
}

async function settleResponsiveState(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function auditSemantics(page: Page): Promise<SemanticAudit> {
  return page.evaluate(() => {
    const isVisible = (element: Element) => {
      const node = element as HTMLElement;
      if (node.closest("[hidden], [inert], [aria-hidden='true']")) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && rect.width > 0
        && rect.height > 0;
    };
    const labelledByText = (element: Element) => {
      const labelledBy = element.getAttribute("aria-labelledby");
      return labelledBy
        ? labelledBy.split(/\s+/).some((id) => Boolean(document.getElementById(id)?.textContent?.trim()))
        : false;
    };
    const hasControlName = (element: Element) => {
      if (element.getAttribute("aria-label")?.trim()) return true;
      if (labelledByText(element)) return true;
      if (element.getAttribute("title")?.trim()) return true;
      if (element.textContent?.trim()) return true;
      return Boolean(element.querySelector("img[alt]:not([alt=''])"));
    };
    const describe = (element: Element) => {
      const id = element.id ? `#${element.id}` : "";
      const testId = element.getAttribute("data-testid");
      return `${element.tagName.toLowerCase()}${id}${testId ? `[data-testid=${testId}]` : ""}`;
    };

    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]"))
      .map((element) => element.id)
      .filter(Boolean);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const unnamedControls = Array.from(document.querySelectorAll("button, a[href], [role='button']"))
      .filter(isVisible)
      .filter((element) => !hasControlName(element))
      .map(describe);
    const unlabelledFields = Array.from(document.querySelectorAll("input:not([type='hidden']), select, textarea"))
      .filter(isVisible)
      .filter((element) => {
        const field = element as HTMLInputElement;
        return !field.labels?.length
          && !field.getAttribute("aria-label")?.trim()
          && !labelledByText(field)
          && !field.getAttribute("title")?.trim();
      })
      .map(describe);

    return {
      duplicateIds,
      h1Count: document.querySelectorAll("h1").length,
      mainCount: document.querySelectorAll("main").length,
      unnamedControls,
      unlabelledFields,
    };
  });
}

async function auditGeometry(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const horizontalOverflow = document.documentElement.scrollWidth - viewportWidth;
    const clippedInteractiveText: string[] = [];
    const outsideViewport: string[] = [];
    const overflowingContainers: string[] = [];

    const isRendered = (element: HTMLElement) => {
      if (element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && rect.width > 0
        && rect.height > 0;
    };

    const isVisuallyHidden = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return rect.width <= 1
        && rect.height <= 1
        && style.overflowX === "hidden"
        && style.overflowY === "hidden";
    };

    const hasHorizontalScrollContainer = (element: HTMLElement) => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.body) {
        const ancestorStyle = getComputedStyle(ancestor);
        if (
          ["auto", "scroll"].includes(ancestorStyle.overflowX)
          && ancestor.scrollWidth > ancestor.clientWidth
        ) {
          return true;
        }
        ancestor = ancestor.parentElement;
      }
      return false;
    };

    for (const element of document.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea")) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (!isRendered(element) || isVisuallyHidden(element)) continue;

      const label = element.getAttribute("aria-label")
        || element.textContent?.trim().slice(0, 60)
        || element.getAttribute("name")
        || element.tagName.toLowerCase();
      if ((rect.left < -1 || rect.right > viewportWidth + 1) && !hasHorizontalScrollContainer(element)) {
        outsideViewport.push(label);
      }
      if (
        element.textContent?.trim()
        && style.overflowX === "hidden"
        && element.scrollWidth - element.clientWidth > 1
      ) {
        clippedInteractiveText.push(label);
      }
    }

    for (const container of document.querySelectorAll<HTMLElement>("[data-testid]")) {
      if (!isRendered(container)) continue;
      const containerRect = container.getBoundingClientRect();
      let contentTop = containerRect.top;
      let contentBottom = containerRect.bottom;

      for (const descendant of container.querySelectorAll<HTMLElement>("*")) {
        if (!isRendered(descendant)) continue;
        const descendantRect = descendant.getBoundingClientRect();
        contentTop = Math.min(contentTop, descendantRect.top);
        contentBottom = Math.max(contentBottom, descendantRect.bottom);
      }

      if (contentTop < containerRect.top - 8 || contentBottom > containerRect.bottom + 8) {
        overflowingContainers.push(container.dataset.testid || container.tagName.toLowerCase());
      }
    }

    return { clippedInteractiveText, horizontalOverflow, outsideViewport, overflowingContainers };
  });
}

async function attachAudit(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2)),
    contentType: "application/json",
  });
}

test.describe("takeover-grade public release contract", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The width matrix runs once in desktop Chromium.");
  });

  for (const path of publicPaths) {
    test(`${path} satisfies the full responsive and semantic contract`, async ({ page }, testInfo) => {
      const errors = watchForPageErrors(page, testInfo);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await expectHealthyPage(page, path);
      await settleLayout(page);

      const locale = path.split("/")[1];
      await expect(page.locator("html")).toHaveAttribute("lang", new RegExp(`^${locale}`));
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");

      const semantics = await auditSemantics(page);
      await attachAudit(testInfo, "semantic-audit", semantics);
      expect(semantics.duplicateIds, `${path} should have unique IDs`).toEqual([]);
      expect(semantics.mainCount, `${path} should expose exactly one main landmark`).toBe(1);
      expect(semantics.h1Count, `${path} should expose exactly one H1`).toBe(1);
      expect(semantics.unnamedControls, `${path} should not expose unnamed controls`).toEqual([]);
      expect(semantics.unlabelledFields, `${path} should not expose unlabelled fields`).toEqual([]);

      for (const width of publicWidths) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        await settleResponsiveState(page);
        const geometry = await auditGeometry(page);
        await attachAudit(testInfo, `geometry-${width}`, geometry);
        expect(geometry.horizontalOverflow, `${path} should not overflow at ${width}px`).toBeLessThanOrEqual(1);
        expect(geometry.outsideViewport, `${path} controls should stay in the viewport at ${width}px`).toEqual([]);
        expect(geometry.clippedInteractiveText, `${path} controls should not clip text at ${width}px`).toEqual([]);
        expect(geometry.overflowingContainers, `${path} containers should contain their content at ${width}px`).toEqual([]);
      }

      await errors.assertClean();
    });
  }

  for (const locale of ["en", "ar"] as const) {
    test(`${locale} cookie customization exposes complete switch state`, async ({ page }, testInfo) => {
      const errors = watchForPageErrors(page, testInfo);
      await page.addInitScript(() => localStorage.removeItem("warrantee_cookie_consent"));
      await expectHealthyPage(page, `/${locale}`);
      await page.getByRole("button", { name: locale === "ar" ? "تخصيص" : "Customize" }).click();

      const switches = page.getByRole("switch");
      await expect(switches).toHaveCount(2);
      for (const toggle of await switches.all()) {
        await expect(toggle).toHaveAttribute("aria-checked", /^(true|false)$/);
      }
      await expect(page.getByRole("status")).toBeVisible();
      await errors.assertClean();
    });
  }
});

test.describe("takeover-grade authenticated release contract", () => {
  const hasCredentials = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The portal width matrix runs once in desktop Chromium.");
    test.skip(!hasCredentials, "Set E2E credentials to enable the portal release contract.");
    await signInWithPassword(page);
  });

  for (const locale of ["en", "ar"] as const) {
    for (const route of authenticatedRoutes) {
      const path = `/${locale}${route}`;
      test(`${path} satisfies the portal geometry and semantic contract`, async ({ page }, testInfo) => {
        const errors = watchForPageErrors(page, testInfo);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await expectHealthyPage(page, path);
        await expect(page.locator("h1")).toHaveCount(1, { timeout: 15_000 });
        await settleLayout(page);

        const semantics = await auditSemantics(page);
        await attachAudit(testInfo, "semantic-audit", semantics);
        expect(semantics.duplicateIds, `${path} should have unique IDs`).toEqual([]);
        expect(semantics.mainCount, `${path} should expose exactly one main landmark`).toBe(1);
        expect(semantics.h1Count, `${path} should expose exactly one H1`).toBe(1);
        expect(semantics.unnamedControls, `${path} should not expose unnamed controls`).toEqual([]);
        expect(semantics.unlabelledFields, `${path} should not expose unlabelled fields`).toEqual([]);

        for (const width of authenticatedWidths) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => window.scrollTo(0, 0));
          await settleResponsiveState(page);
          const geometry = await auditGeometry(page);
          await attachAudit(testInfo, `geometry-${width}`, geometry);
          expect(geometry.horizontalOverflow, `${path} should not overflow at ${width}px`).toBeLessThanOrEqual(1);
          expect(geometry.outsideViewport, `${path} controls should stay in the viewport at ${width}px`).toEqual([]);
          expect(geometry.clippedInteractiveText, `${path} controls should not clip text at ${width}px`).toEqual([]);
          expect(geometry.overflowingContainers, `${path} containers should contain their content at ${width}px`).toEqual([]);
        }

        await errors.assertClean();
      });
    }
  }
});
