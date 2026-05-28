# Batch 3 — Code Security Hardening

**Fecha**: 2026-05-28
**Owner**: Claude Code
**Aprobación**: James 2026-05-28 (output 2 del audit + 8 push-back confirmados)
**Promise**: parte de `<promise>BATCH_1_2_3_4_COMMITTED</promise>`
**Predecesores**: commits `3e82240` Batch 1 + `6cbd643` Batch 2

---

## Objetivo

Cerrar 6 hallazgos del audit consolidado 2026-05-28 que viven en código de aplicación:

| Finding | Severidad | Descripción |
|---|---|---|
| NEW.A | P1 | `validateInviteCodeAction` retorna oracle de enumeración cross-app (`existing_multi_app_user` + `existing_email_masked`) sin rate limit, sin commitment de delivery_target |
| NEW.B | P2 | `reportOnboardingErrorAction` toma `person_id` client-controlled sin token de sesión |
| P1.6 | P1 | Server actions admin (`createEmployeeAction`, `updateEmployeeAction`, `regenerateInviteCodeAction`) solo chequean `auth.getUser()`, no verifican rol `hr_admin` |
| P2.14 | P2 | Open redirect en `login/actions.ts` — `?next=https://evil.example.com` pasa Zod |
| P2.16 | P2 | Matcher bypass en `post-tool-use.ps1` — exact-match `mcp__supabase__apply_migration` mientras matcher acepta `mcp__plugin_supabase_supabase__apply_migration` (✅ **YA RESUELTO en Batch 1 commit `3e82240`** — verificar) |
| P3.43→P2 | P2 | `CRON_SECRET` no validado al boot del cron route — `Bearer undefined` bypass auth si env var no seteada |

---

## Pre-requisitos

1. **env var `ONBOARDING_TOKEN_SECRET`** — generar con `openssl rand -hex 32` (>= 32 chars). Setear en:
   - Vercel Dashboard → Project → Settings → Environment Variables (Production + Preview + Development)
   - `.env.local` local de James
2. **Migration 039 aplicada via Chat MCP** — SQL en Task 1 abajo
3. **`database.types.ts` augmentado manualmente** hasta `supabase gen types` post-merge (pattern existente per CHANGELOG v0.0.2: `database.types.ts manually augmented with hr.complete_onboarding_writes + ...`)

---

## Tasks

### Task 1 — Migration 039: `create_invite_code_attempts_and_commitment`

**Estado**: SQL preparado por Code. **Chat aplica via `mcp__supabase__apply_migration`** después de approval explícito de James.

**Nombre**: `039_create_invite_code_attempts_and_commitment`

**Propósito (NEW.A)**:
1. Crear `hr.invite_code_attempts` — tabla de rate-limit por `(invite_code_id, ip_address)` con TTL sliding 15 min, max 5 attempts, block 15 min
2. Agregar `validated_at` + `validated_delivery_target_hash` a `hr.invite_codes` — commitment del primer delivery_target que pasa gates cedula+code (typo-poisoning fix con rescue path via F5 regenerate)
3. Crear `hr.check_invite_code_rate_limit()` — SECURITY DEFINER atomic check+increment, retorna jsonb. Único entry point al rate-limit table (RLS deny-all en la tabla)

#### SQL completo

