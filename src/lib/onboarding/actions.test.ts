import { describe, it, expect, vi, beforeEach } from 'vitest';

// SIGNUP-session-bug + SIGNUP-phone (Group 3, spec 2026-06-05-signup-cluster-design):
// unit-cover the BRANCH LOGIC of completeOnboardingAction with fully mocked Supabase
// clients. True login/session is E2E (flagged for Jaime); here we assert the action
// drives the right calls: signInWithPassword on the cookie-bound server client for the
// new-user branch, NO silent session + /login?merged=1 for the merge branch, a synthetic
// non-routable email for phone provisioning, and compensating-rollback semantics.

// ---- module mocks (hoisted) ----
const adminMock = vi.hoisted(() => ({
  // hr-schema query builder + RPC dispatcher, reconfigured per-test.
  fromImpl: vi.fn(),
  rpcImpl: vi.fn(),
  createUser: vi.fn(),
  updateUserById: vi.fn(),
  deleteUser: vi.fn(),
}));

const serverMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
}));

const reportErrorMock = vi.hoisted(() => vi.fn());
const enqueueMock = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    schema: () => ({
      from: adminMock.fromImpl,
      rpc: adminMock.rpcImpl,
    }),
    auth: {
      admin: {
        createUser: adminMock.createUser,
        updateUserById: adminMock.updateUserById,
        deleteUser: adminMock.deleteUser,
      },
    },
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { signInWithPassword: serverMock.signInWithPassword },
  }),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Map<string, string>(),
}));

vi.mock('@/lib/observability/report', () => ({ reportError: reportErrorMock }));
vi.mock('@/lib/notifications/insert', () => ({ enqueueNotification: enqueueMock }));

import { completeOnboardingAction } from './actions';
import { createHash } from 'node:crypto';
import { SYNTHETIC_EMAIL_DOMAIN } from '@/lib/auth/identity';

const PERSON_ID = 'person-0001';
const INVITE_ID = 'invite-0001';
const EMAIL = 'nuevo@iconsanet.com';
const PASSWORD = 'Obra2026Segura';

function hashOf(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Configures the admin .from(table) query-builder mock. Each table returns the rows
 * declared in `tables`. The builder is chainable (select/eq/is/maybeSingle/update).
 */
function configureFrom(tables: {
  invite?: Record<string, unknown> | null;
  person?: Record<string, unknown> | null;
}) {
  adminMock.fromImpl.mockImplementation((table: string) => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = vi.fn(chain);
    builder.eq = vi.fn(chain);
    builder.is = vi.fn(chain);
    builder.update = vi.fn(chain);
    builder.maybeSingle = vi.fn(async () => {
      if (table === 'invite_codes') return { data: tables.invite ?? null };
      if (table === 'people') return { data: tables.person ?? null };
      return { data: null };
    });
    return builder;
  });
}

/** A validated, unconsumed, unexpired invite whose committed hash matches `target`. */
function validInvite(target: string) {
  return {
    id: INVITE_ID,
    person_id: PERSON_ID,
    consumed_at: null,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    validated_at: new Date().toISOString(),
    validated_delivery_target_hash: hashOf(target),
  };
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    invite_id: INVITE_ID,
    person_id: PERSON_ID,
    target_field: 'email' as const,
    normalized_target: EMAIL,
    password: PASSWORD,
    emergency: { contact_name: 'Madre', relationship: 'madre', phone: '+50761234567' },
    medical: {},
    address: { province: 'Panamá' },
    ack_ethics_at: new Date().toISOString(),
    ack_child_labor_at: new Date().toISOString(),
    consent_medical: true,
    consent_emergency: true,
    consent_data_processing: true,
    consent_legal_version: 'v1',
    photo_path: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // default RPC: find_auth_user_by_identifier -> none; complete_onboarding_writes -> ok.
  adminMock.rpcImpl.mockImplementation(async (fn: string) => {
    if (fn === 'find_auth_user_by_identifier') return { data: [], error: null };
    if (fn === 'complete_onboarding_writes') return { data: null, error: null };
    return { data: null, error: null };
  });
  adminMock.createUser.mockResolvedValue({ data: { user: { id: 'auth-new' } }, error: null });
  adminMock.updateUserById.mockResolvedValue({ error: null });
  adminMock.deleteUser.mockResolvedValue({ error: null });
  serverMock.signInWithPassword.mockResolvedValue({ data: { user: { id: 'auth-new' } }, error: null });
});

