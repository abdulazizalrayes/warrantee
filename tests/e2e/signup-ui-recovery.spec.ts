import { createServer, type Server } from "node:http";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Rendered UI contracts with an entirely synthetic backend. These tests prove
// neither authentication, durable persistence, OCR quality nor real activation.
const enabled = process.env.WARRANTEE_SYNTHETIC_UI_E2E === "1";
const backend = "http://127.0.0.1:54321";
const draftKey = "warrantee:creation-draft:v1";
const userId = "11111111-1111-4111-8111-111111111111";
const savedId = "22222222-2222-4222-8222-222222222222";
const widths = [320, 390, 768, 1024, 1280, 1440, 1920];
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "synthetic@example.invalid", app_metadata: {}, user_metadata: { full_name: "Synthetic UI User" }, created_at: "2026-01-01T00:00:00Z" };
const profile = { ...user, full_name: "Synthetic UI User", account_type: "consumer", role: "user", onboarding_completed: true, preferred_language: "en" };
let server: Server;
const pageErrors = new WeakMap<Page, string[]>();

test.describe("synthetic mocked signup UI recovery (NOT auth or persistence proof)", () => {
  test.describe.configure({ mode: "default" });
  test.skip(!enabled, "Requires dedicated loopback synthetic app; never run against production or real DB runner.");

  test.beforeAll(async () => {
    const app = new URL(process.env.E2E_BASE_URL || "");
    if (app.hostname !== "127.0.0.1" || !["3100", "3111"].includes(app.port)
      || app.protocol !== "http:" || process.env.NEXT_PUBLIC_SUPABASE_URL !== backend
      || process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Synthetic UI requires explicit isolated loopback app/backend");
    server = createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", app.origin);
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Content-Type", "application/json");
      if (req.method === "OPTIONS") { res.end(); return; }
      const path = new URL(req.url!, backend).pathname;
      if (req.method !== "GET") { res.writeHead(405); res.end('{"error":"Synthetic backend forbids writes"}'); return; }
      if (path === "/auth/v1/user") res.end(JSON.stringify(user));
      else if (path === "/rest/v1/profiles") res.end(JSON.stringify(profile));
      else if (path.startsWith("/rest/v1/")) res.end("[]");
      else { res.writeHead(404); res.end("{}"); }
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(54321, "127.0.0.1", resolve);
    });
  });

  test.afterAll(async () => {
    if (server?.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  test.beforeEach(async ({ context, page }) => {
    const errors: string[] = [];
    pageErrors.set(page, errors);
    page.on("pageerror", error => errors.push(error.message));
    await context.addInitScript(() => {
      localStorage.setItem("warrantee_cookie_consent", JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    });
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: expires, role: "authenticated" })).toString("base64url")}.synthetic`;
    const session = { access_token: token, refresh_token: "synthetic-not-a-real-token", token_type: "bearer", expires_in: 3600, expires_at: expires, user };
    await context.addCookies([{ name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: process.env.E2E_BASE_URL!, sameSite: "Lax" }]);
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (![new URL(process.env.E2E_BASE_URL!).origin, backend].includes(url.origin)) return route.abort("blockedbyclient");
      if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: '{"data":[],"notifications":[],"unreadCount":0}' });
      return route.continue();
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test.afterEach(async ({ page }) => {
    expect(pageErrors.get(page), "No uncaught browser errors during synthetic recovery").toEqual([]);
  });

  for (const locale of ["en", "ar"] as const) {
    const next = locale === "en" ? "Next" : "التالي";
    const createSuccess = locale === "en" ? "Warranty Created Successfully!" : "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646 \u0628\u0646\u062c\u0627\u062d!";

    test(`${locale}: rejected network save unlocks identical idempotent retry and suppresses duplicate clicks`, async ({ page }, info) => {
      const attempts: { body: string | null; key: string | undefined }[] = [];
      let release: (() => Promise<void>) | undefined;
      await page.route("**/api/warranties", async route => {
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] });
        if (attempts.length === 1) return route.abort("failed");
        release = () => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { id: savedId } }) });
      });
      await openCreation(page, locale);
      await completeFields(page, next);
      await page.locator("#warranty-create").click();
      await expect(page.getByRole("alert").filter({ hasText: locale === "en" ? "Could not confirm the request" : "تعذر تأكيد الطلب" })).toBeVisible();
      await expect(page.locator("#warranty-create")).toBeEnabled();
      await geometryMatrix(page, info, "network-error-retry");
      await page.locator("#warranty-create").click();
      await expect.poll(() => Boolean(release)).toBe(true);
      await expect(page.locator("#warranty-create")).toBeDisabled();
      await page.locator("#warranty-create").evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
      expect(attempts).toHaveLength(2);
      expect(attempts[0].key).toMatch(/^[a-f0-9-]{36}$/i);
      expect(attempts[1]).toEqual(attempts[0]);
      await release!();
      await expect(page.getByRole("heading", { name: createSuccess, exact: true })).toBeVisible();
      expect(attempts).toHaveLength(2);
    });

    test(`${locale}: profile failure is explicit and retry recovers onboarding`, async ({ page }, info) => {
      let failed = true;
      let reads = 0;
      await page.route("**/rest/v1/profiles?*", route => {
        reads++;
        return route.fulfill({ status: failed ? 503 : 200, contentType: "application/json", body: JSON.stringify(failed ? { message: "Synthetic unavailable" } : profile) });
      });
      await page.goto(`/${locale}/onboarding`);
      const profileAlert = page.getByRole("alert").filter({ hasText: locale === "en" ? "We could not load your profile." : "تعذّر تحميل ملف حسابك." });
      await expect(profileAlert).toBeVisible({ timeout: 15_000 });
      await geometryMatrix(page, info, "profile-error");
      const before = reads;
      failed = false;
      await page.getByRole("button", { name: locale === "en" ? "Retry" : "إعادة المحاولة", exact: true }).click();
      await expect(page.getByRole("group", { name: locale === "en" ? "Starting point" : "نقطة البداية" })).toBeVisible();
      expect(reads).toBeGreaterThan(before);
      await expect(profileAlert).toHaveCount(0);
      await geometryMatrix(page, info, "profile-recovered-onboarding");
    });

    test(`${locale}: explicit tab draft consent excludes private fields and resumes core fields`, async ({ page }, info) => {
      let creates = 0;
      await page.route("**/api/warranties", route => { creates++; return route.abort("blockedbyclient"); });
      await openCreation(page, locale);
      await page.locator("#warranty-product-name").fill("Synthetic retained product");
      await page.locator("#warranty-serial-number").fill("PRIVATE-SYNTHETIC-SERIAL");
      await page.locator("#warranty-sku").fill("PRIVATE-SYNTHETIC-SKU");
      const draft = () => page.evaluate(key => sessionStorage.getItem(key), draftKey);
      expect(await draft()).toBeNull();
      await expect(page.getByRole("button", { name: "Save as Draft", exact: true })).toHaveCount(0);
      await page.locator("#warranty-save-progress").click();
      await page.getByRole("button", { name: next, exact: true }).click();
      for (const id of ["seller-name", "seller-email", "po-reference", "invoice-reference", "terms", "custom-clauses"]) {
        await page.locator(`#warranty-${id}`).fill(id === "seller-email" ? "private-synthetic@example.invalid" : `PRIVATE-SYNTHETIC-${id}`);
      }
      await page.locator("#warranty-end-date").fill("2028-11-10");
      await geometryMatrix(page, info, "draft-enabled-terms");
      await page.getByRole("button", { name: next, exact: true }).click();
      await page.locator("#warranty-documents").setInputFiles({ name: "PRIVATE-SYNTHETIC.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 synthetic") });
      await expect.poll(async () => JSON.parse((await draft())!).pendingAttachments).toBe(true);
      const stored = JSON.parse((await draft())!);
      expect(Object.keys(stored).sort()).toEqual(["accountId", "expiresAt", "step", "productName", "productNameAr", "category", "quantity", "startDate", "endDate", "savedWarrantyId", "pendingCreation", "pendingAttachments"].sort());
      expect(JSON.stringify(stored)).not.toMatch(/PRIVATE-SYNTHETIC|private-synthetic|base64|data:/);
      expect(stored.expiresAt - Date.now()).toBeGreaterThan(0);
      expect(stored.expiresAt - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
      await page.reload();
      expect(await page.locator("#warranty-documents").evaluate((input: HTMLInputElement) => input.files?.length)).toBe(0);
      await geometryMatrix(page, info, "draft-resumed-documents");
      await page.getByRole("button", { name: locale === "en" ? "Back" : "\u0639\u0648\u062f\u0629", exact: true }).click();
      await expect(page.locator("#warranty-seller-email")).toHaveValue("");
      await expect(page.locator("#warranty-terms")).toHaveValue("");
      await page.getByRole("button", { name: locale === "en" ? "Back" : "\u0639\u0648\u062f\u0629", exact: true }).click();
      await expect(page.locator("#warranty-product-name")).toHaveValue("Synthetic retained product");
      await expect(page.locator("#warranty-serial-number")).toHaveValue("");
      await page.locator("#warranty-discard-draft").click();
      expect(await draft()).toBeNull();
      expect(creates).toBe(0);
    });

    test(`${locale}: Smart Scan posts original data URI without CDN scripts`, async ({ page }, info) => {
      const requests: { method: string; body: unknown }[] = [];
      const cdn: string[] = [];
      page.on("request", request => { if (/cdn\.|unpkg|jsdelivr|tesseract|pdf\.worker/i.test(request.url())) cdn.push(request.url()); });
      await page.route("**/api/ocr", route => {
        requests.push({ method: route.request().method(), body: route.request().postDataJSON() });
        return route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true,"fields":{"product_name":"Synthetic scanned product","confidence":0.7}}' });
      });
      await openCreation(page, locale);
      const bytes = Buffer.from("%PDF-1.4 synthetic OCR fixture");
      await page.locator("#warranty-smart-scan").setInputFiles({ name: "synthetic-scan.pdf", mimeType: "application/pdf", buffer: bytes });
      await expect(page.locator("#warranty-product-name")).toHaveValue("Synthetic scanned product");
      expect(requests).toEqual([{ method: "POST", body: { image: `data:application/pdf;base64,${bytes.toString("base64")}` } }]);
      expect(cdn).toEqual([]);
      await geometryMatrix(page, info, "scan-review");
    });

    test(`${locale}: saved ID attachment retry does not create another warranty`, async ({ page }, info) => {
      let creates = 0;
      let attachmentReads = 0;
      let failAttachment = true;
      await page.route("**/api/warranties", route => {
        creates++;
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { id: savedId } }) });
      });
      const bytes = Buffer.from("%PDF-1.4 synthetic saved-ID attachment");
      const { createHash } = await import("node:crypto");
      await page.route(`**/api/warranties/${savedId}/documents`, route => {
        attachmentReads++;
        expect(route.request().method()).toBe("GET");
        return route.fulfill({ status: failAttachment ? 503 : 200, contentType: "application/json", body: JSON.stringify(failAttachment ? { error: "Synthetic unavailable" } : [{ file_hash: createHash("sha256").update(bytes).digest("hex"), file_size: bytes.length }]) });
      });
      await openCreation(page, locale);
      await completeFields(page, next);
      await page.locator("#warranty-documents").setInputFiles({ name: "synthetic-saved-id.pdf", mimeType: "application/pdf", buffer: bytes });
      await page.locator("#warranty-create").click();
      await expect(page.locator("#warranty-create")).toHaveText(locale === "en" ? "Retry attachments only" : "إعادة محاولة المرفقات فقط");
      await expect(page.locator(`a[href='/${locale}/warranties/${savedId}']`)).toBeVisible();
      expect(creates).toBe(1);
      await geometryMatrix(page, info, "saved-id-attachment-retry");
      failAttachment = false;
      await page.locator("#warranty-create").click();
      await expect(page.getByRole("heading", { name: createSuccess, exact: true })).toBeVisible();
      expect(attachmentReads).toBe(2);
      expect(creates).toBe(1);
    });

    test(`${locale}: every creation stage and button at all seven widths (synthetic geometry)`, async ({ page }, info) => {
      await page.route("**/api/warranties", route => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { id: savedId } }) }));
      await openCreation(page, locale);
      await page.locator("#warranty-product-name").fill("Synthetic extended commercial equipment warranty and preventative maintenance protection package");
      await page.locator("#warranty-product-name-ar").fill("\u0636\u0645\u0627\u0646 \u062a\u062c\u0631\u064a\u0628\u064a \u0645\u0648\u0633\u0639 \u0644\u0644\u0645\u0639\u062f\u0627\u062a \u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629");
      await geometryMatrix(page, info, "product");
      await page.getByRole("button", { name: next, exact: true }).click();
      await page.locator("#warranty-end-date").fill("2028-11-10");
      await geometryMatrix(page, info, "terms");
      await page.getByRole("button", { name: next, exact: true }).click();
      await page.locator("#warranty-documents").setInputFiles({ name: "Synthetic extended commercial equipment warranty supporting maintenance documentation.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 synthetic") });
      await geometryMatrix(page, info, "documents-populated");
      // Remove fixture file: attachment persistence is owned by the real DB suite.
      await page.locator("button[data-file-index='0']").click();
      await page.locator("#warranty-create").click();
      await expect(page.getByRole("heading", { name: createSuccess, exact: true })).toBeVisible();
      await geometryMatrix(page, info, "success");
    });
  }
});

