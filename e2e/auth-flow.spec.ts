import { test, expect } from '@playwright/test';

test.describe('Auth flow', () => {
  test('login page renders with form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'HumanOS' })).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeVisible();
    await expect(page.getByLabel('Contrasena')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });

  test('unauthenticated user hitting protected route is redirected to /login with next', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
    await expect(page.getByRole('heading', { name: 'HumanOS' })).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill('nope@example.com');
    await page.getByLabel('Contrasena').fill('wrongpassword');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: /incorrectos|invalido|invalido/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test('?error=no_access shows access denied message', async ({ page }) => {
    await page.goto('/login?error=no_access');
    await expect(
      page.getByRole('alert').filter({ hasText: /no tiene acceso/i })
    ).toBeVisible();
  });

  test('root path redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'HumanOS' })).toBeVisible();
  });
});
