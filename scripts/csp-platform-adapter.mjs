import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { finalizeBuild } from "./csp-finalize-build.mjs";

const self = realpathSync(fileURLToPath(import.meta.url));

export function createCspPlatformAdapter({
  upstreamPath = process.env.NEXT_ADAPTER_PATH,
  loadModule = (url) => import(url),
  finalize = finalizeBuild,
} = {}) {
  let upstreamPromise;
  function upstream() {
    if (!upstreamPromise) {
      upstreamPromise = (async () => {
        if (!upstreamPath || !path.isAbsolute(upstreamPath)) {
          throw new Error("CSP adapter requires an absolute platform NEXT_ADAPTER_PATH");
        }
        const resolved = realpathSync(upstreamPath);
        if (resolved === self) throw new Error("Recursive CSP platform adapter");
        const imported = await loadModule(pathToFileURL(resolved).href);
        const adapter = imported.default?.default ?? imported.default ?? imported;
        if (!adapter || typeof adapter.onBuildComplete !== "function") {
          throw new Error("Platform adapter must provide onBuildComplete");
        }
        return adapter;
      })();
    }
    return upstreamPromise;
  }

  return {
    name: "warrantee-csp-platform-adapter",
    async modifyConfig(...args) {
      const adapter = await upstream();
      return typeof adapter.modifyConfig === "function"
        ? adapter.modifyConfig.apply(adapter, args) : args[0];
    },
    async onBuildComplete(ctx) {
      const adapter = await upstream();
      const middleware = ctx.outputs?.middleware;
      if (!middleware || middleware.runtime !== "nodejs" || !middleware.assets
          || typeof middleware.assets !== "object" || Array.isArray(middleware.assets)) {
        throw new Error("CSP adapter requires Node Proxy assets");
      }
      const project = realpathSync(ctx.projectDir);
      const repo = realpathSync(ctx.repoRoot);
      if (path.dirname(realpathSync(ctx.distDir)) !== project) {
        throw new Error("CSP build directory must belong to the current project");
      }
      const artifact = path.join(project, ".warrantee-csp/static-routes.json");
      const relative = path.relative(repo, artifact);
      if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error("CSP artifact is outside the platform repository");
      }
      // Next assets map destination paths relative to repoRoot to absolute sources.
      const key = relative.split(path.sep).join("/");
      finalize(ctx.distDir);
      finalize(ctx.distDir, { check: true });
      const manifest = JSON.parse(readFileSync(artifact, "utf8"));
      if (manifest.schemaVersion !== 1 || manifest.complete !== true
          || manifest.buildId !== ctx.buildId || !manifest.routes) {
        throw new Error("CSP artifact does not match the current platform build");
      }
      middleware.assets[key] = artifact;
      // The platform must read the finalized bytes, not reuse a placeholder digest.
      if (middleware.assetsHashes) delete middleware.assetsHashes[key];
      return adapter.onBuildComplete.call(adapter, ctx);
    },
  };
}

export default createCspPlatformAdapter();
