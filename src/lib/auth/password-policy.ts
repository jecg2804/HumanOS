import { z } from 'zod';

// SIGNUP-guardrails #1 (spec 2026-06-05-signup-cluster-design seccion 5 + advisory seccion 4):
// el employee_code/cedula son USERNAME adivinables, jamas credencial. La credencial real es una
// contrasena de alta entropia. Politica minima 10 (piso historico del repo, Step4Schema), preferida
// 12. Validamos forma (longitud + diversidad de clases) en Zod; el filtro de contrasenas filtradas
// (HIBP/pwned) lo aplica Supabase Auth server-side (weak_password -> translateAuthError). NO
// implementamos un diccionario propio: Zod cubre la FORMA, Supabase cubre el LEAK.
//
// No voseo (R15): "Usa", "Evita", "debe" (tu-form / impersonal), nunca "usá"/"evitá".

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_RECOMMENDED_LENGTH = 12;

/** Mensajes centralizados (espanol neutro Panama, sin voseo). */
export const PASSWORD_MESSAGES = {
  tooShort: `La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  noLetter: 'La contrasena debe incluir al menos una letra.',
  noNumberOrSymbol: 'La contrasena debe incluir al menos un numero o un simbolo.',
  whitespaceEnds: 'La contrasena no puede empezar ni terminar con espacios.',
} as const;

/**
 * Politica de contrasena (guardrail #1). Reglas de FORMA:
 *  - longitud minima PASSWORD_MIN_LENGTH
 *  - al menos una letra
 *  - al menos un numero o simbolo (eleva la entropia frente a palabras puras)
 *  - sin espacios al inicio/fin (errores de copy-paste que confunden al usuario)
 * El chequeo contra contrasenas filtradas (pwned) lo hace Supabase Auth, no aqui.
 */
export const passwordPolicySchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_MESSAGES.tooShort)
  .refine((v) => v === v.trim(), { message: PASSWORD_MESSAGES.whitespaceEnds })
  .refine((v) => /\p{L}/u.test(v), { message: PASSWORD_MESSAGES.noLetter })
  .refine((v) => /[0-9]|[^\p{L}0-9]/u.test(v), {
    message: PASSWORD_MESSAGES.noNumberOrSymbol,
  });

/** Helper booleano para validacion en cliente (Step4) sin throw. */
export function isPasswordValid(password: string): boolean {
  return passwordPolicySchema.safeParse(password).success;
}

/** Primer mensaje de error de politica, o null si valida. */
export function passwordPolicyError(password: string): string | null {
  const r = passwordPolicySchema.safeParse(password);
  return r.success ? null : r.error.issues[0]?.message ?? 'Contrasena invalida';
}
