import { test, expect } from '@playwright/test';
import { adminClient, cleanupTestEmployee } from './lib/sql-helpers';

// File-scope skip (evaluated before fixtures) so the storageState file is never required when the
// hr_admin creds are unset. Keeps `npm run verify:e2e` green on a fresh checkout.
test.skip(
  !process.env.E2E_HR_ADMIN_EMAIL || !process.env.E2E_HR_ADMIN_PASSWORD,
  'requires E2E_HR_ADMIN_* creds (authenticated E2E)'
);

test.use({ storageState: 'e2e/.auth/hr_admin.json' });

test('hr_admin creates employee + invite + edits + regenerates', async ({ page }) => {
  await page.goto('/admin/empleados/nuevo');
  await page.fill('input[name="full_name"]', 'E2E Created');
  await page.fill('input[name="national_id"]', '8-777-001');
  await page.fill('input[name="hire_date"]', '2025-06-01');
  await page.locator('select[name="employment_type_id"]').selectOption({ label: 'Indefinido' });
  await page.fill('input[name="position_text"]', 'Tester');
  await page.fill('input[name="department_text"]', 'QA');
  await page.fill('input[name="office_text"]', 'Remoto');
  await page.fill('input[name="delivery_target"]', 'e2e-created@iconsanet.com');
  await page.locator('button[type="submit"]').click();

  await expect(page.locator('text=Empleado creado')).toBeVisible();
  await expect(page.locator('text=Código de invitación')).toBeVisible();

  const admin = adminClient();
  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .select('id')
    .eq('national_id', '8-777-001')
    .single();
  expect(person?.id).toBeTruthy();

  await page.goto(`/admin/empleados/${person!.id}/editar`);
  await expect(page.locator('input[name="full_name"]')).toHaveValue('E2E Created');

  await page.locator('button:has-text("Regenerar código")').click();
  await expect(page.locator('text=Nuevo código')).toBeVisible();

  await cleanupTestEmployee(person!.id);
});