describe('completeOnboardingAction — new-user branch (SIGNUP-session-bug A4)', () => {
  it('establishes a session via signInWithPassword on the server client and lands at /perfil', async () => {
    configureFrom({ invite: validInvite(EMAIL), person: { full_name: 'Nuevo' } });

    const res = await completeOnboardingAction(baseInput());

    expect(res.ok).toBe(true);
    // The new account is minted by EMAIL on the admin client...
    expect(adminMock.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: EMAIL, password: PASSWORD })
    );
    // ...and the SESSION is established on the cookie-bound server client (the fix).
    expect(serverMock.signInWithPassword).toHaveBeenCalledWith({
      email: EMAIL,
      password: PASSWORD,
    });
    expect((res.data as { redirect_to: string }).redirect_to).toBe('/perfil');
  });

  it('does NOT bounce to /login on the happy path (regression for the session bug)', async () => {
    configureFrom({ invite: validInvite(EMAIL), person: { full_name: 'Nuevo' } });
    const res = await completeOnboardingAction(baseInput());
    expect((res.data as { redirect_to: string }).redirect_to).not.toBe('/login');
  });

  it('only signs in AFTER the onboarding RPC succeeds (no usable session on rollback)', async () => {
    configureFrom({ invite: validInvite(EMAIL), person: { full_name: 'Nuevo' } });
    adminMock.rpcImpl.mockImplementation(async (fn: string) => {
      if (fn === 'find_auth_user_by_identifier') return { data: [], error: null };
      if (fn === 'complete_onboarding_writes') return { data: null, error: { message: 'consent guard' } };
      return { data: null, error: null };
    });

    const res = await completeOnboardingAction(baseInput());

    expect(res.ok).toBe(false);
    // RPC failed -> NEVER establish a session.
    expect(serverMock.signInWithPassword).not.toHaveBeenCalled();
    // Compensating rollback: new account is deleted.
    expect(adminMock.deleteUser).toHaveBeenCalledWith('auth-new');
  });

  it('falls back to /login (not /perfil) if the post-provision auto sign-in itself fails', async () => {
    configureFrom({ invite: validInvite(EMAIL), person: { full_name: 'Nuevo' } });
    serverMock.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'transient' } });

    const res = await completeOnboardingAction(baseInput());

    // Account is provisioned (ok), but auto-login failed -> manual login, NOT a rollback.
    expect(res.ok).toBe(true);
    expect((res.data as { redirect_to: string }).redirect_to).toBe('/login');
    expect(adminMock.deleteUser).not.toHaveBeenCalled();
    expect(reportErrorMock).toHaveBeenCalled();
  });
});

describe('completeOnboardingAction — merge branch (SIGNUP-session-bug A6, R22-safe)', () => {
  it('adds humanOS to an existing cross-app account WITHOUT signing in, redirecting to /login?merged=1', async () => {
    configureFrom({ invite: validInvite(EMAIL), person: { full_name: 'Rodrigo' } });
    adminMock.rpcImpl.mockImplementation(async (fn: string) => {
      if (fn === 'find_auth_user_by_identifier')
        return { data: [{ id: 'auth-existing', raw_app_meta_data: { allowed_apps: ['movimientOS'] } }], error: null };
      if (fn === 'complete_onboarding_writes') return { data: null, error: null };
      return { data: null, error: null };
    });

    const res = await completeOnboardingAction(baseInput());

    expect(res.ok).toBe(true);
    // No new account minted; the existing one is updated additively.
    expect(adminMock.createUser).not.toHaveBeenCalled();
    expect(adminMock.updateUserById).toHaveBeenCalledWith(
      'auth-existing',
      expect.objectContaining({
        app_metadata: expect.objectContaining({
          allowed_apps: expect.arrayContaining(['movimientOS', 'humanOS']),
        }),
      })
    );
    // R22 / guardrail #8: typed password ignored, NO silent cross-app session.
    expect(serverMock.signInWithPassword).not.toHaveBeenCalled();
    expect((res.data as { redirect_to: string }).redirect_to).toBe('/login?merged=1');
  });

  it('does not duplicate humanOS when the existing account already has it', async () => {
    configureFrom({ invite: validInvite(EMAIL), person: { full_name: 'Rodrigo' } });
    adminMock.rpcImpl.mockImplementation(async (fn: string) => {
      if (fn === 'find_auth_user_by_identifier')
        return { data: [{ id: 'auth-existing', raw_app_meta_data: { allowed_apps: ['humanOS'] } }], error: null };
      if (fn === 'complete_onboarding_writes') return { data: null, error: null };
      return { data: null, error: null };
    });

    const res = await completeOnboardingAction(baseInput());

    expect(res.ok).toBe(true);
    expect(adminMock.updateUserById).not.toHaveBeenCalled();
    expect(serverMock.signInWithPassword).not.toHaveBeenCalled();
  });

  it('restores original app_metadata (not deleteUser) when the RPC fails on a merge', async () => {
    configureFrom({ invite: validInvite(EMAIL), person: { full_name: 'Rodrigo' } });
    const original = { allowed_apps: ['movimientOS'], provider: 'email' };
    adminMock.rpcImpl.mockImplementation(async (fn: string) => {
      if (fn === 'find_auth_user_by_identifier')
        return { data: [{ id: 'auth-existing', raw_app_meta_data: original }], error: null };
      if (fn === 'complete_onboarding_writes') return { data: null, error: { message: 'boom' } };
      return { data: null, error: null };
    });

    const res = await completeOnboardingAction(baseInput());

    expect(res.ok).toBe(false);
    // Existing account must NOT be deleted; metadata is restored.
    expect(adminMock.deleteUser).not.toHaveBeenCalled();
    expect(adminMock.updateUserById).toHaveBeenLastCalledWith(
      'auth-existing',
      expect.objectContaining({ app_metadata: original })
    );
  });
});

