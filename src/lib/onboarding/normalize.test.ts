import { describe, it, expect } from 'vitest';
import { normalizeNationalId, normalizePhone } from './normalize';

describe('normalizeNationalId', () => {
  it('strips hyphens', () => {
    expect(normalizeNationalId('8-123-456')).toBe('8123456');
  });

  it('strips spaces and trims', () => {
    expect(normalizeNationalId('  8 123 456  ')).toBe('8123456');
  });

  it('upper-cases passport letters', () => {
    expect(normalizeNationalId('p-AB123')).toBe('PAB123');
  });

  it('handles empty string', () => {
    expect(normalizeNationalId('')).toBe('');
  });

  it('rejects non-alphanumeric', () => {
    expect(normalizeNationalId('8/123/456')).toBe('8123456');
  });
});

describe('normalizePhone', () => {
  it('keeps E.164 unchanged', () => {
    expect(normalizePhone('+50761234567')).toBe('+50761234567');
  });

  it('prepends +507 when 8-digit local', () => {
    expect(normalizePhone('61234567')).toBe('+50761234567');
  });

  it('strips spaces and hyphens', () => {
    expect(normalizePhone('+507 6123-4567')).toBe('+50761234567');
  });

  it('throws on invalid length', () => {
    expect(() => normalizePhone('123')).toThrow(/Teléfono inválido/);
  });
});
