import { test, expect } from '@playwright/test';
import { adminClient, cleanupTestEmployee } from './lib/sql-helpers';

test('step 5 critical error pauses wizard + flags needs_review', async ({ page }) => {
  const admin = adminClient();
  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .insert({
      full_name: 'Wrong Name',
      national_id: '8-888-001',
      status: 'Activo',
      created_from: 'manual',
    })
    .select('id')
    .single();
  if (!person) throw new Error('seed failed');

  const { data: employmentType } = await admin
    .schema('hr')
    .from('employment_types')
    .select('id')
    .eq('code', 'tiempo_indefinido')
    .single();
  if (!employmentType) throw new Error('No tiempo_indefinido employment_type');

  await admin.schema('hr').from('employments').insert({
    person_id: person.id,
    position_text: 'Test',
    department_text: 'Test',
    office_text: 'Test',
    hire_date: '2025-01-01',
    app_role: 'employee',
    employment_type_id: employmentType.id,
  });
  await admin.schema('hr').from('user_settings').insert({ person_id: person.id });

  const code = 'E2ERROR1';
  await admin.schema('hr').from('invite_codes').insert({
    code,
    person_id: person.id,
    invite_method: 'email',
    delivery_target: 'e2e-err@iconsanet.com',
  });

  await page.goto(`/onboarding/${code}`);
  await page.locator('input').first().fill(code);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[placeholder*="8-123"]', '8-888-001');
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[name="delivery_target"]', 'e2e-err@iconsanet.com');
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[type="password"]', 'TestPass1234');
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('button:has-text("Hay un error")').click();
  await page.locator('select[name="severity"]').selectOption('critica');
  await page.fill('textarea[name="description"]', 'Mi nombre no es Wrong Name, es Right Name');
  await page.locator('button:has-text("Enviar reporte")').click();

  await expect(page).toHaveURL(/\/onboarding\/error-reported/);

  const { data: updated } = await admin
    .schema('hr')
    .from('people')
    .select('needs_review, review_notes')
    .eq('id', person.id)
    .single();
  expect(updated?.needs_review).toBe(true);
  expect(updated?.review_notes).toContain('Severidad: critica');
  expect(updated?.review_notes).toContain('Mi nombre no es Wrong Name');

  const { data: invite } = await admin
    .schema('hr')
    .from('invite_codes')
    .select('consumed_at')
    .eq('code', code)
    .single();
  expect(invite?.consumed_at).toBeNull();

  await cleanupTestEmployee(person.id);
});
