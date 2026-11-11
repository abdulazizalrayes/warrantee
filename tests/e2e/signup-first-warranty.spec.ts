import { randomUUID } from 'node:crypto';
import { expect, test, devices, type Page } from '@playwright/test';
import { load } from 'cheerio';
import QRCode from 'qrcode';
import { APP_URL, SUPABASE_URL, assertDisposableBackend, assertLoopback } from '../isolated/guard.mjs';
import { fillWarranty, localAdmin, observeLocalOnly, onboard, signedInClient, signupAndConfirm, text, type Scenario } from '../isolated/helpers';

const scenarios: Scenario[] = [];
for (const locale of ['en', 'ar'] as const) {
  for (const account of ['consumer', 'business'] as const) {
    for (const mode of ['completed', 'skipped'] as const) scenarios.push({ locale, account, mode });
  }
  scenarios.push({ locale, account: 'consumer', mode: 'completed', attachment: true });
}

const localSerial = 'SYNTHETIC-PRIVATE-42QA';
const maskedSerial = '********42QA';

async function exerciseBusinessLifecycle(
  holder: Page, outsiderPage: Page, outsider: Awaited<ReturnType<typeof signedInClient>>,
  holderId: string, outsiderId: string, warranty: { id: string; reference_number: string; product_name: string; issuer_company_id: string },
) {
  const admin = await localAdmin();
  const { id, reference_number: reference, product_name: product, issuer_company_id: companyId } = warranty;
  const approvalPath = `/api/warranties/${id}/approve`;
  const certificatePath = `/api/warranties/${id}/certificate`;
  const publicCertificatePath = `/api/v1/warranties/verify/${encodeURIComponent(reference)}/certificate?locale=en`;
  const publicLookup = `/api/v1/warranties/verify?q=${id}`;
  const noRedirect = { maxRedirects: 0 };
  const anonymous = await holder.context().browser()!.newContext({
    ...devices['Desktop Chrome'], userAgent: `Warrantee-QA/1.0 ${devices['Desktop Chrome'].userAgent}`,
    baseURL: APP_URL, serviceWorkers: 'block',
  });
  let claimPath: string;
  try {
    const observed = await observeLocalOnly(anonymous);
    console.log('ISOLATED_STAGE lifecycle_approval');
    expect((await anonymous.request.get(publicLookup, noRedirect)).status()).toBe(404);
    expect((await anonymous.request.get(publicCertificatePath, noRedirect)).status()).toBe(404);
    const issuedBeforeApproval = await admin.from('activity_log').select('id')
      .eq('entity_type', 'funnel_event').eq('action', 'activation_milestone').eq('entity_id', companyId)
      .contains('metadata', { source: 'server_warranty_creation', milestone: 'first_warranty_issued' });
    expect(issuedBeforeApproval.error).toBeNull();
    expect(issuedBeforeApproval.data).toHaveLength(0);
    await assertDisposableBackend();
    expect((await outsiderPage.request.post(approvalPath, noRedirect)).status()).toBe(403);
    const approval = await holder.request.post(approvalPath, noRedirect);
    expect(approval.status()).toBe(200);
    const approved = await approval.json();
    expect(approved).toMatchObject({ success: true, status: 'active', approved_at: expect.any(String) });
    const saved = await admin.from('warranties').select('status,approved_by,approved_at,issuer_company_id').eq('id', id).single();
    expect(saved.error).toBeNull();
    expect(saved.data).toEqual({ status: 'active', approved_by: holderId, approved_at: expect.any(String), issuer_company_id: companyId });
    expect(new Date(saved.data!.approved_at).toISOString()).toBe(approved.approved_at);
    const approvalAudit = await admin.from('activity_log').select('actor_id,previous_state,new_state')
      .eq('entity_type', 'warranty').eq('entity_id', id).eq('action', 'approved').single();
    expect(approvalAudit.error).toBeNull();
    expect(approvalAudit.data).toEqual({ actor_id: holderId, previous_state: { status: 'pending_approval' }, new_state: { status: 'active' } });
    const notice = await admin.from('notifications').select('id').eq('user_id', holderId)
      .eq('warranty_id', id).eq('type', 'warranty_approved');
    expect(notice.error).toBeNull();
    expect(notice.data).toHaveLength(1);

    console.log('ISOLATED_STAGE lifecycle_certificate');
    expect((await anonymous.request.get(certificatePath, noRedirect)).status()).toBe(401);
    expect((await outsiderPage.request.get(certificatePath, noRedirect)).status()).toBe(404);
    await assertDisposableBackend();
    const pdf = await holder.request.get(`${certificatePath}?format=pdf`, noRedirect);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toBe('application/pdf');
    expect(pdf.headers()['content-disposition']).toBe(`attachment; filename="warranty-${id}.pdf"`);
    const pdfBytes = await pdf.body();
    expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdfBytes.subarray(-16).toString()).toMatch(/%%EOF\s*$/);
    expect(pdfBytes.includes(Buffer.from('/Subtype /Image'))).toBe(true);
    const html = await holder.request.get(certificatePath, noRedirect);
    expect(html.status()).toBe(200);
    const certificate = load(await html.text());
    expect(certificate('.badge').text()).toBe('Active');
    expect(certificate('.field p').map((_, item) => certificate(item).text()).get()).toEqual(
      expect.arrayContaining([product, reference, localSerial]),
    );
    const qrLabel = certificate('.qr .ref').text();
    expect(qrLabel).toBe(`Scan to verify | ${APP_URL}/en/verify/${id}`);
    const destination = assertLoopback(qrLabel.slice('Scan to verify | '.length), APP_URL);
    // Validate the actual QR image bytes, not just the printed URL beside it.
    const qr = await QRCode.toDataURL(destination.href, {
      width: 160, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#1A1A2E', light: '#FFFFFF' },
    });
    expect(certificate('.qr img').attr('src') === qr).toBe(true);

    console.log('ISOLATED_STAGE lifecycle_verification');
    await assertDisposableBackend();
    const publicPage = await anonymous.newPage();
    const [lookup] = await Promise.all([
      publicPage.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/warranties/verify'),
      publicPage.goto(destination.href),
    ]);
    expect(lookup.status()).toBe(200);
    const proof = await lookup.json();
    expect(proof).toMatchObject({
      success: true, data: { id, reference_number: reference, product_name: product, status: 'active', serial_number: maskedSerial },
    });
    expect(Object.keys(proof.data).sort()).toEqual([
      'category', 'created_at', 'end_date', 'id', 'product_name', 'product_name_ar',
      'reference_number', 'seller_name', 'serial_number', 'start_date', 'status',
    ]);
    await expect(publicPage.getByRole('heading', { name: 'Verified warranty', exact: true })).toBeVisible();
    await expect(publicPage.getByRole('heading', { name: product, exact: true })).toBeVisible();
    await expect(publicPage.getByText(maskedSerial, { exact: true })).toBeVisible();
    await expect.poll(async () => {
      const views = await admin.from('warranty_passport_events').select('id').eq('warranty_id', id)
        .eq('event_type', 'view').eq('source', 'passport_page').eq('locale', 'en').eq('traffic_class', 'qa');
      if (views.error) throw new Error('Passport event persistence query failed');
      return views.data.length;
    }).toBe(1);
    await expect(publicPage.getByRole('link', { name: 'Open certificate', exact: true })).toHaveAttribute('href', publicCertificatePath);
    const publicCertificate = await anonymous.request.get(publicCertificatePath, noRedirect);
    expect(publicCertificate.status()).toBe(200);
    const publicHtml = load(await publicCertificate.text());
    expect(publicHtml('.status').text()).toBe('Active');
    expect(publicHtml('.url').text()).toBe(destination.href);
    expect(publicHtml('.grid .value').map((_, item) => publicHtml(item).text()).get()).toEqual(
      expect.arrayContaining([product, reference, maskedSerial]),
    );
    expect(publicHtml('body').text().includes(localSerial)).toBe(false);
    const claimLink = publicPage.getByRole('link', { name: 'Start a claim', exact: true });
    await expect(claimLink).toHaveAttribute('href', `/en/auth?redirect=${encodeURIComponent(`/en/warranties/${id}/claim`)}`);
    claimPath = new URL((await claimLink.getAttribute('href'))!, APP_URL).searchParams.get('redirect')!;
    expect(observed).toMatchObject({ external: 0, googleBlocked: 0, funnelFailures: 0, cspViolations: 0, scriptErrors: 0 });
  } finally { await anonymous.close(); }

  console.log('ISOLATED_STAGE lifecycle_claim');
  // The public CTA sends guests to sign-in. Its target is opened by the existing
  // confirmed holder, not by sharing their session with the anonymous verifier.
  await assertDisposableBackend();
  const [profile] = await Promise.all([
    holder.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.origin === SUPABASE_URL && url.pathname === '/rest/v1/profiles' && url.searchParams.get('id') === `eq.${holderId}`;
    }),
    holder.goto(claimPath),
  ]);
  expect(profile.status()).toBe(200);
  const title = 'Synthetic claim on the issued warranty';
  const description = 'Synthetic isolated evidence: the covered product stopped working.';
  await holder.getByLabel(/Claim Title/).fill(title);
  await holder.getByLabel(/Describe the Issue/).fill(description);
  await holder.getByRole('button', { name: 'Submit Claim', exact: true }).click();
  await expect(holder.getByRole('heading', { name: 'Claim Filed Successfully!', exact: true })).toBeVisible();
  const savedClaim = await admin.from('warranty_claims').select('id,claim_number,filed_by,status,title,description')
    .eq('warranty_id', id).single();
  expect(savedClaim.error).toBeNull();
  expect(savedClaim.data).toMatchObject({ filed_by: holderId, status: 'submitted', title, description });
  expect(savedClaim.data!.claim_number).toMatch(/^CL-[A-Z0-9]+-[A-Z0-9]+$/);
  const claimId = savedClaim.data!.id;
  const timeline = await admin.from('claim_events').select('event_type,old_status,new_status,created_by')
    .eq('claim_id', claimId).single();
  expect(timeline.error).toBeNull();
  expect(timeline.data).toEqual({ event_type: 'created', old_status: null, new_status: 'submitted', created_by: holderId });
  const ownerClaims = await holder.request.get('/api/claims', noRedirect);
  expect(ownerClaims.status()).toBe(200);
  expect((await ownerClaims.json()).data).toEqual([expect.objectContaining({ id: claimId, warranty_id: id })]);

  const hiddenClaim = await outsider.from('warranty_claims').select('id').eq('id', claimId);
  expect(hiddenClaim.error).toBeNull();
  expect(hiddenClaim.data).toHaveLength(0);
  const hiddenTimeline = await outsider.from('claim_events').select('id').eq('claim_id', claimId);
  expect(hiddenTimeline.error).toBeNull();
  expect(hiddenTimeline.data).toHaveLength(0);
  await assertDisposableBackend();
  const deniedClaim = await outsider.from('warranty_claims').insert({
    warranty_id: id, filed_by: outsiderId, status: 'submitted', title, description, claim_number: `ISOLATED-${randomUUID()}`,
  });
  expect(deniedClaim.error?.code).toBe('42501');
}

