import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import { runInNewContext } from "node:vm";
import { buildGaBootstrap, buildGtmBootstrap } from "../../src/lib/analytics-bootstrap.mjs";
import { generateAnalyticsBootstrap } from "../../scripts/generate-analytics-bootstrap.mjs";

function execute(source, saved = null, existingGtag, options = {}) {
  const scripts = [];
  const listeners = {};
  const storage = { value: saved, writable: options.writable ?? true };
  const window = {
    dataLayer: [],
    gtag: existingGtag,
    __warranteeConsentStorageFailed: options.memoryDenied ?? false,
    localStorage: { getItem: () => storage.value, setItem: (_key, value) => { if (!storage.writable) throw new Error('Storage read-only'); storage.value = value; } },
    location: { href: "https://warrantee.io/en/pricing?token=private#private", pathname: "/en/pricing" },
    URL,
    history: {
      pushState(_state, _unused, value) { window.location.pathname = new URL(value, window.location.href).pathname; return 'preserved'; },
      replaceState(_state, _unused, value) { window.location.pathname = new URL(value, window.location.href).pathname; },
    },
    addEventListener: (name, callback) => { listeners[name] = callback; },
    document: {
      title: "Pricing",
      referrer: "https://reference.example.invalid/private?email=private@example.invalid",
      createElement: () => ({}),
      head: { appendChild: (script) => scripts.push(script) },
      getElementsByTagName: () => [{ parentNode: { insertBefore: (script) => scripts.push(script) } }],
    },
  };
  window.window = window;
  runInNewContext(source, window);
  return { window, scripts, storage, update: () => listeners.warrantee_cookie_consent_updated(), dispatch: (name, event) => listeners[name](event) };
}

