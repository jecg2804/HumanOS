import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function getAuthUserSnapshot(email: string) {
  const c = adminClient();
  const { data } = await c
    .schema('hr')
    .rpc('find_auth_user_by_identifier', { p_field: 'email', p_value: email });
  return (
    (data as unknown as Array<{
      id: string;
      raw_app_meta_data: Record<string, unknown>;
      encrypted_password: string;
    }>)?.[0] ?? null
  );
}

export async function countAuthUsers(): Promise<number> {
  const c = adminClient();
  const { data, error } = await c.rpc('count_auth_users');
  if (error) throw error;
  return data as number;
}

export async function cleanupTestEmployee(personId: string) {
  const c = adminClient();
  await c.schema('hr').from('invite_codes').delete().eq('person_id', personId);
  await c.schema('hr').from('addresses').delete().eq('person_id', personId);
  await c.schema('hr').from('contacts').delete().eq('person_id', personId);
  await c.schema('hr').from('medical_info').delete().eq('person_id', personId);
  await c.schema('hr').from('user_settings').delete().eq('person_id', personId);
  await c.schema('hr').from('employments').delete().eq('person_id', personId);
  await c.schema('hr').from('people').delete().eq('id', personId);
}
