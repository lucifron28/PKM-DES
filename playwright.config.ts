import { defineConfig, devices } from '@playwright/test';

let baseURL = 'http://127.0.0.1:3000';
if (process.env.SMOKE_WORKFLOW_CONFIRM === 'RUN_PKM_DES_DISPOSABLE_SMOKE') {
  // Rely on the test.beforeAll hook in demo-workflow.spec.ts to validate the environment.
  // The Playwright config just assigns the target URL.
  baseURL = process.env.SMOKE_BASE_URL || 'http://0.0.0.0';
}

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
});
