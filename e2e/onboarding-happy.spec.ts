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

  // Wizard step order (11 steps after SEC-CONSENT): 1 Code, 2 Identity (cedula),
  // 3 Identifier (delivery), 4 Password, 5 Confirm, 6 Consent (3 checkboxes),
  // 7 Emergency, 8 Medical, 9 Address, 10 Acknowledgments (2 checkboxes), 11 Photo.
  await page.goto(`/onboarding/${inviteCode}`);
  await page.locator('input').first().fill(inviteCode);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[placeholder*="8-123"]', TEST_CEDULA);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[name="delivery_target"]', TEST_EMAIL);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.locator('button:has-text("Continuar")').click();
  // Step 5: Confirm profile preview.
  await page.locator('button:has-text("Todo correcto")').click();
  // Step 6: Consent (SEC-CONSENT / Ley 81). Three required checkboxes:
  // data_processing, emergency_contact, medical. All must be checked to advance.
  await expect(
    page.getByRole('heading', { name: 'Consentimiento de datos personales' })
  ).toBeVisible();
  await page.locator('input[type="checkbox"]').nth(0).check();
  await page.locator('input[type="checkbox"]').nth(1).check();
  await page.locator('input[type="checkbox"]').nth(2).check();
  await page.locator('button:has-text("Continuar")').click();
  // Step 7: Emergency contact.
  await page.fill('input[placeholder="madre, esposa, hermano…"]', 'Madre');
  await page.fill('input[placeholder*="+50761234567"]', '+50761234567');
  await page.locator('button:has-text("Continuar")').click();
  // Step 8: Medical (all optional) -> skip.
  await page.locator('button:has-text("Continuar")').click();
  // Step 9: Address (province required).
  await page.locator('select').first().selectOption('Panamá');
  await page.locator('button:has-text("Continuar")').click();
  // Step 10: Acknowledgments (2 checkboxes).
  await page.locator('input[type="checkbox"]').nth(0).check();
  await page.locator('input[type="checkbox"]').nth(1).check();
  await page.locator('button:has-text("Continuar")').click();
  // Step 11: Photo + confirm.
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

// SEC-CONSENT (R27 / Ley 81) edge case: the consent step (step 6) blocks advance
// when the three required consent checkboxes are left unchecked.
test('consent step blocks advance when boxes unchecked', async ({ page }) => {
  const admin = adminClient();
  const cedula = '8-999-002';
  const email = 'e2e-consent@iconsanet.com';
  const inviteCode = 'E2ECONST';

  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .insert({
      full_name: 'E2E Consent User',
      national_id: cedula,
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

  await admin.schema('hr').from('invite_codes').insert({
    code: inviteCode,
    person_id: person.id,
    invite_method: 'email',
    delivery_target: email,
  });

  // Advance to the consent step (6).
  await page.goto(`/onboarding/${inviteCode}`);
  await page.locator('input').first().fill(inviteCode);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[placeholder*="8-123"]', cedula);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[name="delivery_target"]', email);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('button:has-text("Todo correcto")').click();

  // On the consent step with all boxes unchecked, clicking Continuar must NOT
  // advance: the error alert appears and the consent heading stays visible.
  const consentHeading = page.getByRole('heading', {
    name: 'Consentimiento de datos personales',
  });
  await expect(consentHeading).toBeVisible();
  await page.locator('button:has-text("Continuar")').click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(consentHeading).toBeVisible();

  await cleanupTestEmployee(person.id);
});
