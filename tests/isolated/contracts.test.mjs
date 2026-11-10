import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { buildBootstrap, validateBaseAgainstTypes } from './bootstrap.mjs';
import { APP_URL, SUPABASE_URL, MAIL_URL, assertIsolatedEnvironment, assertLoopback, assertDisposableBackend } from './guard.mjs';
import { DATABASE_CONTRACT_MINIMUMS, databaseTestSummary, safeDiagnostics, safeTestOutput, validateJourneySummary } from './diagnostics.mjs';
import { assertFontSource } from './fonts.mjs';
import { buildLegacyBootstrap } from './legacy-bootstrap.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const env = {
  WARRANTEE_ISOLATED_E2E: '1', NEXT_PUBLIC_APP_URL: APP_URL, E2E_BASE_URL: APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, ISOLATED_MAIL_URL: MAIL_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-anon', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service',
  ISOLATED_RUN_ID: 'a'.repeat(32),
};

test('mutations require opt-in, exact loopback destinations, no Vercel, and local keys', () => {
  assert.doesNotThrow(() => assertIsolatedEnvironment(env));
  for (const value of ['https://warrantee.io', 'http://127.0.0.1.example.test', 'http://localhost:54321', 'http://user:password@127.0.0.1:54321', 'https://127.0.0.1:54321']) {
    assert.throws(() => assertLoopback(value, SUPABASE_URL));
  }
  for (const key of Object.keys(env)) {
    const changed = { ...env, [key]: '' };
    assert.throws(() => assertIsolatedEnvironment(changed), key);
  }
  for (const key of ['VERCEL', 'VERCEL_ENV']) {
    for (const value of ['', 'production']) assert.throws(() => assertIsolatedEnvironment({ ...env, [key]: value }));
  }
  assert.throws(() => assertIsolatedEnvironment({ ...env, ISOLATED_RUN_ID: 'not-a-run-id' }));
  for (const suffix of ['/extra', '/?remote=1', '/#remote']) {
    assert.throws(() => assertIsolatedEnvironment({ ...env, NEXT_PUBLIC_SUPABASE_URL: `${SUPABASE_URL}${suffix}` }));
  }
});

