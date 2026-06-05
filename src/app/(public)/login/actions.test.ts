import { describe, it, expect, vi, beforeEach } from 'vitest';

// SIGNUP-phone + SIGNUP-guardrails (Group 3): unit-cover loginAction's resolution chain
// with mocked Supabase clients. We assert: identifier -> email resolution via RPC, the
// uniform anti-enumeration error (#4), the login rate-limit gate (#5), allowed_apps
// enforcement, and that signInWithPassword is driven with the RESOLVED email. redirect()
// throws NEXT_REDIRECT internally, so we mock it to a catchable sentinel and assert the path.

const adminMock = vi.hoisted(() => ({
  rpcImpl: vi.fn(),
}));
const serverMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(async () => {}),
}));
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    const err = new Error(`NEXT_REDIRECT:${path}`);
    throw err;
  })
);

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    schema: () => ({ rpc: adminMock.rpcImpl }),
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      signInWithPassword: serverMock.signInWithPassword,
      signOut: serverMock.signOut,
    },
  }),
}));

vi.mock('next/headers', () => ({ headers: async () => new Map<string, string>() }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import { loginAction } from './actions';

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

/** Captures the path passed to redirect() (which throws NEXT_REDIRECT). */
async function runExpectingRedirect(fd: FormData): Promise<string | null> {
  try {
    await loginAction(fd);
    return null;
  } catch (e) {
    const m = (e as Error).message.match(/^NEXT_REDIRECT:(.*)$/);
    return m ? m[1] : null;
  }
}

const HUMANOS_USER = { app_metadata: { allowed_apps: ['humanOS'] } };

beforeEach(() => {
  vi.clearAllMocks();
  // defaults: rate-limit not blocked; resolver returns a canonical email.
  adminMock.rpcImpl.mockImplementation(async (fn: string) => {
    if (fn === 'check_login_rate_limit') return { data: { blocked: false }, error: null };
    if (fn === 'resolve_login_identifier') return { data: 'persona@iconsanet.com', error: null };
    return { data: null, error: null };
  });
  serverMock.signInWithPassword.mockResolvedValue({ data: { user: HUMANOS_USER }, error: null });
});

describe('loginAction — identifier resolution (SIGNUP-phone)', () => {
  it('resolves an employee_code to its canonical email and signs in with it', async () => {
    const path = await runExpectingRedirect(form({ identifier: 'cuc166', password: 'Obra2026Segura' }));

    // resolver is called with the NORMALIZED identifier (employee_code -> upper).
    expect(adminMock.rpcImpl).toHaveBeenCalledWith(
      'resolve_login_identifier',
      expect.objectContaining({ p_identifier: 'CUC166' })
    );
    // sign-in uses the RESOLVED email, not the raw code.
    expect(serverMock.signInWithPassword).toHaveBeenCalledWith({
      email: 'persona@iconsanet.com',
      password: 'Obra2026Segura',
    });
    expect(path).toBe('/dashboard');
  });

  it('still accepts the legacy "email" form field (backward-compat)', async () => {
    await runExpectingRedirect(form({ email: 'Persona@ICONSA.com', password: 'Obra2026Segura' }));
    expect(adminMock.rpcImpl).toHaveBeenCalledWith(
      'resolve_login_identifier',
      expect.objectContaining({ p_identifier: 'persona@iconsa.com' })
    );
  });

  it('honors a safe next path', async () => {
    const path = await runExpectingRedirect(
      form({ identifier: 'persona@iconsa.com', password: 'Obra2026Segura', next: '/perfil' })
    );
    expect(path).toBe('/perfil');
  });

  it('ignores an unsafe next path (open-redirect guard) and falls back to /dashboard', async () => {
    const path = await runExpectingRedirect(
      form({ identifier: 'persona@iconsa.com', password: 'Obra2026Segura', next: '//evil.com' })
    );
    expect(path).toBe('/dashboard');
  });
});

describe('loginAction — anti-enumeration (guardrail #4)', () => {
  const GENERIC = 'Correo/codigo o contrasena incorrectos';

  it('returns the generic error (not "no existe") when the identifier does not resolve', async () => {
    adminMock.rpcImpl.mockImplementation(async (fn: string) => {
      if (fn === 'check_login_rate_limit') return { data: { blocked: false }, error: null };
      if (fn === 'resolve_login_identifier') return { data: null, error: null };
      return { data: null, error: null };
    });

    const res = await loginAction(form({ identifier: 'ghost@nowhere.com', password: 'whatever123' }));

    expect(res).toEqual({ ok: false, error: GENERIC });
    // Must NOT even attempt a sign-in when nothing resolved.
    expect(serverMock.signInWithPassword).not.toHaveBeenCalled();
  });

  it('returns the SAME generic error when the password is wrong (indistinguishable)', async () => {
    serverMock.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const res = await loginAction(form({ identifier: 'persona@iconsa.com', password: 'wrongpass11' }));
    expect(res).toEqual({ ok: false, error: GENERIC });
  });
});

describe('loginAction — rate-limit (guardrail #5)', () => {
  it('blocks before touching credentials when the rate-limit RPC says blocked', async () => {
    adminMock.rpcImpl.mockImplementation(async (fn: string) => {
      if (fn === 'check_login_rate_limit') return { data: { blocked: true }, error: null };
      return { data: null, error: null };
    });

    const res = await loginAction(form({ identifier: 'persona@iconsa.com', password: 'Obra2026Segura' }));

    expect(res).toEqual({ ok: false, error: expect.stringMatching(/demasiados intentos/i) });
    // Neither resolution nor sign-in should run once blocked.
    expect(adminMock.rpcImpl).not.toHaveBeenCalledWith('resolve_login_identifier', expect.anything());
    expect(serverMock.signInWithPassword).not.toHaveBeenCalled();
  });

  it('fails closed when the rate-limit RPC errors', async () => {
    adminMock.rpcImpl.mockImplementation(async (fn: string) => {
      if (fn === 'check_login_rate_limit') return { data: null, error: { message: 'db down' } };
      return { data: null, error: null };
    });
    const res = await loginAction(form({ identifier: 'persona@iconsa.com', password: 'Obra2026Segura' }));
    expect(res.ok).toBe(false);
    expect(serverMock.signInWithPassword).not.toHaveBeenCalled();
  });

  it('hashes the identifier (never the cleartext) for the rate-limit key', async () => {
    await runExpectingRedirect(form({ identifier: 'persona@iconsa.com', password: 'Obra2026Segura' }));
    const call = adminMock.rpcImpl.mock.calls.find((c) => c[0] === 'check_login_rate_limit');
    const params = call?.[1] as { p_identifier_hash: string };
    expect(params.p_identifier_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(params.p_identifier_hash).not.toContain('persona@iconsa.com');
  });
});

describe('loginAction — allowed_apps enforcement (R2)', () => {
  it('signs out and denies a user without humanOS access', async () => {
    serverMock.signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { allowed_apps: ['movimientOS'] } } },
      error: null,
    });

    const res = await loginAction(form({ identifier: 'persona@iconsa.com', password: 'Obra2026Segura' }));

    expect(res).toEqual({ ok: false, error: expect.stringMatching(/no tiene acceso/i) });
    expect(serverMock.signOut).toHaveBeenCalled();
  });
});

describe('loginAction — input validation', () => {
  it('rejects an empty identifier', async () => {
    const res = await loginAction(form({ identifier: '', password: 'x' }));
    expect(res.ok).toBe(false);
    expect(adminMock.rpcImpl).not.toHaveBeenCalled();
  });

  it('rejects an empty password', async () => {
    const res = await loginAction(form({ identifier: 'persona@iconsa.com', password: '' }));
    expect(res.ok).toBe(false);
    expect(adminMock.rpcImpl).not.toHaveBeenCalled();
  });
});
