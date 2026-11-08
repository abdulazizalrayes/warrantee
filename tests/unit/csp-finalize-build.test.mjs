import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { finalizeBuild, inlineHashes } from "../../scripts/csp-finalize-build.mjs";

const dirs = [];
const temp = () => { const dir = mkdtempSync(path.join(tmpdir(), "warrantee-csp-")); dirs.push(dir); return dir; };
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const put = (root, file, value) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), typeof value === "string" ? value : JSON.stringify(value)); };
const policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline'";
function fixture() {
  const root = path.join(temp(), ".next");
  put(root, "BUILD_ID", "build-one");
  put(root, "server/middleware.js.nft.json", { version: 1, files: [] });
  put(root, "routes-manifest.json", { basePath: "", headers: [{ source: "/:path*", regex: "^/.*$", headers: [{ key: "Content-Security-Policy", value: policy }] }] });
  put(root, "prerender-manifest.json", { routes: { "/": { initialRevalidateSeconds: false, dataRoute: "/index.rsc" }, "/en/a%20b": { initialRevalidateSeconds: false, dataRoute: "/en/a%20b.rsc" }, "/data": { routeType: "route", dataRoute: null } } });
  put(root, "app-path-routes-manifest.json", { "/page": "/", "/en/a%20b/page": "/en/a%20b", "/data/route": "/data" });
  put(root, "server/app/index.html", "<script>window.first=1;</script><script src='/a.js'></script>");
  put(root, "server/app/en/a b.html", "<script>window.second=2;</script>");
  return root;
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("final-build CSP binding", () => {
  it("hashes original script text through a structured parser, preserving entities and normalizing newlines", () => {
    const source = "\nwindow.a='&amp;';\n";
    expect(inlineHashes(`<script>${source.replaceAll("\n", "\r\n")}</script><script src='/x'></script>`)).toEqual([
      `'sha256-${createHash("sha256").update(source).digest("base64")}'`,
    ]);
    expect(() => inlineHashes("<script>unclosed")).toThrow();
  });
  it("appends per-route rules without changing HTML or style/host allowances and checks idempotently", () => {
    const root = fixture();
    const before = readFileSync(path.join(root, "server/app/index.html"));
    expect(finalizeBuild(root, { applyRoutesManifest: true }).routes).toBe(2);
    const headers = json(path.join(root, "routes-manifest.json")).headers;
    expect(headers).toHaveLength(3);
    expect(headers[1].headers[0].value).toContain("style-src 'self' 'unsafe-inline'");
    expect(headers[1].headers[0].value).toContain("https://www.googletagmanager.com");
    expect(headers[1].headers[0].value).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(headers[1].headers[0].value).not.toContain(inlineHashes("<script>window.second=2;</script>")[0]);
    expect(headers[2].source).toBe("/en/a%20b");
    expect(readFileSync(path.join(root, "server/app/index.html"))).toEqual(before);
    expect(finalizeBuild(root, { check: true, applyRoutesManifest: true }).checked).toBe(true);
  });
  it("writes the agreed runtime map by default, preserves routes manifest and binds fallback HTML", () => {
    const root = fixture();
    const before = readFileSync(path.join(root, "routes-manifest.json"));
    const manifest = json(path.join(root, "prerender-manifest.json"));
    manifest.routes["/_not-found"] = { initialRevalidateSeconds: false, srcRoute: "/_not-found", dataRoute: "/_not-found.rsc" };
    put(root, "prerender-manifest.json", manifest);
    const appRoutes = json(path.join(root, "app-path-routes-manifest.json"));
    appRoutes["/_not-found/page"] = "/_not-found"; put(root, "app-path-routes-manifest.json", appRoutes);
    put(root, "server/app/_not-found.html", "<script>window.fallback=1;</script>");
    put(root, "server/pages/500.html", "<h1>Server error</h1>");
    const artifactPath = path.join(path.dirname(root), ".warrantee-csp/static-routes.json");
    put(path.dirname(root), ".warrantee-csp/static-routes.json", { schemaVersion: 1, complete: false });
    expect(finalizeBuild(root).routes).toBe(4);
    const artifact = json(artifactPath);
    expect(Object.keys(artifact)).toEqual(["schemaVersion", "complete", "buildId", "routes", "fallbackHashes"]);
    expect(artifact.buildId).toBe("build-one");
    expect(artifact.complete).toBe(true);
    expect(artifact.routes["/_not-found"].policy).toContain(inlineHashes("<script>window.fallback=1;</script>")[0]);
    expect(artifact.fallbackHashes).toEqual(inlineHashes("<script>window.fallback=1;</script>"));
    expect(artifact.fallbackHashes).not.toContain(inlineHashes("<script>window.first=1;</script>")[0]);
    expect(artifact.routes["/500"].htmlSha256).toBe(createHash("sha256").update("<h1>Server error</h1>").digest("hex"));
    expect(readFileSync(path.join(root, "routes-manifest.json"))).toEqual(before);
    expect(finalizeBuild(root, { check: true }).checked).toBe(true);
    artifact.buildId = "stale"; put(path.dirname(root), ".warrantee-csp/static-routes.json", artifact);
    expect(() => finalizeBuild(root, { check: true })).toThrow("Stale");
  });
  it("adds per-route hashes when the production base already has no script unsafe-inline", () => {
    const root = fixture();
    const manifest = json(path.join(root, "routes-manifest.json"));
    manifest.headers[0].headers[0].value = policy.replace("script-src 'self' 'unsafe-inline'", "script-src 'self'");
    put(root, "routes-manifest.json", manifest);
    const result = finalizeBuild(root);
    const artifact = json(result.artifactPath);
    expect(artifact.routes["/"].policy).toContain(inlineHashes("<script>window.first=1;</script>")[0]);
    expect(artifact.routes["/"].policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(artifact.routes["/"].policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
  it("attaches the private artifact to Node Proxy NFT atomically, sorted and deduplicated", () => {
    const root = fixture();
    const tracePath = path.join(root, "server/middleware.js.nft.json");
    put(root, "server/middleware.js.nft.json", { version: 1, files: ["z.js", "a.js", "a.js"], custom: "preserved" });
    const result = finalizeBuild(root);
    expect(result.proxyTraceEntry).toBe("../../.warrantee-csp/static-routes.json");
    const trace = json(tracePath);
    expect(trace).toEqual({ version: 1, files: [result.proxyTraceEntry, "a.js", "z.js"], custom: "preserved" });
    expect(realpathSync(path.resolve(path.dirname(tracePath), result.proxyTraceEntry))).toBe(result.artifactPath);
    expect(result.artifactPath).not.toContain(`${path.sep}public${path.sep}`);
    expect(finalizeBuild(root, { check: true }).checked).toBe(true);
    trace.files = trace.files.filter((file) => file !== result.proxyTraceEntry); put(root, "server/middleware.js.nft.json", trace);
    expect(() => finalizeBuild(root, { check: true })).toThrow("Stale");
  });
  it("requires the Proxy trace and rejects invalid/private-path escapes before writing", () => {
    const root = fixture();
    expect(() => finalizeBuild(root, { artifactPath: path.join(path.dirname(root), "public/static-routes.json") })).toThrow("private");
    put(root, "server/middleware.js.nft.json", { version: 2, files: [] });
    expect(() => finalizeBuild(root)).toThrow("Invalid Node Proxy NFT");
    rmSync(path.join(root, "server/middleware.js.nft.json"));
    expect(() => finalizeBuild(root)).toThrow();
  });
  it("can attach trace metadata to an unchanged pre-NFT finalized build without rebuilding", () => {
    const root = fixture(); finalizeBuild(root);
    const proofPath = path.join(root, "csp-finalization.json");
    const proof = json(proofPath); delete proof.proxyTraceSha256; put(root, "csp-finalization.json", proof);
    put(root, "server/middleware.js.nft.json", { version: 1, files: ["original.js"] });
    expect(() => finalizeBuild(root, { check: true })).toThrow("Stale");
    finalizeBuild(root);
    expect(json(path.join(root, "server/middleware.js.nft.json")).files).toContain("original.js");
    expect(finalizeBuild(root, { check: true }).checked).toBe(true);
  });
  it.each(["BUILD_ID", "server/app/index.html", "prerender-manifest.json", "routes-manifest.json"])("fails closed after %s changes", (file) => {
    const root = fixture(); finalizeBuild(root);
    if (file.endsWith(".json")) { const value = json(path.join(root, file)); value.changed = true; put(root, file, value); }
    else put(root, file, "changed");
    expect(() => finalizeBuild(root, { check: true })).toThrow();
    expect(() => finalizeBuild(root)).toThrow();
  });
  it("rejects missing binding, missing HTML, orphan HTML, ISR and encoded traversal", () => {
    const root = fixture();
    expect(() => finalizeBuild(root, { check: true })).toThrow("Missing CSP");
    const manifest = json(path.join(root, "prerender-manifest.json"));
    manifest.routes["/"].initialRevalidateSeconds = 60; put(root, "prerender-manifest.json", manifest);
    expect(() => finalizeBuild(root)).toThrow("Mutable");
    manifest.routes["/"].initialRevalidateSeconds = false;
    manifest.routes["/%2e%2e/escape"] = { initialRevalidateSeconds: false }; put(root, "prerender-manifest.json", manifest);
    expect(() => finalizeBuild(root)).toThrow("Unsafe");
    delete manifest.routes["/%2e%2e/escape"]; put(root, "prerender-manifest.json", manifest);
    put(root, "server/app/orphan.html", "orphan");
    expect(() => finalizeBuild(root)).toThrow("inventory");
    rmSync(path.join(root, "server/app/orphan.html")); rmSync(path.join(root, "server/app/index.html"));
    expect(() => finalizeBuild(root)).toThrow("Missing");
  });
  it("rejects conditional and late CSP overrides rather than claiming effective coverage", () => {
    const root = fixture();
    const manifest = json(path.join(root, "routes-manifest.json"));
    manifest.onMatchHeaders = [manifest.headers[0]]; put(root, "routes-manifest.json", manifest);
    expect(() => finalizeBuild(root)).toThrow("onMatchHeaders");
    delete manifest.onMatchHeaders;
    manifest.headers[0].has = [{ type: "header", key: "x-special" }]; put(root, "routes-manifest.json", manifest);
    expect(() => finalizeBuild(root)).toThrow("Conditional");
  });
});

describe("real Next startup integration", () => {
  it("next start honors finalized route headers from the final build manifest", async () => {
    const root = temp();
    symlinkSync(path.resolve("node_modules"), path.join(root, "node_modules"), "dir");
    put(root, "package.json", { private: true });
    put(root, "app/layout.js", "export default function Layout({children}) { return <html><body>{children}</body></html> }");
    put(root, "app/page.js", "export default function Page() { return <><h1>One</h1><script dangerouslySetInnerHTML={{__html:'window.one=1;'}} /></> }");
    put(root, "app/two/page.js", "export default function Page() { return <><h1>Two</h1><script dangerouslySetInnerHTML={{__html:'window.two=2;'}} /></> }");
    put(root, "app/catalog/[slug]/page.js", "export function generateStaticParams(){ return [{slug:'a b'},{slug:'c+d'},{slug:'عربي'}] } export default function Page(){return <h1>Encoded route</h1>}");
    put(root, "next.config.mjs", `export default { async headers() { return [{source:'/:path*', headers:[{key:'Content-Security-Policy',value:${JSON.stringify(policy)}}]}] } }`);
    const cli = path.resolve("node_modules/next/dist/bin/next");
    const env = { PATH: process.env.PATH, HOME: root, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", CI: "1" };
    const build = spawnSync(process.execPath, [cli, "build", "--webpack"], { cwd: root, env, encoding: "utf8", timeout: 120000 });
    expect(build.status, build.stdout + build.stderr).toBe(0);
    const dist = path.join(root, ".next");
    // This fixture tests Next header delivery, not Proxy packaging; it has no Proxy source.
    put(dist, "server/middleware.js.nft.json", { version: 1, files: [] });
    finalizeBuild(dist, { applyRoutesManifest: true }); finalizeBuild(dist, { check: true, applyRoutesManifest: true });
    const socket = createServer(); await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
    const port = socket.address().port; await new Promise((resolve) => socket.close(resolve));
    const child = spawn(process.execPath, [cli, "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let logs = ""; child.stdout.on("data", (data) => { logs += data; }); child.stderr.on("data", (data) => { logs += data; });
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (child.exitCode !== null) throw new Error(logs);
        try { const r = await fetch(`http://127.0.0.1:${port}/`); if (r.ok) { ready = true; break; } } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(ready, logs).toBe(true);
      const rules = json(path.join(dist, "routes-manifest.json")).headers;
      for (const route of ["/", "/two", "/catalog/a%20b", "/catalog/c%2Bd", "/catalog/%D8%B9%D8%B1%D8%A8%D9%8A"]) {
        const response = await fetch(`http://127.0.0.1:${port}${route}`);
        const expected = rules.findLast((rule) => new RegExp(rule.regex).test(route)).headers[0].value;
        expect(response.status).toBe(200);
        expect(response.headers.get("content-security-policy")).toBe(expected);
        const body = await response.text();
        for (const hash of inlineHashes(body)) expect(expected).toContain(hash);
        expect(expected).toContain("style-src 'self' 'unsafe-inline'");
      }
    } finally {
      if (child.exitCode === null) {
        const stopped = new Promise((resolve) => child.once("exit", resolve));
        child.kill("SIGTERM");
        const killTimer = setTimeout(() => child.kill("SIGKILL"), 3000);
        await stopped; clearTimeout(killTimer);
      }
    }
  }, 150000);
});
