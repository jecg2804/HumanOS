import { describe, it, expect } from 'vitest';
import {
  passwordPolicySchema,
  isPasswordValid,
  passwordPolicyError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MESSAGES,
} from './password-policy';

describe('passwordPolicySchema (SIGNUP-guardrails #1)', () => {
  it('accepts a strong mixed password', () => {
    expect(passwordPolicySchema.safeParse('Obra2026Segura').success).toBe(true);
    expect(passwordPolicySchema.safeParse('correcto-horse-9').success).toBe(true);
  });

  it(`rejects shorter than ${PASSWORD_MIN_LENGTH} chars`, () => {
    const r = passwordPolicySchema.safeParse('Abc1!');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe(PASSWORD_MESSAGES.tooShort);
  });

  it('rejects digits-only (no letter)', () => {
    expect(passwordPolicySchema.safeParse('1234567890').success).toBe(false);
  });

  it('rejects letters-only (no number/symbol)', () => {
    expect(passwordPolicySchema.safeParse('abcdefghij').success).toBe(false);
  });

  it('accepts letters + symbol (no digit needed)', () => {
    expect(passwordPolicySchema.safeParse('abcdefghi!').success).toBe(true);
  });

  it('rejects leading/trailing whitespace', () => {
    expect(passwordPolicySchema.safeParse(' Obra2026Segura').success).toBe(false);
    expect(passwordPolicySchema.safeParse('Obra2026Segura ').success).toBe(false);
  });

  it('accepts accented letters as letters (Unicode-aware)', () => {
    expect(passwordPolicySchema.safeParse('Contraseña9').success).toBe(true);
  });
});

describe('isPasswordValid / passwordPolicyError helpers', () => {
  it('isPasswordValid mirrors the schema', () => {
    expect(isPasswordValid('Obra2026Segura')).toBe(true);
    expect(isPasswordValid('short')).toBe(false);
  });

  it('passwordPolicyError returns null when valid, message when invalid', () => {
    expect(passwordPolicyError('Obra2026Segura')).toBeNull();
    expect(passwordPolicyError('123')).toBe(PASSWORD_MESSAGES.tooShort);
  });
});

describe('password policy copy is neutral-Panama (no voseo, R15)', () => {
  it('messages use tu-form / impersonal, not voseo', () => {
    const all = Object.values(PASSWORD_MESSAGES).join(' ');
    expect(all).not.toMatch(/\b(usá|evitá|debés|tenés|podés|elegí|incluí)\b/iu);
  });
});
