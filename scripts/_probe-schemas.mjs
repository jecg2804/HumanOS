// scripts/_probe-schemas.mjs  (throwaway diagnostic — safe, read-only)
// Asks PostgREST which schemas are exposed by probing a nonexistent table in each.
//   - "schema must be one of ..." / PGRST106  => schema NOT exposed
//   - table-not-found (PGRST205)              => schema IS exposed (table just missing)
// Run: node scripts/_probe-schemas.mjs

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path = '.env.local') {
  const raw = readFileSync(path, 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
const c = createClient(url, key, { auth: { persistSession: false } });

const schemas = [
  'public', 'hr', 'requests', 'docs', 'workflows', 'audit',
  'notifications', 'files', 'performance', 'learning', 'mdm', 'humanos',
];

let exposedListMsg = '';
for (const s of schemas) {
  const { error } = await c.schema(s).from('__probe_nonexistent__').select('*').limit(1);
  let verdict;
  const code = error?.code || '';
  const msg = error?.message || '';
  if (!error) {
    verdict = 'EXPOSED (probe table exists?!)';
  } else if (code === 'PGRST106' || /must be one of|not exposed|Invalid schema/i.test(msg)) {
    verdict = 'NOT exposed';
    if (!exposedListMsg && /must be one of/i.test(msg)) exposedListMsg = msg;
  } else {
    verdict = `EXPOSED (table-level: ${code || msg.slice(0, 40)})`;
  }
  console.log(`${s.padEnd(14)} -> ${verdict}`);
}

if (exposedListMsg) {
  console.log('\nPostgREST says the exposed schemas are:');
  console.log('  ' + exposedListMsg);
}
