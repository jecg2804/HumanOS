import { test, expect } from '@playwright/test';

test('forgot password anti-enumeration response', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.fill('input[name="identifier"]', 'nobody@nowhere.invalid');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('text=Si esa cuenta existe')).toBeVisible();
});

test('forgot password phone shows contact-RRHH message', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.fill('input[name="identifier"]', '+50761234567');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('text=contacta a tu Oficial de RRHH')).toBeVisible();
});
