import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildBootstrap } from '../tests/isolated/bootstrap.mjs';
import { APP_URL, SUPABASE_URL, MAIL_URL, assertLoopback, assertDisposableBackend, maySnapshotSource } from '../tests/isolated/guard.mjs';
import { DATABASE_CONTRACT_MINIMUMS, databaseTestSummary, safeDiagnostics, safeTestOutput, validateJourneySummary } from '../tests/isolated/diagnostics.mjs';
import { prepareRealFonts } from '../tests/isolated/fonts.mjs';
import { createLegacyIdentity } from '../tests/isolated/legacy-identity.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkOnly = args.length === 1 && args[0] === '--check';
const run = args[0] === '--run';
const separator = args.indexOf('--');
if (!checkOnly && (!run || (args.length > 1 && (separator !== 1 || !args[2])))) {
  throw new Error('Usage: node scripts/run-isolated-signup-journey.mjs --check | --run [-- command args...]');
}
const sql = buildBootstrap(root, randomBytes(16).toString('hex'));
if (checkOnly) {
  console.log(`PASS: focused bootstrap source contracts (${sql.length} SQL bytes); no services contacted`);
  process.exit(0);
}
if (process.env.WARRANTEE_ISOLATED_E2E !== '1' || process.env.VERCEL !== undefined || process.env.VERCEL_ENV !== undefined) {
  throw new Error('Refusing to run without explicit isolated local opt-in, or on Vercel');
}
for (const [key, expected] of [
  ['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL], ['NEXT_PUBLIC_APP_URL', APP_URL], ['E2E_BASE_URL', APP_URL],
]) {
  if (process.env[key] !== undefined) assertLoopback(process.env[key], expected);
}

const cleanEnv = {};
for (const key of ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'CI', 'PLAYWRIGHT_BROWSERS_PATH']) {
  if (process.env[key]) cleanEnv[key] = process.env[key];
}
cleanEnv.NEXT_TELEMETRY_DISABLED = '1';
const children = new Set();
const childCompletion = new Map();
let currentStep = 'docker_preflight';
function stopChild(child, signal) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch { /* The process may already have exited. */ }
}
function command(executable, argv, options = {}) {
  return new Promise((resolveResult, reject) => {
    const { input, step = 'journey', minimumCases = 1, legacySummary = false, ...spawnOptions } = options;
    currentStep = step;
    const child = spawn(executable, argv, { cwd: root, env: cleanEnv, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'], ...spawnOptions });
    children.add(child);
    childCompletion.set(child, new Promise((done) => child.once('close', done)));
    let output = '';
    let errors = '';
    child.stdout.on('data', (chunk) => { if (output.length < 4_000_000) output += chunk; });
    // Never echo CLI status, build output, request logs, tokens, or raw test errors.
    child.stderr.on('data', (chunk) => { if (errors.length < 1_000_000) errors += chunk; });
    child.on('error', (error) => { reject(error); });
    child.stdin.on('error', () => {});
    child.on('close', (code) => {
      children.delete(child);
      childCompletion.delete(child);
      if (step === 'journey') {
        for (const line of safeTestOutput(output)) console.log(line);
        if (!validateJourneySummary(output, minimumCases, legacySummary)) {
          reject(new Error('Isolated browser summary absent, failed, or below the required active-case minimum'));
          return;
        }
      }
      if (step === 'database_contracts') {
        const summary = databaseTestSummary(output);
        console.log(`ISOLATED_DB_SUMMARY ${JSON.stringify(summary)}`);
        if (summary.status !== 'passed') {
          reject(new Error('Real isolated DB contracts failed or required per-file coverage is incomplete'));
          return;
        }
      }
      if (code !== 0) {
        for (const diagnostic of safeDiagnostics(step, `${output}\n${errors}`)) console.error(`ISOLATED_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
        reject(new Error(`Isolated step failed: ${step} (exit ${code})`));
      }
      else resolveResult(output);
    });
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

let temporary;
let cli;
let project;
let started = false;
let server;
let serverExit;
let cleaning;
async function cleanup() {
  if (cleaning) return cleaning;
  cleaning = (async () => {
    const active = [...children];
    const completions = active.map((child) => childCompletion.get(child));
    for (const child of active) stopChild(child, 'SIGTERM');
    let timer;
    if (active.length) {
      await Promise.race([Promise.all(completions), new Promise((done) => { timer = setTimeout(done, 5000); })]);
      clearTimeout(timer);
    }
    for (const child of active) if (children.has(child)) stopChild(child, 'SIGKILL');
    await Promise.all(completions);
    if (server) {
      stopChild(server, 'SIGTERM');
      await Promise.race([serverExit, new Promise((done) => { timer = setTimeout(done, 5000); })]);
      clearTimeout(timer);
      if (server.exitCode === null) stopChild(server, 'SIGKILL');
      await serverExit;
    }
    let stopError;
    if (started) {
      try { await command(cli[0], [...cli.slice(1), 'stop', '--no-backup', '--project-id', project, '--workdir', temporary], { step: 'cleanup' }); }
      catch (error) { stopError = error; }
    }
    if (temporary) rmSync(temporary, { recursive: true, force: true });
    if (stopError) throw stopError;
  })();
  return cleaning;
}
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => {
  try { await cleanup(); } finally { process.exit(1); }
});

try {
  // Preflight before copying/building; this Mac has no Docker and must fail honestly.
  await command('docker', ['info'], { step: 'docker_preflight' });
  cli = process.env.CI ? ['npx', '--yes', 'supabase@2.84.2'] : ['supabase'];
  const version = await command(cli[0], [...cli.slice(1), '--version'], { step: 'cli_version' });
  if (version.trim() !== '2.84.2') throw new Error('Isolated stack requires Supabase CLI 2.84.2');
  temporary = mkdtempSync(resolve(tmpdir(), 'warrantee-signup-'));
  const runId = randomBytes(16).toString('hex');
  project = `warrantee-signup-${runId.slice(0, 12)}`;
  await command(cli[0], [...cli.slice(1), 'init', '--workdir', temporary, '--yes'], { step: 'stack_init' });
  const config = readFileSync(resolve(root, 'tests/isolated/supabase.toml'), 'utf8')
    .replace('project_id = "warrantee-signup-isolated"', `project_id = "${project}"`);
  writeFileSync(resolve(temporary, 'supabase/config.toml'), config, { mode: 0o600 });
  started = true;
  console.log('Starting disposable GoTrue/Postgres/PostgREST/storage and local Mailpit');
  await command(cli[0], [...cli.slice(1), 'start', '--workdir', temporary, '--exclude',
    'imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'], { step: 'stack_start' });
  const status = JSON.parse(await command(cli[0], [...cli.slice(1), 'status', '--workdir', temporary, '--output', 'json'], { step: 'stack_status' }));
  assertLoopback(status.API_URL, SUPABASE_URL);
  assertLoopback(status.INBUCKET_URL, MAIL_URL);
  const databaseURL = new URL(status.DB_URL);
  if (!['127.0.0.1', 'localhost'].includes(databaseURL.hostname) || databaseURL.port !== '54322') {
    throw new Error('Refusing non-local Postgres');
  }
  const container = `supabase_db_${project}`;
  const inspected = JSON.parse(await command('docker', ['inspect', container], { step: 'database_identity' }));
  if (inspected.length !== 1 || inspected[0].Name !== `/${container}` || !inspected[0].State.Running) {
    throw new Error('Disposable database container identity mismatch');
  }
  await command('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres',
    '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--set', 'VERBOSITY=sqlstate', '--file=-'], { input: buildBootstrap(root, runId), step: 'bootstrap' });

  const app = resolve(temporary, 'app');
  mkdirSync(app);
  const inventory = (await command('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { step: 'source_inventory' })).split('\0').filter(Boolean);
  for (const file of new Set(inventory)) {
    if (!maySnapshotSource(file)) continue;
    const source = resolve(root, file);
    if (!lstatSync(source).isFile()) continue;
    const destination = resolve(app, file);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination);
  }
  // Dependency reads are shared; build output and all generated source stay in the snapshot.
  symlinkSync(resolve(root, 'node_modules'), resolve(app, 'node_modules'), 'dir');
  currentStep = 'font_dependencies';
  console.log('Prefetching exact current real IBM Plex Sans Arabic build dependencies');
  const fonts = await prepareRealFonts(app, resolve(temporary, 'font-dependencies'));
  console.log(`Verified real WOFF2 build assets: ${fonts.count}`);
  const env = {
    ...cleanEnv, WARRANTEE_ISOLATED_E2E: '1',
    NEXT_PUBLIC_APP_URL: APP_URL, E2E_BASE_URL: APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    ISOLATED_MAIL_URL: MAIL_URL, ISOLATED_RUN_ID: runId,
    RATE_LIMIT_ALLOW_MEMORY_FALLBACK: '1', WARRANTEE_DISABLE_SENTRY_NEXT_CONFIG: '1',
    NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'production',
    NEXT_FONT_GOOGLE_MOCKED_RESPONSES: fonts.responses,
    // No Google/CRM/Resend/Stripe/OCR/Redis/Sentry credentials or IDs are inherited.
    NODE_OPTIONS: `--import=${resolve(app, 'tests/isolated/egress.mjs')}`,
  };
  await assertDisposableBackend(env);
  if (separator === 1) {
    // Legacy CI owns this additive canonical expansion; never substitute stubs.
    const { buildLegacyBootstrap } = await import(pathToFileURL(resolve(root, 'tests/isolated/legacy-bootstrap.mjs')).href);
    const legacySQL = await buildLegacyBootstrap(root);
    if (typeof legacySQL !== 'string' || !legacySQL.trim()) throw new Error('Missing canonical legacy schema expansion');
    await command('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres',
      '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--set', 'VERBOSITY=sqlstate', '--file=-'], { input: legacySQL, step: 'bootstrap' });
    await assertDisposableBackend(env);
    Object.assign(env, await createLegacyIdentity(env));
  }
  console.log(`Running real guarded database contracts (minimum ${Object.values(DATABASE_CONTRACT_MINIMUMS).reduce((sum, count) => sum + count, 0)}; no skips)`);
  const databaseFiles = Object.keys(DATABASE_CONTRACT_MINIMUMS);
  for (const file of databaseFiles) {
    if (!lstatSync(resolve(app, file)).isFile()) throw new Error('Missing required isolated database contract source');
  }
  await command(process.execPath, [resolve(app, 'node_modules/vitest/vitest.mjs'), 'run',
    ...databaseFiles, '--maxWorkers=1', '--allowOnly=false', '--reporter=json'],
    { cwd: app, env, step: 'database_contracts' });
  console.log('Building real Next application with isolated keys and external integrations absent');
  await command('npm', ['run', 'build'], { cwd: app, env, step: 'build' });
  currentStep = 'server_readiness';
  server = spawn(process.execPath, [resolve(app, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3100'],
    { cwd: app, env, detached: process.platform !== 'win32', stdio: 'ignore' });
  serverExit = new Promise((done) => { server.once('exit', done); server.once('error', done); });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error('Isolated Next server exited before readiness');
    try {
      const response = await fetch(`${APP_URL}/en/auth?tab=signup`, { redirect: 'error', signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        const csp = response.headers.get('content-security-policy') || '';
        if (!csp.includes(SUPABASE_URL)) throw new Error('Missing strict isolated CSP allowance');
        ready = true;
        break;
      }
    } catch (error) {
      if (error.message === 'Missing strict isolated CSP allowance') throw error;
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  if (!ready) throw new Error('Isolated Next server did not become ready');
  console.log('Running local-only journey; external OAuth handshake NOT TESTED');
  const testCommand = separator === 1 ? args.slice(2) :
    [process.execPath, resolve(app, 'node_modules/@playwright/test/cli.js'), 'test', '--config=playwright.signup.config.ts'];
  const requestedMinimum = testCommand.find((arg) => /^ISOLATED_MIN_CASES=\d+$/.test(arg));
  const minimumCases = separator === 1 ? (requestedMinimum ? Number(requestedMinimum.split('=')[1]) : 1) : 10;
  await command(testCommand[0], testCommand.slice(1), { cwd: app, env, step: 'journey', minimumCases, legacySummary: separator === 1 });
  console.log('PASS: isolated command completed; disposing local data');
} catch (error) {
  console.error(`FAIL: isolated ${currentStep}${error.code === 'ENOENT' ? ' (required local executable unavailable)' : ''}; raw diagnostics suppressed`);
  process.exitCode = 1;
} finally {
  try { await cleanup(); } catch { console.error('FAIL: disposable stack cleanup failed'); process.exitCode = 1; }
}
