import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repository = "abdulazizalrayes/warrantee";
const valid = {
  NODE_ENV: "test" as const,
  CI: "true",
  GITHUB_ACTIONS: "true",
  GITHUB_REPOSITORY: repository,
  GITHUB_REF: "refs/heads/main",
  GITHUB_JOB: "production-security",
  GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/production-security.yml@refs/heads/main`,
  GITHUB_EVENT_NAME: "schedule",
  OPERATIONAL_E2E: "1",
  E2E_BASE_URL: "https://warrantee.io",
  NEXT_PUBLIC_APP_URL: "https://warrantee.io",
  NEXT_PUBLIC_SUPABASE_URL: "https://erptubrslnfmkuouczgn.supabase.co",
  E2E_USER_EMAIL: "qa-fixture@warrantee.io",
  E2E_USER_PASSWORD: "test-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "test-placeholder",
};

function list(config: string, overrides: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [
    resolve("node_modules/@playwright/test/cli.js"),
    "test", "--list", "--reporter=list", `--config=${config}`,
  ], {
    // Never pass through local or CI credentials. Listing does not execute hooks.
    env: { ...valid, ...overrides },
    encoding: "utf8",
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

describe("production operational Playwright configuration", () => {
  it.each(["schedule", "workflow_dispatch"])("lists only the production spec for %s", (event) => {
    const result = list("playwright.operational.config.ts", { GITHUB_EVENT_NAME: event });
    expect(result.status).toBe(0);
    expect(result.output).toContain("[chromium] › operational-workflows.spec.ts");
    expect(result.output).toContain("Total: 1 test in 1 file");
  });

  it.each([
    ["GITHUB_ACTIONS", ""],
    ["GITHUB_REPOSITORY", "another-owner/warrantee"],
    ["GITHUB_REF", "refs/heads/preview"],
    ["GITHUB_JOB", "build"],
    ["GITHUB_WORKFLOW_REF", `${repository}/.github/workflows/ci.yml@refs/heads/main`],
    ["GITHUB_EVENT_NAME", "pull_request"],
    ["OPERATIONAL_E2E", ""],
    ["E2E_BASE_URL", "https://warrantee.io.invalid"],
    ["NEXT_PUBLIC_APP_URL", "https://preview.warrantee.io"],
    ["NEXT_PUBLIC_SUPABASE_URL", "https://another-project.supabase.co"],
    ["E2E_USER_EMAIL", "ordinary@warrantee.io"],
    ["SUPABASE_SERVICE_ROLE_KEY", ""],
  ])("fails closed with an invalid %s", (key, value) => {
    const result = list("playwright.operational.config.ts", { [key]: value });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("Production operational E2E requires");
    expect(result.output).not.toContain("Total:");
  });

  it("does not permit production through the shared CI config", () => {
    const result = list("playwright.config.ts");
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("CI browser tests require an explicit isolated-regression or synthetic-ui lane");
  });
});
