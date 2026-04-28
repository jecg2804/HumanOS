import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient, createServerClientPublic } from '@/lib/supabase/server';
import type { AppRole, Person } from '@/types/database';

const HR_CODES = new Set(['KOSM01', 'OLM206', 'MAN943', 'MEN943']);

export type Me = Person & { role: AppRole };

export class NoLinkedProfileError extends Error {
  constructor() {
    super('NO_LINKED_PROFILE');
    this.name = 'NoLinkedProfileError';
  }
}

export const getMe = cache(async (): Promise<Me> => {
  const supaPub = await createServerClientPublic();
  const {
    data: { user },
  } = await supaPub.auth.getUser();
  if (!user) redirect('/login');

  const supa = await createServerClient();
  const { data: person } = await supa
    .from('people')
    .select('*')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!person) {
    throw new NoLinkedProfileError();
  }

  let role: AppRole = 'employee';
  if (person.app_role && ['employee', 'supervisor', 'hr_admin'].includes(person.app_role)) {
    role = person.app_role as AppRole;
  } else if (HR_CODES.has(person.code)) {
    role = 'hr_admin';
  } else {
    const { count } = await supa
      .from('people')
      .select('id', { count: 'exact', head: true })
      .eq('supervisor_id', person.id);
    if ((count ?? 0) > 0) role = 'supervisor';
  }

  return { ...(person as Person), role };
});
