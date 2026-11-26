import { createServer, type Server } from 'node:http';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

// Synthetic rendered UI only: no real authentication, approval or persistence.
// approval_action is not a server-funnel event. Analytics call ordering is
// covered by approval-path.test.ts; this no-consent fixture must send none.
const enabled = process.env.WARRANTEE_SYNTHETIC_UI_E2E === '1';
const backend = 'http://127.0.0.1:54321';
const userId = '11111111-1111-4111-8111-111111111111';
const warrantyId = '22222222-2222-4222-8222-222222222222';
const companyId = '33333333-3333-4333-8333-333333333333';
const otherCompany = '44444444-4444-4444-8444-444444444444';
const widths = [320, 390, 768, 1024, 1280, 1440, 1920];
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'synthetic@example.invalid',
  app_metadata: {}, user_metadata: { full_name: 'Synthetic UI User' }, created_at: '2026-01-01T00:00:00Z' };
const profile = { ...user, full_name: 'Synthetic UI User', account_type: 'business', role: 'user',
  onboarding_completed: true, preferred_language: 'en' };
const pending = { id: warrantyId, reference_number: 'SYNTHETIC-APPROVAL-001',
  product_name: 'Synthetic commercial equipment warranty',
  product_name_ar: '\u0636\u0645\u0627\u0646 \u062a\u062c\u0631\u064a\u0628\u064a \u0644\u0644\u0645\u0639\u062f\u0627\u062a \u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629',
  status: 'pending_approval', issuer_company_id: companyId, issuer_user_id: 'synthetic-teammate',
  created_by: 'synthetic-teammate', seller_name: 'Synthetic Supplier', created_at: '2026-11-26T00:00:00Z' };
type Membership = { id: string; company_id: string; user_id: string; is_active: boolean; role: string };
const membership = (extra: Partial<Membership> = {}): Membership => ({
  id: 'synthetic-membership', company_id: companyId, user_id: userId, is_active: true, role: 'approver', ...extra,
});
let server: Server;
let memberships: Membership[];
let backendWrites = 0;
let status = 'pending_approval';
let approvedAt: string | null = null;
let author = 'synthetic-teammate';
let available = true;
type Event = { event: string; metadata: { action?: string } };
const events = new WeakMap<Page, Event[]>();
const errors = new WeakMap<Page, string[]>();
const attempts = new WeakMap<Page, string[]>();
const forbiddenWrites = new WeakMap<Page, string[]>();

