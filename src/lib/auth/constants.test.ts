import { describe, it, expect } from 'vitest';
import { isPublicRoute, PUBLIC_ROUTES } from './constants';

describe('isPublicRoute', () => {
  it.each([
    '/login',
    '/forgot-password',
    '/reset-password',
    '/onboarding',
    '/onboarding/ABC123',
    '/api/auth/callback',
    '/error',
  ])('treats %s as public', (path) => {
    expect(isPublicRoute(path)).toBe(true);
  });

  // F-01 regression: the password-reset flow ships pages that anonymous users must reach.
  // If these drop out of PUBLIC_ROUTES the proxy bounces them to /login and the flow is dead.
  it('keeps the password-reset flow reachable while unauthenticated', () => {
    expect(isPublicRoute('/forgot-password')).toBe(true);
    expect(isPublicRoute('/reset-password')).toBe(true);
    expect(PUBLIC_ROUTES).toContain('/forgot-password');
    expect(PUBLIC_ROUTES).toContain('/reset-password');
  });

  it.each(['/dashboard', '/admin/empleados', '/perfil', '/ayuda'])(
    'treats %s as protected',
    (path) => {
      expect(isPublicRoute(path)).toBe(false);
    }
  );
});
