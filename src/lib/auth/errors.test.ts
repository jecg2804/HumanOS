import { describe, it, expect } from 'vitest';
import { translateAuthError } from './errors';

describe('translateAuthError', () => {
  it('translates weak_password', () => {
    const msg = translateAuthError({ code: 'weak_password', message: 'Password is too weak' });
    expect(msg).toMatch(/al menos 10 caracteres/);
  });

  it('translates email_exists', () => {
    const msg = translateAuthError({ code: 'email_exists', message: 'User already exists' });
    expect(msg).toMatch(/ya está registrado/);
  });

  it('translates invalid_credentials', () => {
    const msg = translateAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' });
    expect(msg).toMatch(/incorrectos/);
  });

  it('translates email_not_confirmed', () => {
    const msg = translateAuthError({ code: 'email_not_confirmed', message: 'Email not confirmed' });
    expect(msg).toMatch(/confirma tu correo/);
  });

  it('translates over_email_send_rate_limit', () => {
    const msg = translateAuthError({ code: 'over_email_send_rate_limit', message: 'Rate limit' });
    expect(msg).toMatch(/Demasiados intentos/);
  });

  it('translates user_not_found', () => {
    const msg = translateAuthError({ code: 'user_not_found', message: 'User not found' });
    expect(msg).toMatch(/No encontramos/);
  });

  it('translates session_expired', () => {
    const msg = translateAuthError({ code: 'session_expired', message: 'Session expired' });
    expect(msg).toMatch(/sesión expiró/);
  });

  it('falls back to generic Spanish message for unknown code', () => {
    const msg = translateAuthError({ code: 'unknown_code_xyz', message: 'Whatever' });
    expect(msg).toMatch(/Intenta nuevamente/);
  });

  it('falls back when code is undefined', () => {
    const msg = translateAuthError({ message: 'Something' } as unknown as { code?: string; message: string });
    expect(msg).toMatch(/Intenta nuevamente/);
  });
});
