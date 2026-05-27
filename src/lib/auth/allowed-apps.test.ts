import { describe, it, expect } from 'vitest';
import { userHasHumanOSAccess } from './allowed-apps';
import { isPublicRoute } from './constants';

describe('userHasHumanOSAccess', () => {
  it('returns false when user is null', () => {
    expect(userHasHumanOSAccess(null)).toBe(false);
  });

  it('returns false when app_metadata is missing', () => {
    expect(userHasHumanOSAccess({ id: 'u1' } as never)).toBe(false);
  });

  it('returns false when allowed_apps is missing', () => {
    expect(userHasHumanOSAccess({ app_metadata: {} } as never)).toBe(false);
  });

  it('returns false when allowed_apps does not include humanOS', () => {
    expect(
      userHasHumanOSAccess({ app_metadata: { allowed_apps: ['movimientOS'] } } as never)
    ).toBe(false);
  });

  it('returns true when allowed_apps includes humanOS', () => {
    expect(
      userHasHumanOSAccess({
        app_metadata: { allowed_apps: ['humanOS', 'movimientOS'] },
      } as never)
    ).toBe(true);
  });

  it('is case-sensitive (rejects HUMANOS)', () => {
    expect(
      userHasHumanOSAccess({ app_metadata: { allowed_apps: ['HUMANOS'] } } as never)
    ).toBe(false);
  });
});

describe('isPublicRoute', () => {
  it.each([
    ['/login', true],
    ['/login/whatever', true],
    ['/onboarding/ABC123', true],
    ['/api/auth/callback', true],
    ['/error', true],
    ['/', false],
    ['/dashboard', false],
    ['/perfil', false],
    ['/solicitudes', false],
  ])('isPublicRoute(%s) === %s', (path, expected) => {
    expect(isPublicRoute(path)).toBe(expected);
  });
});