```sql
-- =========================================================================
-- Migration 039_create_invite_code_attempts_and_commitment
-- Audit 2026-05-28 Batch 3 Task 1 — NEW.A Opción B hardening
-- Kills cross-app enumeration oracle in validateInviteCodeAction
-- Adds typo-poisoning protection with rescue via F5 regenerate-invite
-- =========================================================================

-- 1) Add commitment columns to hr.invite_codes
ALTER TABLE hr.invite_codes
  ADD COLUMN validated_at timestamptz,
  ADD COLUMN validated_delivery_target_hash text;

COMMENT ON COLUMN hr.invite_codes.validated_at IS 'NEW.A Batch 3 — timestamp del primer attempt que paso gates code+cedula. NULL hasta primera validacion exitosa. No se resetea sin regenerate.';
COMMENT ON COLUMN hr.invite_codes.validated_delivery_target_hash IS 'NEW.A Batch 3 — SHA256 hex del primer delivery_target normalizado que paso gates. Attempts subsecuentes con hash distinto = REJECTED (kills cross-app enumeration oracle). Rescue path: F5 regenerate-invite emite nuevo invite_code con columnas NULL.';

-- 2) Create rate-limit tracking table
CREATE TABLE hr.invite_code_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id uuid NOT NULL REFERENCES hr.invite_codes(id) ON DELETE CASCADE,
  ip_address inet NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invite_code_attempts_invite_ip_unique UNIQUE (invite_code_id, ip_address)
);

COMMENT ON TABLE hr.invite_code_attempts IS 'NEW.A Batch 3 rate-limit tracking per (invite_code, IP) tuple. RLS deny-all; sole entry point is hr.check_invite_code_rate_limit() SECURITY DEFINER function. TTL 15 min sliding, max 5 attempts, block 15 min on exceed.';
COMMENT ON COLUMN hr.invite_code_attempts.invite_code_id IS 'FK a hr.invite_codes; ON DELETE CASCADE.';
COMMENT ON COLUMN hr.invite_code_attempts.ip_address IS 'IP del requester (inet). Source: x-forwarded-for header (Vercel-injected).';
COMMENT ON COLUMN hr.invite_code_attempts.attempts IS 'Counter dentro de TTL window. Reset cuando window expira (sliding).';
COMMENT ON COLUMN hr.invite_code_attempts.first_attempt_at IS 'Timestamp primer attempt en TTL window actual. Base del sliding window.';
COMMENT ON COLUMN hr.invite_code_attempts.last_attempt_at IS 'Timestamp del attempt mas reciente.';
COMMENT ON COLUMN hr.invite_code_attempts.blocked_until IS 'NULL si no bloqueado. Set cuando attempts >= MAX dentro de TTL.';

-- Compound index for fast (invite_code, IP) lookup
CREATE INDEX idx_invite_code_attempts_invite_ip ON hr.invite_code_attempts(invite_code_id, ip_address);

-- updated_at trigger using existing helper
CREATE TRIGGER tg_invite_code_attempts_updated_at
  BEFORE UPDATE ON hr.invite_code_attempts
  FOR EACH ROW
  EXECUTE FUNCTION hr.touch_updated_at();

-- 3) RLS deny-all (no policies created; SECURITY DEFINER function is sole access)
ALTER TABLE hr.invite_code_attempts ENABLE ROW LEVEL SECURITY;

-- 4) SECURITY DEFINER atomic rate-limit check+increment
CREATE OR REPLACE FUNCTION hr.check_invite_code_rate_limit(
  p_invite_code_id uuid,
  p_ip_address inet,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15,
  p_block_minutes integer DEFAULT 15
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr, pg_catalog
AS $$
DECLARE
  v_record hr.invite_code_attempts;
  v_now timestamptz := now();
  v_blocked boolean := false;
  v_attempts_remaining integer;
BEGIN
  -- Atomic upsert with sliding window logic
  INSERT INTO hr.invite_code_attempts (invite_code_id, ip_address, attempts, first_attempt_at, last_attempt_at)
  VALUES (p_invite_code_id, p_ip_address, 1, v_now, v_now)
  ON CONFLICT (invite_code_id, ip_address) DO UPDATE
    SET attempts = CASE
        WHEN hr.invite_code_attempts.first_attempt_at < (v_now - make_interval(mins => p_window_minutes))
          THEN 1  -- Window expired: reset counter
        ELSE hr.invite_code_attempts.attempts + 1
      END,
      first_attempt_at = CASE
        WHEN hr.invite_code_attempts.first_attempt_at < (v_now - make_interval(mins => p_window_minutes))
          THEN v_now  -- Window expired: reset start
        ELSE hr.invite_code_attempts.first_attempt_at
      END,
      last_attempt_at = v_now,
      blocked_until = CASE
        WHEN hr.invite_code_attempts.attempts + 1 >= p_max_attempts
             AND hr.invite_code_attempts.first_attempt_at >= (v_now - make_interval(mins => p_window_minutes))
          THEN v_now + make_interval(mins => p_block_minutes)
        ELSE hr.invite_code_attempts.blocked_until
      END
  RETURNING * INTO v_record;

  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    v_blocked := true;
  END IF;

  v_attempts_remaining := GREATEST(0, p_max_attempts - v_record.attempts);

  RETURN jsonb_build_object(
    'blocked', v_blocked,
    'blocked_until', v_record.blocked_until,
    'attempts', v_record.attempts,
    'attempts_remaining', v_attempts_remaining,
    'window_started_at', v_record.first_attempt_at
  );
END;
$$;

COMMENT ON FUNCTION hr.check_invite_code_rate_limit(uuid, inet, integer, integer, integer) IS 'NEW.A Batch 3 — atomic check+increment rate-limit per (invite_code, IP). Returns jsonb {blocked: bool, blocked_until: tstz|null, attempts: int, attempts_remaining: int, window_started_at: tstz}. Defaults: 5 attempts / 15 min sliding window / 15 min block. Solo entry point a la tabla (RLS deny-all).';

-- 5) GRANT EXECUTE: anon + authenticated necesitan llamarla durante onboarding flow
GRANT EXECUTE ON FUNCTION hr.check_invite_code_rate_limit(uuid, inet, integer, integer, integer) TO anon, authenticated, service_role;
```

