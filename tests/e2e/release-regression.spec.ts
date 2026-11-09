import { expect, test, type Page, type Route, type TestInfo } from "@playwright/test";
import sitemap from "../../src/app/sitemap";
import { expectHealthyPage, signInWithPassword, watchForPageErrors } from "./helpers";
import { captureSafePublicFailure } from "./safe-evidence";

const publicPaths = sitemap().map(({ url }) => new URL(url).pathname);
const publicWidths = [320, 390, 768, 1024, 1280, 1440, 1920] as const;
const authenticatedWidths = publicWidths;
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

type ListingRoute = "/documents" | "/warranties";

function syntheticListing(route: ListingRoute, locale: "en" | "ar") {
  const warranties = [
    {
      id: "synthetic-geometry-warranty-1",
      product_name: "Synthetic industrial cooling equipment with extended parts and service warranty",
      product_name_ar: "معدات تبريد صناعية تجريبية مع ضمان ممتد لقطع الغيار وخدمات الصيانة",
      reference_number: "SYNTHETIC-GEOMETRY-001", seller_name: "Synthetic Industrial Equipment Supplier",
      status: "active", start_date: "2026-01-01", end_date: "2099-12-31",
    },
    {
      id: "synthetic-geometry-warranty-2",
      product_name: "Synthetic commercial water pump and preventative maintenance protection package",
      product_name_ar: "مضخة مياه تجارية تجريبية مع باقة الحماية والصيانة الوقائية للمعدات",
      reference_number: "SYNTHETIC-GEOMETRY-002", seller_name: "Synthetic Commercial Service Company",
      status: "expired", start_date: "2020-01-01", end_date: "2021-12-31",
    },
  ];
  const documentNames = locale === "ar" ? [
    "شهادة ضمان تجريبية موسعة مع المستندات الداعمة وسجل صيانة معدات التبريد الصناعية.pdf",
    "سجل فحص تجريبي لمضخة المياه التجارية مع تفاصيل قطع الغيار والصيانة الوقائية.pdf",
  ] : [
    "Synthetic extended warranty certificate with supporting industrial cooling service records.pdf",
    "Synthetic commercial water pump inspection and preventative maintenance records.pdf",
  ];
  const data = route === "/documents" ? warranties.map((warranty, index) => ({
    id: `synthetic-geometry-document-${index + 1}`, file_name: documentNames[index],
    file_type: "application/pdf", file_size: 245760, file_url: null,
    storage_path: `synthetic/geometry-${index + 1}.pdf`, version: index + 1,
    created_at: "2026-01-01T12:00:00Z", warranty_id: warranty.id,
    warranties: { product_name: warranty.product_name, product_name_ar: warranty.product_name_ar, reference_number: warranty.reference_number },
  })) : warranties;
  return {
    payload: route === "/documents" ? { data } : { data, pagination: { total: data.length, limit: 20, offset: 0 } },
    names: route === "/documents" ? documentNames : warranties.map(warranty => locale === "ar" ? warranty.product_name_ar : warranty.product_name),
  };
}

async function mockListingReads(page: Page, route: ListingRoute, response: () => { status: number; body: unknown }) {
  const endpoint = `/api${route}`;
  await page.route(url => url.pathname === endpoint || url.pathname.startsWith(`${endpoint}/`), request => {
    // These are populated-layout fixtures, not authorization or persistence proofs.
    if (request.request().method() !== "GET" || new URL(request.request().url()).pathname !== endpoint) {
      return request.abort("blockedbyclient");
    }
    const { status, body } = response();
    return request.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function settleLayout(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts?.ready;
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getComputedTiming().iterations === Infinity) animation.cancel();
      else animation.finish();
    }
    window.scrollTo(0, 0);
  });
}

