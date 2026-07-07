import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const envFiles = [".env.production.local", ".env.local"];
const port = process.env.E2E_PORT || "3100";
const baseUrl = `http://127.0.0.1:${port}`;

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) return null;

  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [match[1], value];
}

async function loadEnvFiles(env) {
  for (const file of envFiles) {
    if (!existsSync(file)) continue;
    const text = await readFile(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      if (!(key in env)) env[key] = value;
    }
  }
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env,
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Keep waiting until Next has started.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const env = { ...process.env };
  await loadEnvFiles(env);
  env.E2E_BASE_URL = baseUrl;
  env.E2E_PORT = port;
  env.NEXT_PUBLIC_APP_URL = baseUrl;
  env.VERCEL_ENV = "development";
  const hasLocalStripeSecret = Boolean(env.STRIPE_SECRET_KEY);

  await run("npm", ["run", "qa:e2e-env"], env);
  await run("npm", ["run", "build"], env);

  const server = spawn("npm", ["run", "start"], {
    stdio: "inherit",
    env: { ...env, PORT: port },
    shell: false,
  });

  let serverExited = false;
  server.on("exit", (code) => {
    serverExited = true;
    if (code !== 0 && code !== null) {
      console.error(`Local QA server exited with ${code}`);
    }
  });

  try {
    await waitForServer(`${baseUrl}/en`);
    if (serverExited) throw new Error("Local QA server exited before tests started");

    await run(
      "npx",
      [
        "playwright",
        "test",
        "tests/e2e/public-routes.spec.ts",
        "tests/e2e/protected-routes.spec.ts",
        "tests/e2e/seo-agent-ready.spec.ts",
        "--project=chromium",
        "--workers=1",
        "--timeout=90000",
      ],
      env,
    );
    await run(
      "npx",
      ["playwright", "test", "tests/e2e/authenticated-shell.spec.ts", "--project=chromium", "--workers=1", "--timeout=90000"],
      env,
    );
    await run(
      "npx",
      ["playwright", "test", "tests/e2e/business-workflows.spec.ts", "--project=chromium", "--workers=1", "--timeout=90000"],
      env,
    );
    const operationalEnv = hasLocalStripeSecret
      ? { ...env, OPERATIONAL_E2E: "1" }
      : { ...env, E2E_BASE_URL: "https://warrantee.io", OPERATIONAL_E2E: "1" };

    if (!hasLocalStripeSecret) {
      console.warn(
        [
          "Local STRIPE_SECRET_KEY is not available.",
          "Running the operational payment/OCR workflow against production instead of the local server.",
          "This avoids a false local 503 while still verifying the real checkout boundary.",
        ].join(" ")
      );
    }

    await run(
      "npx",
      [
        "playwright",
        "test",
        "tests/e2e/operational-workflows.spec.ts",
        "--project=chromium",
        "--workers=1",
        "--timeout=90000",
      ],
      operationalEnv,
    );
  } finally {
    if (!server.killed) server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