#### Rollback SQL (si necesario)

```sql
-- =========================================================================
-- Rollback Migration 039
-- =========================================================================
DROP FUNCTION IF EXISTS hr.check_invite_code_rate_limit(uuid, inet, integer, integer, integer);
DROP TABLE IF EXISTS hr.invite_code_attempts CASCADE;
ALTER TABLE hr.invite_codes
  DROP COLUMN IF EXISTS validated_delivery_target_hash,
  DROP COLUMN IF EXISTS validated_at;
```

#### Post-apply verification (Chat ejecuta después de MCP apply)

```sql
-- Verificar columnas nuevas
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='hr' AND table_name='invite_codes'
  AND column_name IN ('validated_at','validated_delivery_target_hash');
-- Expected: 2 rows

-- Verificar tabla rate-limit + RLS
SELECT c.relrowsecurity, (SELECT count(*) FROM pg_policies WHERE schemaname='hr' AND tablename='invite_code_attempts') AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='hr' AND c.relname='invite_code_attempts';
-- Expected: rls=true, policies=0 (deny-all by design)

-- Verificar función SECURITY DEFINER + search_path
SELECT prosecdef, proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='hr' AND p.proname='check_invite_code_rate_limit';
-- Expected: prosecdef=true, proconfig includes search_path=hr,pg_catalog

-- Smoke test
SELECT hr.check_invite_code_rate_limit(
  (SELECT id FROM hr.invite_codes LIMIT 1),
  '127.0.0.1'::inet
);
-- Expected: jsonb with blocked=false, attempts=1, attempts_remaining=4
```

---

### Task 2 — `src/lib/onboarding/token.ts` (HMAC stateless)

Nuevo archivo. HMAC-SHA256 sobre `(invite_id, person_id, validated_at_iso)` con `ONBOARDING_TOKEN_SECRET`. Verify usa `crypto.timingSafeEqual` (constant-time).

Implementación inline en Task 11 abajo (código completo).

---

### Task 3 — `validateInviteCodeAction` Opción B refactor

**Archivo**: [src/lib/onboarding/actions.ts](../../src/lib/onboarding/actions.ts)

Cambios:

1. Import `headers` from `next/headers`, `createHash` from `node:crypto`, `signOnboardingToken` del nuevo `./token`
2. Después de fetch invite + checks expires/consumed: llamar `hr.check_invite_code_rate_limit` con `(invite.id, ip)` — si `blocked`, return generic error
3. Después de cedula+employee_code checks: SHA256 del `normalizedTarget`
4. Si `invite.validated_at IS NOT NULL` y hash distinto del committed: return generic error con guidance "contacta a RRHH para regenerar"
5. Si `invite.validated_at IS NULL`: UPDATE invite con `validated_at=now()`, `validated_delivery_target_hash=hash`
6. **Quitar `existing_multi_app_user` y `existing_email_masked` del response** (mata oracle cross-app)
7. **Quitar `maskEmail()` helper** y la llamada a `find_auth_user_by_identifier` (la query queda solo en `completeOnboardingAction`)
8. Generar token HMAC con `(invite.id, person.id, invite.validated_at ?? now())`
9. Return shape: `{person_id, display_name, invite_id, normalized_target, target_field, preview, token}` — no `existing_*`

---

### Task 4 — Wizard updates

#### 4.1 `WizardReducer.ts`

- Quitar `existing_multi_app_user`, `existing_email_masked` de `ValidatedContext`
- Agregar `token: string` a `ValidatedContext`
- En reducer `VALIDATED`: `step: 4` siempre (sin skip a Step 5) — UX trade-off aceptado per audit
- En reducer `NEXT_STEP` y `PREV_STEP`: quitar lógica `existing_multi_app_user` que saltaba step 4

#### 4.2 `Step5Confirm.tsx`

