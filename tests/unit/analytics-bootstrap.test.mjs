import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import { runInNewContext } from "node:vm";
import { buildGaBootstrap, buildGtmBootstrap } from "../../src/lib/analytics-bootstrap.mjs";
import { generateAnalyticsBootstrap } from "../../scripts/generate-analytics-bootstrap.mjs";

function execute(source, saved = null, existingGtag) {
  const scripts = [];
  const listeners = {};
  const storage = { value: saved };
  const window = {
    dataLayer: [],
    gtag: existingGtag,
    localStorage: { getItem: () => storage.value },
    location: { href: "https://warrantee.io/en/pricing" },
    addEventListener: (name, callback) => { listeners[name] = callback; },
    document: {
      title: "Pricing",
      createElement: () => ({}),
      head: { appendChild: (script) => scripts.push(script) },
      getElementsByTagName: () => [{ parentNode: { insertBefore: (script) => scripts.push(script) } }],
    },
  };
  window.window = window;
  runInNewContext(source, window);
  return { window, scripts, storage, update: () => listeners.warrantee_cookie_consent_updated() };
}

for (const [name, builder, id] of [
  ["GA", buildGaBootstrap, "G-ZQJ4LRG4GN"],
  ["GTM", buildGtmBootstrap, "GTM-WFLBH83M"],
]) {
  test(`${name} rejects unsafe and wrong-kind identifiers`, () => {
    for (const value of [undefined, null, "", "G-ABC';alert(1)//", "GTM-X</script>", "G-X\n", " GTM-X", "GTM-abc", "GT-X", "G-X?secret=value"]) {
      assert.throws(() => builder(value), /Invalid public analytics identifier/);
    }
    assert.throws(() => builder(name === "GA" ? "GTM-ABC" : "G-ABC"));
    assert.doesNotThrow(() => new Function(builder(id)));
  });

  test(`${name} defaults denied and preserves one-time loading and withdrawal`, () => {
    for (const saved of [null, "malformed", JSON.stringify({ analytics: false, marketing: false })]) {
      const state = execute(builder(id), saved);
      assert.equal(state.scripts.length, 0);
      assert.equal(state.window.dataLayer[0][0], "consent");
      assert.equal(state.window.dataLayer[0][1], "default");
      assert.equal(state.window.dataLayer[0][2].analytics_storage, "denied");
      state.storage.value = JSON.stringify({ analytics: true, marketing: false });
      state.update();
      state.update();
      assert.equal(state.scripts.length, 1);
      assert.equal(state.scripts[0].async, true);
      assert.equal(state.scripts[0].src, name === "GA"
        ? `https://www.googletagmanager.com/gtag/js?id=${id}`
        : `https://www.googletagmanager.com/gtm.js?id=${id}`);
      state.storage.value = JSON.stringify({ analytics: false, marketing: false });
      state.update();
      assert.equal(state.scripts.length, 1);
      const last = state.window.dataLayer.at(-1);
      assert.equal(last[1], "update");
      for (const value of Object.values(last[2])) assert.equal(value, "denied");
      const configs = state.window.dataLayer.filter((command) => command[0] === "config");
      assert.equal(configs.length, name === "GA" ? 1 : 0);
      if (name === "GA") {
        assert.equal(configs[0][1], id);
        assert.equal(configs[0][2].send_page_view, true);
        assert.equal(configs[0][2].page_title, "Pricing");
        assert.equal(configs[0][2].page_location, state.window.location.href);
      }
    }
  });

  test(`${name} preserves marketing-only and saved analytics consent behavior`, () => {
    assert.equal(execute(builder(id), JSON.stringify({ analytics: false, marketing: true })).scripts.length,
      name === "GTM" ? 1 : 0);
    assert.equal(execute(builder(id), JSON.stringify({ analytics: true, marketing: false })).scripts.length, 1);
  });

  test(`${name} preserves the original global gtag replacement behavior`, () => {
    const existing = () => {};
    const actual = execute(builder(id), null, existing).window.gtag;
    // Direct GA's original top-level declaration replaces the global binding.
    if (name === "GA") assert.notEqual(actual, existing);
    else assert.equal(actual, existing);
  });
}

test("generator writes deterministic public-only artifacts and clears stale enabled output", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "warrantee-analytics-test-"));
  try {
    const env = { NEXT_PUBLIC_GTM_ID: "GTM-WFLBH83M", NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-ZQJ4LRG4GN", PRIVATE_SECRET: "never-render-this" };
    await generateAnalyticsBootstrap({ env, outputDirectory });
    assert.equal(await readFile(join(outputDirectory, "ga.js"), "utf8"), buildGaBootstrap(env.NEXT_PUBLIC_GA_MEASUREMENT_ID));
    assert.equal(await readFile(join(outputDirectory, "gtm.js"), "utf8"), buildGtmBootstrap(env.NEXT_PUBLIC_GTM_ID));
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
