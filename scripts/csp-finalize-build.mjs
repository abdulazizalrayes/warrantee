import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { load } from "cheerio";

const require = createRequire(import.meta.url);
const { getRouteCacheKey } = require("next/dist/server/lib/route-cache-key");
const { selectAppPageEntry } = require("next/dist/shared/lib/router/utils/app-paths");

const marker = "warranteeCspFinalization";
const digest = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeSource = (value) => value.replace(/[():*+?{}\\]/g, "\\$&");

export function inlineHashes(html) {
  const $ = load(html, { sourceCodeLocationInfo: true });
  const hashes = new Set();
  $("script:not([src])").each((_, element) => {
    const location = element.sourceCodeLocation;
    if (!location?.startTag || !location.endTag) throw new Error("Unterminated script in final HTML");
    // CSP hashes the browser's text, including whitespace, after HTML newline normalization.
    const text = html.slice(location.startTag.endOffset, location.endTag.startOffset).replace(/\r\n?/g, "\n");
    hashes.add(`'sha256-${createHash("sha256").update(text).digest("base64")}'`);
  });
  return [...hashes].sort();
}

function policyFor(headers, route, hashes) {
  let policy;
  for (const rule of headers) {
    if (rule.has?.length || rule.missing?.length) {
      if (rule.headers.some((h) => h.key.toLowerCase() === "content-security-policy")) {
        throw new Error("Conditional CSP rules are unsupported");
      }
      continue;
    }
    if (!new RegExp(rule.regex, "i").test(route)) continue;
    for (const header of rule.headers) {
      if (header.key.toLowerCase() === "content-security-policy") policy = header.value;
    }
  }
  if (!policy) throw new Error(`Missing base CSP for ${route}`);
  const directives = policy.split(";").map((s) => s.trim()).filter(Boolean);
  const scripts = directives.filter((s) => s.split(/\s/)[0].toLowerCase() === "script-src");
  if (scripts.length !== 1 || directives.some((s) => /^script-src-elem\s/i.test(s))) {
    throw new Error("Require one script-src and no overriding script-src-elem");
  }
  const tokens = scripts[0].split(/\s+/).slice(1).filter((s) => s !== "'unsafe-inline'");
  if (tokens.includes("'none'") || tokens.some((s) => s.startsWith("'nonce-"))) {
    throw new Error("Nonce/none base policies are unsupported");
  }
  return directives.map((s) => s === scripts[0]
    ? ["script-src", ...new Set([...tokens, ...hashes])].join(" ") : s).join("; ");
}

