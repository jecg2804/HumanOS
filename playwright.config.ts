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
    // Auth bootstrap: logs in as hr_admin and writes e2e/.auth/hr_admin.json. Skips gracefully
    // (see e2e/auth.setup.ts) when E2E_HR_ADMIN_* are unset, so the public suite still runs.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // Public suite: no auth needed (login, forgot/reset password, onboarding). Runs without creds.
    {
      name: 'public',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/auth\.setup\.ts/, /admin-empleados\.spec\.ts/],
    },
    // Authenticated suite: needs the hr_admin storage state. Whole file skips when creds are unset.
    {
      name: 'authenticated',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/hr_admin.json' },
      testMatch: /admin-empleados\.spec\.ts/,
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
