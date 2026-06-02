// scripts/seed-test-user.mjs
// One-off DEV seed: creates a HumanOS test login end-to-end:
//   auth.users (allowed_apps=['humanOS'], email confirmed) + hr.people (auth_id linked) + hr.employments (app_role=hr_admin)
//
// Run from repo root:   node scripts/seed-test-user.mjs
// Override creds:        TEST_USER_EMAIL=you@iconsa.test TEST_USER_PASSWORD='Secret123!' node scripts/seed-test-user.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local (same key the app's admin client uses).
// Idempotent: re-running resets the password + re-ensures access; does not duplicate rows.
// NOT for production. To remove: delete the auth user in the dashboard + its hr.people/hr.employments rows.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// --- minimal .env.local loader (no extra deps, no Node flag needed) ---
function loadEnv(path = '.env.local') {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`Could not read ${path} — run this from the repo root.`);
  }
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const EMAIL = process.env.TEST_USER_EMAIL || 'admin@iconsa.test';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'HumanOS2026!';
const FULL_NAME = 'Administrador de Pruebas';
const APP_ROLE = 'hr_admin'; // hr_admin => full app visibility
const ALLOWED_APPS = ['humanOS']; // APP_NAME token the proxy checks

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  // 1) auth user (create, or find + update if it already exists) ---------------
  let authId;
  const created = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { allowed_apps: ALLOWED_APPS },
  });

  if (created.error) {
    const existing = await findUserByEmail(EMAIL);
    if (!existing) throw created.error;
    authId = existing.id;
    const mergedApps = Array.from(
      new Set([...(existing.app_metadata?.allowed_apps ?? []), ...ALLOWED_APPS])
    );
    const upd = await admin.auth.admin.updateUserById(authId, {
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { ...existing.app_metadata, allowed_apps: mergedApps },
    });
    if (upd.error) throw upd.error;
    console.log(`auth user existed -> updated + password reset (${authId})`);
  } else {
    authId = created.data.user.id;
    console.log(`auth user created (${authId})`);
  }

  // 2) hr.people linked to the auth user (create or reuse) ---------------------
  let personId;
  const { data: existingPerson, error: pSelErr } = await admin
    .schema('hr')
    .from('people')
    .select('id')
    .eq('auth_id', authId)
    .maybeSingle();
  if (pSelErr) throw pSelErr;

  if (existingPerson) {
    personId = existingPerson.id;
    console.log(`hr.people existed (${personId})`);
  } else {
    const { data, error } = await admin
      .schema('hr')
      .from('people')
      .insert({ full_name: FULL_NAME, auth_id: authId, employee_code: 'TESTADMIN' })
      .select('id')
      .single();
    if (error) throw error;
    personId = data.id;
    console.log(`hr.people created (${personId})`);
  }

  // 3) current employment with the app_role (create if none) -------------------
  const { data: emp, error: eSelErr } = await admin
    .schema('hr')
    .from('employments')
    .select('id, app_role')
    .eq('person_id', personId)
    .is('valid_to', null)
    .maybeSingle();
  if (eSelErr) throw eSelErr;

  if (emp) {
    console.log(`hr.employments current exists (app_role=${emp.app_role})`);
    if (emp.app_role !== APP_ROLE) {
      const { error } = await admin
        .schema('hr')
        .from('employments')
        .update({ app_role: APP_ROLE })
        .eq('id', emp.id);
      if (error) throw error;
      console.log(`  -> app_role updated to ${APP_ROLE}`);
    }
  } else {
    const { error } = await admin.schema('hr').from('employments').insert({
      person_id: personId,
      app_role: APP_ROLE,
      position_text: 'Administrador de Pruebas (seed)',
      // is_current is a GENERATED column (valid_to IS NULL) - never insert it.
    });
    if (error) throw error;
    console.log(`hr.employments created (app_role=${APP_ROLE})`);
  }

  console.log('\n========================================');
  console.log(' HumanOS test login listo:');
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Rol:      ${APP_ROLE}`);
  console.log('   Login:    http://localhost:3001/login');
  console.log('========================================\n');
}

main().catch((e) => {
  console.error('SEED FAILED:', e?.message || e);
  process.exit(1);
});
