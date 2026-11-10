import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { load } from 'cheerio';
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { APP_URL, SUPABASE_URL, MAIL_URL, assertDisposableBackend, assertLoopback } from './guard.mjs';

export type Scenario = { locale: 'en' | 'ar'; account: 'consumer' | 'business'; mode: 'completed' | 'skipped'; attachment?: boolean };
export const text = (scenario: Scenario, en: string, ar: string) => scenario.locale === 'ar' ? ar : en;
const browserSignals = new WeakMap<BrowserContext, { cspViolations: number; scriptErrors: number }>();

export async function localAdmin() {
  await assertDisposableBackend();
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function signedInClient(context: BrowserContext) {
  await assertDisposableBackend();
  const ssr = createServerClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => context.cookies(), setAll: () => {} },
  });
  const { data: { session }, error } = await ssr.auth.getSession();
  if (error || !session) throw new Error('Missing actual browser GoTrue session');
  return createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function observeLocalOnly(context: BrowserContext) {
  const observed = { external: 0, googleBlocked: 0, funnelFailures: 0, cspViolations: 0, scriptErrors: 0 };
  browserSignals.set(context, observed);
  for (const page of context.pages()) page.on('pageerror', () => { observed.scriptErrors++; });
  context.on('page', page => page.on('pageerror', () => { observed.scriptErrors++; }));
  await context.exposeBinding('__isolatedCspViolation', () => { observed.cspViolations++; });
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      // Google is disabled and blocked separately. Local auth/storage must obey real CSP.
      if (event.blockedURI.includes(location.hostname) || event.violatedDirective.startsWith('script-src')) {
        void (window as unknown as { __isolatedCspViolation: () => Promise<void> }).__isolatedCspViolation();
      }
    });
  });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if ([APP_URL, SUPABASE_URL, MAIL_URL].includes(url.origin)) return route.continue();
    if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    if (/(^|\.)(google-analytics\.com|googletagmanager\.com|google\.com|doubleclick\.net)$/.test(url.hostname)) observed.googleBlocked++;
    else observed.external++;
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', (socket) => {
    const url = new URL(socket.url());
    if (url.hostname === '127.0.0.1' && url.port === '54321') socket.connectToServer();
    else {
      observed.external++;
      socket.close({ code: 1008, reason: 'Isolated network boundary' });
    }
  });
  context.on('response', (response) => {
    if (new URL(response.url()).pathname === '/api/funnel/events' && response.status() !== 201) observed.funnelFailures++;
  });
  return observed;
}

