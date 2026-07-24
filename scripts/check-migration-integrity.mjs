import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const migrationsDirectory = path.join(root, "supabase", "migrations");
const manifestPath = path.join(root, "supabase", "production-migration-manifest.json");
const filenamePattern = /^(\d{14})_([a-z0-9_]+)\.sql$/;

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const errors = [];
const versions = new Set();
const manifestByFile = new Map(
  manifest.migrations.map((migration) => [migration.file, migration]),
);

for (const file of files) {
  const match = file.match(filenamePattern);
  if (!match) {
    errors.push(`${file}: migration filename must use YYYYMMDDHHMMSS_snake_case.sql`);
    continue;
  }

  if (versions.has(match[1])) {
    errors.push(`${file}: duplicate migration version ${match[1]}`);
  }
  versions.add(match[1]);

  const source = await readFile(path.join(migrationsDirectory, file));
  if (source.toString("utf8").trim().length === 0) {
    errors.push(`${file}: migration is empty`);
  }

  const expected = manifestByFile.get(file);
  if (!expected) {
    errors.push(`${file}: missing from production-migration-manifest.json`);
    continue;
  }

  const actualChecksum = createHash("sha256").update(source).digest("hex");
  if (actualChecksum !== expected.sha256) {
    errors.push(`${file}: checksum differs from the verified migration source`);
  }
}

for (const migration of manifest.migrations) {
  if (!files.includes(migration.file)) {
    errors.push(`${migration.file}: manifest entry has no matching migration file`);
  }
}

if (manifest.projectRef !== "erptubrslnfmkuouczgn") {
  errors.push("manifest projectRef does not match the Warrantee Supabase project");
}

if (errors.length > 0) {
  console.error("Migration integrity check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const pendingCount = manifest.migrations.filter(
  (migration) => migration.productionState === "pending",
).length;
console.log(
  `Migration integrity passed: ${files.length} files (${pendingCount} pending production rollout).`,
);
