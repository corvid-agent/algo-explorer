import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4177',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx serve -l 4177 -s .',
    url: 'http://localhost:4177',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