async function openCreation(page: Page, locale: string) {
  await page.goto(`/${locale}/warranties/new`);
  await expect(page.locator("#warranty-product-name")).toBeVisible();
}

async function completeFields(page: Page, next: string) {
  await page.locator("#warranty-product-name").fill("Synthetic recovery warranty");
  await page.getByRole("button", { name: next, exact: true }).click();
  await page.locator("#warranty-start-date").fill("2026-11-10");
  await page.locator("#warranty-end-date").fill("2028-11-10");
  await page.getByRole("button", { name: next, exact: true }).click();
}

async function geometryMatrix(page: Page, info: TestInfo, stage: string) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      for (const animation of document.getAnimations()) {
        if (animation.effect?.getComputedTiming().iterations === Infinity) animation.cancel(); else animation.finish();
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      // Form actions scroll the dashboard's nested content pane independently.
      for (const element of document.querySelectorAll<HTMLElement>("main *")) {
        if (element.scrollHeight > element.clientHeight) element.scrollTo({ top: 0, behavior: "instant" });
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    const audit = await page.locator("main").evaluate(main => {
      const failures: string[] = [];
      const controls = [...main.querySelectorAll<HTMLElement>("button, a[href], [role=button], input, textarea, select")].filter(element => {
        if (element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
      });
      const boxes = controls.map(element => ({ element, rect: element.getBoundingClientRect() }));
      for (const { element, rect } of boxes) {
        const label = element.id || element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 70) || element.tagName;
        if (rect.left < -1 || rect.right > innerWidth + 1) failures.push(`${label}: outside viewport`);
        if (element.scrollWidth > element.clientWidth + 1 && !element.matches("input, textarea, select")) failures.push(`${label}: content overflow`);
        const parent = element.parentElement!.getBoundingClientRect();
        if (rect.left < parent.left - 1 || rect.right > parent.right + 1) failures.push(`${label}: outside parent`);
        if (element.matches("button, a[href], [role=button]")) {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent?.trim()) continue;
            const range = document.createRange(); range.selectNodeContents(walker.currentNode);
            for (const text of range.getClientRects()) {
              if (text.left < rect.left - 1 || text.right > rect.right + 1 || text.top < rect.top - 1 || text.bottom > rect.bottom + 1) failures.push(`${label}: text outside control`);
            }
          }
        }
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
        if (Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left) > 1
          && Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top) > 1) failures.push(`overlapping controls: ${a.element.id || a.element.textContent} / ${b.element.id || b.element.textContent}`);
      }
      return { controls: controls.length, failures, horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect.soft(audit.controls, `${stage} ${width} rendered controls`).toBeGreaterThan(0);
    expect.soft(audit.failures, `${stage} ${width} geometry`).toEqual([]);
    expect.soft(audit.horizontalOverflow, `${stage} ${width} page overflow`).toBeLessThanOrEqual(1);
    if (!process.env.CI && process.env.WARRANTEE_SYNTHETIC_SCREENSHOTS === "1") {
      await page.screenshot({ path: info.outputPath(`synthetic-${stage}-${width}.png`), fullPage: true });
    }
  }
}
