'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { translateAuthError } from '@/lib/auth/errors';
import { z } from 'zod';

const Schema = z.object({
  identifier: z.string().min(1, 'Ingresa tu correo o teléfono'),
});

type FormState = { ok: boolean; message?: string };

export async function resetPasswordForEmailAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = Schema.safeParse({ identifier: formData.get('identifier') });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const identifier = parsed.data.identifier.trim();
  if (!identifier.includes('@')) {
    return {
      ok: true,
      message:
        'Si te registraste con teléfono, contacta a tu Oficial de RRHH (Samantha Kosmas o Rocío Olmedo) para recuperar tu contraseña. SMS recovery estará disponible en próxima versión.',
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(identifier.toLowerCase(), {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password`,
  });
  if (error && error.code !== 'over_email_send_rate_limit' && error.code !== 'user_not_found') {
    return { ok: false, message: translateAuthError(error) };
  }
  return {
    ok: true,
    message: 'Si esa cuenta existe, te enviamos un enlace de recuperación a tu correo.',
  };
}
