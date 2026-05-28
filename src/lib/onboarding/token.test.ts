import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_SECRET = 'a'.repeat(64); // 64 hex chars = 32 bytes

describe('signOnboardingToken + verifyOnboardingToken', () => {
  beforeEach(() => {
    vi.stubEnv('ONBOARDING_TOKEN_SECRET', VALID_SECRET);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sign + verify round-trip recovers payload', async () => {
    const { signOnboardingToken, verifyOnboardingToken } = await import('./token');
    const payload = {
      invite_id: '550e8400-e29b-41d4-a716-446655440000',
      person_id: '550e8400-e29b-41d4-a716-446655440001',
      validated_at: '2026-05-28T12:00:00.000Z',
    };
    const token = signOnboardingToken(payload);
    expect(token).toContain('.');
    const verified = verifyOnboardingToken(token);
    expect(verified).toEqual(payload);
  });

  it('tampered signature rejected', async () => {
    const { signOnboardingToken, verifyOnboardingToken } = await import('./token');
    const token = signOnboardingToken({
      invite_id: 'inv-1',
      person_id: 'per-1',
      validated_at: '2026-05-28T12:00:00.000Z',
    });
    const [encodedData, signature] = token.split('.');
    const tampered = `${encodedData}.${signature.slice(0, -2)}XX`;
    expect(verifyOnboardingToken(tampered)).toBeNull();
  });

  it('tampered payload rejected', async () => {
    const { signOnboardingToken, verifyOnboardingToken } = await import('./token');
    const token = signOnboardingToken({
      invite_id: 'inv-1',
      person_id: 'per-1',
      validated_at: '2026-05-28T12:00:00.000Z',
    });
    const [, signature] = token.split('.');
    const evilPayload = Buffer.from('inv-1|per-EVIL|2026-05-28T12:00:00.000Z', 'utf-8').toString(
      'base64url'
    );
    expect(verifyOnboardingToken(`${evilPayload}.${signature}`)).toBeNull();
  });

  it('token signed with different secret is rejected', async () => {
    const { signOnboardingToken } = await import('./token');
    const token = signOnboardingToken({
      invite_id: 'inv-1',
      person_id: 'per-1',
      validated_at: '2026-05-28T12:00:00.000Z',
    });
    // Re-import with different secret
    vi.stubEnv('ONBOARDING_TOKEN_SECRET', 'b'.repeat(64));
    vi.resetModules();
    const { verifyOnboardingToken } = await import('./token');
    expect(verifyOnboardingToken(token)).toBeNull();
  });

  it('malformed token (no dot) rejected', async () => {
    const { verifyOnboardingToken } = await import('./token');
    expect(verifyOnboardingToken('not-a-token')).toBeNull();
    expect(verifyOnboardingToken('')).toBeNull();
  });

  it('throws when ONBOARDING_TOKEN_SECRET not set on sign', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('ONBOARDING_TOKEN_SECRET', '');
    vi.resetModules();
    const { signOnboardingToken } = await import('./token');
    expect(() =>
      signOnboardingToken({
        invite_id: 'i',
        person_id: 'p',
        validated_at: '2026-05-28T00:00:00.000Z',
      })
    ).toThrow(/ONBOARDING_TOKEN_SECRET/);
  });

  it('throws when secret too short on sign', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('ONBOARDING_TOKEN_SECRET', 'short');
    vi.resetModules();
    const { signOnboardingToken } = await import('./token');
    expect(() =>
      signOnboardingToken({
        invite_id: 'i',
        person_id: 'p',
        validated_at: '2026-05-28T00:00:00.000Z',
      })
    ).toThrow(/al menos/);
  });
});