- Quitar banner azul "Detectamos que ya tienes cuenta de ICONSA..." (líneas 31-37). Multi-app merge ahora silencioso en `completeOnboardingAction`.

#### 4.3 `Step3Identifier.tsx`

- No requiere cambios estructurales — el response ya viene sin `existing_*`. El reducer ahora siempre va a step 4.

#### 4.4 `HayErrorModal.tsx`

- Agregar `<input type="hidden" name="token" value={state.validated?.token ?? ''} />` en el form (línea 47 área)

---

### Task 5 — `completeOnboardingAction` silent multi-app

**Archivo**: [src/lib/onboarding/actions.ts](../../src/lib/onboarding/actions.ts)

Sin cambios estructurales — la lógica multi-app merge ya estaba ahí (líneas 279-295 read invite_codes + auth.users + updateUserById). Solo cambia que esta info ya NO se expuso al cliente vía validateInviteCodeAction. La merge sigue funcionando dentro de completeOnboardingAction.

---

### Task 6 — `reportOnboardingErrorAction` token validation

**Archivo**: [src/lib/onboarding/actions.ts](../../src/lib/onboarding/actions.ts)

Cambios:

1. Import `verifyOnboardingToken` from `./token`
2. Leer `formData.get('token')` como string
3. Si token missing o `verifyOnboardingToken` retorna null: return `{ ok: false, message: 'Token invalido. Reinicia el onboarding.' }`
4. Si `payload.person_id !== personId` (form data): return mismo error (token no matchea person_id sent)

---

### Task 7 — `requireHrAdmin` helper + apply (P1.6)

#### 7.1 Nuevo archivo `src/lib/auth/require-hr-admin.ts`

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface HrAdminContext {
  user: User;
  personId: string;
}

export async function requireHrAdmin(): Promise<HrAdminContext> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new AuthorizationError('No autenticado.');
  }
  const { data: employment } = await supabase
    .schema('hr')
    .from('employments')
    .select('person_id, app_role')
    .eq('auth_id', user.id)
    .eq('is_current', true)
    .maybeSingle();
  if (!employment || employment.app_role !== 'hr_admin') {
    throw new AuthorizationError('Acceso restringido a hr_admin.');
  }
  return { user, personId: employment.person_id };
}
```

#### 7.2 Apply a 3 server actions en `employees-actions.ts`

Reemplazar el patrón actual:
```typescript
const userClient = await createSupabaseServerClient();
const { data: { user } } = await userClient.auth.getUser();
if (!user) return { ok: false, message: 'No autenticado' };
```

Por:
```typescript
let ctx;
try {
  ctx = await requireHrAdmin();
} catch (e) {
  if (e instanceof AuthorizationError) {
    return { ok: false, message: e.message };
  }
  throw e;
}
const { user } = ctx;
```

Aplicar en:
- `createEmployeeAction` (línea 56-60)
- `regenerateInviteCodeAction` (línea 137-141)
- `updateEmployeeAction` (línea 190-194)

Note: `hr.employments` tiene RLS — el query `select('person_id, app_role')` necesita que la session user pueda leer su propio employment. Verificar policy `employments_select_own_and_subordinates` o similar.

---

### Task 8 — login open redirect allow-list (P2.14)

**Archivo**: [src/app/(public)/login/actions.ts](../../src/app/(public)/login/actions.ts)

Cambios:

1. Agregar helper `isSafePath`:
   ```typescript
   function isSafeNextPath(next: string | undefined): boolean {
     if (!next) return false;
     if (!next.startsWith('/')) return false;
     if (next.startsWith('//')) return false;  // protocol-relative
     if (next.startsWith('/\\')) return false; // edge case
     return true;
   }
   ```
2. Reemplazar línea 49 `redirect(parsed.data.next ?? '/dashboard');` por:
   ```typescript
   const safeNext = isSafeNextPath(parsed.data.next) ? parsed.data.next! : '/dashboard';
   redirect(safeNext);
   ```

---

### Task 9 — CRON_SECRET undefined check (P3.43→P2)

**Archivo**: [src/app/api/cron/process-notifications/route.ts](../../src/app/api/cron/process-notifications/route.ts)

Insertar al inicio de `export async function GET()` antes de cualquier auth check:

```typescript
if (!process.env.CRON_SECRET) {
  console.error('[cron] CRON_SECRET env var no esta seteada — abort');
  return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
}
```

Esto previene el bypass `Authorization: Bearer undefined` cuando alguien deploya sin setear `CRON_SECRET`.

---

### Task 10 — `.env.local.example`

Agregar:
```
ONBOARDING_TOKEN_SECRET=<openssl rand -hex 32>
```

Comentario indicando: 32+ chars random, usado por `signOnboardingToken`/`verifyOnboardingToken` HMAC en wizard onboarding.

---

### Task 11 — `database.types.ts` augmentation

Hasta `supabase gen types` post-merge, augmentar manualmente:

```typescript
// In hr.Tables.invite_codes.Row, Insert, Update:
validated_at: string | null
validated_delivery_target_hash: string | null

