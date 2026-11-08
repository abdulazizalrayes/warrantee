import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildGaBootstrap, buildGtmBootstrap } from "../src/lib/analytics-bootstrap.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function generateAnalyticsBootstrap({
  env = process.env,
  outputDirectory = resolve(repositoryRoot, "public/agent-bootstrap/analytics"),
} = {}) {
  // Validate both public identifiers before writing either artifact.
  const ga = env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    ? buildGaBootstrap(env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
    : "// Google Analytics is not configured.\n";
  const gtm = env.NEXT_PUBLIC_GTM_ID
    ? buildGtmBootstrap(env.NEXT_PUBLIC_GTM_ID)
    : "// Google Tag Manager is not configured.\n";
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "ga.js"), ga, "utf8");
  await writeFile(resolve(outputDirectory, "gtm.js"), gtm, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { default: nextEnv } = await import("@next/env");
  nextEnv.loadEnvConfig(repositoryRoot, process.env.NODE_ENV === "development", {
    info() {},
    error() {},
  });
  await generateAnalyticsBootstrap();
  console.log("Generated public analytics bootstraps.");
}
