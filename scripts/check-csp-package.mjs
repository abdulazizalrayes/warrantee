import { readFileSync, existsSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { finalizeBuild } from "./csp-finalize-build.mjs";

const root = process.cwd();
finalizeBuild(".next", { check: true });
const key = ".warrantee-csp/static-routes.json";
const artifact = readFileSync(key);
const manifest = JSON.parse(artifact);
const config = JSON.parse(readFileSync(".vercel/output/functions/_middleware.func/.vc-config.json", "utf8"));
const mapped = config.filePathMap?.[key];
if (mapped !== key || realpathSync(mapped) !== path.join(root, key)) throw new Error("Private Proxy manifest packaging mismatch");
if (existsSync(path.join(".vercel/output/static", key))) throw new Error("CSP manifest must not be public");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
let checkedHtml = 0;
for (const [route, record] of Object.entries(manifest.routes)) {
  const file = path.join(".vercel/output/functions", `${route === "/" ? "index" : route.slice(1)}.prerender-fallback.html`);
  if (!existsSync(file)) continue;
  if (sha(readFileSync(file)) !== record.htmlSha256) throw new Error(`Packaged HTML changed after CSP finalization: ${route}`);
  checkedHtml++;
}
if (checkedHtml < 50) throw new Error("Insufficient packaged HTML proof");
const rules = JSON.parse(readFileSync(".vercel/output/config.json", "utf8")).routes.length;
if (rules > 2048) throw new Error("Routing rules exceed the existing hosting limit");
console.log(JSON.stringify({ ok: true, buildId: manifest.buildId, mappedPrivateArtifactSha256: sha(artifact), artifactBytes: artifact.length, checkedHtml, routingRules: rules, note: "Non-standalone Vercel output references source files through filePathMap; deployed preview verification is also required." }, null, 2));
