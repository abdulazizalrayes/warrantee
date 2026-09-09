import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { load } from "cheerio";

const nextDir = path.resolve(".next");
const buildManifestPath = path.join(nextDir, "build-manifest.json");
const appManifestPath = path.join(nextDir, "app-build-manifest.json");

function fail(message) {
  console.error(`Frontend performance budget failed: ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}. Run npm run build first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function gzipBytes(relativeFile) {
  const encodedPath = path.join(nextDir, relativeFile);
  const filePath = fs.existsSync(encodedPath)
    ? encodedPath
    : path.join(nextDir, decodeURIComponent(relativeFile));
  if (!fs.existsSync(filePath)) {
    throw new Error(`Build manifest references missing file ${relativeFile}.`);
  }
  return zlib.gzipSync(fs.readFileSync(filePath)).byteLength;
}

function next16RouteFiles(route) {
  const routePath = route.startsWith("/") ? route.slice(1) : route;
  const manifestPath = path.join(
    nextDir,
    "server",
    "app",
    `${routePath}_client-reference-manifest.js`,
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing build manifest route ${route}.`);
  }

  const source = fs.readFileSync(manifestPath, "utf8");
  const marker = `globalThis.__RSC_MANIFEST[${JSON.stringify(route)}]=`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Unable to parse build manifest route ${route}.`);
  }

  const serialized = source.slice(markerIndex + marker.length).trim();
  const manifest = JSON.parse(
    serialized.endsWith(";") ? serialized.slice(0, -1) : serialized,
  );
  return [
    ...new Set(
      Object.values(manifest.clientModules || {})
        .flatMap((module) => module.chunks || [])
        .filter((file) => typeof file === "string" && file.endsWith(".js")),
    ),
  ];
}

function routeBytes(appManifest, route, sharedBytes) {
  const files = appManifest?.pages?.[route] || next16RouteFiles(route);
  const routeChunkBytes = files
    .filter((file) => file.endsWith(".js"))
    .reduce((total, file) => total + gzipBytes(file), 0);
  return appManifest ? routeChunkBytes : sharedBytes + routeChunkBytes;
}

function kib(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function fontPreloads(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Missing prerendered page ${htmlPath}.`);
  }
  const $ = load(fs.readFileSync(htmlPath, "utf8"));
  return $("link[rel='preload'][as='font']").length;
}

const buildManifest = readJson(buildManifestPath);
const appManifest = fs.existsSync(appManifestPath)
  ? readJson(appManifestPath)
  : null;
const sharedBytes = buildManifest.rootMainFiles
  .filter((file) => file.endsWith(".js"))
  .reduce((total, file) => total + gzipBytes(file), 0);

const budgets = {
  // Keep enough headroom for deterministic gzip variance across macOS and Linux CI.
  shared: 230 * 1024,
  homepage: 255 * 1024,
  pricing: 265 * 1024,
  auth: 335 * 1024,
};
const measurements = {
  shared: sharedBytes,
  homepage: routeBytes(appManifest, "/[locale]/page", sharedBytes),
  pricing: routeBytes(appManifest, "/[locale]/pricing/page", sharedBytes),
  auth: routeBytes(appManifest, "/[locale]/auth/page", sharedBytes),
};

for (const [name, bytes] of Object.entries(measurements)) {
  const budget = budgets[name];
  console.log(`${name}: ${kib(bytes)} / ${kib(budget)}`);
  if (bytes > budget) fail(`${name} JavaScript is ${kib(bytes)}; budget is ${kib(budget)}.`);
}

const englishPreloads = fontPreloads(path.join(nextDir, "server/app/en.html"));
console.log(`English font preloads: ${englishPreloads}`);
if (englishPreloads !== 0) {
  fail(`English homepage preloads ${englishPreloads} unused font files; expected 0.`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("Frontend performance budgets passed.");
