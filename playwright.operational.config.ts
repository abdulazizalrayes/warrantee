import { defineConfig, devices } from "@playwright/test";

const env = process.env;
const repository = "abdulazizalrayes/warrantee";
const ref = "refs/heads/main";
const origin = "https://warrantee.io";
const supabaseOrigin = "https://erptubrslnfmkuouczgn.supabase.co";

if (
  env.CI !== "true" || env.GITHUB_ACTIONS !== "true" ||
  env.GITHUB_REPOSITORY !== repository || env.GITHUB_REF !== ref || env.GITHUB_JOB !== "production-security" ||
  env.GITHUB_WORKFLOW_REF !== `${repository}/.github/workflows/production-security.yml@${ref}` ||
  (env.GITHUB_EVENT_NAME !== "schedule" && env.GITHUB_EVENT_NAME !== "workflow_dispatch")
) {
  throw new Error("Production operational E2E requires the Warrantee production security workflow on main.");
}

if (
  env.OPERATIONAL_E2E !== "1" ||
  env.E2E_BASE_URL !== origin || env.NEXT_PUBLIC_APP_URL !== origin ||
  env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") !== supabaseOrigin
) {
  throw new Error("Production operational E2E requires explicit opt-in and exact Warrantee targets.");
}

const qaEmail = env.E2E_USER_EMAIL?.trim().toLowerCase() || "";
const [local, domain, extra] = qaEmail.split("@");
const qaMarker = /(^|[+._-])(qa|e2e|test|smoke)([+._-]|$)/;
if (
  domain !== "warrantee.io" || extra !== undefined ||
  !(local.startsWith("qa") || qaMarker.test(local)) ||
  !env.E2E_USER_PASSWORD?.trim() || !env.SUPABASE_SERVICE_ROLE_KEY?.trim()
) {
  throw new Error("Production operational E2E requires a Warrantee QA identity and configured credentials.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "operational-workflows.spec.ts",
  forbidOnly: true,
  failOnFlakyTests: true,
  // The operational spec writes disposable fixtures. Do not retry writes.
  retries: 0,
  workers: 1,
  reporter: [["./tests/e2e/safe-evidence-reporter.ts"]],
  use: {
    baseURL: origin,
    serviceWorkers: "block",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      userAgent: `Warrantee-QA/1.0 ${devices["Desktop Chrome"].userAgent}`,
    },
  }],
});
