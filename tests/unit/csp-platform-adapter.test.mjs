import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCspPlatformAdapter } from "../../scripts/csp-platform-adapter.mjs";

const directories = [];
const put = (root, file, value) => {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value));
};
function fixture(nested = false) {
  const repo = realpathSync(mkdtempSync(path.join(tmpdir(), "warrantee-csp-adapter-")));
  directories.push(repo);
  const project = nested ? path.join(repo, "apps/warrantee") : repo;
  const dist = path.join(project, ".next");
  put(project, ".next/BUILD_ID", "fixture-build");
  put(project, ".next/server/middleware.js.nft.json", { version: 1, files: [] });
  put(project, ".next/routes-manifest.json", { headers: [{ regex: "^/.*$", headers: [{ key: "Content-Security-Policy", value: "script-src 'self'" }] }] });
  put(project, ".next/prerender-manifest.json", { routes: { "/en": { initialRevalidateSeconds: false, dataRoute: "/en.rsc" } } });
  put(project, ".next/app-path-routes-manifest.json", { "/en/page": "/en" });
  put(project, ".next/server/app/en.html", "<script>window.fixture=1</script>");
  put(project, ".warrantee-csp/static-routes.json", { schemaVersion: 1, complete: false });
  const key = path.relative(repo, path.join(project, ".warrantee-csp/static-routes.json")).split(path.sep).join("/");
  const ctx = { repoRoot: repo, projectDir: project, distDir: dist, buildId: "fixture-build", outputs: { middleware: { runtime: "nodejs", assets: { "other.js": path.join(repo, "other.js") }, assetsHashes: { [key]: "stale-placeholder", "other.js": "keep-digest" } } } };
  const upstreamPath = path.join(repo, "platform.mjs");
  put(repo, "platform.mjs", "export default {};");
  return { ctx, key, project, upstreamPath };
}
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe("CSP platform adapter", () => {
  it.each([false, true])("finalizes before delegation and preserves other assets (nested=%s)", async (nested) => {
    const { ctx, key, project, upstreamPath } = fixture(nested);
    const hook = vi.fn(function (received) {
      expect(this.name).toBe("platform");
      expect(received).toBe(ctx);
      const artifact = received.outputs.middleware.assets[key];
      expect(artifact).toBe(path.join(project, ".warrantee-csp/static-routes.json"));
      const manifest = JSON.parse(readFileSync(artifact, "utf8"));
      expect(manifest.complete).toBe(true);
      expect(manifest.buildId).toBe(ctx.buildId);
      expect(manifest.routes["/en"].policy).toContain("sha256-");
      expect(received.outputs.middleware.assetsHashes).toEqual({ "other.js": "keep-digest" });
      expect(received.outputs.middleware.assets["other.js"]).toBe(path.join(ctx.repoRoot, "other.js"));
      return "packaged";
    });
    const adapter = createCspPlatformAdapter({ upstreamPath, loadModule: async () => ({ default: { name: "platform", onBuildComplete: hook } }) });
    expect(await adapter.onBuildComplete(ctx)).toBe("packaged");
    expect(hook).toHaveBeenCalledTimes(1);
  });
  it("delegates modifyConfig arguments, receiver, and result unchanged", async () => {
    const { upstreamPath } = fixture();
    const result = { untouched: true };
    const config = { original: true };
    const modifyConfig = vi.fn(function (...args) { expect(this.name).toBe("platform"); expect(args).toEqual([config, "second"]); return result; });
    const adapter = createCspPlatformAdapter({ upstreamPath, loadModule: async () => ({ default: { name: "platform", modifyConfig, onBuildComplete() {} } }) });
    expect(await adapter.modifyConfig(config, "second")).toBe(result);
  });
  it("imports an existing platform ESM module through Node", async () => {
    const { upstreamPath } = fixture();
    writeFileSync(upstreamPath, "export default {onBuildComplete(){}, modifyConfig(value){return value}};");
    const config = {};
    expect(await createCspPlatformAdapter({ upstreamPath }).modifyConfig(config)).toBe(config);
  });
  it("fails closed on missing upstream and direct recursion", async () => {
    await expect(createCspPlatformAdapter({ upstreamPath: "" }).modifyConfig({})).rejects.toThrow("NEXT_ADAPTER_PATH");
    const self = fileURLToPath(new URL("../../scripts/csp-platform-adapter.mjs", import.meta.url));
    await expect(createCspPlatformAdapter({ upstreamPath: self }).modifyConfig({})).rejects.toThrow("Recursive");
  });
  it("does not package failed finalization, mismatched builds, or non-Node Proxy", async () => {
    const { ctx, upstreamPath } = fixture();
    const hook = vi.fn();
    const options = { upstreamPath, loadModule: async () => ({ default: { onBuildComplete: hook } }) };
    await expect(createCspPlatformAdapter({ ...options, finalize() { throw new Error("invalid build"); } }).onBuildComplete(ctx)).rejects.toThrow("invalid build");
    ctx.buildId = "different-build";
    await expect(createCspPlatformAdapter(options).onBuildComplete(ctx)).rejects.toThrow("current platform build");
    ctx.outputs.middleware.runtime = "edge";
    await expect(createCspPlatformAdapter(options).onBuildComplete(ctx)).rejects.toThrow("Node Proxy");
    expect(hook).not.toHaveBeenCalled();
  });
});
