import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { access, readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const VERSION = '1.60.0';
export const IMAGE = `mcr.microsoft.com/playwright:v${VERSION}-noble`;
const ROOT = '/ms-playwright';
const NAMES = ['chromium', 'firefox', 'webkit'];
const HTML = '<!doctype html><html><head><title>Runtime check</title></head><body><p>runtime-ok</p></body></html>';
const require = createRequire(import.meta.url);

export function assertCiEnvironment(env, platform) {
  assert.equal(env.WARRANTEE_CI_BROWSER_RUNTIME, '1', 'Explicit runtime opt-in required');
  assert.equal(env.CI, 'true', 'CI required');
  assert.equal(platform, 'linux', 'Linux required');
  assert.ok(!Object.keys(env).some((key) => key === 'VERCEL' || key.startsWith('VERCEL_')), 'Vercel environment prohibited');
  assert.equal(env.PLAYWRIGHT_BROWSERS_PATH, ROOT, 'Container browser path required');
}

export async function checkBrowserRuntime({
  env = process.env,
  platform = process.platform,
  readVersion = () => require('@playwright/test/package.json').version,
  readDockerInfo = async () => JSON.parse(await readFile(`${ROOT}/.docker-info`, 'utf8')),
  loadEngines = () => import('@playwright/test'),
  resolvePath = realpath,
  checkExecutable = (path) => access(path, constants.X_OK),
  onStage = () => {},
} = {}) {
  onStage('environment');
  assertCiEnvironment(env, platform);
  onStage('package');
  assert.equal(await readVersion(), VERSION, 'Playwright version mismatch');
  onStage('container_metadata');
  const info = await readDockerInfo();
  assert.equal(info?.driverVersion, VERSION, 'Container driver version mismatch');
  assert.equal(info?.dockerImageName, IMAGE, 'Container image name mismatch');
  const engines = await loadEngines();
  onStage('binaries');
  for (const name of NAMES) {
    const path = engines[name].executablePath();
    assert.ok(path.startsWith(`${ROOT}/`) && posix.normalize(path) === path, 'Executable outside container browser path');
    assert.ok((await resolvePath(path)).startsWith(`${ROOT}/`), 'Executable resolves outside container browser path');
    await checkExecutable(path);
  }
  for (const name of NAMES) {
    onStage(`launch_${name}`);
    const browser = await engines[name].launch({ headless: true, timeout: 30_000 });
    let context;
    try {
      context = await browser.newContext({ offline: true, serviceWorkers: 'block' });
      await context.route('**/*', (route) => route.abort());
      const page = await context.newPage();
      onStage(`fixture_${name}`);
      await page.setContent(HTML, { waitUntil: 'load', timeout: 10_000 });
      assert.equal(await page.title(), 'Runtime check', 'Local fixture mismatch');
      assert.equal(await page.locator('p').textContent(), 'runtime-ok', 'Local fixture mismatch');
    } finally {
      try { await context?.close(); } finally { await browser.close(); }
    }
  }
  return { version: VERSION, image: IMAGE, browsers: NAMES.map((name) => ({ name, status: 'PASS' })) };
}

export async function main({ check, log = console.log, error = console.error } = {}) {
  try {
    const result = await (check ? check() : checkBrowserRuntime({ onStage: (stage) => log(JSON.stringify({ runtime_stage: stage })) }));
    log(JSON.stringify(result));
    return 0;
  } catch {
    // Browser errors can contain environment values, paths, and process arguments.
    error('Warrantee CI browser runtime: FAIL');
    return 1;
  }
}

export function isMain(url = import.meta.url, argv = process.argv) {
  return Boolean(argv[1]) && url === pathToFileURL(resolve(argv[1])).href;
}

if (isMain()) process.exitCode = await main();
