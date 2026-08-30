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
  const filePath = path.join(nextDir, relativeFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Build manifest references missing file ${relativeFile}.`);
  }
  return zlib.gzipSync(fs.readFileSync(filePath)).byteLength;
}

function routeBytes(appManifest, route) {
  const files = appManifest.pages[route];
  if (!files) throw new Error(`Missing build manifest route ${route}.`);
  return files.filter((file) => file.endsWith(".js")).reduce((total, file) => total + gzipBytes(file), 0);
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
const appManifest = readJson(appManifestPath);
const sharedBytes = buildManifest.rootMainFiles
  .filter((file) => file.endsWith(".js"))
  .reduce((total, file) => total + gzipBytes(file), 0);

const budgets = {
  shared: 195 * 1024,
  homepage: 215 * 1024,
  pricing: 220 * 1024,
  auth: 285 * 1024,
};
const measurements = {
  shared: sharedBytes,
  homepage: routeBytes(appManifest, "/[locale]/page"),
  pricing: routeBytes(appManifest, "/[locale]/pricing/page"),
  auth: routeBytes(appManifest, "/[locale]/auth/page"),
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
