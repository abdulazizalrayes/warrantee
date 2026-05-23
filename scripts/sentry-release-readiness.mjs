import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const shouldCheckVercel = process.argv.includes("--vercel-production");
const allowMissingToken = process.argv.includes("--allow-missing-token");

function parseEnvText(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function readLocalEnv() {
  const values = { ...process.env };
  for (const file of [".env.production.local", ".env.local"]) {
    if (!fs.existsSync(file)) continue;
    Object.assign(values, parseEnvText(fs.readFileSync(file, "utf8")));
  }
  return values;
}

function readVercelProductionEnv() {
  const tmp = path.join(os.tmpdir(), `warrantee-vercel-env-${process.pid}.tmp`);
  const result = spawnSync("npx", ["vercel", "env", "pull", tmp, "--environment=production"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    if (result.status !== 0) {
      return {
        values: {},
        error: "Could not pull Vercel production env. Run `npx vercel login` or check project linking.",
      };
    }

    return {
      values: fs.existsSync(tmp) ? parseEnvText(fs.readFileSync(tmp, "utf8")) : {},
      error: null,
    };
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function status(values, key) {
  return values[key] ? "present" : "missing";
}

function evaluate(values, source) {
  const hasRuntimeDsn = Boolean(values.NEXT_PUBLIC_SENTRY_DSN || values.SENTRY_DSN);
  const requiredForReleaseUpload = ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"];
  const missingRelease = requiredForReleaseUpload.filter((key) => !values[key]);

  return {
    source,
    runtime_dsn: hasRuntimeDsn ? "present" : "missing",
    NEXT_PUBLIC_SENTRY_DSN: status(values, "NEXT_PUBLIC_SENTRY_DSN"),
    SENTRY_DSN: status(values, "SENTRY_DSN"),
    SENTRY_AUTH_TOKEN: status(values, "SENTRY_AUTH_TOKEN"),
    SENTRY_ORG: status(values, "SENTRY_ORG"),
    SENTRY_PROJECT: status(values, "SENTRY_PROJECT"),
    release_upload_ready: missingRelease.length === 0,
    missing_release_upload_env: missingRelease,
  };
}

const reports = [evaluate(readLocalEnv(), "local")];
if (shouldCheckVercel) {
  const pulled = readVercelProductionEnv();
  if (pulled.error) {
    reports.push({ source: "vercel-production", error: pulled.error });
  } else {
    reports.push(evaluate(pulled.values, "vercel-production"));
  }
}

console.log(JSON.stringify({ status: "checked", reports }, null, 2));

const blockingReport = reports.find((report) => report.source === "vercel-production" && !report.error) || reports[0];
if (blockingReport.error) process.exit(1);
if (blockingReport.runtime_dsn !== "present") process.exit(1);
if (!allowMissingToken && !blockingReport.release_upload_ready) process.exit(1);