for (const scenario of scenarios) {
  // These are synthetic local users. Ordinary UA exercises the human-classified
  // database branch, not evidence of real-user demand or verified human identity.
  const trafficClass = scenario.mode === 'completed' ? 'human' : 'qa';
  const checkLifecycle = scenario.locale === 'en' && scenario.account === 'business' && scenario.mode === 'completed';
  test.describe(`isolated synthetic ${scenario.locale} ${scenario.account} ${scenario.mode} ${scenario.attachment ? 'attachment' : 'no-files'} (${trafficClass}-classified)`, () => {
    test.use({ userAgent: `${trafficClass === 'qa' ? 'Warrantee-QA/1.0 ' : ''}${devices['Desktop Chrome'].userAgent}` });

    test('real signup, SMTP confirmation, onboarding, durable first warranty and tenant policy', async ({ page, context }) => {
      await assertDisposableBackend();
      const observed = await observeLocalOnly(context);
      const identity = await signupAndConfirm(page, scenario, scenario.locale === 'en' && scenario.account === 'consumer' && scenario.mode === 'completed' && !scenario.attachment);
      const admin = await localAdmin();
      await onboard(page, scenario, identity.id, true);
      if (checkLifecycle) await page.locator('#warranty-serial-number').fill(localSerial);
      const lifecycleEndDate = new Date(Math.max(Date.now(), Date.UTC(2026, 10, 10)) + 365 * 86_400_000).toISOString().slice(0, 10);
      const product = await fillWarranty(page, scenario, checkLifecycle ? lifecycleEndDate : undefined);
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
      await expect(page.getByRole('alert').filter({ hasText: text(scenario,
        'Could not confirm the request. Check your connection and retry; the same request will be used without creating another warranty.',
        'تعذر تأكيد الطلب. تحقق من الاتصال وأعد المحاولة؛ سيُستخدم الطلب نفسه دون إنشاء ضمان آخر.') })).toBeVisible();
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
      const otherContext = await context.browser()!.newContext({
        userAgent: `Warrantee-QA/1.0 ${devices['Desktop Chrome'].userAgent}`, baseURL: APP_URL, serviceWorkers: 'block',
      });
      try {
        const otherPage = await otherContext.newPage();
        await observeLocalOnly(otherContext);
        const otherIdentity = await signupAndConfirm(otherPage, { locale: scenario.locale, account: 'consumer', mode: 'skipped' });
        const outsider = await signedInClient(otherContext);
        const inaccessible = await outsider.from('warranties').select('id').eq('id', committedId!);
        expect(inaccessible.error).toBeNull();
        expect(inaccessible.data).toHaveLength(0);
        await assertDisposableBackend();
        const crossTenant = await outsider.from('warranties').insert({
          ...rows.data![0], id: randomUUID(), reference_number: `ISOLATED-${randomUUID()}`,
        });
        expect(crossTenant.error).not.toBeNull();
        if (checkLifecycle) await exerciseBusinessLifecycle(page, otherPage, outsider, identity.id, otherIdentity.id, rows.data![0]);
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
      const issuances = activations.filter((row) => row.metadata.milestone === 'first_warranty_issued');
      expect(issuances).toHaveLength(checkLifecycle ? 1 : 0);
      if (checkLifecycle) expect(issuances[0]).toMatchObject({
        entity_id: identity.companyId, metadata: { account_type: 'business', traffic_class: 'human' },
      });
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
