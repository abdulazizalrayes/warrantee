import { defineConfig, devices } from "@playwright/test";

const localPort = process.env.E2E_PORT || "3100";
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${localPort}`;
const useExternalTarget = Boolean(process.env.E2E_BASE_URL);

if (
  process.env.CI &&
  !useExternalTarget &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
) {
  throw new Error(
    "CI E2E requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY repository secrets.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
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
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