test('backend marker is mandatory before mutation and redirects are rejected', async () => {
  const original = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async (_url, options) => {
      calls++;
      assert.equal(options.redirect, 'error');
      return new Response(JSON.stringify([{ run_id: 'wrong' }]), { status: 200 });
    };
    await assert.rejects(assertDisposableBackend({ ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://example.test' }));
    assert.equal(calls, 0);
    await assert.rejects(assertDisposableBackend(env), /marker mismatch/);
    globalThis.fetch = async () => new Response(JSON.stringify([{ run_id: env.ISOLATED_RUN_ID }]), { status: 200 });
    await assert.doesNotReject(assertDisposableBackend(env));
  } finally { globalThis.fetch = original; }
});

test('base columns and exact enum lists match generated source types', () => {
  const base = readFileSync(resolve(root, 'tests/isolated/base.sql'), 'utf8');
  assert.ok(validateBaseAgainstTypes(root, base) > 100);
  assert.throws(() => validateBaseAgainstTypes(root, base.replace('full_name text', 'invented_profile_column text')), /Missing type contract/);
  assert.throws(() => validateBaseAgainstTypes(root, base.replace("'consumer', 'business'", "'business', 'consumer'")), /Enum drift/);
});

test('real-font prefetch remains bound to the exact checked-in IBM font definition', () => {
  assert.doesNotThrow(() => assertFontSource(root));
  const prefetch = readFileSync(resolve(root, 'tests/isolated/fonts.mjs'), 'utf8');
  assert.match(prefetch, /wOF2/);
  assert.match(prefetch, /readFileSync\(path\)\.equals\(bytes\)/);
  const runner = readFileSync(resolve(root, 'scripts/run-isolated-signup-journey.mjs'), 'utf8');
  assert.ok(runner.indexOf('await prepareRealFonts') < runner.indexOf('NODE_OPTIONS:'));
  assert.match(runner, /NEXT_FONT_GOOGLE_MOCKED_RESPONSES: fonts.responses/);
});

test('bootstrap loads canonical policies/functions, plans, state machine and transactional RPC', () => {
  const sql = buildBootstrap(root, env.ISOLATED_RUN_ID);
  for (const file of [
    '20260724214305_self_service_business_onboarding.sql',
    '20260830151500_harden_business_onboarding_rpc.sql',
    '20260406080746_enforce_warranty_state_machine.sql',
    '20260610194500_document_security_status.sql',
    '20261110151140_manual_warranty_creation_transaction.sql',
  ]) assert.ok(sql.includes(readFileSync(resolve(root, 'supabase/migrations', file), 'utf8')), file);
  assert.ok(sql.indexOf('create or replace function public.enforce_warranty_plan_quota()') < sql.lastIndexOf('create or replace function public.enforce_warranty_plan_quota()'));
  assert.match(sql, /reserve_backend_funnel_events/);
  assert.match(sql, /response_body jsonb/);
  assert.match(sql, /api_idempotency_explicit_service_only/);
  assert.match(sql, /async_jobs_explicit_service_only/);
  assert.match(sql, /split_part\(name, '\/', 1\) = \(select auth.uid\(\)\)::text/);
  assert.throws(() => buildBootstrap(root, "'; select 1; --"), /Invalid disposable run/);
});

test('Node egress preload rejects external fetch/HTTP/socket before I/O and permits real local fetch', () => {
  const script = `
    import assert from 'node:assert/strict';
    import http from 'node:http';
    import net from 'node:net';
    assert.throws(() => fetch('https://example.test'), /blocked external/);
    assert.throws(() => http.get('http://example.test'), /blocked external/);
    assert.throws(() => net.connect({host:'example.test',port:80}), /blocked external/);
    const server = http.createServer((_request, response) => response.end('local-only'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const response = await fetch('http://127.0.0.1:' + server.address().port);
      assert.equal(await response.text(), 'local-only');
    } finally { await new Promise(resolve => server.close(resolve)); }
  `;
  execFileSync(process.execPath, ['--import', resolve(root, 'tests/isolated/egress.mjs'), '--input-type=module', '-e', script], { stdio: 'pipe', timeout: 10000 });
});

test('sanitized diagnostics disclose only bounded source coordinates and SQLSTATE', () => {
  assert.deepEqual(safeDiagnostics('bootstrap', 'psql:<stdin>:123: ERROR: 42P01\nsecret payload'), [{ step: 'bootstrap', line: 123, sqlstate: '42P01' }]);
  assert.deepEqual(safeDiagnostics('build', 'src/lib/file.ts(12,4): error TS2322: private payload'), [{ step: 'build', file: 'src/lib/file.ts', line: 12, column: 4, code: 'TS2322' }]);
  assert.equal(JSON.stringify(safeDiagnostics('build', 'http://secret.example.test/token=private')).includes('private'), false);
  assert.equal(safeDiagnostics('bootstrap', 'psql:<stdin>:123: ERROR: 42P01\n'.repeat(30)).length, 12);
  assert.throws(() => safeDiagnostics('raw-secrets', ''), /Unregistered/);
  assert.deepEqual(safeTestOutput('ISOLATED_CASE {"line":23,"status":"failed","secret":"private"}'), ['ISOLATED_CASE {"line":23,"status":"failed"}']);
  assert.deepEqual(safeTestOutput('ISOLATED_CASE {"line":23,"status":"private"}'), []);
  assert.equal(safeTestOutput('{"passed":244,"failed":0,"skipped":100,"flaky":0,"globalErrors":0,"runStatus":"passed","secret":"private"}')[0], 'ISOLATED_LEGACY_SUMMARY {"passed":244,"failed":0,"skipped":100,"flaky":0,"globalErrors":0,"status":"passed","syntheticOnly":true}');
});

test('legacy canonical expansion validates added columns and rejects missing source anchors', () => {
  const sql = buildLegacyBootstrap(root);
  assert.ok(sql.includes(readFileSync(resolve(root, 'supabase/migrations/20260724214205_harden_tenant_and_storage_access.sql'), 'utf8')));
  assert.ok(sql.includes(readFileSync(resolve(root, 'supabase/migrations/20260724214245_atomic_claim_transitions.sql'), 'utf8')));
  const fixture = mkdtempSync(resolve(tmpdir(), 'warrantee-source-contract-'));
  try {
    mkdirSync(resolve(fixture, 'src/types'), { recursive: true });
    mkdirSync(resolve(fixture, 'tests/isolated'), { recursive: true });
    mkdirSync(resolve(fixture, 'supabase'), { recursive: true });
    cpSync(resolve(root, 'src/types/database.ts'), resolve(fixture, 'src/types/database.ts'));
    cpSync(resolve(root, 'supabase/migrations'), resolve(fixture, 'supabase/migrations'), { recursive: true });
    const base = readFileSync(resolve(root, 'tests/isolated/legacy-base.sql'), 'utf8');
    writeFileSync(resolve(fixture, 'tests/isolated/legacy-base.sql'), `${base}\nalter table public.warranties add column invented_column text;`);
    assert.throws(() => buildLegacyBootstrap(fixture), /type contract/i);
    writeFileSync(resolve(fixture, 'tests/isolated/legacy-base.sql'), base);
    const claimsPath = resolve(fixture, 'supabase/migrations/20260327190110_claims_workflow_tables_and_policies.sql');
    writeFileSync(claimsPath, readFileSync(claimsPath, 'utf8').replace('-- Add severity', '-- intentionally missing source anchor'));
    assert.throws(() => buildLegacyBootstrap(fixture), /source anchor missing/);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test('workflow has no secrets, caches, persisted artifacts, production QA or dispatch to other workflows', () => {
  const workflow = readFileSync(resolve(root, '.github/workflows/signup-journey.yml'), 'utf8');
  assert.match(workflow, /ubuntu-24\.04/);
  assert.match(workflow, /codex\/signup-first-warranty-reliability/);
  assert.doesNotMatch(workflow, /secrets\.|actions\/cache|upload-artifact|download-artifact|qa:user:|gh workflow|repository_dispatch|pull_request_target|cache:\s*["']?npm/);
  assert.match(workflow, /persist-credentials: false/);
  const runner = readFileSync(resolve(root, 'scripts/run-isolated-signup-journey.mjs'), 'utf8');
  assert.match(runner, /supabase@2\.84\.2/);
  assert.match(runner, /'stop', '--no-backup', '--project-id', project/);
  assert.doesNotMatch(runner, /dotenv|\.env\.production|qa:user:|npm ci|--linked/);
});

test('actual DB contracts gate requires every registered file and minimum, no skips/todos or empty success', () => {
  const total = Object.values(DATABASE_CONTRACT_MINIMUMS).reduce((sum, count) => sum + count, 0);
  const testResults = Object.entries(DATABASE_CONTRACT_MINIMUMS).map(([file, count]) => ({ name: `/synthetic/${file}`, assertionResults: Array.from({ length: count }, () => ({ status: 'passed' })) }));
  const report = { success: true, numTotalTests: total, numPassedTests: total, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, testResults };
  assert.equal(databaseTestSummary(JSON.stringify(report)).status, 'passed');
  for (const changed of [{ numTotalTests: 0, numPassedTests: 0 }, { numPendingTests: 1 }, { numTodoTests: 1 }, { success: false }, { numPassedTests: 22 }, { numFailedTests: 1 }]) {
    assert.equal(databaseTestSummary(JSON.stringify({ ...report, ...changed })).status, 'failed');
  }
  assert.equal(databaseTestSummary('raw sensitive failure').status, 'failed');
  assert.equal(databaseTestSummary(JSON.stringify({ ...report, testResults: testResults.slice(0, 1) })).status, 'failed');
  assert.equal(databaseTestSummary(JSON.stringify({ ...report, testResults: testResults.map((result) => ({ ...result, assertionResults: result.assertionResults.slice(0, 1) })) })).status, 'failed');
  const failures = testResults.map((result) => ({ ...result, assertionResults: result.assertionResults.map(() => ({ status: 'failed', title: 'private', failureMessages: ['private session rows'] })) }));
  const sanitized = databaseTestSummary(JSON.stringify({ ...report, success: false, testResults: failures }));
  assert.equal(sanitized.failedCases.length, 12);
  assert.deepEqual(sanitized.failedCases[0], { file: Object.keys(DATABASE_CONTRACT_MINIMUMS)[0], assertionIndex: 1 });
  assert.deepEqual(sanitized.failedCases[6], { file: Object.keys(DATABASE_CONTRACT_MINIMUMS)[1], assertionIndex: 1 });
  assert.doesNotMatch(JSON.stringify(sanitized), /private|session|title|failureMessages/);
});

test('browser summaries enforce ten real journeys and the full legacy active-case minimum', () => {
  const summary = { passed: 10, failed: 0, skipped: 0, flaky: 0, globalErrors: 0, status: 'passed' };
  assert.equal(validateJourneySummary(`ISOLATED_SUMMARY ${JSON.stringify(summary)}`, 10), true);
  assert.equal(validateJourneySummary(`ISOLATED_SUMMARY ${JSON.stringify({ ...summary, skipped: 1 })}`, 10), false);
  assert.equal(validateJourneySummary('', 10), false);
  const legacy = { passed: 246, failed: 0, skipped: 0, flaky: 0, globalErrors: 0, runStatus: 'passed' };
  assert.equal(validateJourneySummary(JSON.stringify(legacy), 246, true), true);
  assert.equal(validateJourneySummary(`ISOLATED_LEGACY_SUMMARY ${JSON.stringify({ ...summary, passed: 246 })}`, 246, true), true);
  assert.equal(validateJourneySummary(`ISOLATED_SUMMARY ${JSON.stringify({ ...summary, passed: 246 })}`, 246, true), false);
  assert.equal(validateJourneySummary(`ISOLATED_LEGACY_SUMMARY ${JSON.stringify({ ...summary, passed: 246, skipped: 1 })}`, 246, true), false);
  for (const changed of [{ passed: 245 }, { failed: 1 }, { flaky: 1 }, { globalErrors: 1 }, { runStatus: 'failed' }]) {
    assert.equal(validateJourneySummary(JSON.stringify({ ...legacy, ...changed }), 246, true), false);
  }
});

test('actual reporter chooses the right prefix and fails below 246 cases or on any skip', () => {
  const script = `
    import Reporter from ${JSON.stringify(new URL('./reporter.ts', import.meta.url).href)};
    const reporter = new Reporter();
    const expected = Number(process.env.TEST_EXPECTED);
    const skipped = Number(process.env.TEST_SKIPPED);
    reporter.onBegin({}, { allTests: () => [
      ...Array.from({length: expected}, () => ({ outcome: () => 'expected' })),
      ...Array.from({length: skipped}, () => ({ outcome: () => 'skipped' })),
    ] });
    const result = await reporter.onEnd({status:'passed'});
    process.exitCode = result?.status === 'failed' ? 1 : 0;
  `;
  for (const scenario of [
    { expected: 246, skipped: 0, minimum: '246', legacy: true, success: true },
    { expected: 245, skipped: 0, minimum: '246', legacy: true, success: false },
    { expected: 246, skipped: 1, minimum: '246', legacy: true, success: false },
    { expected: 10, skipped: 0, minimum: '10', legacy: false, success: true },
  ]) {
    let output;
    let success = true;
    try {
      output = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], {
        encoding: 'utf8', stdio: 'pipe', env: {
          E2E_SUITE: scenario.legacy ? 'isolated-regression' : '', ISOLATED_MIN_CASES: scenario.minimum,
          TEST_EXPECTED: String(scenario.expected), TEST_SKIPPED: String(scenario.skipped),
        },
      });
    } catch (error) { success = false; output = String(error.stdout); }
    assert.equal(success, scenario.success);
    assert.equal(validateJourneySummary(output, Number(scenario.minimum), scenario.legacy), scenario.success);
  }
});