describe('completeOnboardingAction — phone provisioning (SIGNUP-phone A5)', () => {
  it('mints a synthetic non-routable email for a phone-only worker and signs in with it', async () => {
    const phone = '+50761234567';
    configureFrom({
      invite: validInvite(phone),
      person: { employee_code: 'CUC166', national_id: '8-930-2166', full_name: 'Obrero' },
    });

    const res = await completeOnboardingAction(
      baseInput({ target_field: 'phone', normalized_target: phone, password: PASSWORD })
    );

    expect(res.ok).toBe(true);
    const createArgs = adminMock.createUser.mock.calls[0][0] as { email: string };
    expect(createArgs.email).toBe(`cuc166@${SYNTHETIC_EMAIL_DOMAIN}`);
    // No phone-only account is ever minted (the bug being prevented).
    expect(createArgs).not.toHaveProperty('phone');
    // Session is established with the SAME synthetic email so the worker is logged in.
    expect(serverMock.signInWithPassword).toHaveBeenCalledWith({
      email: `cuc166@${SYNTHETIC_EMAIL_DOMAIN}`,
      password: PASSWORD,
    });
    expect((res.data as { redirect_to: string }).redirect_to).toBe('/perfil');
  });

  it('falls back to cedula digits when the worker has no employee_code', async () => {
    const phone = '+50760000000';
    configureFrom({
      invite: validInvite(phone),
      person: { employee_code: null, national_id: '8-930-2166', full_name: 'Obrero' },
    });

    await completeOnboardingAction(
      baseInput({ target_field: 'phone', normalized_target: phone })
    );

    // The cedula seed is stripped to digits-only (\D removed) BEFORE building the email,
    // so separators collapse away entirely (unlike the employee_code path).
    const createArgs = adminMock.createUser.mock.calls[0][0] as { email: string };
    expect(createArgs.email).toBe(`89302166@${SYNTHETIC_EMAIL_DOMAIN}`);
  });
});

describe('completeOnboardingAction — guardrail re-validation (commitment hash, expiry, single-use)', () => {
  it('rejects when the invite is not found', async () => {
    configureFrom({ invite: null });
    const res = await completeOnboardingAction(baseInput());
    expect(res.ok).toBe(false);
    expect(adminMock.createUser).not.toHaveBeenCalled();
  });

  it('rejects an already-consumed invite (single-use)', async () => {
    configureFrom({ invite: { ...validInvite(EMAIL), consumed_at: new Date().toISOString() } });
    const res = await completeOnboardingAction(baseInput());
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/ya fue usado/i);
  });

  it('rejects an expired invite', async () => {
    configureFrom({
      invite: { ...validInvite(EMAIL), expires_at: new Date(Date.now() - 1000).toISOString() },
    });
    const res = await completeOnboardingAction(baseInput());
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/expirado/i);
  });

  it('rejects when the delivery-target commitment hash does not match (anti cross-app hijack)', async () => {
    // Invite was committed to a DIFFERENT target than the one now submitted.
    configureFrom({ invite: validInvite('victima@iconsanet.com') });
    const res = await completeOnboardingAction(baseInput({ normalized_target: EMAIL }));
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/inv[aá]lida/i);
    expect(adminMock.createUser).not.toHaveBeenCalled();
  });

  it('rejects when the invite belongs to a different person', async () => {
    configureFrom({ invite: { ...validInvite(EMAIL), person_id: 'someone-else' } });
    const res = await completeOnboardingAction(baseInput());
    expect(res.ok).toBe(false);
    expect(adminMock.createUser).not.toHaveBeenCalled();
  });

  it('rejects a new-user provision with no password', async () => {
    configureFrom({ invite: validInvite(EMAIL), person: { full_name: 'Nuevo' } });
    const res = await completeOnboardingAction(baseInput({ password: null }));
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/password/i);
    expect(adminMock.createUser).not.toHaveBeenCalled();
  });
});
