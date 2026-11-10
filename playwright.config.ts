import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { assertIsolatedEnvironment } from "./tests/isolated/guard.mjs";

const isolatedRegression = process.env.E2E_SUITE === "isolated-regression";
const syntheticUI = process.env.E2E_SUITE === "synthetic-ui";
const guardedCI = isolatedRegression || syntheticUI;
if (process.env.CI && !guardedCI) {
  throw new Error("CI browser tests require an explicit isolated-regression or synthetic-ui lane, not production credentials.");
}
if (isolatedRegression) {
  assertIsolatedEnvironment();
  if (!process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD) {
    throw new Error("Isolated regression requires a fresh disposable local identity; missing fixtures must not skip tests.");
  }
} else if (syntheticUI) {
  if (process.env.WARRANTEE_SYNTHETIC_UI_E2E !== "1" ||
      process.env.WARRANTEE_ISOLATED_E2E !== "1" ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
      process.env.NEXT_PUBLIC_APP_URL !== "http://127.0.0.1:3100" ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "local-build-placeholder-not-a-credential" ||
      process.env.E2E_BASE_URL !== "http://127.0.0.1:3100" || process.env.E2E_PORT ||
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error("Synthetic UI tests require their explicit disposable loopback fixture, never a real backend or external app.");
  }
} else {
  dotenv.config({ path: ".env.production.local", override: false, quiet: true });
  dotenv.config({ path: ".env.local", override: false, quiet: true });
}

const localPort = process.env.E2E_PORT || "3100";
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${localPort}`;
const useExternalTarget = Boolean(process.env.E2E_BASE_URL) && !syntheticUI;
const qaUserAgentPrefix = "Warrantee-QA/1.0";

const regressionSpecs = [
  "public-routes.spec.ts", "protected-routes.spec.ts", "csp.spec.ts",
  "seo-agent-ready.spec.ts", "header-footer.spec.ts", "searchable-select.spec.ts",
  "authenticated-shell.spec.ts", "authenticated-core-flows.spec.ts",
  "business-workflows.spec.ts",
];

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "signup-first-warranty.spec.ts", // Separate real journey config/gate.
  fullyParallel: !syntheticUI,
  ...(syntheticUI ? { timeout: 90_000 } : {}),
  forbidOnly: Boolean(process.env.CI),
  failOnFlakyTests: Boolean(process.env.CI),
  retries: guardedCI ? 0 : process.env.CI ? 2 : 0,
  workers: syntheticUI ? 1 : 2,
  reporter: guardedCI
    ? [["./tests/isolated/reporter.ts"]]
    : process.env.CI
    ? [["./tests/e2e/safe-evidence-reporter.ts"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    serviceWorkers: "block",
    trace: process.env.CI || guardedCI ? "off" : "retain-on-failure",
    screenshot: process.env.CI || guardedCI ? "off" : "only-on-failure",
    video: process.env.CI || guardedCI ? "off" : "retain-on-failure",
  },
  webServer: useExternalTarget
    ? undefined
    : {
        command: `npm run build && PORT=${localPort} npm run start`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 240_000,
      },
  projects: [
    {
      name: "chromium",
      ...(isolatedRegression ? {
        testMatch: [...regressionSpecs, "release-regression.spec.ts"],
      } : syntheticUI ? { testMatch: "signup-ui-recovery.spec.ts" } : {}),
      use: {
        ...devices["Desktop Chrome"],
        userAgent: `${qaUserAgentPrefix} ${devices["Desktop Chrome"].userAgent}`,
      },
    },
    ...(!syntheticUI ? [{
      name: "mobile-chrome",
      // The release-regression width matrix already covers every mobile width;
      // do not schedule its deliberately skipped duplicate project instances.
      ...(isolatedRegression ? { testMatch: regressionSpecs } : {}),
      use: {
        ...devices["Pixel 7"],
        userAgent: `${qaUserAgentPrefix} ${devices["Pixel 7"].userAgent}`,
      },
    }] : []),
  ],
});
