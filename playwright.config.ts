import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false, // no parallel execution for state-changing tests
  forbidOnly: !!process.env.CI,
  retries: 0, // zero retries for mutating workflow
  workers: 1, // one worker for mutating workflow
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'off', // traces disabled by default
    screenshot: 'off', // screenshots disabled by default
    video: 'off', // videos disabled by default
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
});