for (const [name, builder, id] of [
  ["GA", buildGaBootstrap, "G-ZQJ4LRG4GN"],
  ["GTM", (id) => buildGtmBootstrap(id, "G-ZQJ4LRG4GN"), "GTM-WFLBH83M"],
]) {
  test(`${name} rejects unsafe and wrong-kind identifiers`, () => {
    for (const value of [undefined, null, "", "G-ABC';alert(1)//", "GTM-X</script>", "G-X\n", " GTM-X", "GTM-abc", "GT-X", "G-X?secret=value"]) {
      assert.throws(() => builder(value), /Invalid public analytics identifier/);
    }
    assert.throws(() => builder(name === "GA" ? "GTM-ABC" : "G-ABC"));
    assert.doesNotThrow(() => new Function(builder(id)));
  });

  test(`${name} defaults denied and preserves one-time loading and withdrawal`, () => {
    for (const saved of [null, "null", "[]", "malformed", JSON.stringify({ analytics: false, marketing: false })]) {
      const state = execute(builder(id), saved);
      assert.equal(state.scripts.length, 0);
      const initial = state.window.dataLayer.find(command => command[0] === "consent");
      assert.equal(initial[1], "default");
      assert.equal(initial[2].analytics_storage, "denied");
      assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], true);
      state.storage.value = JSON.stringify({ analytics: true, marketing: false });
      state.update();
      state.update();
      assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], false);
      assert.equal(state.scripts.length, 1);
      assert.equal(state.scripts[0].async, true);
      assert.equal(state.scripts[0].src, name === "GA"
        ? `https://www.googletagmanager.com/gtag/js?id=${id}`
        : `https://www.googletagmanager.com/gtm.js?id=${id}`);
      state.storage.value = JSON.stringify({ analytics: false, marketing: false });
      state.update();
      assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], true);
      assert.equal(state.scripts.length, 1);
      const last = state.window.dataLayer.at(-1);
      assert.equal(last[1], "update");
      for (const value of Object.values(last[2])) assert.equal(value, "denied");
      const configs = state.window.dataLayer.filter((command) => command[0] === "config");
      assert.equal(configs.length, name === "GA" ? 1 : 0);
      if (name === "GA") {
        assert.equal(configs[0][1], id);
        assert.equal(configs[0][2].send_page_view, true);
      }
      const context = state.window.dataLayer.filter(command => command[0] === "set").at(-1)[1];
      assert.equal(context.page_location, "https://warrantee.io/en/pricing");
      assert.equal(context.page_referrer, "https://reference.example.invalid");
      assert.equal(context.page_title, "Warrantee");
    }
  });

  test(`${name} requires analytics consent even when marketing consent is present`, () => {
    assert.equal(execute(builder(id), JSON.stringify({ analytics: false, marketing: true })).scripts.length, 0);
    assert.equal(execute(builder(id), JSON.stringify({ analytics: "false", marketing: "true" })).scripts.length, 0);
    assert.equal(execute(builder(id), JSON.stringify({ analytics: true, marketing: false })).scripts.length, 1);
  });

  test(`${name} records only sanitized pathname changes while consent is granted`, () => {
    const state = execute(builder(id), JSON.stringify({ analytics: true, marketing: false }));
    const pageviews = () => state.window.dataLayer.filter(command => command[0] === 'event' && command[1] === 'page_view');
    assert.equal(pageviews().length, 0, 'the Google tag alone owns the initial pageview');
    assert.equal(state.window.history.pushState({}, '', '/en/pricing?token=secret'), 'preserved');
    state.dispatch('hashchange');
    assert.equal(pageviews().length, 0);
    state.window.history.pushState({}, '', '/ar/pricing?email=secret#secret');
    assert.equal(pageviews().length, 1);
    assert.equal(pageviews()[0][2].page_location, 'https://warrantee.io/ar/pricing');
    assert.equal(pageviews()[0][2].page_referrer, 'https://reference.example.invalid');
    assert.equal(pageviews()[0][2].send_to, 'G-ZQJ4LRG4GN');
    state.storage.value = JSON.stringify({ analytics: false });
    state.update();
    state.window.history.pushState({}, '', '/en/dashboard/warranties/private-id');
    state.dispatch('popstate');
    assert.equal(pageviews().length, 1);
    state.storage.value = JSON.stringify({ analytics: true });
    state.update();
    state.window.history.replaceState({}, '', '/en/dashboard/warranties/another-private-id');
    assert.equal(pageviews().length, 2);
    assert.equal(pageviews()[1][2].page_location, 'https://warrantee.io/en/[other]');
    assert.equal(state.scripts.length, 1);
    assert.ok(!JSON.stringify(pageviews()).includes('private-id'));
  });

  test(`${name} preserves the original global gtag replacement behavior`, () => {
    const existing = () => {};
    const actual = execute(builder(id), null, existing).window.gtag;
    // Direct GA's original top-level declaration replaces the global binding.
    if (name === "GA") assert.notEqual(actual, existing);
    else assert.equal(actual, existing);
  });

  test(`${name} revalidates cross-tab consent without loading duplicate tags`, () => {
    const state = execute(builder(id), JSON.stringify({ analytics: true }));
    state.storage.value = JSON.stringify({ analytics: false });
    state.dispatch('storage', { key: 'unrelated' });
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], false);
    state.dispatch('storage', { key: 'warrantee_cookie_consent' });
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], true);
    state.storage.value = JSON.stringify({ analytics: true });
    state.dispatch('storage', { key: 'warrantee_cookie_consent' });
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], false);
    state.storage.value = null;
    state.dispatch('storage', { key: null });
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], true);
    assert.equal(state.scripts.length, 1);
  });

  test(`${name} fails closed if consent storage becomes unavailable`, () => {
    const state = execute(builder(id), JSON.stringify({ analytics: true }));
    state.window.localStorage.getItem = () => { throw new Error('Storage unavailable'); };
    state.update();
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], true);
    assert.equal(state.scripts.length, 1);
  });

  test(`${name} does not initially load tags from a grant in read-only storage`, () => {
    const granted = JSON.stringify({ analytics: true, marketing: true });
    const state = execute(builder(id), granted, undefined, { writable: false });
    assert.equal(state.storage.value, granted, 'the old stored grant remains readable');
    assert.equal(state.window.__warranteeConsentStorageFailed, true);
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], true);
    assert.equal(state.scripts.length, 0);
    const consent = state.window.dataLayer.filter(command => command[0] === 'consent').at(-1)[2];
    for (const value of Object.values(consent)) assert.equal(value, 'denied');
    state.window.history.pushState({}, '', '/ar/pricing');
    assert.equal(state.window.dataLayer.filter(command => command[0] === 'event').length, 0);
  });

  test(`${name} keeps memory denial authoritative over a stored grant until explicitly cleared`, () => {
    const granted = JSON.stringify({ analytics: true, marketing: false });
    const state = execute(builder(id), granted, undefined, { memoryDenied: true });
    state.update();
    state.dispatch('storage', { key: 'warrantee_cookie_consent' });
    assert.equal(state.scripts.length, 0);
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], true);
    state.window.localStorage.setItem('warrantee_cookie_consent', granted);
    state.window.__warranteeConsentStorageFailed = false;
    state.update();
    state.update();
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], false);
    assert.equal(state.scripts.length, 1);
  });

  test(`${name} revokes a prior grant on failed persistence and re-enables without duplicate load only after explicit recovery`, () => {
    const granted = JSON.stringify({ analytics: true, marketing: false });
    const state = execute(builder(id), granted);
    assert.equal(state.scripts.length, 1);
    state.storage.writable = false;
    state.update();
    assert.equal(state.storage.value, granted);
    assert.equal(state.window.__warranteeConsentStorageFailed, true);
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], true);
    state.window.history.pushState({}, '', '/ar/pricing');
    assert.equal(state.window.dataLayer.filter(command => command[0] === 'event').length, 0);
    state.storage.writable = true;
    state.update();
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], true, 'writable storage alone cannot clear the memory denial');
    state.window.localStorage.setItem('warrantee_cookie_consent', granted);
    state.window.__warranteeConsentStorageFailed = false;
    state.update();
    state.update();
    state.window.history.pushState({}, '', '/en/pricing');
    assert.equal(state.window['ga-disable-G-ZQJ4LRG4GN'], false);
    assert.equal(state.window.dataLayer.filter(command => command[0] === 'event' && command[1] === 'page_view').length, 1);
    assert.equal(state.scripts.length, 1);
  });
}