function htmlFiles(root, current = root) {
  const result = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const file = path.join(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink inside HTML tree: ${file}`);
    if (entry.isDirectory()) result.push(...htmlFiles(root, file));
    else if (entry.name.endsWith(".html")) result.push(path.relative(root, file).split(path.sep).join("/"));
  }
  return result.sort();
}

function createFinalized(dist, manifest, baseHeaders) {
  const app = path.join(dist, "server/app");
  const prerenderBytes = readFileSync(path.join(dist, "prerender-manifest.json"));
  const prerender = JSON.parse(prerenderBytes);
  const appRoutesBytes = readFileSync(path.join(dist, "app-path-routes-manifest.json"));
  const appRoutes = JSON.parse(appRoutesBytes);
  const pageEntries = Object.entries(appRoutes).filter(([key]) => key.endsWith("/page"));
  const pageSources = new Set(pageEntries.map(([, route]) => route));
  if (manifest.basePath || manifest.i18n) throw new Error("basePath/i18n manifest routing is unsupported");
  if ((manifest.onMatchHeaders ?? []).some((rule) => rule.headers.some((header) => header.key.toLowerCase() === "content-security-policy"))) {
    throw new Error("onMatchHeaders CSP overrides are unsupported");
  }
  const buildId = readFileSync(path.join(dist, "BUILD_ID"));
  if (!buildId.toString("utf8").trim()) throw new Error("Missing build identity");
  const server = path.join(dist, "server");
  const scoped = path.join(server, "route-cache/APP_PAGE");
  const files = [
    ...(existsSync(app) ? htmlFiles(app).map((file) => `app/${file}`) : []),
    ...(existsSync(scoped) ? htmlFiles(scoped).map((file) => `route-cache/APP_PAGE/${file}`) : []),
  ].sort();
  if (!files.length) throw new Error("Missing final HTML files");
  const available = new Set(files);
  const records = [];
  for (const [route, info] of Object.entries(prerender.routes).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    if (info.routeType === "route" || info.dataRoute === null) continue;
    if (Object.keys(info.initialHeaders ?? {}).some((key) => key.toLowerCase() === "content-security-policy")) {
      throw new Error(`Prerender CSP override is unsupported: ${route}`);
    }
    if (!route.startsWith("/") || /[\\\u0000-\u001f?#]/.test(route)) throw new Error(`Invalid route: ${route}`);
    const decoded = route.split("/").map((part) => decodeURIComponent(part));
    if (decoded.some((part) => part === "." || part === ".." || /[/\\\0]/.test(part))) {
      throw new Error(`Unsafe encoded route: ${route}`);
    }
    if (!pageSources.has(info.srcRoute ?? route)) throw new Error(`Missing page source mapping: ${route}`);
    const pathname = decoded.map(encodeURIComponent).join("/");
    const forms = new Set([route, decoded.join("/"), pathname]);
    const source = info.srcRoute ?? route;
    const sourceKey = selectAppPageEntry(source, pageEntries.map(([key]) => key));
    if (!sourceKey || appRoutes[sourceKey] !== source) throw new Error(`Ambiguous page source mapping: ${route}`);
    const scopedKey = getRouteCacheKey(route, { kind: "APP_PAGE", sourceRoute: sourceKey });
    if (!scopedKey.startsWith("/route-cache/APP_PAGE/") || scopedKey.split("/").includes("..")) {
      throw new Error(`Invalid scoped HTML key: ${route}`);
    }
    const candidates = [...new Set([
      ...[...forms].map((s) => s === "/" ? "app/index.html" : `app/${s.slice(1)}.html`),
      `${scopedKey.slice(1)}.html`,
    ])].filter((s) => available.has(s));
    if (candidates.length !== 1) throw new Error(`Missing or ambiguous final HTML for ${route}`);
    if (info.initialRevalidateSeconds !== false || (info.compute && info.compute !== "static") || (info.response && info.response !== "complete")) {
      throw new Error(`Mutable/partial prerender unsupported: ${route}`);
    }
    const file = candidates[0];
    const bytes = readFileSync(path.join(server, file));
    const hashes = inlineHashes(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const csp = policyFor(baseHeaders, pathname, hashes);
    if (Buffer.byteLength(csp) > 12000) throw new Error(`Oversize CSP for ${route}`);
    records.push({ route, pathname, file, sha256: digest(bytes), hashes, csp });
  }
  if (!records.length) throw new Error("No immutable HTML routes found");
  const covered = new Set(records.map((r) => r.file));
  if (files.some((file) => !covered.has(file))) throw new Error("HTML inventory does not match prerender manifest");
  for (const status of [404, 500]) {
    const file = path.join(dist, `server/pages/${status}.html`);
    if (!existsSync(file)) continue;
    const bytes = readFileSync(file);
    const route = `/${status}`;
    const hashes = inlineHashes(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    records.push({ route, pathname: route, file: `pages/${status}.html`, sha256: digest(bytes), hashes, csp: policyFor(baseHeaders, route, hashes) });
  }
  const publicRecords = records;
  const generated = publicRecords.map(({ pathname, csp }) => ({
    source: escapeSource(pathname),
    regex: `^${escapeRegex(pathname === "/" ? "" : pathname)}(?:/)?$`,
    headers: [{ key: "Content-Security-Policy", value: csp }],
  }));
  const binding = {
    version: 1,
    buildIdSha256: digest(buildId),
    prerenderSha256: digest(prerenderBytes),
    appRoutesSha256: digest(appRoutesBytes),
    html: records.map(({ route, file, sha256, hashes }) => ({ route, file, sha256, hashes })),
    baseHeaders,
    baseManifestSha256: digest(JSON.stringify({ ...manifest, headers: baseHeaders, [marker]: undefined })),
  };
  const routes = {};
  for (const record of publicRecords) {
    if (Object.hasOwn(routes, record.pathname)) throw new Error(`Ambiguous URL pathname: ${record.pathname}`);
    routes[record.pathname] = { policy: record.csp, htmlSha256: record.sha256 };
  }
  const fallbackHashes = [...new Set(records
    .filter(({ route }) => ["/_not-found", "/_global-error", "/404", "/500"].includes(route))
    .flatMap(({ hashes }) => hashes))].sort();
  return {
    manifest: { ...manifest, headers: [...baseHeaders, ...generated], [marker]: binding },
    artifact: { schemaVersion: 1, complete: true, buildId: buildId.toString("utf8").trim(), routes, fallbackHashes },
    binding,
  };
}

function atomicJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.csp-tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  renameSync(temporary, file);
}

export function finalizeBuild(distDir, { check = false, applyRoutesManifest = false, artifactPath } = {}) {
  const dist = realpathSync(distDir);
  const file = path.join(dist, "routes-manifest.json");
  const output = artifactPath ?? path.join(path.dirname(dist), ".warrantee-csp/static-routes.json");
  const privateOutput = path.join(path.dirname(dist), ".warrantee-csp/static-routes.json");
  if (path.resolve(output) !== privateOutput ||
      (existsSync(path.dirname(output)) && realpathSync(path.dirname(output)) !== path.dirname(privateOutput)) ||
      (existsSync(output) && realpathSync(output) !== privateOutput)) {
    throw new Error("CSP artifact must remain at the fixed private filesystem path");
  }
  const adapterConfigPath = path.join(dist, "output/functions/_middleware.func/.vc-config.json");
  if (existsSync(adapterConfigPath)) {
    const adapterConfig = readJson(adapterConfigPath);
    const privatePath = ".warrantee-csp/static-routes.json";
    if (!adapterConfig.filePathMap ||
        !Object.hasOwn(adapterConfig.filePathMap, privatePath) ||
        adapterConfig.filePathMap[privatePath] !== privatePath) {
      throw new Error("Prepackaged Node Proxy must map the fixed root-relative private CSP artifact");
    }
    if (Object.hasOwn(adapterConfig.fileHashes ?? {}, privatePath)) {
      throw new Error("Prepackaged Node Proxy has a cached private CSP artifact hash");
    }
  }
  const tracePath = path.join(dist, "server/middleware.js.nft.json");
  const trace = readJson(tracePath);
  if (trace.version !== 1 || !Array.isArray(trace.files) || trace.files.some((entry) => typeof entry !== "string")) {
    throw new Error("Invalid Node Proxy NFT: require version 1 and string files");
  }
  const traceEntry = path.relative(path.dirname(tracePath), output).split(path.sep).join("/");
  const expectedTrace = { ...trace, files: [...new Set([...trace.files, traceEntry])].sort() };
  const proofPath = path.join(dist, "csp-finalization.json");
  const manifest = readJson(file);
  const proof = existsSync(proofPath) ? readJson(proofPath) : null;
  const existing = manifest[marker] ?? proof?.binding;
  if (check && !existing) throw new Error("Missing CSP finalization; refuse unbound build");
  if (existing && existing.version !== 1) throw new Error("Unknown CSP finalization version");
  const expected = createFinalized(dist, manifest, existing?.baseHeaders ?? manifest.headers);
  const expectedManifest = applyRoutesManifest ? expected.manifest : manifest;
  const legacyProof = { binding: expected.binding, applyRoutesManifest, artifactSha256: digest(JSON.stringify(expected.artifact)) };
  const expectedProof = { ...legacyProof, proxyTraceSha256: digest(JSON.stringify(expectedTrace)) };
  if (existing) {
    const upgradingTrace = !check && proof && !Object.hasOwn(proof, "proxyTraceSha256") &&
      JSON.stringify(proof) === JSON.stringify(legacyProof);
    if (!proof || (!upgradingTrace && JSON.stringify(proof) !== JSON.stringify(expectedProof)) ||
        JSON.stringify(readJson(output)) !== JSON.stringify(expected.artifact) ||
        (!upgradingTrace && JSON.stringify(trace) !== JSON.stringify(expectedTrace)) ||
        (applyRoutesManifest && JSON.stringify(manifest) !== JSON.stringify(expectedManifest))) {
      throw new Error("Stale/tampered CSP finalization; run a clean next build");
    }
    if (upgradingTrace) {
      atomicJson(tracePath, expectedTrace);
      atomicJson(proofPath, expectedProof);
    }
  } else {
    if (existsSync(output)) {
      const placeholder = readJson(output);
      if (placeholder.schemaVersion !== 1 || placeholder.complete !== false) throw new Error("Require a pending placeholder or absent artifact");
    }
    atomicJson(output, expected.artifact);
    if (applyRoutesManifest) atomicJson(file, expectedManifest);
    atomicJson(tracePath, expectedTrace);
    atomicJson(proofPath, expectedProof);
  }
  return { routes: Object.keys(expected.artifact.routes).length, checked: Boolean(existing), artifactPath: output, proxyTraceEntry: traceEntry, applyRoutesManifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const flags = new Set(["--check", "--apply-routes-manifest"]);
    if (args.some((arg) => arg.startsWith("--") && !flags.has(arg)) || args.filter((arg) => !flags.has(arg)).length > 1) {
      throw new Error("Usage: node scripts/csp-finalize-build.mjs [distDir] [--check] [--apply-routes-manifest]");
    }
    console.log(JSON.stringify(finalizeBuild(args.find((arg) => !flags.has(arg)) ?? ".next", { check: args.includes("--check"), applyRoutesManifest: args.includes("--apply-routes-manifest") })));
  } catch (error) {
    console.error(`CSP finalization failed: ${error.message}`);
    process.exitCode = 1;
  }
}
