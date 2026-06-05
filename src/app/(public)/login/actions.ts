'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { userHasHumanOSAccess } from '@/lib/auth/allowed-apps';
import { normalizeLoginIdentifier } from '@/lib/auth/identity';

// SIGNUP-phone (spec 2026-06-05 seccion 4): el login acepta email O codigo de empleado. Un email se
// reconoce por '@'; cualquier otra cosa se trata como employee_code y se resuelve a email via RPC.
// Backward-compat: el form historico posteaba 'email'; aceptamos ambos campos.
const LoginInput = z.object({
  identifier: z.string().min(1, 'Ingresa tu correo o codigo de empleado'),
  password: z.string().min(1, 'Contrasena requerida'),
  next: z.string().optional(),
});

export type LoginResult = { ok: true } | { ok: false; error: string };

// Anti-enumeracion (guardrail #4): UN solo mensaje para cualquier fallo de credenciales --
// "no existe" y "password incorrecto" son indistinguibles. Sin codigo/cedula en el mensaje.
const GENERIC_CREDENTIALS_ERROR = 'Correo/codigo o contrasena incorrectos';

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const rawIdentifier =
    (formData.get('identifier') as string | null) ??
    (formData.get('email') as string | null) ??
    '';
  const parsed = LoginInput.safeParse({
    identifier: rawIdentifier,
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Datos invalidos',
    };
  }

  const normalizedIdentifier = normalizeLoginIdentifier(parsed.data.identifier);

  // Guardrail #5: rate-limit de LOGIN keyed (identifier_hash, ip). Corre ANTES de tocar credenciales,
  // sobre el admin client (la RPC es service_role-only). identifier_hash = SHA256 hex (nunca el valor
  // en claro). Fail-closed ante error de la RPC.
  const admin = createSupabaseAdminClient();
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ipAddress = (forwardedFor?.split(',')[0]?.trim() || realIp || '0.0.0.0').slice(0, 45);
  const identifierHash = createHash('sha256').update(normalizedIdentifier).digest('hex');

  const { data: rateJson, error: rateErr } = await admin
    .schema('hr')
    .rpc('check_login_rate_limit', {
      p_identifier_hash: identifierHash,
      p_ip_address: ipAddress,
    });
  if (rateErr) {
    return { ok: false, error: 'Error de inicio de sesion. Intenta de nuevo.' };
  }
  const rate = rateJson as { blocked: boolean } | null;
  if (rate?.blocked) {
    return {
      ok: false,
      error: 'Demasiados intentos. Espera unos minutos antes de reintentar.',
    };
  }

  // Resolver identificador -> email canonico (email o employee_code). Devuelve NULL uniformemente si
  // no resuelve (anti-enumeracion). Sin resolucion -> mismo error generico que un password malo.
  const { data: resolvedEmail, error: resolveErr } = await admin
    .schema('hr')
    .rpc('resolve_login_identifier', { p_identifier: normalizedIdentifier });
  if (resolveErr) {
    return { ok: false, error: 'Error de inicio de sesion. Intenta de nuevo.' };
  }
  if (!resolvedEmail || typeof resolvedEmail !== 'string') {
    return { ok: false, error: GENERIC_CREDENTIALS_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { ok: false, error: GENERIC_CREDENTIALS_ERROR };
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
