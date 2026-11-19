import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCiEnvironment, checkBrowserRuntime, IMAGE, isMain, main, VERSION } from './check-ci-browser-runtime.mjs';

const names = ['chromium', 'firefox', 'webkit'];
const environment = () => ({ WARRANTEE_CI_BROWSER_RUNTIME: '1', CI: 'true', PLAYWRIGHT_BROWSERS_PATH: '/ms-playwright' });

function fixture(failAt) {
  const events = [];
  const step = (name) => {
    events.push(name);
    if (name === failAt) throw new Error('synthetic-private-value');
  };
  const engines = Object.fromEntries(names.map((name) => [name, {
    executablePath: () => `/ms-playwright/${name}/browser`,
    async launch(options) {
      assert.deepEqual(options, { headless: true, timeout: 30_000 });
      step(`${name}:launch`);
      return {
        async newContext(options) {
          assert.deepEqual(options, { offline: true, serviceWorkers: 'block' });
          step(`${name}:context`);
          return {
            async route(pattern, handler) {
              assert.equal(pattern, '**/*');
              let aborted = false;
              await handler({ abort: async () => { aborted = true; } });
              assert.equal(aborted, true);
            },
            async newPage() {
              step(`${name}:page`);
              return {
                async setContent(html, options) {
                  assert.equal(html, '<!doctype html><html><head><title>Runtime check</title></head><body><p>runtime-ok</p></body></html>');
                  assert.deepEqual(options, { waitUntil: 'load', timeout: 10_000 });
                  step(`${name}:content`);
                },
                title: async () => 'Runtime check',
                locator: (selector) => {
                  assert.equal(selector, 'p');
                  return { textContent: async () => { step(`${name}:text`); return 'runtime-ok'; } };
                },
              };
            },
            close: async () => step(`${name}:context-close`),
          };
        },
        close: async () => step(`${name}:browser-close`),
      };
    },
  }]));
  return { events, engines, deps: {
    env: environment(), platform: 'linux',
    readVersion: () => { step('version'); return VERSION; },
    readDockerInfo: async () => { step('metadata'); return { driverVersion: VERSION, dockerImageName: IMAGE }; },
    loadEngines: async () => { step('engines'); return engines; },
    resolvePath: async (path) => path,
    checkExecutable: async (path) => step(`executable:${path}`),
  } };
}

test('environment gates fail before package, filesystem, or browser access', async () => {
  for (const change of [
    { env: {} }, { env: { ...environment(), WARRANTEE_CI_BROWSER_RUNTIME: '0' } },
    { env: { ...environment(), CI: '1' } }, { platform: 'darwin' }, { platform: 'win32' },
    { env: { ...environment(), VERCEL: '1' } }, { env: { ...environment(), VERCEL_ENV: 'production' } },
    { env: { ...environment(), VERCEL: '' } }, { env: { ...environment(), VERCEL_TOKEN: 'synthetic-private-value' } },
    { env: { ...environment(), PLAYWRIGHT_BROWSERS_PATH: '/tmp/browsers' } },
  ]) {
    const { deps, events } = fixture();
    await assert.rejects(checkBrowserRuntime({ ...deps, ...change }));
    assert.deepEqual(events, []);
  }
  assert.doesNotThrow(() => assertCiEnvironment(environment(), 'linux'));
});

test('rejects package and container metadata mismatches before loading browsers', async () => {
  for (const change of [
    { readVersion: () => '1.59.0' },
    ...[null, {}, { driverVersion: '1.59.0', dockerImageName: IMAGE },
      { driverVersion: VERSION, dockerImageName: `${IMAGE}-untrusted` }]
      .map((info) => ({ readDockerInfo: async () => info })),
    { readDockerInfo: async () => JSON.parse('{') },
    { readDockerInfo: async () => { throw new Error('missing metadata'); } },
  ]) {
    const { deps, events } = fixture();
    await assert.rejects(checkBrowserRuntime({ ...deps, ...change }));
    assert.equal(events.includes('engines'), false);
  }
});

test('rejects escaped, symlinked, missing, or non-executable binaries before any launch', async () => {
  for (const path of ['/tmp/browser', '/ms-playwright-evil/browser', '/ms-playwright/../tmp/browser', '/ms-playwright']) {
    const { deps, engines, events } = fixture();
    engines.webkit.executablePath = () => path;
    await assert.rejects(checkBrowserRuntime(deps));
    assert.equal(events.some((event) => event.endsWith(':launch')), false);
  }
  for (const change of [
    { resolvePath: async () => '/tmp/browser' },
    { resolvePath: async () => { throw new Error('missing binary'); } },
    { checkExecutable: async () => { throw new Error('not executable'); } },
  ]) {
    const { deps, events } = fixture();
    await assert.rejects(checkBrowserRuntime({ ...deps, ...change }));
    assert.equal(events.some((event) => event.endsWith(':launch')), false);
  }
});

test('runs all three engines sequentially using only local fixed HTML and closes resources', async () => {
  const { deps, events } = fixture();
  assert.deepEqual(await checkBrowserRuntime(deps), {
    version: VERSION, image: IMAGE, browsers: names.map((name) => ({ name, status: 'PASS' })),
  });
  assert.deepEqual(events.slice(6), names.flatMap((name) =>
    ['launch', 'context', 'page', 'content', 'text', 'context-close', 'browser-close'].map((step) => `${name}:${step}`)));
});

test('diagnostic stages contain fixed categories only', async () => {
  const { deps } = fixture();
  const stages = [];
  await checkBrowserRuntime({ ...deps, onStage: (stage) => stages.push(stage) });
  assert.deepEqual(stages, ['environment', 'package', 'container_metadata', 'binaries',
    ...names.flatMap((name) => [`launch_${name}`, `fixture_${name}`])]);
});

test('closes resources on failures and never starts the next engine', async () => {
  for (const stage of ['launch', 'context', 'page', 'content', 'text', 'context-close', 'browser-close']) {
    const { deps, events } = fixture(`chromium:${stage}`);
    await assert.rejects(checkBrowserRuntime(deps));
    assert.equal(events.includes('firefox:launch'), false);
    assert.equal(events.includes('chromium:browser-close'), stage !== 'launch');
    assert.equal(events.includes('chromium:context-close'), !['launch', 'context'].includes(stage));
  }
});

test('CLI emits only allowlisted pass metadata or a fixed failure message', async () => {
  const { deps } = fixture();
  const output = [];
  const error = [];
  assert.equal(await main({ check: () => checkBrowserRuntime(deps), log: (line) => output.push(line), error: (line) => error.push(line) }), 0);
  assert.deepEqual(JSON.parse(output[0]), { version: VERSION, image: IMAGE, browsers: names.map((name) => ({ name, status: 'PASS' })) });
  assert.deepEqual(error, []);
  output.length = 0;
  assert.equal(await main({ check: async () => { throw new Error('synthetic-private-value'); }, log: (line) => output.push(line), error: (line) => error.push(line) }), 1);
  assert.deepEqual(output, []);
  assert.deepEqual(error, ['Warrantee CI browser runtime: FAIL']);
});

test('isMain distinguishes direct execution from import', () => {
  assert.equal(isMain('file:///tmp/guard.mjs', ['node', '/tmp/guard.mjs']), true);
  assert.equal(isMain('file:///tmp/guard.mjs', ['node', '/tmp/test.mjs']), false);
  assert.equal(isMain('file:///tmp/guard.mjs', ['node']), false);
});
