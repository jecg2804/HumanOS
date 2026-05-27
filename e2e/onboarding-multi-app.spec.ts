import { test, expect } from '@playwright/test';
import {
  adminClient,
  getAuthUserSnapshot,
  countAuthUsers,
  cleanupTestEmployee,
} from './lib/sql-helpers';

const RODRIGO_EMAIL = 'reisenmann@iconsanet.com';
const RODRIGO_CEDULA = '8-123-456';

test('multi-app merge preserves encrypted_password (no MovimientOS break)', async ({ page }) => {
  const admin = adminClient();

  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .insert({
      full_name: 'Rodrigo Test',
      national_id: RODRIGO_CEDULA,
      status: 'Activo',
      created_from: 'manual',
    })
    .select('id')
    .single();
  if (!person) throw new Error('Seed failed');

  const { data: employmentType } = await admin
    .schema('hr')
    .from('employment_types')
    .select('id')
    .eq('code', 'tiempo_indefinido')
    .single();
  if (!employmentType) throw new Error('No tiempo_indefinido employment_type');

  await admin.schema('hr').from('employments').insert({
    person_id: person.id,
    position_text: 'President Test',
    department_text: 'Direccion',
    office_text: 'Oficina Central',
    hire_date: '2010-01-01',
    app_role: 'president',
    employment_type_id: employmentType.id,
  });

  await admin.schema('hr').from('user_settings').insert({ person_id: person.id });

  const inviteCode = 'E2EMULTI';
  await admin.schema('hr').from('invite_codes').insert({
    code: inviteCode,
    person_id: person.id,
    invite_method: 'email',
    delivery_target: RODRIGO_EMAIL,
  });

  const usersBefore = await countAuthUsers();
  const rodrigoBefore = await getAuthUserSnapshot(RODRIGO_EMAIL);
  expect(rodrigoBefore).toBeTruthy();

  await page.goto(`/onboarding/${inviteCode}`);
  await page.locator('input').first().fill(inviteCode);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[placeholder*="8-123"]', RODRIGO_CEDULA);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[name="delivery_target"]', RODRIGO_EMAIL);
  await page.locator('button:has-text("Continuar")').click();
  await expect(page.locator('text=Confirma tus datos')).toBeVisible();
  await page.locator('button:has-text("Todo correcto")').click();
  await page.fill('input[placeholder="madre, esposa, hermano…"]', 'Esposa');
  await page.fill('input[placeholder*="+50761234567"]', '+50760000000');
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
  expect(usersAfter).toBe(usersBefore);

  const rodrigoAfter = await getAuthUserSnapshot(RODRIGO_EMAIL);
  expect(rodrigoAfter?.encrypted_password).toBe(rodrigoBefore?.encrypted_password);
  expect(
    (rodrigoAfter?.raw_app_meta_data as { allowed_apps?: string[] })?.allowed_apps
  ).toContain('humanOS');
  expect(
    (rodrigoAfter?.raw_app_meta_data as { allowed_apps?: string[] })?.allowed_apps
  ).toContain('movimientOS');
  expect((rodrigoAfter?.raw_app_meta_data as { provider?: string })?.provider).toBe(
    (rodrigoBefore?.raw_app_meta_data as { provider?: string })?.provider
  );

  await cleanupTestEmployee(person.id);
});
