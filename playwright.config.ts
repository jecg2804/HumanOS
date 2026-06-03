import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// F-02: load .env.local into the Playwright test process the same way Next does. Without this the
// node-side test code (e.g. e2e/lib/sql-helpers.ts createClient) gets `supabaseUrl is required`,
// because the dev server loads env but the runner process does not.
loadEnvConfig(process.cwd());

const PORT = 3001;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Auth bootstrap: logs in as hr_admin and writes e2e/.auth/hr_admin.json (consumed by
    // admin-empleados.spec via test.use({ storageState })).
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