// In hr.Tables, agregar invite_code_attempts:
invite_code_attempts: {
  Row: {
    id: string
    invite_code_id: string
    ip_address: unknown  // inet
    attempts: number
    first_attempt_at: string
    last_attempt_at: string
    blocked_until: string | null
    created_at: string
    updated_at: string
  }
  Insert: { ... }
  Update: { ... }
  Relationships: [{ foreignKeyName: "invite_code_attempts_invite_code_id_fkey", ... }]
}

// In hr.Functions, agregar check_invite_code_rate_limit:
check_invite_code_rate_limit: {
  Args: {
    p_invite_code_id: string
    p_ip_address: unknown
    p_max_attempts?: number
    p_window_minutes?: number
    p_block_minutes?: number
  }
  Returns: Json
}
```

---

### Task 12 — Tests

#### Vitest unit tests

**Nuevo**: `src/lib/onboarding/token.test.ts`
- Sign + verify round-trip
- Tampered token rejected
- Wrong-secret token rejected
- Token sin punto rejected (malformed)
- Token con payload trim rejected

**Update**: existing onboarding action tests (si los hay) para nuevo response shape

#### E2E spec updates

**Update**: `e2e/onboarding-multi-app.spec.ts`
- Quitar assertions de banner "Detectamos que ya tienes cuenta..."
- Verificar que step 4 (password) ahora SE MUESTRA siempre (no skip)
- Mantener encrypted_password IMMUTABLE invariant (R22)

**Update**: `e2e/onboarding-error-report.spec.ts`
- Agregar verificación de token en form

**Nuevo**: `e2e/onboarding-rate-limit.spec.ts` (opcional, alto valor)
- Verificar que después de 5 attempts fallidos en 15 min, el 6to retorna "Demasiados intentos"

---

## Verification gate (al final de Batch 3)

```bash
npm run typecheck   # 0 errors
npm run lint        # 0 errors
npm test            # all green (incluye token.test.ts nuevo)
npm run build       # production OK
```

Y manual:
- [ ] env var `ONBOARDING_TOKEN_SECRET` seteada en Vercel (Production + Preview + Development) + `.env.local`
- [ ] Migration 039 aplicada por Chat via MCP + post-apply verification SQL pasa
- [ ] Smoke local: rate-limit funciona (curl la action 6 veces, 6ta blocked)
- [ ] Smoke local: token validation funciona (modify token in form data → reportError fails)
- [ ] E2E suite pasa contra branch temporal (cleanup discipline ADR-0016 patrón)

---

## Rollback strategy

Si Batch 3 introduce regresión post-merge:

1. **Code rollback**: `git revert <commit-batch-3>` — revierte cambios de aplicación
2. **Migration rollback**: Chat via MCP ejecuta el rollback SQL del Task 1 — revierte schema
3. **env var rollback**: dejar `ONBOARDING_TOKEN_SECRET` (no afecta — código revertido no lo usa)

---

## Notas operacionales

- **Three-actor model**: Code prepara este plan + implementa código; Chat aplica migration via MCP; James aprueba ambos
- **Cleanup discipline**: si E2E corren contra Supabase branch temporal, borrar branch post-suite (patrón confirmado por James, pendiente ADR-0016 para aclarar constitution 5.7)
- **NEW.A trade-off UX aceptado**: password step se muestra a todos (no skip para multi-app users). Documentar en UI Step 4 mensaje breve "Si ya tienes cuenta ICONSA, usa la misma contraseña — la unificaremos".
- **F5 rescue path**: si user typo'eó delivery_target en primer attempt y quedó "poisoned", hr_admin regenera invite via `/admin/empleados/[id]/editar` → `regenerateInviteCodeAction` (ya existe). Nuevo invite_code emitido con `validated_at` y `validated_delivery_target_hash` NULL.
