import { describe, it, expect } from 'vitest';
import { validateMime, MAX_FILE_SIZE_BYTES, ALLOWED_MIME } from './avatars';

describe('validateMime', () => {
  it('accepts allowed MIME types', () => {
    expect(validateMime('image/jpeg')).toBe(true);
    expect(validateMime('image/png')).toBe(true);
    expect(validateMime('image/webp')).toBe(true);
  });

  it('rejects HEIC, GIF, SVG', () => {
    expect(validateMime('image/heic')).toBe(false);
    expect(validateMime('image/gif')).toBe(false);
    expect(validateMime('image/svg+xml')).toBe(false);
  });
});

describe('constants', () => {
  it('MAX_FILE_SIZE_BYTES is 5MB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it('ALLOWED_MIME has 3 entries', () => {
    expect(ALLOWED_MIME).toHaveLength(3);
  });
});