test('GTM requires the known GA destination to enforce its opt-out boundary', () => {
  for (const ga of [undefined, '', 'GTM-ABC', 'G-ABC?private=value']) {
    assert.throws(() => buildGtmBootstrap('GTM-WFLBH83M', ga), /Invalid public analytics identifier/);
  }
});

test("generator writes deterministic public-only artifacts and clears stale enabled output", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "warrantee-analytics-test-"));
  try {
    const env = { NEXT_PUBLIC_GTM_ID: "GTM-WFLBH83M", NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-ZQJ4LRG4GN", PRIVATE_SECRET: "never-render-this" };
    await generateAnalyticsBootstrap({ env, outputDirectory });
    assert.equal(await readFile(join(outputDirectory, "ga.js"), "utf8"), buildGaBootstrap(env.NEXT_PUBLIC_GA_MEASUREMENT_ID));
    assert.equal(await readFile(join(outputDirectory, "gtm.js"), "utf8"), buildGtmBootstrap(env.NEXT_PUBLIC_GTM_ID, env.NEXT_PUBLIC_GA_MEASUREMENT_ID));
    await assert.rejects(generateAnalyticsBootstrap({ env: { NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-VALID", NEXT_PUBLIC_GTM_ID: "GTM-X';unsafe" }, outputDirectory }));
    assert.equal(await readFile(join(outputDirectory, "ga.js"), "utf8"), buildGaBootstrap(env.NEXT_PUBLIC_GA_MEASUREMENT_ID));
    await generateAnalyticsBootstrap({ env: {}, outputDirectory });
    for (const name of ["ga.js", "gtm.js"]) {
      const content = await readFile(join(outputDirectory, name), "utf8");
      assert.match(content, /^\/\/ Google .* is not configured\.\n$/);
      assert.ok(!content.includes(env.PRIVATE_SECRET));
    }
    assert.deepEqual((await readdir(outputDirectory)).sort(), ["ga.js", "gtm.js"]);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