async function settleResponsiveState(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    // Resizing starts sidebar transitions after the initial page stabilization.
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getComputedTiming().iterations === Infinity) animation.cancel();
      else animation.finish();
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
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

    for (const action of document.querySelectorAll<HTMLElement>('a[href^="/api/documents/"][href$="/download"]')) {
      const row = action.parentElement;
      const content = row?.querySelector<HTMLElement>("div.flex-1");
      if (content && content.scrollWidth - content.clientWidth > 1) overflowingContainers.push("document-row-content");
      if (row) {
        const bounds = row.getBoundingClientRect();
        const actionBounds = action.getBoundingClientRect();
        if (actionBounds.left < bounds.left - 1 || actionBounds.right > bounds.right + 1) overflowingContainers.push("document-row-action");
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
  test.afterEach(async ({ page }, testInfo) => {
    await captureSafePublicFailure(page, testInfo, publicPaths);
  });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The width matrix runs once in desktop Chromium.");
  });

  for (const locale of ["en", "ar"]) test(`${locale} responsive stabilization finishes the real sidebar transition without injected CSS`, async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1000 });
    await expectHealthyPage(page, `/${locale}`);
    await settleLayout(page);
    await page.evaluate(() => {
      const probe = document.createElement("aside");
      probe.id = "responsive-stability-probe";
      probe.className = "fixed left-0 w-64 transform transition-transform duration-300 -translate-x-full lg:translate-x-0";
      document.body.appendChild(probe);
      return getComputedStyle(probe).transform;
    });
    await page.setViewportSize({ width: 1024, height: 1000 });
    await settleResponsiveState(page);
    expect(await page.locator("#responsive-stability-probe").evaluate(element => element.getBoundingClientRect().left)).toBeGreaterThanOrEqual(-1);
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
        const isTeamGeometryFixture = route === "/settings/team";
        const listingRoute = route === "/documents" || route === "/warranties" ? route : null;
        const listing = listingRoute ? syntheticListing(listingRoute, locale) : null;
        if (listingRoute && listing) {
          await mockListingReads(page, listingRoute, () => ({ status: 200, body: listing.payload }));
        }
        if (isTeamGeometryFixture) {
          // Synthetic layout data only; the real login above is not team authorization proof.
          await page.route("**/api/team/members", (request) => {
            if (request.request().method() !== "GET") return request.abort("blockedbyclient");
            return request.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                canManage: true,
                allowedDomain: "example.invalid",
                members: [
                  { id: "synthetic-team-1", full_name: "Synthetic Member One", email: "member.one@example.invalid", role: "manager" },
                  { id: "synthetic-team-2", full_name: "Synthetic Member Two", email: "member.two@example.invalid", role: "viewer" },
                ],
              }),
            });
          });
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
        await expectHealthyPage(page, path);
        await expect(page.locator("h1")).toHaveCount(1, { timeout: 15_000 });
        if (isTeamGeometryFixture) {
          await expect(page.getByRole("cell", { name: /^member\.(one|two)@example\.invalid$/ })).toHaveCount(2);
        }
        if (listing) {
          for (const name of listing.names) {
            await expect(page.getByText(name, { exact: true }).filter({ visible: true })).toHaveCount(1);
          }
        }
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
          if (isTeamGeometryFixture) {
            const table = page.getByRole("table");
            await expect(table.locator("..")).toHaveCSS("overflow-x", "auto");
            await expect(table.getByRole("button", { name: locale === "ar" ? "إزالة" : "Remove", exact: true })).toHaveCount(2);
            for (const control of await table.locator("input, select, button").all()) {
              await control.scrollIntoViewIfNeeded();
              // Center away from fractional clip edges; keep full intersection required.
              await control.evaluate(element => element.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" }));
              await expect(control).toBeInViewport({ ratio: 1 });
            }
          }
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

    test(`/${locale}/documents cancels an older search and keeps the latest visible result`, async ({ page }, testInfo) => {
      const errors = watchForPageErrors(page, testInfo);
      const listing = syntheticListing("/documents", locale);
      let heldRoute: Route | undefined;
      await page.route(url => url.pathname === "/api/documents" || url.pathname.startsWith("/api/documents/"), request => {
        const url = new URL(request.request().url());
        if (request.request().method() !== "GET" || url.pathname !== "/api/documents") return request.abort("blockedbyclient");
        if (url.searchParams.get("q") === "synthetic-old-query") {
          heldRoute = request;
          return;
        }
        return request.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(url.searchParams.get("q") === "synthetic-newer-query"
            ? { data: [listing.payload.data[1]] } : listing.payload),
        });
      });
      await expectHealthyPage(page, `/${locale}/documents`);
      for (const name of listing.names) await expect(page.getByText(name, { exact: true })).toBeVisible();
      const search = page.getByRole("textbox", { name: locale === "ar" ? "ابحث عن مستند" : "Search documents", exact: true });
      await search.fill("synthetic-old-query");
      await expect.poll(() => Boolean(heldRoute), { message: "The older query must be intercepted and held" }).toBe(true);
      const pending = heldRoute;
      if (!pending) throw new Error("Older synthetic document query was not held");
      await search.fill("synthetic-newer-query");
      await expect(page.getByText(listing.names[1], { exact: true })).toBeVisible();
      await expect(page.getByText(listing.names[0], { exact: true })).toHaveCount(0);
      const isAbort = (message: string | undefined) => /net::ERR_ABORTED|NS_BINDING_ABORTED|cancelled|canceled/i.test(message || "");
      try {
        await pending.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [listing.payload.data[0]] }) });
      } catch (error) {
        // A verified browser cancellation may invalidate the intercepted route.
        await expect.poll(() => isAbort(pending.request().failure()?.errorText), { message: "Only a verified cancellation may invalidate the held route" }).toBe(true);
        if (!(error instanceof Error)
          || !/Invalid InterceptionId|Invalid interceptionId|Route is already handled|net::ERR_ABORTED|NS_BINDING_ABORTED/.test(error.message)) throw error;
      }
      await expect.poll(() => isAbort(pending.request().failure()?.errorText), { message: "The browser must cancel the superseded fetch" }).toBe(true);
      await settleResponsiveState(page);
      await expect(search).toHaveValue("synthetic-newer-query");
      await expect(page.getByText(listing.names[1], { exact: true })).toBeVisible();
      await expect(page.getByText(listing.names[0], { exact: true })).toHaveCount(0);
      await expect(page.getByText(locale === "ar" ? "تعذر تحميل المستندات الآن" : "Documents could not load right now", { exact: true })).toHaveCount(0);
      await errors.assertClean();
    });

    for (const route of ["/documents", "/warranties"] as const) {
      test(`/${locale}${route} exposes existing empty and failed-listing states with synthetic reads`, async ({ page }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", error => pageErrors.push(error.message));
        let failed = false;
        await mockListingReads(page, route, () => ({
          status: failed ? 500 : 200,
          body: failed ? { error: "Synthetic listing unavailable" }
            : route === "/documents" ? { data: [] } : { data: [], pagination: { total: 0, limit: 20, offset: 0 } },
        }));
        await page.setViewportSize({ width: 390, height: 1000 });
        await expectHealthyPage(page, `/${locale}${route}`);
        const emptyHeading = route === "/documents"
          ? locale === "ar" ? "لا توجد مستندات" : "No documents found"
          : locale === "ar" ? "لا توجد ضمانات" : "No warranties found";
        await expect(page.getByRole("heading", { name: emptyHeading, exact: true })).toBeVisible();
        failed = true;
        const [response] = await Promise.all([
          page.waitForResponse(response => new URL(response.url()).pathname === `/api${route}` && response.status() === 500),
          page.reload({ waitUntil: "domcontentloaded" }),
        ]);
        expect(response.request().method()).toBe("GET");
        const errorHeading = route === "/documents"
          ? locale === "ar" ? "تعذر تحميل المستندات الآن" : "Documents could not load right now"
          : locale === "ar" ? "تعذر تحميل الضمانات الآن" : "Warranties could not load right now";
        await expect(page.getByText(errorHeading, { exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: emptyHeading, exact: true })).toBeVisible();
        expect(pageErrors).toEqual([]);
      });
    }
  }
});
