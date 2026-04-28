/**
 * Seed Supabase Auth users for testers + link auth_id en humanos.people.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotente: si la cuenta ya existe en auth.users, solo vincula auth_id.
 *
 * Run: npm run seed:auth-users
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Asegura que .env.local también se lea (dotenv/config solo lee .env por default)
loadEnv({ path: '.env.local' });

const TESTERS: Array<{ code: string; password: string }> = [
  { code: 'KOSM01', password: 'TestPass2026!' }, // Samantha Kosmas
  { code: 'OLM206', password: 'TestPass2026!' }, // Rocío Olmedo
  { code: 'MAN943', password: 'TestPass2026!' }, // Milagros Manyoma
  { code: 'MEN943', password: 'TestPass2026!' }, // Jerelyn Mendoza
  { code: 'EIS772', password: 'TestPass2026!' }, // Rodrigo Eisenmann
  { code: 'CUC166', password: 'TestPass2026!' }, // Jaime Cucalón
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supa = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  for (const { code, password } of TESTERS) {
    const { data: person, error: pErr } = await supa
      .schema('humanos')
      .from('people')
      .select('id, email, name')
      .eq('code', code)
      .single();

    if (pErr || !person) {
      console.warn(`[skip] ${code} no encontrado en humanos.people: ${pErr?.message ?? 'no row'}`);
      continue;
    }
    if (!person.email) {
      console.warn(`[skip] ${code} (${person.name}) no tiene email`);
      continue;
    }

    // Idempotent: busca por email; si existe, reusa.
    const { data: list, error: lErr } = await supa.auth.admin.listUsers();
    if (lErr) {
      console.error(`[error] listUsers: ${lErr.message}`);
      continue;
    }
    let userId = list.users.find((u) => u.email === person.email)?.id;

    if (!userId) {
      const { data: created, error: cErr } = await supa.auth.admin.createUser({
        email: person.email,
        password,
        email_confirm: true,
        user_metadata: { name: person.name, code },
      });
      if (cErr || !created.user) {
        console.error(`[error] createUser ${code}: ${cErr?.message ?? 'no user'}`);
        continue;
      }
      userId = created.user.id;
      console.log(`[created] ${code} → ${person.email}`);
    } else {
      console.log(`[exists] ${code} → ${person.email}`);
    }

    const { error: uErr } = await supa
      .schema('humanos')
      .from('people')
      .update({ auth_id: userId })
      .eq('id', person.id);
    if (uErr) {
      console.error(`[error] link auth_id ${code}: ${uErr.message}`);
    } else {
      console.log(`[linked] ${code} auth_id=${userId}`);
    }
  }
  console.log('\nSeed complete. Password inicial: TestPass2026! — rota antes de exponer a usuarios reales.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
