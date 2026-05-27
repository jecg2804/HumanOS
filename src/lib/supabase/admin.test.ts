import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('createSupabaseAdminClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const { createSupabaseAdminClient } = await import('./admin');
    expect(() => createSupabaseAdminClient()).toThrowError(
      /SUPABASE_SERVICE_ROLE_KEY/
    );

    if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('returns a client when key is present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    const { createSupabaseAdminClient } = await import('./admin');
    const client = createSupabaseAdminClient();
    expect(client).toBeDefined();
    expect(client.auth.admin).toBeDefined();
  });
});
