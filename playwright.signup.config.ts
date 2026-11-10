import { defineConfig, devices } from '@playwright/test';
import { assertIsolatedEnvironment } from './tests/isolated/guard.mjs';

// Deliberately no dotenv loading, production target option, retries, or CSP bypass.
assertIsolatedEnvironment();
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'signup-first-warranty.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  failOnFlakyTests: true,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['./tests/isolated/reporter.ts']],
  outputDir: './test-results/isolated-signup',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.E2E_BASE_URL,
    serviceWorkers: 'block',
    trace: 'off', screenshot: 'off', video: 'off',
  },
  projects: [{ name: 'isolated-chromium' }],
});
