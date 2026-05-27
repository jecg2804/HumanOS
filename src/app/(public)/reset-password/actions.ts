'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { translateAuthError } from '@/lib/auth/errors';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const Schema = z.object({
  password: z.string().min(10, 'Mínimo 10 caracteres'),
});

type FormState = { ok: boolean; message?: string };

export async function setNewPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = Schema.safeParse({ password: formData.get('password') });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: translateAuthError(error) };
  redirect('/login?reset=ok');
}
