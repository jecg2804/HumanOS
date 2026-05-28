'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { userHasHumanOSAccess } from '@/lib/auth/allowed-apps';

const LoginInput = z.object({
  email: z.string().email('Correo invalido'),
  password: z.string().min(1, 'Contrasena requerida'),
  next: z.string().optional(),
});

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = LoginInput.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Datos invalidos',
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { ok: false, error: 'Correo o contrasena incorrectos' };
  }

  if (!userHasHumanOSAccess(data.user)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error:
        'Tu cuenta no tiene acceso a HumanOS. Solicita un codigo de invitacion a RRHH.',
    };
  }

  const safeNext = isSafeNextPath(parsed.data.next) ? parsed.data.next! : '/dashboard';
  redirect(safeNext);
}

function isSafeNextPath(next: string | undefined): boolean {
  if (!next) return false;
  if (!next.startsWith('/')) return false;
  if (next.startsWith('//')) return false; // protocol-relative URL
  if (next.startsWith('/\\')) return false; // edge case browsers normalize
  return true;
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
