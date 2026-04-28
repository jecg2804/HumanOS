'use server';
import { redirect } from 'next/navigation';
import { createServerClientPublic } from '@/lib/supabase/server';

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/inicio');

  const supabase = await createServerClientPublic();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent('Email o contraseña incorrectos')}&next=${encodeURIComponent(next)}`,
    );
  }
  redirect(next);
}

export async function logoutAction() {
  const supabase = await createServerClientPublic();
  await supabase.auth.signOut();
  redirect('/login');
}
