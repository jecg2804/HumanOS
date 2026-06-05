// SIGNUP-phone (Group 3, spec 2026-06-05-signup-cluster-design seccion 4): email es el identificador
// canonico de auth.users. Los obreros sin buzon reciben un email sintetico no-ruteable para que TODA
// cuenta sea logueable por el mismo path email+password (signInWithPassword). El telefono pasa a ser
// dato de perfil/alias, NUNCA identificador de login de auth.users.
//
// A5 (spec): @no-mail.iconsa.local es un TLD reservado (.local, RFC 6762) -> no enrutable. Ningun
// correo real puede entregarse ahi, lo que documenta que la cuenta no tiene buzon. El local-part se
// deriva del identificador estable que el empleado ya conoce (employee_code o digitos de cedula).

export const SYNTHETIC_EMAIL_DOMAIN = 'no-mail.iconsa.local' as const;

/**
 * Construye un email sintetico no-ruteable para una cuenta sin buzon (SIGNUP-phone).
 * El local-part se normaliza a [a-z0-9.] para ser un email valido. Lanza si el seed queda vacio.
 *
 * @param seed identificador estable del empleado (employee_code o digitos de cedula).
 */
export function buildSyntheticEmail(seed: string): string {
  const localPart = seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
  if (!localPart) {
    throw new Error('No se pudo derivar un email sintetico: identificador vacio.');
  }
  return `${localPart}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/** True si el email pertenece al dominio sintetico no-ruteable (cuenta sin buzon). */
export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

/**
 * Normaliza un identificador de login para hashing del rate-limit y para la resolucion via RPC.
 * Email -> lower+trim. employee_code -> trim+upper (la resolucion es case-insensitive).
 */
export function normalizeLoginIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  return trimmed.toUpperCase();
}
