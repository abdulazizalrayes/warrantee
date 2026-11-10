import { randomUUID } from 'node:crypto';
import { expect, test, devices } from '@playwright/test';
import { assertDisposableBackend } from '../isolated/guard.mjs';
import { fillWarranty, localAdmin, observeLocalOnly, onboard, signedInClient, signupAndConfirm, text, type Scenario } from '../isolated/helpers';

const scenarios: Scenario[] = [];
for (const locale of ['en', 'ar'] as const) {
  for (const account of ['consumer', 'business'] as const) {
    for (const mode of ['completed', 'skipped'] as const) scenarios.push({ locale, account, mode });
  }
  scenarios.push({ locale, account: 'consumer', mode: 'completed', attachment: true });
}

for (const scenario of scenarios) {
  // These are synthetic local users. Ordinary UA exercises the human-classified
  // database branch, not evidence of real-user demand or verified human identity.
  const trafficClass = scenario.mode === 'completed' ? 'human' : 'qa';
  test.describe(`isolated synthetic ${scenario.locale} ${scenario.account} ${scenario.mode} ${scenario.attachment ? 'attachment' : 'no-files'} (${trafficClass}-classified)`, () => {
    test.use({ userAgent: `${trafficClass === 'qa' ? 'Warrantee-QA/1.0 ' : ''}${devices['Desktop Chrome'].userAgent}` });

    test('real signup, SMTP confirmation, onboarding, durable first warranty and tenant policy', async ({ page, context }) => {
      await assertDisposableBackend();
      const observed = await observeLocalOnly(context);
      const identity = await signupAndConfirm(page, scenario, scenario.locale === 'en' && scenario.account === 'consumer' && scenario.mode === 'completed' && !scenario.attachment);
      const admin = await localAdmin();
      await onboard(page, scenario, identity.id, true);
      const product = await fillWarranty(page, scenario);
      const authenticated = await signedInClient(context);

      // The browser's actual JWT may not claim an admin role or forge activation.
      await assertDisposableBackend();
      const roleEscalation = await authenticated.from('profiles').update({ role: 'super_admin' }).eq('id', identity.id);
      expect(roleEscalation.error).not.toBeNull();
      const spoofed = await authenticated.from('activity_log').insert({
        actor_id: identity.id, entity_type: 'funnel_event', entity_id: randomUUID(),
        action: 'activation_milestone', metadata: { milestone: 'first_warranty_created', traffic_class: 'human' },
      });
      expect(spoofed.error).not.toBeNull();

      const invalid = await page.request.post('/api/warranties', {
        data: { product_name: '', start_date: '2027-11-10', end_date: '2026-11-10' }, maxRedirects: 0,
      });
      expect(invalid.status()).toBe(400);
      const before = await admin.from('warranties').select('id').eq('created_by', identity.id);
      expect(before.error).toBeNull();
      expect(before.data).toHaveLength(0);

      // Commit the real HTTP request, then lose only its response. No fake success
      // response is supplied. Retry must use the identical key/body and durable ID.
      let committedId: string | undefined;
      let originalBody: string | null = null;
      let originalKey: string | undefined;
      let lostResponse = false;
      await page.route('**/api/warranties', async (route) => {
        if (route.request().method() !== 'POST' || lostResponse) return route.continue();
        originalBody = route.request().postData();
        originalKey = route.request().headers()['idempotency-key'];
        const response = await route.fetch({ maxRedirects: 0 });
        if (response.status() !== 201) {
          await route.fulfill({ response });
          throw new Error(`isolated_http_status:201:${response.status()}`);
        }
        const result = await response.json();
        committedId = result.data.id;
        lostResponse = true;
        await route.abort('failed');
      });
      const create = page.getByRole('button', { name: text(scenario, 'Create Warranty', '\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646'), exact: true });
      await assertDisposableBackend();
      console.log('ISOLATED_STAGE first_save');
      await create.click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(create).toBeEnabled();
      expect(lostResponse).toBe(true);
      expect(originalKey).toMatch(/^[a-f0-9-]{36}$/i);
      const replayResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/warranties' && response.request().method() === 'POST');
      await assertDisposableBackend();
      console.log('ISOLATED_STAGE retry_save');
      await create.click();
      const replay = await replayResponse;
      expect(replay.status()).toBe(201);
      expect(replay.request().postData()).toBe(originalBody);
      expect(replay.request().headers()['idempotency-key']).toBe(originalKey);
      expect(replay.headers()['idempotency-replayed']).toBe('true');
      const replayBody = await replay.json();
      expect(replayBody.data.id).toBe(committedId);
      await page.unroute('**/api/warranties');
      await expect(page.getByRole('heading', { name: text(scenario, 'Warranty Created Successfully!', '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0636\u0645\u0627\u0646 \u0628\u0646\u062c\u0627\u062d!'), exact: true })).toBeVisible();

      console.log('ISOLATED_STAGE durable_assertions');
      const rows = await admin.from('warranties').select('*').eq('created_by', identity.id);
      expect(rows.error).toBeNull();
      expect(rows.data).toHaveLength(1);
      expect(rows.data![0]).toMatchObject({
        id: committedId, user_id: identity.id, created_by: identity.id, issuer_user_id: identity.id,
        issuer_company_id: identity.companyId || null, product_name: product,
        status: scenario.account === 'business' ? 'pending_approval' : 'active',
      });
      const storedReplay = await admin.from('api_idempotency_records').select('resource_id,status,response_body').eq('user_id', identity.id).eq('idempotency_key', originalKey!);
      expect(storedReplay.error).toBeNull();
      expect(storedReplay.data).toHaveLength(1);
      expect(storedReplay.data![0]).toMatchObject({ resource_id: committedId, status: 'completed' });

      // Same key, changed payload cannot change or duplicate the original record.
      await assertDisposableBackend();
      const mismatch = await page.request.post('/api/warranties', {
        headers: { 'Idempotency-Key': originalKey! },
        data: { ...JSON.parse(originalBody!), product_name: 'Changed synthetic retry' }, maxRedirects: 0,
      });
      expect(mismatch.status()).toBe(409);

      const documents = await admin.from('warranty_documents').select('*').eq('warranty_id', committedId!);
      expect(documents.error).toBeNull();
      expect(documents.data).toHaveLength(scenario.attachment ? 1 : 0);
      if (scenario.attachment) {
        const document = documents.data![0];
        expect(document.uploaded_by).toBe(identity.id);
        expect(document.storage_path).toMatch(new RegExp(`^${identity.id}/${committedId}/`));
        expect(document.security_status).toBe('pending_scan');
        expect(document.file_hash).toMatch(/^[a-f0-9]{64}$/);
        const stored = await admin.storage.from('warranty-documents').download(document.storage_path);
        expect(stored.error).toBeNull();
        expect(stored.data?.size).toBe(document.file_size);
      }

      // A fresh real password identity has no membership or access to this tenant.
      // Creating it through the UI also exercises confirmation/login isolation.
      const otherContext = await context.browser()!.newContext({ userAgent: `Warrantee-QA/1.0 ${devices['Desktop Chrome'].userAgent}` });
      try {
        const otherPage = await otherContext.newPage();
        await observeLocalOnly(otherContext);
        await signupAndConfirm(otherPage, { locale: scenario.locale, account: 'consumer', mode: 'skipped' });
        const outsider = await signedInClient(otherContext);
        const inaccessible = await outsider.from('warranties').select('id').eq('id', committedId!);
        expect(inaccessible.error).toBeNull();
        expect(inaccessible.data).toHaveLength(0);
        await assertDisposableBackend();
        const crossTenant = await outsider.from('warranties').insert({
          ...rows.data![0], id: randomUUID(), reference_number: `ISOLATED-${randomUUID()}`,
        });
        expect(crossTenant.error).not.toBeNull();
      } finally { await otherContext.close(); }

      const audit = () => admin.from('activity_log').select('action,entity_id,metadata').eq('actor_id', identity.id).eq('entity_type', 'funnel_event');
      await expect.poll(async () => {
        const events = await audit();
        if (events.error) throw new Error('Durable funnel audit query failed');
        return events.data!.some((row) => row.action === 'onboarding_completed' && row.metadata.completion_mode === scenario.mode);
      }).toBe(true);
      const events = (await audit()).data!;
      console.log('ISOLATED_STAGE funnel');
      const serverCreated = events.filter((row) => row.action === 'warranty_created' && row.entity_id === committedId);
      expect(serverCreated).toHaveLength(1);
      expect(serverCreated[0].metadata.traffic_class).toBe(trafficClass);
      const activations = events.filter((row) => row.action === 'activation_milestone' && row.metadata.source === 'server_warranty_creation');
      expect(activations.filter((row) => row.metadata.milestone === 'first_warranty_created')).toHaveLength(trafficClass === 'human' ? 1 : 0);
      expect(activations.filter((row) => row.metadata.milestone === 'first_warranty_issued')).toHaveLength(0);
      expect(observed).toMatchObject({ external: 0, googleBlocked: 0, funnelFailures: 0, cspViolations: 0, scriptErrors: 0 });
      expect(await page.evaluate(() => ({ ga: Boolean(window.gtag), layer: window.dataLayer?.length || 0 }))).toEqual({ ga: false, layer: 0 });
      if (scenario.locale === 'ar') {
        const loaded = await page.evaluate(async () => {
          const family = getComputedStyle(document.documentElement).getPropertyValue('--font-arabic-brand').split(',')[0].trim();
          if (!family) return 0;
          const faces = await document.fonts.load(`400 16px ${family}`, '\u0636\u0645\u0627\u0646');
          return faces.filter((face) => face.status === 'loaded').length;
        });
        expect(loaded).toBeGreaterThan(0);
      }
    });
  });
}
