import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const ignoredFiles = new Set(["package-lock.json", "tsconfig.tsbuildinfo"]);
const ignoredExtensions = new Set([
  ".ico",
  ".jpg",
  ".jpeg",
  ".pdf",
  ".png",
  ".webp",
  ".zip",
]);

const patterns = [
  { name: "localhost", regex: /localhost/gi },
  { name: "127.0.0.1", regex: /127\.0\.0\.1/g },
  { name: "0.0.0.0", regex: /0\.0\.0\.0/g },
  { name: "::1", regex: /(?:\[(?:::1)\]|::1)/g },
];

const allowlist = [
  {
    file: "playwright.config.ts",
    patterns: new Set(["127.0.0.1"]),
    reason: "Playwright starts an isolated local server when E2E_BASE_URL is not set.",
  },
  {
    file: "src/lib/auth-email-guard.ts",
    patterns: new Set(["localhost"]),
    reason: "localhost is intentionally rejected as an auth email domain.",
  },
  {
    file: "scripts/check-no-loopback-links.mjs",
    patterns: new Set(patterns.map((pattern) => pattern.name)),
    reason: "This guard contains the loopback patterns it scans for.",
  },
];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function isAllowed(relativePath, patternName) {
  return allowlist.some(
    (entry) => entry.file === relativePath && entry.patterns.has(patternName),
  );
}

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toPosix(path.relative(root, absolutePath));

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        yield* walk(absolutePath);
      }
      continue;
    }

    if (!entry.isFile()) continue;
    if (ignoredFiles.has(entry.name)) continue;
    if (ignoredExtensions.has(path.extname(entry.name).toLowerCase())) continue;

    yield { absolutePath, relativePath };
  }
}

function findMatches(relativePath, text) {
  const matches = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      if (!pattern.regex.test(line)) continue;
      if (isAllowed(relativePath, pattern.name)) continue;

      matches.push({
        file: relativePath,
        line: index + 1,
        pattern: pattern.name,
      });
    }
  });

  return matches;
}

const failures = [];

for await (const file of walk(root)) {
  let text;
  try {
    text = await readFile(file.absolutePath, "utf8");
  } catch {
    continue;
  }

  if (text.includes("\0")) continue;
  failures.push(...findMatches(file.relativePath, text));
}

if (failures.length > 0) {
  console.error("Loopback references are not allowed in Warrantee production-facing files.");
  console.error("Use https://warrantee.io, NEXT_PUBLIC_APP_URL, or an explicit test-only allowlist.");
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line} matched ${failure.pattern}`);
  }
  process.exit(1);
}

console.log("No disallowed localhost or loopback references found.");
