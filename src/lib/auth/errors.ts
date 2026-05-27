export interface AuthErrorShape {
  code?: string;
  message: string;
}

const CODES: Record<string, string> = {
  weak_password:
    'La contraseña debe tener al menos 10 caracteres y no estar en la lista de contraseñas comprometidas.',
  email_exists:
    'Este correo ya está registrado. Inicia sesión o usa recuperación de contraseña.',
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Por favor confirma tu correo. Revisa tu bandeja de entrada.',
  over_email_send_rate_limit: 'Demasiados intentos. Espera unos minutos.',
  user_not_found: 'No encontramos una cuenta con esos datos.',
  session_expired: 'Tu sesión expiró. Inicia sesión nuevamente.',
};

const FALLBACK = 'Ocurrió un error. Intenta nuevamente o contacta a RRHH.';

export function translateAuthError(error: AuthErrorShape): string {
  if (!error.code) return FALLBACK;
  return CODES[error.code] ?? FALLBACK;
}
