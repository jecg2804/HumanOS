import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

// F-02: produce the hr_admin storage state that admin-empleados.spec consumes, instead of
// depending on a hand-committed `e2e/.auth/hr_admin.json` that never existed. This runs as a
// Playwright "setup" project (see playwright.config.ts > projects) before the chromium suite.
//
// Requires a real seeded hr_admin auth user (shared MovimientOS/HumanOS auth.users) and these
// env vars (in .env.local — never commit them):
//   E2E_HR_ADMIN_EMAIL, E2E_HR_ADMIN_PASSWORD
// E2E is a LOCAL gate (not in CI) — see docs/STATUS.md.

const AUTH_FILE = path.join(__dirname, '.auth', 'hr_admin.json');

setup('authenticate as hr_admin', async ({ page }) => {
  const email = process.env.E2E_HR_ADMIN_EMAIL;
  const password = process.env.E2E_HR_ADMIN_PASSWORD;

  expect(
    email && password,
    'E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD must be set in .env.local to run the E2E gate locally'
  ).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Correo').fill(email!);
  await page.getByLabel('Contrasena').fill(password!);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Land on an authenticated route — proxy bounces unauthenticated users back to /login.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });

  await page.context().storageState({ path: AUTH_FILE });
});
