// requireHrAdmin helper (P1.6 Batch 3).
// Centraliza el check de rol hr_admin para server actions admin.
// Reemplaza el patron solo-auth.getUser() que dejaba a empleados invocar
// createEmployeeAction / updateEmployeeAction / regenerateInviteCodeAction
// directamente via POST.

import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface HrAdminContext {
  user: User;
  personId: string;
}

export async function requireHrAdmin(): Promise<HrAdminContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AuthorizationError('No autenticado.');
  }
  // Two-step lookup: hr.people.auth_id -> hr.employments.person_id.
  // hr.employments has no auth_id column; canonical link is via hr.people.
  const { data: person } = await supabase
    .schema('hr')
    .from('people')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (!person) {
    throw new AuthorizationError('No tienes persona asociada.');
  }
  const { data: employment } = await supabase
    .schema('hr')
    .from('employments')
    .select('app_role')
    .eq('person_id', person.id)
    .eq('is_current', true)
    .maybeSingle();
  if (!employment) {
    throw new AuthorizationError('No tienes employment activo.');
  }
  if (employment.app_role !== 'hr_admin') {
    throw new AuthorizationError('Acceso restringido a hr_admin.');
  }
  return { user, personId: person.id };
}
