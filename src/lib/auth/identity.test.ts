import { describe, it, expect } from 'vitest';
import {
  buildSyntheticEmail,
  isSyntheticEmail,
  normalizeLoginIdentifier,
  SYNTHETIC_EMAIL_DOMAIN,
} from './identity';

describe('buildSyntheticEmail (SIGNUP-phone)', () => {
  it('builds a non-routable email from an employee_code', () => {
    expect(buildSyntheticEmail('CUC166')).toBe(`cuc166@${SYNTHETIC_EMAIL_DOMAIN}`);
  });

  it('builds from raw cedula digits (collapses non-alphanumeric to a dot)', () => {
    expect(buildSyntheticEmail('8-930-2166')).toBe(`8.930.2166@${SYNTHETIC_EMAIL_DOMAIN}`);
  });

  it('lowercases and trims', () => {
    expect(buildSyntheticEmail('  AbC123  ')).toBe(`abc123@${SYNTHETIC_EMAIL_DOMAIN}`);
  });

  it('strips leading/trailing separators and collapses repeats', () => {
    expect(buildSyntheticEmail('--a__b--')).toBe(`a.b@${SYNTHETIC_EMAIL_DOMAIN}`);
  });

  it('throws when the seed yields an empty local-part', () => {
    expect(() => buildSyntheticEmail('---')).toThrow(/email sintetico/i);
    expect(() => buildSyntheticEmail('')).toThrow(/email sintetico/i);
  });
});

describe('isSyntheticEmail', () => {
  it('detects the synthetic domain', () => {
    expect(isSyntheticEmail(`cuc166@${SYNTHETIC_EMAIL_DOMAIN}`)).toBe(true);
  });

  it('is false for a real email', () => {
    expect(isSyntheticEmail('persona@iconsanet.com')).toBe(false);
  });

  it('is false for null/undefined/empty', () => {
    expect(isSyntheticEmail(null)).toBe(false);
    expect(isSyntheticEmail(undefined)).toBe(false);
    expect(isSyntheticEmail('')).toBe(false);
  });

  it('is case-insensitive on the domain', () => {
    expect(isSyntheticEmail(`CUC166@NO-MAIL.ICONSA.LOCAL`)).toBe(true);
  });
});

describe('normalizeLoginIdentifier', () => {
  it('lowercases an email', () => {
    expect(normalizeLoginIdentifier('  Persona@ICONSA.com ')).toBe('persona@iconsa.com');
  });

  it('uppercases an employee_code (case-insensitive resolution)', () => {
    expect(normalizeLoginIdentifier('  cuc166 ')).toBe('CUC166');
  });
});