export async function signupAndConfirm(page: Page, scenario: Scenario, failFirst = false) {
  console.log('ISOLATED_STAGE signup');
  await assertDisposableBackend();
  const email = `isolated-${randomUUID()}@warrantee-isolated.test`;
  const name = `Synthetic ${scenario.account} ${scenario.locale}`;
  const company = `Synthetic local company ${randomUUID()}`;
  await page.goto(`/${scenario.locale}/auth?tab=signup&account=${scenario.account}`);
  await page.locator('#signup-full-name').fill(name);
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill('short');
  if (scenario.account === 'business') await page.locator('#signup-company-name').fill(company);

  const consent = page.getByRole('dialog', { name: 'Cookie consent' });
  if (scenario.mode === 'completed') {
    await consent.getByRole('button', { name: text(scenario, 'Accept All', '\u0642\u0628\u0648\u0644 \u0627\u0644\u0643\u0644'), exact: true }).click();
  } else {
    await consent.getByRole('button', { name: text(scenario, 'Reject All', '\u0631\u0641\u0636 \u0627\u0644\u0643\u0644'), exact: true }).click();
  }
  await expect(consent).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('warrantee_cookie_consent')!).analytics)).toBe(scenario.mode === 'completed');

  const submit = page.locator('form:has(#signup-email) button[type="submit"]');
  await submit.click();
  expect(await page.locator('#signup-password').evaluate((input: HTMLInputElement) => input.validity.tooShort)).toBe(true);
  await page.locator('#signup-password').fill('Local-only-Password-42!');
  if (failFirst) {
    await page.route('**/auth/v1/signup?*', (route) => route.abort('failed'));
    await submit.click();
    // Next's route announcer is also an alert; require the actual recovery copy.
    await expect(page.getByRole('alert').filter({ hasText: scenario.mode === 'skipped'
      ? text(scenario, 'We could not skip setup. Please try again.', 'تعذّر تخطي الإعداد. حاول مرة أخرى.')
      : text(scenario, 'We could not save your setup. Please try again.', 'تعذّر حفظ الإعدادات. حاول مرة أخرى.') })).toBeVisible();
    await expect(submit).toBeEnabled();
    const admin = await localAdmin();
    const unsaved = await admin.from('profiles').select('id').eq('email', email);
    expect(unsaved.error).toBeNull();
    expect(unsaved.data).toHaveLength(0);
    await page.unroute('**/auth/v1/signup?*');
  }

  const signup = page.waitForResponse((response) => response.url().startsWith(`${SUPABASE_URL}/auth/v1/signup`) && response.request().method() === 'POST', { timeout: 15_000 });
  await submit.click();
  expect((await signup).status()).toBe(200);

  // Real GoTrue SMTP is captured by Mailpit. Follow its real PKCE confirmation URL
  // in the same browser; no admin confirmation or fabricated browser session.
  console.log('ISOLATED_STAGE confirmation');
  let confirmation: string | undefined;
  await expect.poll(async () => {
    const response = await fetch(`${MAIL_URL}/api/v1/messages?limit=100`, { redirect: 'error' });
    if (!response.ok) return false;
    const list = await response.json() as { messages: { ID: string; To: { Address: string }[] }[] };
    const message = list.messages.find((message) => message.To.some((recipient) => recipient.Address === email));
    if (!message) return false;
    const detailResponse = await fetch(`${MAIL_URL}/api/v1/message/${encodeURIComponent(message.ID)}`, { redirect: 'error' });
    if (!detailResponse.ok) return false;
    const detail = await detailResponse.json() as { HTML: string };
    for (const element of load(detail.HTML)('a[href]').toArray()) {
      const href = load(detail.HTML)(element).attr('href');
      if (!href) continue;
      const candidate = new URL(href);
      assertLoopback(candidate.href, SUPABASE_URL);
      if (candidate.pathname !== '/auth/v1/verify') continue;
      const redirect = candidate.searchParams.get('redirect_to');
      if (!redirect) throw new Error('Local confirmation missing redirect contract');
      assertLoopback(redirect, APP_URL);
      confirmation = candidate.href;
      return true;
    }
    return false;
  }, { timeout: 20_000, message: 'Local SMTP must contain a real loopback confirmation link' }).toBe(true);
  await assertDisposableBackend();
  const transit = { callbackSeen: false, callbackCookieSet: false, proxyState: 'unknown', proxyInputCookie: false, browserSentCookie: false, documentHtml: false };
  const watchCallback = async (response: import('@playwright/test').Response) => {
    const headers = await response.allHeaders();
    if (response.request().isNavigationRequest()) transit.documentHtml = headers['content-type']?.includes('text/html') || false;
    const proxy = headers['x-warrantee-isolated-auth'];
    if (/^(?:cookie|no_cookie):(?:no_session|auth_failure|none)$/.test(proxy || '')) transit.proxyState = proxy;
    if (proxy) {
      transit.proxyInputCookie = headers['x-warrantee-isolated-input'] === 'cookie';
      const requestHeaders = await response.request().allHeaders();
      transit.browserSentCookie = /(?:^|;\s*)sb-[^=;]*auth-token(?:\.\d+)?=/.test(requestHeaders.cookie || '');
    }
    if (new URL(response.url()).pathname !== '/auth/callback') return;
    transit.callbackSeen = true;
    transit.callbackCookieSet = /sb-[^=;\s]*auth-token/.test(headers['set-cookie'] || '');
  };
  page.on('response', watchCallback);
  await page.goto(confirmation!);
  try {
  await expect(page).toHaveURL(new RegExp(`/${scenario.locale}/onboarding(?:\\?|$)`));
  } catch {
    const destination = new URL(page.url());
    const error = destination.searchParams.get('error');
    const state = error === 'auth_callback_error' ? 'callback_rejected'
      : error || new URLSearchParams(destination.hash.slice(1)).has('error') ? 'verification_rejected'
      : destination.pathname === `/${scenario.locale}/auth` ? 'sign_in'
        : destination.pathname === `/${scenario.locale}/dashboard` ? 'dashboard'
          : destination.pathname === `/${scenario.locale}/onboarding` ? 'onboarding'
            : 'other';
    const cookies = await page.context().cookies();
    const applicable = await page.context().cookies(`${APP_URL}/${scenario.locale}/dashboard`);
    let cookieVerified = false;
    let profileReadable = false;
    let explicitCookieAccepted = false;
    try {
      const client = await signedInClient(page.context());
      const verified = await client.auth.getUser();
      cookieVerified = !verified.error && Boolean(verified.data.user);
      if (verified.data.user) {
        const ownProfile = await client.from('profiles').select('id').eq('id', verified.data.user.id).single();
        profileReadable = !ownProfile.error && Boolean(ownProfile.data);
      }
    } catch { /* Only bounded flags leave the disposable diagnostic. */ }
    try {
      const probe = await page.request.get(`/${scenario.locale}/dashboard`, { maxRedirects: 0,
        headers: { Cookie: applicable.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') } });
      explicitCookieAccepted = probe.status() === 200;
    } catch { /* The probe stays inside the same guarded local account. */ }
    const signals = browserSignals.get(page.context());
    const cookieVisible = await page.evaluate(() => /(?:^|;\s*)sb-[^=;]*auth-token(?:\.\d+)?=/.test(document.cookie));
    const browserHydrated = await page.locator('form').count() > 0;
    const documentScripts = await page.locator('script[src*="/_next/"]').count() > 0;
    const httpOnlyCookie = applicable.some(cookie => /^sb-.*auth-token(?:\.\d+)?$/.test(cookie.name) && cookie.httpOnly);
    const sameAppOrigin = destination.origin === APP_URL;
    throw new Error(`isolated_confirmation_destination:${state};callbackSeen=${transit.callbackSeen};callbackCookieSet=${transit.callbackCookieSet};hasAuthCookie=${cookies.some(cookie => /^sb-.*auth-token(?:\.\d+)?$/.test(cookie.name))};authRedirect=${destination.searchParams.has('redirect')};cookieApplicable=${applicable.some(cookie => /^sb-.*auth-token(?:\.\d+)?$/.test(cookie.name))};cookieVerified=${cookieVerified};profileReadable=${profileReadable};proxyState=${transit.proxyState};proxyInputCookie=${transit.proxyInputCookie};browserSentCookie=${transit.browserSentCookie};explicitCookieAccepted=${explicitCookieAccepted};cspViolated=${Boolean(signals?.cspViolations)};browserScriptError=${Boolean(signals?.scriptErrors)};browserHydrated=${browserHydrated};cookieVisible=${cookieVisible};documentScripts=${documentScripts};documentHtml=${transit.documentHtml};httpOnlyCookie=${httpOnlyCookie};sameAppOrigin=${sameAppOrigin}`);
  } finally { page.off('response', watchCallback); }
  const admin = await localAdmin();
  const { data: profile, error } = await admin.from('profiles').select('*').eq('email', email).single();
  expect(error).toBeNull();
  expect(profile?.account_type).toBe(scenario.account);
  expect(profile?.onboarding_completed).toBe(false);
  const { data: identity, error: identityError } = await admin.auth.admin.getUserById(profile!.id);
  expect(identityError).toBeNull();
  expect(identity.user?.email_confirmed_at).toBeTruthy();
  const { data: subscription, error: subscriptionError } = await admin.from('subscriptions').select('plan_id,warranty_limit').eq('user_id', profile!.id).single();
  expect(subscriptionError).toBeNull();
  expect(subscription).toEqual({ plan_id: 'free', warranty_limit: scenario.account === 'business' ? 100 : 10 });
  const { data: memberships, error: membershipError } = await admin.from('company_members').select('company_id,role,is_active').eq('user_id', profile!.id);
  expect(membershipError).toBeNull();
  expect(memberships).toHaveLength(scenario.account === 'business' ? 1 : 0);
  if (scenario.account === 'business') {
    expect(memberships![0]).toMatchObject({ role: 'company_admin', is_active: true });
    const { data: storedCompany, error: companyError } = await admin.from('companies').select('name,created_by').eq('id', memberships![0].company_id).single();
    expect(companyError).toBeNull();
    expect(storedCompany).toEqual({ name: company, created_by: profile!.id });
  }
  return { id: profile!.id as string, email, companyId: memberships?.[0]?.company_id as string | undefined };
}

export async function onboard(page: Page, scenario: Scenario, userId: string, failFirst = false) {
  console.log('ISOLATED_STAGE onboarding');
  const admin = await localAdmin();
  const save = () => page.getByRole('button', { name: scenario.mode === 'skipped'
    ? text(scenario, 'Skip for now', '\u062a\u062e\u0637\u064a \u0627\u0644\u0625\u0639\u062f\u0627\u062f')
    : text(scenario, 'Complete Setup', '\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0625\u0639\u062f\u0627\u062f'), exact: true });
  if (scenario.mode === 'completed') {
    await page.getByRole('button', { name: text(scenario, 'Next', '\u0627\u0644\u062a\u0627\u0644\u064a'), exact: true }).click();
  }
  if (failFirst) {
    await page.route('**/rest/v1/profiles?*', async (route) => {
      if (route.request().method() === 'PATCH') await route.abort('failed');
      else await route.continue();
    });
    await save().click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(save()).toBeEnabled();
    const { data, error } = await admin.from('profiles').select('onboarding_completed').eq('id', userId).single();
    expect(error).toBeNull();
    expect(data?.onboarding_completed).toBe(false);
    await expect(page).toHaveURL(new RegExp(`/${scenario.locale}/onboarding`));
    await page.unroute('**/rest/v1/profiles?*');
  }
  await assertDisposableBackend();
  await save().click();
  await expect.poll(async () => {
    const { data, error } = await admin.from('profiles').select('onboarding_completed,preferred_locale,preferred_language').eq('id', userId).single();
    if (error) throw new Error('Onboarding persistence query failed');
    return data;
  }).toEqual({ onboarding_completed: true, preferred_locale: scenario.locale, preferred_language: scenario.locale });
  if (scenario.mode === 'completed') {
    await page.getByRole('link', { name: text(scenario, 'Add Warranty', '\u0623\u0636\u0641 \u0636\u0645\u0627\u0646'), exact: true }).click();
  } else {
    await expect(page).toHaveURL(new RegExp(`/${scenario.locale}/dashboard`));
    await page.goto(`/${scenario.locale}/warranties/new?activation=1`);
  }
  await expect(page.locator('#warranty-product-name')).toBeVisible();
}

export async function fillWarranty(page: Page, scenario: Scenario) {
  console.log('ISOLATED_STAGE warranty_form');
  const name = `Synthetic local warranty ${randomUUID()}`;
  await page.locator('#warranty-product-name').fill(name);
  await page.getByRole('button', { name: text(scenario, 'Next', '\u0627\u0644\u062a\u0627\u0644\u064a'), exact: true }).click();
  await page.locator('#warranty-start-date').fill('2026-11-10');
  await page.locator('#warranty-end-date').fill('2027-11-10');
  await page.getByRole('button', { name: text(scenario, 'Next', '\u0627\u0644\u062a\u0627\u0644\u064a'), exact: true }).click();
  if (scenario.attachment) {
    await page.locator('input[type="file"][multiple]').setInputFiles({
      name: 'synthetic-local-proof.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=', 'base64'),
    });
  }
  return name;
}