test.describe('synthetic approval UI recovery (NOT auth or persistence proof)', () => {
  test.skip(!enabled, 'Requires explicit credential-free loopback snapshot and mocked backend.');
  test.beforeAll(async () => {
    const app = new URL(process.env.E2E_BASE_URL || '');
    if (app.origin !== 'http://127.0.0.1:3100' || process.env.NEXT_PUBLIC_SUPABASE_URL !== backend
      || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VERCEL || process.env.VERCEL_ENV) {
      throw new Error('Approval UI requires isolated loopback app/backend and no service credentials');
    }
    server = createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', app.origin);
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'OPTIONS') { res.end(); return; }
      if (req.method !== 'GET') { backendWrites++; res.writeHead(405); res.end('{}'); return; }
      const url = new URL(req.url!, backend);
      if (url.pathname === '/auth/v1/user') { res.end(JSON.stringify(user)); return; }
      if (url.pathname === '/rest/v1/profiles') { res.end(JSON.stringify(profile)); return; }
      let rows: Record<string, unknown>[] = [];
      if (url.pathname === '/rest/v1/company_members') {
        rows = memberships.filter(member => {
          for (const key of ['company_id', 'user_id', 'is_active', 'role'] as const) {
            const filter = url.searchParams.get(key);
            if (filter?.startsWith('eq.') && String(member[key]) !== filter.slice(3)) return false;
            if (filter?.startsWith('in.(') && !filter.slice(4, -1).split(',').includes(String(member[key]))) return false;
          }
          return true;
        });
      } else if (url.pathname === '/rest/v1/warranties') {
        const scope = url.searchParams.get('or');
        if (available && (!scope || scope.includes(`issuer_company_id.in.(${companyId})`) || author === userId)) {
          rows = [{ ...pending, status, approved_at: approvedAt, created_by: author, issuer_user_id: author }];
          const selection = url.searchParams.get('select');
          if (selection && selection !== '*') rows = rows.map(row => Object.fromEntries(
            selection.split(',').map(field => [field.trim(), row[field.trim()]]),
          ));
        }
      }
      const single = req.headers.accept?.includes('application/vnd.pgrst.object+json');
      res.end(JSON.stringify(single ? rows[0] || null : rows));
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(54321, '127.0.0.1', resolve);
    });
  });
  test.afterAll(async () => {
    if (server?.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  test.beforeEach(async ({ context, page }) => {
    memberships = [membership()]; status = 'pending_approval'; author = 'synthetic-teammate'; available = true; backendWrites = 0;
    approvedAt = null;
    events.set(page, []); errors.set(page, []); attempts.set(page, []); forbiddenWrites.set(page, []);
    page.on('pageerror', error => errors.get(page)!.push(error.message));
    await context.addInitScript(() => localStorage.setItem('warrantee_cookie_consent',
      JSON.stringify({ necessary: true, analytics: false, marketing: false })));
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId, exp: expires, role: 'authenticated' })).toString('base64url')}.synthetic`;
    const session = { access_token: token, refresh_token: 'synthetic-not-a-real-token', token_type: 'bearer',
      expires_in: 3600, expires_at: expires, user };
    await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
      url: process.env.E2E_BASE_URL!, sameSite: 'Lax' }]);
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (![process.env.E2E_BASE_URL, backend].includes(url.origin)) return route.abort('blockedbyclient');
      if (url.origin === process.env.E2E_BASE_URL && url.pathname === '/api/funnel/events' && request.method() === 'POST') {
        events.get(page)!.push(request.postDataJSON());
        return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        forbiddenWrites.get(page)!.push(`${request.method()} ${url.pathname}`);
        return route.abort('blockedbyclient');
      }
      if (url.origin === process.env.E2E_BASE_URL && url.pathname.startsWith('/api/')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[],"notifications":[],"unreadCount":0}' });
      }
      return route.continue();
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });
  test.afterEach(async ({ page }) => {
    expect(errors.get(page), 'No uncaught UI errors').toEqual([]);
    expect(forbiddenWrites.get(page), 'All action attempts remain mocked; no private writes reach app/backend').toEqual([]);
    expect(backendWrites).toBe(0);
  });

  test('ordinary company approver: EN/AR queue/detail controls and error geometry at all seven widths', async ({ page }, info) => {
    for (const locale of ['en', 'ar'] as const) {
      for (const view of ['queue', 'detail'] as const) {
        await page.goto(`/${locale}/approval${view === 'detail' ? `/${warrantyId}` : ''}?view=seller`);
        const approve = page.getByRole('button', { name: approveLabel(locale, view), exact: true });
        await expect(approve).toBeEnabled();
        if (view === 'detail') {
          await expect(page.locator(`a[href="/api/warranties/${warrantyId}/certificate"]`)).toHaveCount(0);
          await expect(page.getByRole('button', { name: locale === 'en' ? 'Reject with reason' : '\u0631\u0641\u0636 \u0645\u0639 \u0630\u0643\u0631 \u0627\u0644\u0633\u0628\u0628', exact: true })).toBeDisabled();
        } else {
          await expect(page.getByText(locale === 'ar' ? pending.product_name_ar : pending.product_name, { exact: true })).toBeVisible();
        }
        await geometryMatrix(page, info, `${locale}-${view}-ready`);
        await mockAction(page, 'approve', 403);
        const before = successEvents(page).length;
        await approve.click();
        await expect(actionAlert(page)).toHaveText(errorLabel(locale));
        await expect(approve).toBeEnabled();
        expect(successEvents(page)).toHaveLength(before);
        await geometryMatrix(page, info, `${locale}-${view}-error`);
        await page.unroute(`**/api/warranties/${warrantyId}/approve`);
      }
    }
  });

  for (const locale of ['en', 'ar'] as const) {
    for (const scenario of [
      { state: 'pending_approval', proof: null, eligible: false },
      { state: 'draft', proof: null, eligible: false },
      { state: 'rejected', proof: null, eligible: false },
      { state: 'cancelled', proof: null, eligible: false },
      { state: 'cancelled', proof: 'not-a-date', eligible: false },
      { state: 'active', proof: null, eligible: true },
      { state: 'claimed', proof: null, eligible: true },
      { state: 'expired', proof: null, eligible: true },
      { state: 'renewed', proof: null, eligible: true },
      { state: 'cancelled', proof: '2026-11-26T00:00:00Z', eligible: true },
    ]) {
      test(`${locale}: ${scenario.state} certificate link eligibility with ${scenario.proof || 'no approval'} is ${scenario.eligible}`, async ({ page }) => {
        status = scenario.state; approvedAt = scenario.proof;
        const certificateRequests: string[] = [];
        page.on('request', request => {
          if (new URL(request.url()).pathname === `/api/warranties/${warrantyId}/certificate`) certificateRequests.push(request.method());
        });
        await page.goto(`/${locale}/approval/${warrantyId}?view=seller`);
        await expect(page.getByRole('heading', { name: locale === 'en' ? 'Approval Detail' : '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629', exact: true })).toBeVisible();
        const link = page.locator(`a[href="/api/warranties/${warrantyId}/certificate"]`);
        const label = page.getByText(locale === 'en' ? 'Certificate Preview' : '\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0634\u0647\u0627\u062f\u0629', { exact: true });
        if (scenario.eligible) {
          await expect(link).toBeVisible();
          await expect(link).toHaveAttribute('target', '_blank');
          await expect(label).toBeVisible();
        } else {
          await expect(link).toHaveCount(0);
          await expect(label).toHaveCount(0);
        }
        expect(certificateRequests, 'No certificate is opened or generated by this visibility-only test').toEqual([]);
        expect(attempts.get(page)).toEqual([]);
        expect(successEvents(page)).toEqual([]);
      });
    }
  }

  for (const view of ['queue', 'detail'] as const) {
    for (const failure of [403, 409, 422, 500, 'network'] as const) {
      test(`${view}: ${failure} restores controls without success telemetry; retry succeeds only in the fixture`, async ({ page }) => {
        await mockAction(page, 'approve', failure);
        await page.goto(`/en/approval${view === 'detail' ? `/${warrantyId}` : ''}?view=seller`);
        const approve = page.getByRole('button', { name: approveLabel('en', view), exact: true });
        await expect(approve).toBeEnabled();
        await approve.click();
        await expect(actionAlert(page)).toHaveText(errorLabel('en'));
        await expect(approve).toBeEnabled();
        expect(successEvents(page)).toEqual([]);
        await mockAction(page, 'approve', 200);
        const acknowledgement = actionResponse(page, 'approve');
        await approve.click();
        expect(await (await acknowledgement).json()).toEqual({ success: true, status: 'active' });
        await expect(approve).toHaveCount(0);
        await expect(actionAlert(page)).toHaveCount(0);
        expect(successEvents(page)).toEqual([]);
        expect(attempts.get(page)).toHaveLength(2);
      });
    }

    test(`${view}: company approver can submit their own draft`, async ({ page }) => {
      status = 'draft'; author = userId;
      await mockAction(page, 'submit', 200);
      await page.goto(`/en/approval${view === 'detail' ? `/${warrantyId}` : ''}?view=seller`);
      if (view === 'queue') await page.getByRole('button', { name: 'Draft', exact: true }).click();
      const acknowledgement = actionResponse(page, 'submit');
      await page.getByRole('button', { name: 'Submit for approval', exact: true }).click();
      expect(await (await acknowledgement).json()).toEqual({ success: true, status: 'pending_approval' });
      await expect(page.getByRole('button', { name: 'Submit for approval', exact: true })).toHaveCount(0);
      expect(successEvents(page)).toEqual([]);
      expect(attempts.get(page)).toEqual(['submit']);
    });

    for (const change of ['active', 'removed', 'revoked'] as const) {
      test(`${view}: stale 409 refreshes ${change} state instead of repeating the obsolete action`, async ({ page }) => {
        await mockAction(page, 'approve', 409, () => {
          if (change === 'active') status = 'active';
          else if (change === 'removed') available = false;
          else memberships = [];
        });
        await page.goto(`/en/approval${view === 'detail' ? `/${warrantyId}` : ''}?view=seller`);
        const approve = page.getByRole('button', { name: approveLabel('en', view), exact: true });
        await approve.click();
        await expect(actionAlert(page)).toHaveText(errorLabel('en'));
        await expect(approve).toHaveCount(0);
        expect(successEvents(page)).toEqual([]);
        expect(attempts.get(page)).toEqual(['approve']);
      });
    }
  }

  for (const role of ['approver', 'company_admin', 'platform_admin']) {
    test(`ordinary profile with ${role} membership retains both controls`, async ({ page }) => {
      memberships = [membership({ role })];
      for (const view of ['queue', 'detail'] as const) {
        await page.goto(`/en/approval${view === 'detail' ? `/${warrantyId}` : ''}`);
        await expect(page.getByRole('button', { name: approveLabel('en', view), exact: true })).toBeEnabled();
      }
    });
  }
  for (const denied of ['viewer', 'revoked', 'unrelated'] as const) {
    test(`${denied}: cannot approve this issuer company`, async ({ page }) => {
      memberships = [membership(denied === 'viewer' ? { role: 'viewer' }
        : denied === 'revoked' ? { is_active: false } : { company_id: otherCompany })];
      for (const view of ['queue', 'detail'] as const) {
        await page.goto(`/en/approval${view === 'detail' ? `/${warrantyId}` : ''}`);
        if (denied !== 'unrelated') await expect(page).toHaveURL('/en/dashboard');
        else if (view === 'detail') await expect(page.getByRole('heading', { name: 'Approval Detail', exact: true })).toBeVisible();
        else await expect(page.getByText('No approval items found.', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: approveLabel('en', view), exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Reject with reason', exact: true })).toHaveCount(0);
      }
      expect(attempts.get(page)).toEqual([]);
      expect(successEvents(page)).toEqual([]);
    });
  }
});

function approveLabel(locale: 'en' | 'ar', view: 'queue' | 'detail') {
  return locale === 'en' ? view === 'queue' ? 'Approve' : 'Approve warranty'
    : view === 'queue' ? '\u0645\u0648\u0627\u0641\u0642\u0629' : '\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646';
}
function errorLabel(locale: 'en' | 'ar') {
  return locale === 'en' ? 'Could not complete the action. Please retry.'
    : '\u062a\u0639\u0630\u0631 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0625\u062c\u0631\u0627\u0621. \u064a\u0631\u062c\u0649 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629.';
}
function successEvents(page: Page) { return events.get(page)!.filter(event => event.event === 'approval_action'); }
function actionAlert(page: Page) { return page.locator('main [role="alert"]:not(#__next-route-announcer__)'); }
function actionResponse(page: Page, action: string) {
  return page.waitForResponse(response => new URL(response.url()).pathname === `/api/warranties/${warrantyId}/${action}`
    && response.request().method() === 'POST' && response.status() === 200);
}
async function mockAction(page: Page, action: string, outcome: number | 'network', change?: () => void) {
  const pattern = `**/api/warranties/${warrantyId}/${action}`;
  await page.unroute(pattern);
  await page.route(pattern, route => {
    expect(route.request().method()).toBe('POST');
    attempts.get(page)!.push(action);
    change?.();
    if (outcome === 'network') return route.abort('failed');
    if (outcome === 200) status = action === 'submit' ? 'pending_approval' : 'active'; // Ephemeral fixture state only.
    return route.fulfill({ status: outcome, contentType: 'application/json',
      body: JSON.stringify(outcome === 200 ? { success: true, status } : { error: 'Synthetic private failure: never display' }) });
  });
}

async function geometryMatrix(page: Page, info: TestInfo, stage: string) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const animation of document.getAnimations()) {
        if (animation.effect?.getComputedTiming().iterations === Infinity) animation.cancel(); else animation.finish();
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      for (const element of document.querySelectorAll<HTMLElement>('main *')) {
        if (element.scrollHeight > element.clientHeight) element.scrollTo({ top: 0, behavior: 'instant' });
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    const audit = await page.locator('main').evaluate(main => {
      const failures: string[] = [];
      const controls = [...main.querySelectorAll<HTMLElement>('button, a[href], textarea, input, select')].filter(element => {
        if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
      });
      const boxes = controls.map(element => ({ element, rect: element.getBoundingClientRect() }));
      for (const { element, rect } of boxes) {
        const label = element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 60) || element.tagName;
        if (rect.left < -1 || rect.right > innerWidth + 1) failures.push(`${label}: outside viewport`);
        if (element.scrollWidth > element.clientWidth + 1 && !element.matches('input,textarea,select')) failures.push(`${label}: content overflow`);
        const parent = element.parentElement!.getBoundingClientRect();
        if (rect.left < parent.left - 1 || rect.right > parent.right + 1) failures.push(`${label}: outside parent`);
        if (!element.matches('button,a[href]')) continue;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent?.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          for (const text of range.getClientRects()) {
            if (text.left < rect.left - 1 || text.right > rect.right + 1 || text.top < rect.top - 1 || text.bottom > rect.bottom + 1) failures.push(`${label}: text outside control`);
          }
        }
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
        if (Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left) > 1
          && Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top) > 1) failures.push('overlapping controls');
      }
      const alert = main.querySelector<HTMLElement>('[role=alert]');
      if (alert && alert.scrollWidth > alert.clientWidth + 1) failures.push('alert: content overflow');
      return { controls: controls.length, failures,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect.soft(audit.controls, `${stage}/${width}: controls`).toBeGreaterThan(0);
    expect.soft(audit.failures, `${stage}/${width}: geometry`).toEqual([]);
    expect.soft(audit.horizontalOverflow, `${stage}/${width}: page overflow`).toBeLessThanOrEqual(1);
    if (!process.env.CI && process.env.WARRANTEE_SYNTHETIC_SCREENSHOTS === '1') {
      await page.screenshot({ path: info.outputPath(`synthetic-${stage}-${width}.png`), fullPage: true });
    }
  }
}
