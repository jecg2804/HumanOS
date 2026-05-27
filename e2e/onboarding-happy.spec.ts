import { test, expect } from '@playwright/test';
import { adminClient, countAuthUsers, cleanupTestEmployee } from './lib/sql-helpers';

const TEST_CEDULA = '8-999-001';
const TEST_EMAIL = 'e2e-happy@iconsanet.com';
const TEST_PASSWORD = 'TestPass1234';

test('new user onboarding happy path', async ({ page }) => {
  const admin = adminClient();

  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .insert({
      full_name: 'E2E Happy User',
      national_id: TEST_CEDULA,
      status: 'Activo',
      created_from: 'manual',
    })
    .select('id')
    .single();
  if (!person) throw new Error('Seed person failed');

  const { data: employmentType } = await admin
    .schema('hr')
    .from('employment_types')
    .select('id')
    .eq('code', 'tiempo_indefinido')
    .single();
  if (!employmentType) throw new Error('No tiempo_indefinido employment_type');

  await admin.schema('hr').from('employments').insert({
    person_id: person.id,
    position_text: 'Tester',
    department_text: 'QA',
    office_text: 'Remoto',
    hire_date: '2025-01-01',
    app_role: 'employee',
    employment_type_id: employmentType.id,
  });

  await admin.schema('hr').from('user_settings').insert({ person_id: person.id });

  const inviteCode = 'E2EHAPPY';
  await admin.schema('hr').from('invite_codes').insert({
    code: inviteCode,
    person_id: person.id,
    invite_method: 'email',
    delivery_target: TEST_EMAIL,
  });

  const usersBefore = await countAuthUsers();

  await page.goto(`/onboarding/${inviteCode}`);
  await page.locator('input').first().fill(inviteCode);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[placeholder*="8-123"]', TEST_CEDULA);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[name="delivery_target"]', TEST_EMAIL);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('button:has-text("Todo correcto")').click();
  await page.fill('input[placeholder="madre, esposa, hermano…"]', 'Madre');
  await page.fill('input[placeholder*="+50761234567"]', '+50761234567');
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('select').first().selectOption('Panamá');
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('input[type="checkbox"]').nth(0).check();
  await page.locator('input[type="checkbox"]').nth(1).check();
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('button:has-text("Confirmar")').click();

  await expect(page).toHaveURL(/\/perfil/);

  const usersAfter = await countAuthUsers();
  expect(usersAfter).toBe(usersBefore + 1);

  const { data: updatedPerson } = await admin
    .schema('hr')
    .from('people')
    .select('auth_id')
    .eq('id', person.id)
    .single();
  expect(updatedPerson?.auth_id).toBeTruthy();

  const { data: invite } = await admin
    .schema('hr')
    .from('invite_codes')
    .select('consumed_at')
    .eq('code', inviteCode)
    .single();
  expect(invite?.consumed_at).toBeTruthy();

  await cleanupTestEmployee(person.id);
});
