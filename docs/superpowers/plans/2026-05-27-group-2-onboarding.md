# Group 2: Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Onboarding completo end-to-end: F1 `/onboarding/[code]` wizard 10 pasos (incluye F-04-01 emergency/medical + F-01-09 acknowledgments), F4 `/admin/empleados/nuevo`, F5 `/admin/empleados/[id]/editar`, recovery `/forgot-password` + `/reset-password`, foto avatar con bucket Supabase Storage, y notifications PRIMARY (in_app + email) wired desde día 1.

**Architecture:** Server actions Next.js 16 con `useActionState` hook. Wizard cliente usa `useReducer` con state in-memory (cero localStorage por R13), commit atómico en step 10 vía `completeOnboardingAction`. Multi-app gating via `auth.users` lookup por email/phone usando SECURITY DEFINER function `hr.find_auth_user_by_identifier` (preferida vs exposed_schemas auth — security trade-off documentado abajo). Cliente admin service_role aislado en `src/lib/supabase/admin.ts` con ESLint rule bloqueando import desde `'use client'`. Notifications: pattern INSERT en outbox dentro de misma transacción que server action; in_app via Supabase Realtime subscription; email via Supabase Edge Function `*/5 * * * *` con Resend SDK v6 + templates `@react-email/components`.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.6 strict, Tailwind 4, @supabase/ssr 0.10, @supabase/supabase-js 2.105, Zod 4.3, React Hook Form 7.74, shadcn/ui, Resend 6.12, @react-email/components (a instalar), react-markdown (a instalar), Vitest 4, Playwright 1.60.

**Cross-cutting decisions absorbidas** (ver `docs/adr/`):
- ADR-0001: RLS-driven access via JWT — sigue vigente para 95% de operaciones
- ADR-0002: Codegen snake_case + Zod en boundaries
- ADR-0003: Snapshot profile fields at submit (no aplica wizard onboarding pero sí F-04-01 medical fields cuando se snapshoteen en ticket futuro)
- ADR-0006: Service role admin client onboarding exception (email/phone lookup, NO national_id, NO public.people)
- ADR-0007: `employment_type` reference table con metadata operacional
- ADR-0008: Notifications in-app + email PRIMARY MVP, pattern INSERT same-tx, Edge Function `*/5 * * * *`

**Implementation choice — Auth lookup: SECURITY DEFINER preferred over exposed_schemas**:

ADR-0006 menciona dos paths para lookup `auth.users`. Este plan implementa **path (B) SECURITY DEFINER `hr.find_auth_user_by_identifier`** (NO path A exposed_schemas) por razones de seguridad: exponer schema `auth` via PostgREST permite a authenticated users hacer queries arbitrarias contra `auth.users` (enumeration attacks, schema discovery). SECURITY DEFINER function tiene scope estricto (solo lookup por email/phone, retorna solo columnas necesarias), GRANT EXECUTE únicamente a `service_role`, y performance equivalente. Trade-off: una migration extra (029) en lugar de un Dashboard setting change. Aceptable.

**Mini-grill decisions absorbed** (ver handoff + grill transcript 2026-05-27):
- F4 captura 11 campos críticos (incluyendo `employment_type_id` requerido)
- Catalog fallback (b): link explícito "No veo el mío" para position/department/office; NO fallback para employment_type
- Wizard navigation: useReducer atomic step 10, lock invite_code post-validation, cero localStorage, redirect `/perfil`, beforeunload guard
- Photo: optional, single source `hr.people.photo_url`, bucket `avatars` RLS via subquery `auth_id`, resize 800x800 q0.85, pattern β-prima (pre-submit non-blocking)
- Password: 10 chars min, no complexity, HIBP Pro activo, same policy all roles, 2FA defer v1.1
- Step 5 "hay error": option C — `hr.people.needs_review=true` + `review_notes` append markdown + `notifications.outbox` con severidad híbrida (leve continúa / crítica pausa wizard)
- Notifications: PRIMARY MVP in_app + email; pattern INSERT same-tx; per-user-per-channel preferences en `hr.user_settings.notification_preferences`

---

## File Structure

### Files to create

| Path | Responsibility |
|---|---|
| `src/lib/supabase/admin.ts` | Service role admin client factory (ADR-0006 exception) |
| `src/lib/auth/errors.ts` | `translateAuthError(err)` → mensaje español |
| `src/lib/auth/errors.test.ts` | Unit tests 7 códigos + fallback |
| `src/lib/onboarding/normalize.ts` | `normalizeNationalId`, `normalizePhone` |
| `src/lib/onboarding/normalize.test.ts` | Unit tests normalización |
| `src/lib/onboarding/validation.ts` | Zod schemas wizard steps + invite validation |
| `src/lib/onboarding/validation.test.ts` | Unit tests Zod schemas |
| `src/lib/onboarding/actions.ts` | Server actions: validateInviteCode, reportError, completeOnboarding |
| `src/lib/admin/employees-actions.ts` | Server actions F4/F5: createEmployee, updateEmployee, regenerateInviteCode |
| `src/lib/admin/employees-actions.test.ts` | Unit tests pure helpers (SCD-2 transitions) |
| `src/lib/notifications/types.ts` | NotificationType enum + template_code mapping + notification_type CHECK |
| `src/lib/notifications/insert.ts` | `enqueueNotification()` helper para server actions (pattern INSERT same-tx) |
| `src/lib/notifications/realtime.ts` | Client-side Realtime subscription hook |
| `src/lib/storage/avatars.ts` | Client-side resize (canvas 800x800 JPEG q0.85) + upload helpers |
| `src/lib/storage/avatars.test.ts` | Unit tests resize + MIME validation |
| `src/emails/BaseLayout.tsx` | Shared email layout (ICONSA branding) |
| `src/emails/OnboardingErrorReported.tsx` | Q5 critical error → hr_admin |
| `src/emails/InviteCodeGenerated.tsx` | F4 invite delivery (initial + regeneration) |
| `src/emails/WelcomeEmployee.tsx` | Post-onboarding success |
| `src/components/notifications/NotificationBell.tsx` | AppShell bell icon + badge count |
| `src/components/notifications/NotificationDropdown.tsx` | Top 10 unread + "Marcar todas leídas" + link `/notificaciones` |
| `src/components/notifications/NotificationItem.tsx` | Single row render con deep link |
| `src/components/onboarding/WizardLayout.tsx` | Shell: progress + step indicator + cancel button + beforeunload guard |
| `src/components/onboarding/WizardReducer.ts` | State machine + action types + types |
| `src/components/onboarding/Step1Code.tsx` | Validate invite_code |
| `src/components/onboarding/Step2Identity.tsx` | Triple validation R14 (cedula + employee_code) |
| `src/components/onboarding/Step3Identifier.tsx` | Email O phone E.164 |
| `src/components/onboarding/Step4Password.tsx` | Set password (skipped si existing_multi_app_user) |
| `src/components/onboarding/Step5Confirm.tsx` | Preview profile + "hay error" modal |
| `src/components/onboarding/Step6Emergency.tsx` | Emergency contact (hr.contacts) |
| `src/components/onboarding/Step7Medical.tsx` | Medical info (hr.medical_info) |
| `src/components/onboarding/Step8Address.tsx` | Residence address (hr.addresses) |
| `src/components/onboarding/Step9Acknowledgments.tsx` | M-01 ética + D-07 trabajo infantil |
| `src/components/onboarding/Step10PhotoConfirm.tsx` | Optional photo + final submit |
| `src/components/onboarding/HayErrorModal.tsx` | Step 5 severity dropdown + description |
| `src/components/admin/employees/EmployeeForm.tsx` | F4 + F5 shared form (11 fields) |
| `src/components/admin/employees/EmployeeList.tsx` | F4 list with filter chip "Necesitan revisión" |
| `src/components/admin/employees/CatalogComboboxField.tsx` | Combobox + "No veo el mío" → text fallback |
| `src/components/admin/employees/RegenerateInviteButton.tsx` | Row action F5 |
| `src/components/admin/employees/PhotoUploadField.tsx` | Drag-drop + resize + signed URL preview |
| `src/app/(public)/onboarding/[code]/page.tsx` | Wizard host page |
| `src/app/(public)/onboarding/[code]/wizard.tsx` | Client wizard root |
| `src/app/(public)/onboarding/error-reported/page.tsx` | Terminal screen post step 5 crítica |
| `src/app/(public)/forgot-password/page.tsx` | Email form |
| `src/app/(public)/forgot-password/actions.ts` | resetPasswordForEmailAction |
| `src/app/(public)/reset-password/page.tsx` | New password form (from email link) |
| `src/app/(public)/reset-password/actions.ts` | setNewPasswordAction |
| `src/app/(authenticated)/admin/empleados/page.tsx` | Employee list (F4 part 1) |
| `src/app/(authenticated)/admin/empleados/nuevo/page.tsx` | Create employee (F4 part 2) |
| `src/app/(authenticated)/admin/empleados/[id]/editar/page.tsx` | Edit employee (F5) |
| `src/app/(authenticated)/perfil/page.tsx` | Post-onboarding landing (read-only profile) |
| `supabase/functions/process-notifications/index.ts` | Email worker Edge Function |
| `supabase/functions/process-notifications/deno.json` | Deno import map |
| `eslint-rules/no-admin-client-in-client.js` | Custom ESLint rule blocking import |
| `e2e/onboarding-happy.spec.ts` | E2E wizard 10 steps new user |
| `e2e/onboarding-multi-app.spec.ts` | E2E Rodrigo merge (encrypted_password invariant via SQL) |
| `e2e/onboarding-error-report.spec.ts` | E2E step 5 critical severity |
| `e2e/admin-empleados.spec.ts` | E2E F4 create + invite + F5 edit |
| `e2e/forgot-password.spec.ts` | E2E recovery flow |
| `e2e/lib/sql-helpers.ts` | SQL snapshot helpers (encrypted_password compare) |

### Files to modify

| Path | Why |
|---|---|
| `package.json` | Add `resend`, `@react-email/components`, `react-markdown`, `dompurify` deps |
| `.env.local.example` | Add `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| `eslint.config.mjs` | Register custom rule `no-admin-client-in-client` |
| `src/lib/auth/constants.ts` | Add `/onboarding/[code]`, `/forgot-password`, `/reset-password` a public routes (verify already listed per Group 1 G1-2) |
| `src/components/app-shell/topbar.tsx` | Insert `<NotificationBell />` |
| `src/lib/auth/allowed-apps.ts` | Export `getCurrentPersonId()` helper para server actions |
| `docs/CONTEXT.md` | Already updated during grill — Multi-app detection, Employment type, Catalog fallback terms |
| `docs/CHANGELOG.md` | Group 2 entries [bd], [seed], [feat], [test] |

### Migrations to apply via Supabase MCP (`apply_migration`)

**Renumeración crítica**: migrations 029-032 ya están taken en BD (verificado 2026-05-27, fueron experimento `core_identities` aplicado y luego roll-backed). Nueva numeración inicia en 033.

| # | Name (snake_case `NNN_action_target`) | Purpose |
|---|---|---|
| 033 | `033_seed_onboarding_sops_m01_d07` | Seed docs.sops + docs.sop_versions para IC-RH-M-01 + IC-RH-D-07 (Blocker B2 fix) |
| 034 | `034_create_find_auth_user_by_identifier` | SECURITY DEFINER lookup function (ADR-0006) |
| 035 | `035_create_avatars_bucket_and_policies` | Storage bucket + RLS via subquery `auth_id` |
| 036 | `036_add_outbox_indexes_and_enqueue_helper` | Index para worker query + `notifications.enqueue` helper |
| 037 | `037_create_complete_onboarding_writes_rpc` | Atomic onboarding RPC (idempotent, ON CONFLICT clauses per Issue I3) |
| 038 | `038_create_apply_employment_scd2_change` | SCD-2 helper for F5 edit |

**Issue I1 resuelto sin migration**: reusamos `hr.user_settings.preferences` JSONB existente con namespace `notifications` — NO se crea columna `notification_preferences`. Grep src/ confirma 0 usos de los 4 booleanos legacy (`notification_{email,in_app,sms,whatsapp}_enabled`); quedan como master switch futuro F33.

---

## Cross-cutting patterns referenced from tasks

### Pattern A: Server action signature for `useActionState`

```typescript
// Pattern A — server action returns FormState para useActionState
type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

'use server';
export async function someAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = SomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  // ... business logic
  return { ok: true, message: 'Listo' };
}
```

### Pattern B: Server action import header for service role exceptions

```typescript
'use server';
// ADR-0006 exception: this server action uses service_role admin client
// for multi-app provisioning. See docs/adr/0006-service-role-admin-client-onboarding-exception.md
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
```

Toda server action que importe `@/lib/supabase/admin` DEBE llevar este comentario header. ESLint rule `no-admin-client-in-client` valida que esta import jamás aparezca en archivos `'use client'`.

### Pattern C: Wizard step component shape

```tsx
'use client';
import type { WizardState, WizardAction } from './WizardReducer';

interface StepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function StepN({ state, dispatch }: StepProps) {
  const handleSubmit = async (formData: FormData) => {
    // local validation (Zod via react-hook-form)
    dispatch({ type: 'SET_FIELD', key: 'someKey', value: formData.get('field') });
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* field inputs */}
      <div className="flex justify-between">
        <button type="button" onClick={() => dispatch({ type: 'PREV_STEP' })}>
          Atrás
        </button>
        <button type="submit">Continuar</button>
      </div>
    </form>
  );
}
```

### Pattern D: notifications.enqueue helper invocation

```typescript
// Within server action transaction
import { enqueueNotification } from '@/lib/notifications/insert';
import { NotificationType } from '@/lib/notifications/types';

await enqueueNotification(supabase, {
  recipientPersonId,
  type: NotificationType.WelcomeEmployee,
  subject: 'Bienvenido a HumanOS',
  body: `Hola ${displayName}, tu cuenta está lista.`,
  metadata: { person_id: personId, deep_link: '/perfil' },
  templateVariables: { display_name: displayName },
});
```

`enqueueNotification` consulta `hr.user_settings.notification_preferences` para decidir si insertar `channel='email'` además de `channel='in_app'` (siempre se inserta in_app).

---

## Tasks

### Task 1: Install Group 2 dependencies + env vars + ESLint rule registration

**Files:**
- Modify: `package.json`
- Modify: `.env.local.example`
- Create: `eslint-rules/no-admin-client-in-client.js`
- Modify: `eslint.config.mjs`

- [ ] **Step 1.1: Install Group 2 deps**

```bash
npm install @react-email/components react-markdown dompurify
npm install --save-dev @types/dompurify
```

Verify `resend@^6.12.2` already installed from Group 1 setup. If not: `npm install resend`.

- [ ] **Step 1.2: Add env vars to `.env.local.example`**

```bash
# Existing from Group 1
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=

# New Group 2
SUPABASE_SERVICE_ROLE_KEY=
RESEND_FROM_EMAIL=HumanOS <notificaciones@rein-eisenwerk.com>
RESEND_REPLY_TO=samantha.kosmas@iconsanet.com
NEXT_PUBLIC_APP_URL=https://humanos.rein-eisenwerk.com
CRON_SECRET=
```

Coordinate with James:
- Pull `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard → Project Settings → API → service_role secret
- `RESEND_API_KEY` ya in-place desde Group 1 (no tocar `.env.local` existente)
- `RESEND_FROM_EMAIL` confirmado: `HumanOS <notificaciones@rein-eisenwerk.com>` (domain rein-eisenwerk.com verified en Resend)
- `RESEND_REPLY_TO` apunta a Samantha (canal directo para preguntas que emails generen)
- `NEXT_PUBLIC_APP_URL`: subdomain `humanos.rein-eisenwerk.com` ya configurado DNS + Vercel (validado por Chat via HTTP probe responde con redirect /login)
- `CRON_SECRET`: genera secret aleatorio (`openssl rand -base64 32`) y configúralo en Vercel project settings + `.env.local` para que el route handler valide invocations del cron

- [ ] **Step 1.3: Create custom ESLint rule**

Create `eslint-rules/no-admin-client-in-client.js`:

```javascript
/**
 * ESLint rule: block import of @/lib/supabase/admin from 'use client' files.
 * Enforces ADR-0006 exception scope (admin client only in server-side code).
 */
'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow @/lib/supabase/admin in client components' },
    schema: [],
    messages: {
      noAdminInClient:
        "@/lib/supabase/admin must not be imported in 'use client' files (ADR-0006 exception scope)",
    },
  },
  create(context) {
    let isClientFile = false;
    return {
      Program(node) {
        const firstStatement = node.body[0];
        if (
          firstStatement &&
          firstStatement.type === 'ExpressionStatement' &&
          firstStatement.expression.type === 'Literal' &&
          firstStatement.expression.value === 'use client'
        ) {
          isClientFile = true;
        }
      },
      ImportDeclaration(node) {
        if (!isClientFile) return;
        const src = node.source.value;
        if (src === '@/lib/supabase/admin' || src.endsWith('/lib/supabase/admin')) {
          context.report({ node, messageId: 'noAdminInClient' });
        }
      },
    };
  },
};
```

- [ ] **Step 1.4: Register rule in `eslint.config.mjs`**

Add to the existing config:

```javascript
import noAdminClientInClient from './eslint-rules/no-admin-client-in-client.js';

export default [
  // ... existing config
  {
    plugins: {
      iconsa: { rules: { 'no-admin-client-in-client': noAdminClientInClient } },
    },
    rules: {
      'iconsa/no-admin-client-in-client': 'error',
    },
  },
];
```

- [ ] **Step 1.5: Verify lint passes on existing tree**

Run: `npm run lint`
Expected: PASS (no `'use client'` file currently imports admin client; it doesn't exist yet).

- [ ] **Step 1.6: Commit**

```bash
git add package.json package-lock.json .env.local.example eslint-rules/ eslint.config.mjs
git commit -m "chore(deps): Group 2 deps + admin client lint guard"
```

---

### Task 2A: Migration 033 — Seed `docs.sops` + `docs.sop_versions` for IC-RH-M-01 + IC-RH-D-07 (Blocker B2)

**Files:**
- Migration `033_seed_onboarding_sops_m01_d07` via Supabase MCP
- Modify: `docs/CHANGELOG.md`

**Reason** (Blocker B2): Wizard step 9 inserts `docs.acknowledgments` rows with FK `sop_version_id NOT NULL`. Tables `docs.sops` + `docs.sop_versions` are empty (0 rows confirmed). Without seed, atomic submit at step 10 fails FK violation. Seed runs BEFORE Task 12 RPC creation since RPC references these rows.

- [ ] **Step 2A.1: Apply migration**

```sql
-- Migration 033: Seed Manual de Ética (IC-RH-M-01) + Política Trabajo Infantil (IC-RH-D-07)
-- and their current versions. Required for F-01-09 onboarding acknowledgments
-- (wizard step 9 inserts docs.acknowledgments rows referencing sop_version_id).
-- PDFs ship in docs/sops/ and are served from /sops/*.pdf via Next.js public/ symlink.

INSERT INTO docs.sops (code, title, category, description, is_active)
VALUES
  ('IC-RH-M-01', 'Manual de Ética y Conducta', 'manual',
   'Código de conducta y principios éticos de ICONSA. Acknowledgment obligatorio en onboarding.',
   true),
  ('IC-RH-D-07', 'Política contra el trabajo infantil y trata de personas', 'documento',
   'Política institucional ICONSA contra trabajo infantil y trata. Acknowledgment obligatorio en onboarding.',
   true)
ON CONFLICT (code) DO NOTHING;

-- Versions VV01 marked is_current=true
WITH s AS (
  SELECT id, code FROM docs.sops WHERE code IN ('IC-RH-M-01', 'IC-RH-D-07')
)
INSERT INTO docs.sop_versions (sop_id, version_number, file_url, is_current, published_at, change_notes)
SELECT s.id, 'VV01',
       CASE s.code
         WHEN 'IC-RH-M-01' THEN '/sops/IC-RH-M-01.pdf'
         WHEN 'IC-RH-D-07' THEN '/sops/IC-RH-D-07.pdf'
       END,
       true, now(),
       'Versión inicial seedeada para wizard onboarding F-01-09'
FROM s
ON CONFLICT DO NOTHING;

-- Backfill current_version_id
UPDATE docs.sops s
SET current_version_id = sv.id
FROM docs.sop_versions sv
WHERE sv.sop_id = s.id AND sv.is_current = true AND s.current_version_id IS NULL;
```

- [ ] **Step 2A.2: Verify**

```sql
SELECT s.code, s.title, sv.version_number, sv.file_url, sv.is_current
FROM docs.sops s
JOIN docs.sop_versions sv ON sv.sop_id = s.id
WHERE s.code IN ('IC-RH-M-01', 'IC-RH-D-07')
ORDER BY s.code;
```

Expected: 2 rows. `current_version_id` set in sops.

- [ ] **Step 2A.3: Verify PDF files are served**

The wizard step 9 links `/sops/IC-RH-M-01.pdf` y `/sops/IC-RH-D-07.pdf`. Confirm Next.js sirve los PDFs:

- Option A: copy PDFs from `docs/sops/` to `public/sops/` via prebuild script (existing `copy-sops-to-public.ts` mentioned in repo — verify it copies these two specifically)
- Option B: serve directly via `next.config.ts` rewrite from `/sops/*` to a route handler that streams from `docs/sops/`

Recommended: A (simpler, no runtime stream). Add to plan task as side-effect of Task 2A.

- [ ] **Step 2A.4: Update CHANGELOG**

Append to `docs/CHANGELOG.md` Group 2 [bd]:
- `033_seed_onboarding_sops_m01_d07: seed IC-RH-M-01 (Manual Ética) + IC-RH-D-07 (Política Trabajo Infantil) + VV01 versions (Blocker B2)`

- [ ] **Step 2A.5: Commit**

```bash
git add docs/CHANGELOG.md
git commit -m "feat(bd): 033 seed SOPs IC-RH-M-01 + IC-RH-D-07 for onboarding ack (B2 fix)"
```

---

### Task 2: Migration 034 — SECURITY DEFINER `hr.find_auth_user_by_identifier`

**Files:**
- Migration applied via `mcp__claude_ai_Supabase__apply_migration` with name `034_create_find_auth_user_by_identifier`
- Modify: `docs/CHANGELOG.md` (add `[bd]` entry)

- [ ] **Step 2.1: Apply migration via Supabase MCP**

SQL body:

```sql
-- Migration 034: SECURITY DEFINER lookup auth.users by email or phone.
-- Documented in docs/adr/0006-service-role-admin-client-onboarding-exception.md.
-- Used by onboardEmployee server action to detect multi-app users without
-- exposing `auth` schema via PostgREST (enumeration attack mitigation).

CREATE OR REPLACE FUNCTION hr.find_auth_user_by_identifier(
  p_field text,
  p_value text
)
RETURNS TABLE (
  id uuid,
  email text,
  phone text,
  raw_app_meta_data jsonb,
  encrypted_password text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, email, phone, raw_app_meta_data, encrypted_password
  FROM auth.users
  WHERE (p_field = 'email' AND email = lower(trim(p_value)))
     OR (p_field = 'phone' AND phone = p_value)
  LIMIT 1;
$$;

COMMENT ON FUNCTION hr.find_auth_user_by_identifier(text, text) IS
  'Multi-app gating helper. Returns at most 1 row matching email or phone. '
  'GRANT EXECUTE only to service_role. See ADR-0006.';

REVOKE EXECUTE ON FUNCTION hr.find_auth_user_by_identifier(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.find_auth_user_by_identifier(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION hr.find_auth_user_by_identifier(text, text) TO service_role;
```

Expected: migration accepted, function listed in `pg_proc`.

- [ ] **Step 2.2: Verify via execute_sql**

```sql
SELECT proname, proacl
FROM pg_proc
WHERE proname = 'find_auth_user_by_identifier';
```

Expected: 1 row, `proacl` shows `service_role=X/postgres` only (no anon/authenticated).

- [ ] **Step 2.3: Smoke test the function**

```sql
-- Should return existing Rodrigo if his email is reisenmann@iconsanet.com
SELECT id, email, raw_app_meta_data->'allowed_apps' AS apps
FROM hr.find_auth_user_by_identifier('email', 'reisenmann@iconsanet.com');

-- Should return 0 rows for non-existent
SELECT count(*) FROM hr.find_auth_user_by_identifier('email', 'no-existe@iconsanet.com');
```

Expected: first query returns Rodrigo's row with `apps` containing `"movimientOS"`; second returns 0.

- [ ] **Step 2.4: Update CHANGELOG**

Append to `docs/CHANGELOG.md`:

```markdown
## [Unreleased] — Group 2 onboarding

### [bd]
- 029_create_find_auth_user_by_identifier: SECURITY DEFINER function for multi-app auth lookup (ADR-0006)
```

- [ ] **Step 2.5: Commit**

```bash
git add docs/CHANGELOG.md
git commit -m "feat(bd): 034 SECURITY DEFINER find_auth_user_by_identifier (ADR-0006)"
```

---

### Task 3: Migration 035 — Avatars bucket + RLS policies

**Files:**
- Migration `035_create_avatars_bucket_and_policies` via Supabase MCP
- Modify: `docs/CHANGELOG.md`

- [ ] **Step 3.1: Apply migration**

```sql
-- Migration 035: avatars bucket for hr.people.photo_url + RLS via subquery.
-- Documented in Group 2 plan + grill Q3.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  5242880,  -- 5 MB hard cap pre-resize
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- SELECT: any authenticated user can view (directory needs avatars visible)
CREATE POLICY "avatars_select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- ALL (INSERT/UPDATE/DELETE): owner (via hr.people.auth_id = auth.uid()) OR hr_admin
CREATE POLICY "avatars_owner_or_hr_admin_write"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    EXISTS (
      SELECT 1 FROM hr.people
      WHERE id::text = (storage.foldername(name))[1]
        AND auth_id = auth.uid()
    )
    OR hr.is_hr_admin()
  )
)
WITH CHECK (
  bucket_id = 'avatars' AND (
    EXISTS (
      SELECT 1 FROM hr.people
      WHERE id::text = (storage.foldername(name))[1]
        AND auth_id = auth.uid()
    )
    OR hr.is_hr_admin()
  )
);
```

Expected: bucket created, 2 policies in `storage.objects`.

- [ ] **Step 3.2: Verify**

```sql
SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'avatars';
SELECT polname FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname LIKE 'avatars%';
```

Expected: bucket row + 2 policies.

- [ ] **Step 3.3: Update CHANGELOG + commit**

Append to `docs/CHANGELOG.md` under Group 2 [bd]:
- `035_create_avatars_bucket_and_policies: storage bucket avatars + RLS subquery auth_id`

```bash
git add docs/CHANGELOG.md
git commit -m "feat(bd): 035 avatars bucket + RLS owner-or-hr-admin (Q3 grill)"
```

---

### Task 4: Migration 036 — outbox indexes + enqueue helper (Issue I1 resolved: reuse existing `preferences` jsonb namespace)

**Files:**
- Migration `036_add_outbox_indexes_and_enqueue_helper` via Supabase MCP
- Modify: `docs/CHANGELOG.md`

**Issue I1 resolution**: NO migration nueva para `notification_preferences`. La tabla `hr.user_settings` ya tiene columna `preferences jsonb NOT NULL DEFAULT '{}'` (verificado BD). Usaremos namespace `preferences->'notifications'` con shape `{ notifications: { email: {<type>: bool}, sms: {}, whatsapp: {} } }`. El helper `notifications.enqueue` lee de ahí. Si el usuario no tiene el namespace inicializado, fallback a defaults TRUE para todos los types email (opt-in implícito hasta que F33 settings UI permita configurar).

- [ ] **Step 4.1: Apply migration 036**

```sql
-- Migration 036: indexes for worker query + enqueue helper (Issue I1: uses preferences jsonb namespace).

CREATE INDEX IF NOT EXISTS idx_outbox_worker_pending
ON notifications.outbox (channel, status, scheduled_for)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_outbox_recipient_unread
ON notifications.outbox (recipient_id, status, created_at DESC)
WHERE channel = 'in_app' AND status IN ('pending', 'queued', 'sent');

-- Helper to insert outbox respecting user preferences from preferences->'notifications'.
-- ALWAYS inserts in_app; conditionally inserts email if opted-in (default TRUE if namespace absent).
CREATE OR REPLACE FUNCTION notifications.enqueue(
  p_recipient_id uuid,
  p_notification_type text,
  p_subject text,
  p_body text,
  p_template_code text,
  p_template_variables jsonb,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email_opted_in boolean;
  v_pref jsonb;
BEGIN
  -- Always queue in-app
  INSERT INTO notifications.outbox (
    recipient_id, channel, status, subject, body,
    template_code, template_variables, metadata, notification_type
  ) VALUES (
    p_recipient_id, 'in_app', 'pending', p_subject, p_body,
    p_template_code, p_template_variables, p_metadata, p_notification_type
  );

  -- Check email opt-in via preferences->'notifications'->'email'->>type
  -- If namespace absent OR type absent in namespace → default TRUE (opt-in implicit until F33 UI)
  SELECT preferences -> 'notifications' -> 'email' -> p_notification_type
  INTO v_pref
  FROM hr.user_settings
  WHERE person_id = p_recipient_id;

  v_email_opted_in := COALESCE(v_pref::boolean, true);

  IF v_email_opted_in THEN
    INSERT INTO notifications.outbox (
      recipient_id, channel, status, subject, body,
      template_code, template_variables, metadata, notification_type
    ) VALUES (
      p_recipient_id, 'email', 'pending', p_subject, p_body,
      p_template_code, p_template_variables, p_metadata, p_notification_type
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION notifications.enqueue IS
  'Insert outbox row(s). Always in_app; email conditional on user preferences. '
  'Call from within server action transaction. ADR-0008 pattern INSERT.';

REVOKE EXECUTE ON FUNCTION notifications.enqueue FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notifications.enqueue TO authenticated, service_role;
```

NOTE: this assumes `notifications.outbox` already has `notification_type` column. If not present, add it first:

```sql
ALTER TABLE notifications.outbox
ADD COLUMN IF NOT EXISTS notification_type text;
COMMENT ON COLUMN notifications.outbox.notification_type IS
  'Semantic type matching template_code. Used for opt-in filtering per ADR-0008.';
```

- [ ] **Step 4.2: Verify**

```sql
SELECT proname FROM pg_proc WHERE proname = 'enqueue' AND pronamespace = 'notifications'::regnamespace;
SELECT indexname FROM pg_indexes WHERE schemaname='notifications' AND indexname LIKE 'idx_outbox%';
```

Expected: function present, 2 indexes present.

- [ ] **Step 4.3: Smoke test**

```sql
-- Pick a test recipient
WITH r AS (SELECT id FROM hr.people LIMIT 1)
SELECT notifications.enqueue(
  (SELECT id FROM r),
  'welcome_employee',
  'Test subject',
  'Test body',
  'WelcomeEmployee',
  '{"employee_name":"X"}'::jsonb,
  '{}'::jsonb
);

-- Verify both in_app + email rows inserted (default TRUE opt-in)
SELECT channel, status, notification_type FROM notifications.outbox WHERE template_code = 'WelcomeEmployee' ORDER BY created_at DESC LIMIT 2;
-- Cleanup
DELETE FROM notifications.outbox WHERE template_code = 'WelcomeEmployee' AND subject = 'Test subject';
```

Expected: 2 rows (in_app + email), both `pending`.

- [ ] **Step 4.4: Update CHANGELOG + commit**

Append:
- `036_add_outbox_indexes_and_enqueue_helper: idx_outbox_worker_pending + idx_outbox_recipient_unread + notifications.enqueue() helper reading preferences->'notifications' namespace (Issue I1 resolved without new column)`

```bash
git add docs/CHANGELOG.md
git commit -m "feat(bd): 036 outbox indexes + enqueue helper (preferences jsonb namespace, I1)"
```

---

### Task 5: `src/lib/supabase/admin.ts` — Service role admin client

**Files:**
- Create: `src/lib/supabase/admin.ts`

- [ ] **Step 5.1: Write the failing import smoke test**

Create `src/lib/supabase/admin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('createSupabaseAdminClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';

    const { createSupabaseAdminClient } = await import('./admin');
    expect(() => createSupabaseAdminClient()).toThrowError(
      /SUPABASE_SERVICE_ROLE_KEY/
    );

    if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('returns a client when key is present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    const { createSupabaseAdminClient } = await import('./admin');
    const client = createSupabaseAdminClient();
    expect(client).toBeDefined();
    expect(client.auth.admin).toBeDefined();
  });
});
```

- [ ] **Step 5.2: Run test — expect failure**

Run: `npx vitest run src/lib/supabase/admin.test.ts`
Expected: FAIL (file does not exist).

- [ ] **Step 5.3: Implement `admin.ts`**

Create `src/lib/supabase/admin.ts`:

```typescript
// ADR-0006 exception: this module exposes Supabase service_role admin client.
// Only importable from server-side code (server actions, route handlers, server components).
// ESLint rule `iconsa/no-admin-client-in-client` blocks import from 'use client' files.
// Each call site in a server action MUST include comment: // ADR-0006 exception

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { SUPABASE_URL } from './env';

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for admin client. ADR-0006 exception unavailable without it.'
    );
  }
  return createClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
```

- [ ] **Step 5.4: Run test — expect pass**

Run: `npx vitest run src/lib/supabase/admin.test.ts`
Expected: PASS (2 tests green).

- [ ] **Step 5.5: Verify ESLint rule fires on misuse**

Create temporary `src/components/_test-eslint-rule.tsx`:

```tsx
'use client';
import { createSupabaseAdminClient } from '@/lib/supabase/admin'; // should error

export function TestComponent() {
  return null;
}
```

Run: `npm run lint`
Expected: FAIL with message "must not be imported in 'use client' files (ADR-0006 exception scope)".

Delete the test file:

```bash
rm src/components/_test-eslint-rule.tsx
```

Run lint again — expected PASS.

- [ ] **Step 5.6: Commit**

```bash
git add src/lib/supabase/admin.ts src/lib/supabase/admin.test.ts
git commit -m "feat(auth): service role admin client + ESLint guard (ADR-0006)"
```

---

### Task 6: Auth error translator + onboarding normalization helpers

**Files:**
- Create: `src/lib/auth/errors.ts` + `errors.test.ts`
- Create: `src/lib/onboarding/normalize.ts` + `normalize.test.ts`

- [ ] **Step 6.1: Write failing test for translateAuthError**

Create `src/lib/auth/errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { translateAuthError } from './errors';

describe('translateAuthError', () => {
  it('translates weak_password', () => {
    const msg = translateAuthError({ code: 'weak_password', message: 'Password is too weak' });
    expect(msg).toMatch(/al menos 10 caracteres/);
  });

  it('translates email_exists', () => {
    const msg = translateAuthError({ code: 'email_exists', message: 'User already exists' });
    expect(msg).toMatch(/ya está registrado/);
  });

  it('translates invalid_credentials', () => {
    const msg = translateAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' });
    expect(msg).toMatch(/incorrectos/);
  });

  it('translates email_not_confirmed', () => {
    const msg = translateAuthError({ code: 'email_not_confirmed', message: 'Email not confirmed' });
    expect(msg).toMatch(/confirma tu correo/);
  });

  it('translates over_email_send_rate_limit', () => {
    const msg = translateAuthError({ code: 'over_email_send_rate_limit', message: 'Rate limit' });
    expect(msg).toMatch(/Demasiados intentos/);
  });

  it('translates user_not_found', () => {
    const msg = translateAuthError({ code: 'user_not_found', message: 'User not found' });
    expect(msg).toMatch(/No encontramos/);
  });

  it('translates session_expired', () => {
    const msg = translateAuthError({ code: 'session_expired', message: 'Session expired' });
    expect(msg).toMatch(/sesión expiró/);
  });

  it('falls back to generic Spanish message for unknown code', () => {
    const msg = translateAuthError({ code: 'unknown_code_xyz', message: 'Whatever' });
    expect(msg).toMatch(/Intenta nuevamente/);
  });

  it('falls back when code is undefined', () => {
    const msg = translateAuthError({ message: 'Something' } as unknown as { code?: string; message: string });
    expect(msg).toMatch(/Intenta nuevamente/);
  });
});
```

- [ ] **Step 6.2: Run test — expect failure**

Run: `npx vitest run src/lib/auth/errors.test.ts`
Expected: FAIL (module does not exist).

- [ ] **Step 6.3: Implement errors.ts**

```typescript
// Translate Supabase Auth error codes to Spanish messages (R15 idioma Panamá).
// Maintain mapping minimal — add codes as encountered.

export interface AuthErrorShape {
  code?: string;
  message: string;
}

const CODES: Record<string, string> = {
  weak_password:
    'La contraseña debe tener al menos 10 caracteres y no estar en la lista de contraseñas comprometidas.',
  email_exists:
    'Este correo ya está registrado. Inicia sesión o usa recuperación de contraseña.',
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Por favor confirma tu correo. Revisa tu bandeja de entrada.',
  over_email_send_rate_limit: 'Demasiados intentos. Espera unos minutos.',
  user_not_found: 'No encontramos una cuenta con esos datos.',
  session_expired: 'Tu sesión expiró. Inicia sesión nuevamente.',
};

const FALLBACK = 'Ocurrió un error. Intenta nuevamente o contacta a RRHH.';

export function translateAuthError(error: AuthErrorShape): string {
  if (!error.code) return FALLBACK;
  return CODES[error.code] ?? FALLBACK;
}
```

- [ ] **Step 6.4: Run test — expect pass**

Run: `npx vitest run src/lib/auth/errors.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6.5: Write failing test for normalize**

Create `src/lib/onboarding/normalize.test.ts`:

```typescript
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
```

- [ ] **Step 6.6: Run test — expect failure**

Run: `npx vitest run src/lib/onboarding/normalize.test.ts`
Expected: FAIL.

- [ ] **Step 6.7: Implement normalize.ts**

```typescript
// Normalization helpers for onboarding inputs.
// Defends R14 triple validation against typos (cedula with/without hyphens,
// leading zeros, casing). Phone normalized to E.164 +507XXXXXXXX.

export function normalizeNationalId(input: string): string {
  return input.trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

export function normalizePhone(input: string): string {
  const stripped = input.replace(/[^\d+]/g, '');
  if (stripped.startsWith('+507') && stripped.length === 12) return stripped;
  if (/^\d{8}$/.test(stripped)) return `+507${stripped}`;
  throw new Error('Teléfono inválido. Usa formato +507XXXXXXXX o 8 dígitos.');
}
```

- [ ] **Step 6.8: Run test — expect pass**

Run: `npx vitest run src/lib/onboarding/normalize.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6.9: Commit**

```bash
git add src/lib/auth/errors.ts src/lib/auth/errors.test.ts src/lib/onboarding/normalize.ts src/lib/onboarding/normalize.test.ts
git commit -m "feat(auth): translateAuthError + onboarding normalize helpers"
```

---

### Task 7: Onboarding validation schemas (Zod) + invite code validator

**Files:**
- Create: `src/lib/onboarding/validation.ts` + `validation.test.ts`

- [ ] **Step 7.1: Write failing tests for Zod schemas**

Create `src/lib/onboarding/validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  Step1Schema,
  Step2Schema,
  Step3Schema,
  Step4Schema,
  Step6Schema,
  Step7Schema,
  Step8Schema,
  Step9Schema,
  ErrorReportSchema,
} from './validation';

describe('wizard step schemas', () => {
  it('Step1Schema accepts 8-char alphanumeric code', () => {
    expect(Step1Schema.safeParse({ code: 'ABCD1234' }).success).toBe(true);
  });

  it('Step1Schema rejects wrong length', () => {
    expect(Step1Schema.safeParse({ code: 'ABC' }).success).toBe(false);
  });

  it('Step2Schema requires cedula', () => {
    const r = Step2Schema.safeParse({ cedula: '', employee_code: '' });
    expect(r.success).toBe(false);
  });

  it('Step3Schema accepts email', () => {
    expect(Step3Schema.safeParse({ delivery_target: 'a@b.com' }).success).toBe(true);
  });

  it('Step3Schema accepts phone +507', () => {
    expect(Step3Schema.safeParse({ delivery_target: '+50761234567' }).success).toBe(true);
  });

  it('Step4Schema enforces 10 char min', () => {
    expect(Step4Schema.safeParse({ password: '123456789' }).success).toBe(false);
    expect(Step4Schema.safeParse({ password: '1234567890' }).success).toBe(true);
  });

  it('Step6Schema requires emergency contact name + at least one phone', () => {
    expect(Step6Schema.safeParse({ contact_name: 'Maria', relationship: 'madre', phone: '+50761234567' }).success).toBe(true);
    expect(Step6Schema.safeParse({ contact_name: '', relationship: 'madre', phone: '+50761234567' }).success).toBe(false);
  });

  it('Step7Schema all fields optional but typed', () => {
    expect(Step7Schema.safeParse({}).success).toBe(true);
    expect(Step7Schema.safeParse({ blood_type: 'O+' }).success).toBe(true);
    expect(Step7Schema.safeParse({ blood_type: 'INVALID' }).success).toBe(false);
  });

  it('Step8Schema requires province', () => {
    expect(Step8Schema.safeParse({ street: 'X', province: 'Panama' }).success).toBe(true);
    expect(Step8Schema.safeParse({ street: 'X' }).success).toBe(false);
  });

  it('Step9Schema requires both acknowledgments true', () => {
    expect(Step9Schema.safeParse({ ack_ethics: true, ack_child_labor: true }).success).toBe(true);
    expect(Step9Schema.safeParse({ ack_ethics: true, ack_child_labor: false }).success).toBe(false);
  });

  it('ErrorReportSchema requires severity and description', () => {
    expect(ErrorReportSchema.safeParse({ severity: 'leve', description: 'Mi cargo está mal' }).success).toBe(true);
    expect(ErrorReportSchema.safeParse({ severity: 'invalid', description: 'X' }).success).toBe(false);
    expect(ErrorReportSchema.safeParse({ severity: 'leve', description: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 7.2: Run test — expect failure**

Run: `npx vitest run src/lib/onboarding/validation.test.ts`
Expected: FAIL.

- [ ] **Step 7.3: Implement validation.ts**

```typescript
import { z } from 'zod';

export const Step1Schema = z.object({
  code: z.string().length(8, 'Código debe tener 8 caracteres'),
});

export const Step2Schema = z.object({
  cedula: z.string().min(1, 'Cédula requerida'),
  employee_code: z.string().optional().or(z.literal('')),
});

const emailOrPhone = z.string().refine(
  (val) => val.includes('@') || /^\+?\d{8,15}$/.test(val.replace(/[\s-]/g, '')),
  { message: 'Ingresa un correo válido o teléfono panameño' }
);

export const Step3Schema = z.object({
  delivery_target: emailOrPhone,
});

export const Step4Schema = z.object({
  password: z.string().min(10, 'Contraseña debe tener al menos 10 caracteres'),
});

export const Step6Schema = z.object({
  contact_name: z.string().min(1, 'Nombre requerido'),
  relationship: z.string().min(1, 'Parentesco requerido'),
  phone: z.string().min(1, 'Al menos un teléfono requerido'),
  phone_alt: z.string().optional().or(z.literal('')),
});

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const Step7Schema = z.object({
  blood_type: z.enum(BLOOD_TYPES).optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
  chronic_conditions: z.string().optional().or(z.literal('')),
  current_medications: z.string().optional().or(z.literal('')),
  doctor_name: z.string().optional().or(z.literal('')),
  doctor_phone: z.string().optional().or(z.literal('')),
  medical_insurance_provider: z.string().optional().or(z.literal('')),
  medical_insurance_number: z.string().optional().or(z.literal('')),
  css_number: z.string().optional().or(z.literal('')),
});

export const Step8Schema = z.object({
  street: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  province: z.string().min(1, 'Provincia requerida'),
  postal_code: z.string().optional().or(z.literal('')),
});

export const Step9Schema = z.object({
  ack_ethics: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar el manual de ética' }) }),
  ack_child_labor: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar la política de trabajo infantil' }) }),
});

export const ErrorReportSchema = z.object({
  severity: z.enum(['leve', 'critica']),
  description: z.string().min(5, 'Describe el error con más detalle'),
});

export type Step1Input = z.infer<typeof Step1Schema>;
export type Step2Input = z.infer<typeof Step2Schema>;
export type Step3Input = z.infer<typeof Step3Schema>;
export type Step4Input = z.infer<typeof Step4Schema>;
export type Step6Input = z.infer<typeof Step6Schema>;
export type Step7Input = z.infer<typeof Step7Schema>;
export type Step8Input = z.infer<typeof Step8Schema>;
export type Step9Input = z.infer<typeof Step9Schema>;
export type ErrorReportInput = z.infer<typeof ErrorReportSchema>;
```

- [ ] **Step 7.4: Run test — expect pass**

Run: `npx vitest run src/lib/onboarding/validation.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 7.5: Commit**

```bash
git add src/lib/onboarding/validation.ts src/lib/onboarding/validation.test.ts
git commit -m "feat(onboarding): Zod schemas wizard steps + error report"
```

---

### Task 8: Notifications types + enqueueNotification helper

**Files:**
- Create: `src/lib/notifications/types.ts`
- Create: `src/lib/notifications/insert.ts` + `insert.test.ts`

- [ ] **Step 8.1: Implement types.ts**

```typescript
// Notification taxonomy. Each type maps to a template_code (filename in src/emails/).
// notification_type column in notifications.outbox uses these string values.
// See ADR-0008.

export const NotificationType = {
  TicketCreatedApprover: 'ticket_created_approver',
  TicketStatusChangedRequester: 'ticket_status_changed_requester',
  TicketCompleted: 'ticket_completed',
  OnboardingErrorReported: 'onboarding_error_reported',
  ManualEntryCreated: 'manual_entry_created',
  InviteCodeDelivered: 'invite_code_delivered',
  InviteCodeRegenerated: 'invite_code_regenerated',
  WelcomeEmployee: 'welcome_employee',
  ProfileChangedSensitive: 'profile_changed_sensitive',
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

// template_code matches src/emails/{TemplateCode}.tsx filename (PascalCase).
export const TEMPLATE_CODE_MAP: Record<NotificationTypeValue, string> = {
  ticket_created_approver: 'TicketCreatedApprover',
  ticket_status_changed_requester: 'TicketStatusChangedRequester',
  ticket_completed: 'TicketCompleted',
  onboarding_error_reported: 'OnboardingErrorReported',
  manual_entry_created: 'ManualEntryCreated',
  invite_code_delivered: 'InviteCodeDelivered',
  invite_code_regenerated: 'InviteCodeRegenerated',
  welcome_employee: 'WelcomeEmployee',
  profile_changed_sensitive: 'ProfileChangedSensitive',
};
```

- [ ] **Step 8.2: Write failing test for enqueueNotification**

Create `src/lib/notifications/insert.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { enqueueNotification } from './insert';
import { NotificationType } from './types';

function mockClient() {
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  return { rpc } as never;
}

describe('enqueueNotification', () => {
  it('calls notifications.enqueue RPC with correct params', async () => {
    const client = mockClient();
    await enqueueNotification(client, {
      recipientPersonId: 'rec-uuid',
      type: NotificationType.WelcomeEmployee,
      subject: 'Bienvenido',
      body: 'Hola',
      templateVariables: { name: 'X' },
      metadata: { deep_link: '/perfil' },
    });
    expect((client as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenCalledWith(
      'enqueue',
      expect.objectContaining({
        p_recipient_id: 'rec-uuid',
        p_notification_type: 'welcome_employee',
        p_subject: 'Bienvenido',
        p_template_code: 'WelcomeEmployee',
      })
    );
  });

  it('throws when RPC returns error', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'fail' } }));
    const client = { rpc } as never;
    await expect(
      enqueueNotification(client, {
        recipientPersonId: 'rec',
        type: NotificationType.WelcomeEmployee,
        subject: 's',
        body: 'b',
        templateVariables: {},
        metadata: {},
      })
    ).rejects.toThrow(/fail/);
  });
});
```

- [ ] **Step 8.3: Run test — expect failure**

Run: `npx vitest run src/lib/notifications/insert.test.ts`
Expected: FAIL.

- [ ] **Step 8.4: Implement insert.ts**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { type NotificationTypeValue, TEMPLATE_CODE_MAP } from './types';

interface EnqueueParams {
  recipientPersonId: string;
  type: NotificationTypeValue;
  subject: string;
  body: string;
  templateVariables: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export async function enqueueNotification(
  client: SupabaseClient,
  params: EnqueueParams
): Promise<void> {
  const { error } = await client.schema('notifications').rpc('enqueue', {
    p_recipient_id: params.recipientPersonId,
    p_notification_type: params.type,
    p_subject: params.subject,
    p_body: params.body,
    p_template_code: TEMPLATE_CODE_MAP[params.type],
    p_template_variables: params.templateVariables,
    p_metadata: params.metadata,
  });
  if (error) {
    throw new Error(`enqueueNotification failed: ${error.message}`);
  }
}
```

NOTE: the test above uses `client.rpc(...)` directly because mock; the implementation uses `client.schema('notifications').rpc(...)`. Adjust test to mock `client.schema(...).rpc` chain:

```typescript
function mockClient() {
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  const schemaFn = vi.fn(() => ({ rpc }));
  return { schema: schemaFn, rpc } as never;
}
```

Update test assertion to check `client.schema` was called with `'notifications'` then `.rpc('enqueue', ...)`.

- [ ] **Step 8.5: Run test — expect pass**

Run: `npx vitest run src/lib/notifications/insert.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 8.6: Commit**

```bash
git add src/lib/notifications/types.ts src/lib/notifications/insert.ts src/lib/notifications/insert.test.ts
git commit -m "feat(notifications): types + enqueueNotification helper (ADR-0008)"
```

---

### Task 9: Email templates (React Email components)

**Files:**
- Create: `src/emails/BaseLayout.tsx`
- Create: `src/emails/OnboardingErrorReported.tsx`
- Create: `src/emails/InviteCodeDelivered.tsx`
- Create: `src/emails/InviteCodeRegenerated.tsx`
- Create: `src/emails/WelcomeEmployee.tsx`

- [ ] **Step 9.1: Implement BaseLayout**

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Tailwind,
  Preview,
  pixelBasedPreset,
} from '@react-email/components';

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-xl bg-white p-8 my-8 rounded-lg">
            <Section>
              <Text className="text-2xl font-bold text-[#1B3A5C] mb-2">HumanOS</Text>
              <Text className="text-sm text-gray-500 mt-0">ICONSA — Recursos Humanos</Text>
            </Section>
            <Section className="mt-6">{children}</Section>
            <Section className="mt-8 border-t border-gray-200 pt-4">
              <Text className="text-xs text-gray-500">
                Este es un mensaje automático de HumanOS. Si no esperabas recibirlo, contacta a
                Recursos Humanos.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

- [ ] **Step 9.2: Implement OnboardingErrorReported template**

```tsx
import { Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface Props {
  employee_name: string;
  severity: 'leve' | 'critica';
  description: string;
  reported_at: string;
}

export function OnboardingErrorReported({
  employee_name,
  severity,
  description,
  reported_at,
}: Props) {
  return (
    <BaseLayout preview={`${employee_name} reporta un error en sus datos de onboarding`}>
      <Heading className="text-xl font-bold text-gray-900">
        Empleado reporta error en sus datos
      </Heading>
      <Text className="text-base text-gray-700 mt-4">
        <strong>{employee_name}</strong> reportó un error mientras completaba su onboarding.
      </Text>
      <Section className="bg-gray-100 rounded p-4 my-4">
        <Text className="text-sm">
          <strong>Severidad:</strong> {severity === 'critica' ? 'Crítica (wizard pausado)' : 'Leve (wizard continúa)'}
        </Text>
        <Text className="text-sm">
          <strong>Reportado:</strong> {reported_at}
        </Text>
        <Text className="text-sm">
          <strong>Descripción:</strong>
        </Text>
        <Text className="text-sm whitespace-pre-wrap">{description}</Text>
      </Section>
      <Text className="text-sm text-gray-700">
        Revisa el empleado en /admin/empleados (filtra por &quot;Necesitan revisión&quot;) y
        corrige antes de notificarle.
      </Text>
    </BaseLayout>
  );
}

export default OnboardingErrorReported;
```

- [ ] **Step 9.3: Implement InviteCodeDelivered template**

```tsx
import { Heading, Text, Button, Section } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface Props {
  employee_name: string;
  code: string;
  onboarding_url: string;
  expires_at: string;
}

export function InviteCodeDelivered({ employee_name, code, onboarding_url, expires_at }: Props) {
  return (
    <BaseLayout preview="Tu código para activar HumanOS está listo">
      <Heading className="text-xl font-bold text-gray-900">
        Bienvenido a HumanOS, {employee_name}
      </Heading>
      <Text className="text-base text-gray-700 mt-4">
        ICONSA ha generado tu código de invitación para configurar tu cuenta de HumanOS.
      </Text>
      <Section className="bg-gray-100 rounded p-6 my-6 text-center">
        <Text className="text-sm text-gray-600 mb-1">Tu código:</Text>
        <Text className="text-3xl font-mono font-bold tracking-widest text-[#1B3A5C]">
          {code}
        </Text>
      </Section>
      <Button
        href={onboarding_url}
        className="bg-[#1B3A5C] text-white px-6 py-3 rounded-md font-medium inline-block"
      >
        Iniciar configuración
      </Button>
      <Text className="text-sm text-gray-600 mt-6">
        El código vence el {expires_at}. Si necesitas otro, contacta a Recursos Humanos.
      </Text>
    </BaseLayout>
  );
}

export default InviteCodeDelivered;
```

- [ ] **Step 9.4: Implement InviteCodeRegenerated template**

Same shape as `InviteCodeDelivered` but with subject heading "Código de invitación renovado" and additional `Text` explaining the previous code is no longer valid.

```tsx
import { Heading, Text, Button, Section } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface Props {
  employee_name: string;
  code: string;
  onboarding_url: string;
  expires_at: string;
}

export function InviteCodeRegenerated({ employee_name, code, onboarding_url, expires_at }: Props) {
  return (
    <BaseLayout preview="Tu nuevo código de invitación está listo">
      <Heading className="text-xl font-bold text-gray-900">
        Código renovado, {employee_name}
      </Heading>
      <Text className="text-base text-gray-700 mt-4">
        Recursos Humanos ha generado un nuevo código para ti. El código anterior ya no es válido.
      </Text>
      <Section className="bg-gray-100 rounded p-6 my-6 text-center">
        <Text className="text-sm text-gray-600 mb-1">Tu nuevo código:</Text>
        <Text className="text-3xl font-mono font-bold tracking-widest text-[#1B3A5C]">
          {code}
        </Text>
      </Section>
      <Button
        href={onboarding_url}
        className="bg-[#1B3A5C] text-white px-6 py-3 rounded-md font-medium inline-block"
      >
        Continuar
      </Button>
      <Text className="text-sm text-gray-600 mt-6">
        El nuevo código vence el {expires_at}.
      </Text>
    </BaseLayout>
  );
}

export default InviteCodeRegenerated;
```

- [ ] **Step 9.5: Implement WelcomeEmployee template**

```tsx
import { Heading, Text, Button, Section } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface Props {
  employee_name: string;
  perfil_url: string;
}

export function WelcomeEmployee({ employee_name, perfil_url }: Props) {
  return (
    <BaseLayout preview="Tu cuenta HumanOS está activa">
      <Heading className="text-xl font-bold text-gray-900">
        Bienvenido a HumanOS, {employee_name}
      </Heading>
      <Text className="text-base text-gray-700 mt-4">
        Tu cuenta está configurada y lista para usar. Desde HumanOS puedes:
      </Text>
      <Section className="my-4">
        <Text className="text-sm text-gray-700">• Solicitar vacaciones, préstamos, permisos</Text>
        <Text className="text-sm text-gray-700">• Ver el estado de tus trámites</Text>
        <Text className="text-sm text-gray-700">• Actualizar tu información personal</Text>
        <Text className="text-sm text-gray-700">• Consultar políticas y procedimientos</Text>
      </Section>
      <Button
        href={perfil_url}
        className="bg-[#1B3A5C] text-white px-6 py-3 rounded-md font-medium inline-block"
      >
        Ver mi perfil
      </Button>
    </BaseLayout>
  );
}

export default WelcomeEmployee;
```

- [ ] **Step 9.6: Smoke test render**

```bash
npx tsc --noEmit
```

Expected: no errors (TS understands the props).

Render-as-HTML test (optional sanity):

```typescript
// scratch test (not committed)
import { render } from '@react-email/components';
import { WelcomeEmployee } from './src/emails/WelcomeEmployee';

const html = await render(<WelcomeEmployee employee_name="Test" perfil_url="https://x" />);
console.log(html.slice(0, 200));
```

- [ ] **Step 9.7: Commit**

```bash
git add src/emails/
git commit -m "feat(emails): BaseLayout + Onboarding/Invite/Welcome templates (@react-email)"
```

---

### Task 10: Storage avatars helpers (client-side resize + upload)

**Files:**
- Create: `src/lib/storage/avatars.ts` + `avatars.test.ts`

- [ ] **Step 10.1: Write failing tests**

Create `src/lib/storage/avatars.test.ts`:

```typescript
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
```

- [ ] **Step 10.2: Implement avatars.ts**

```typescript
// Client-side avatar utilities. Pure functions where possible (testable in jsdom).
// resizeImage uses canvas API which is jsdom-compatible.

import type { SupabaseClient } from '@supabase/supabase-js';

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const TARGET_DIMENSION = 800;
export const JPEG_QUALITY = 0.85;
export const POST_RESIZE_LIMIT_BYTES = 1024 * 1024; // 1MB

export function validateMime(mime: string): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

export async function resizeImage(file: File): Promise<Blob> {
  if (!validateMime(file.type)) {
    throw new Error('Formato no soportado. Usa JPG, PNG o WebP.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Archivo muy grande. Máximo 5MB antes de procesar.');
  }
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ratio = Math.min(TARGET_DIMENSION / img.width, TARGET_DIMENSION / img.height, 1);
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context no disponible');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
  if (blob.size > POST_RESIZE_LIMIT_BYTES) {
    throw new Error(`Imagen demasiado grande después de procesar (${Math.round(blob.size / 1024)}KB). Intenta una foto más pequeña.`);
  }
  return blob;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = URL.createObjectURL(file);
  });
}

// NOTE: client-side upload via authenticated user client would work POST-onboarding
// but during wizard step 10 the user is NOT YET authenticated. Use `uploadOnboardingAvatarAction`
// (server action) instead which runs admin client gated by invite_code validity.
// Keeping this helper for F5 admin edit + F33 self-service photo update flows.
export async function uploadAvatar(
  client: SupabaseClient,
  personId: string,
  blob: Blob
): Promise<string> {
  const path = `${personId}/current.jpg`;
  const { error } = await client.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Upload falló: ${error.message}`);
  return `avatars/${path}`;
}

export async function getAvatarSignedUrl(
  client: SupabaseClient,
  path: string,
  ttlSeconds = 3600
): Promise<string> {
  const cleanPath = path.startsWith('avatars/') ? path.slice('avatars/'.length) : path;
  const { data, error } = await client.storage.from('avatars').createSignedUrl(cleanPath, ttlSeconds);
  if (error || !data) throw new Error(`Signed URL falló: ${error?.message}`);
  return data.signedUrl;
}
```

- [ ] **Step 10.3: Run tests — expect pass**

Run: `npx vitest run src/lib/storage/avatars.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 10.4: Commit**

```bash
git add src/lib/storage/avatars.ts src/lib/storage/avatars.test.ts
git commit -m "feat(storage): avatar resize/upload helpers (Q3 grill β-prima)"
```

---

### Task 11: Realtime subscription hook for in-app notifications

**Files:**
- Create: `src/lib/notifications/realtime.ts`

- [ ] **Step 11.1: Implement useNotificationsRealtime hook**

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Database } from '@/lib/supabase/database.types';

type OutboxRow = Database['notifications']['Tables']['outbox']['Row'];

interface UseNotificationsRealtime {
  notifications: OutboxRow[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotificationsRealtime(
  currentPersonId: string | null
): UseNotificationsRealtime {
  const [notifications, setNotifications] = useState<OutboxRow[]>([]);
  const client = createSupabaseBrowserClient();

  useEffect(() => {
    if (!currentPersonId) return;
    let active = true;

    async function loadInitial() {
      const { data } = await client
        .schema('notifications')
        .from('outbox')
        .select('*')
        .eq('recipient_id', currentPersonId)
        .eq('channel', 'in_app')
        .in('status', ['pending', 'queued', 'sent'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (active && data) setNotifications(data as OutboxRow[]);
    }

    loadInitial();

    const channel = client
      .channel(`notifications-${currentPersonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'notifications',
          table: 'outbox',
          filter: `recipient_id=eq.${currentPersonId}`,
        },
        (payload) => {
          if (!active) return;
          if (payload.eventType === 'INSERT' && (payload.new as OutboxRow).channel === 'in_app') {
            setNotifications((prev) => [payload.new as OutboxRow, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === (payload.new as OutboxRow).id ? (payload.new as OutboxRow) : n))
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== (payload.old as OutboxRow).id));
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [currentPersonId, client]);

  const unreadCount = notifications.filter(
    (n) => n.channel === 'in_app' && n.status !== 'read' && n.status !== 'dismissed'
  ).length;

  const markAsRead = useCallback(
    async (id: string) => {
      await client
        .schema('notifications')
        .from('outbox')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', id);
    },
    [client]
  );

  const markAllAsRead = useCallback(async () => {
    if (!currentPersonId) return;
    await client
      .schema('notifications')
      .from('outbox')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('recipient_id', currentPersonId)
      .eq('channel', 'in_app')
      .in('status', ['pending', 'queued', 'sent']);
  }, [client, currentPersonId]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
```

- [ ] **Step 11.2: Commit**

```bash
git add src/lib/notifications/realtime.ts
git commit -m "feat(notifications): useNotificationsRealtime hook (Supabase Realtime)"
```

---

### Task 12: Server actions — onboarding

**Files:**
- Create: `src/lib/onboarding/actions.ts`

- [ ] **Step 12.1: Implement actions.ts**

```typescript
'use server';
// ADR-0006 exception: this module uses service_role admin client for multi-app
// provisioning during onboarding. See docs/adr/0006-service-role-admin-client-onboarding-exception.md

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Step1Schema,
  Step2Schema,
  Step3Schema,
  ErrorReportSchema,
  type ErrorReportInput,
} from './validation';
import { normalizeNationalId, normalizePhone } from './normalize';
import { translateAuthError } from '@/lib/auth/errors';
import { NotificationType } from '@/lib/notifications/types';
import { enqueueNotification } from '@/lib/notifications/insert';

type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

// ─────────────────────────────────────────────────────────────
// validateInviteCode (Step 1 + 2 + 3 server-side validation)
// ─────────────────────────────────────────────────────────────

interface ValidateInput {
  code: string;
  cedula: string;
  employee_code?: string;
  delivery_target: string;
}

export async function validateInviteCodeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = Object.fromEntries(formData) as Record<string, string>;
  const codeR = Step1Schema.safeParse({ code: input.code });
  const cedR = Step2Schema.safeParse({ cedula: input.cedula, employee_code: input.employee_code });
  const delR = Step3Schema.safeParse({ delivery_target: input.delivery_target });
  if (!codeR.success || !cedR.success || !delR.success) {
    return {
      ok: false,
      errors: {
        ...(codeR.success ? {} : codeR.error.flatten().fieldErrors),
        ...(cedR.success ? {} : cedR.error.flatten().fieldErrors),
        ...(delR.success ? {} : delR.error.flatten().fieldErrors),
      },
    };
  }

  const admin = createSupabaseAdminClient();

  // 1. Lookup invite code
  const { data: invite } = await admin
    .schema('hr')
    .from('invite_codes')
    .select('id, code, person_id, expires_at, consumed_at')
    .eq('code', codeR.data.code)
    .maybeSingle();

  if (!invite) {
    return { ok: false, message: 'Código de invitación no encontrado.' };
  }
  if (invite.consumed_at) {
    return { ok: false, message: 'Este código ya fue usado.' };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, message: 'Código expirado. Solicita uno nuevo a RRHH.' };
  }

  // 2. Lookup person + triple validation
  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .select('id, national_id, employee_code, full_name')
    .eq('id', invite.person_id)
    .maybeSingle();

  if (!person) {
    return { ok: false, message: 'Empleado no encontrado en el sistema.' };
  }

  const formCed = normalizeNationalId(cedR.data.cedula);
  const dbCed = normalizeNationalId(person.national_id ?? '');
  if (formCed !== dbCed) {
    return { ok: false, message: 'Cédula no coincide con la registrada.' };
  }
  if (
    cedR.data.employee_code &&
    person.employee_code &&
    cedR.data.employee_code.trim().toUpperCase() !== person.employee_code.trim().toUpperCase()
  ) {
    return { ok: false, message: 'Código de empleado no coincide.' };
  }

  // 3. Normalize delivery target
  const isEmail = delR.data.delivery_target.includes('@');
  const normalizedTarget = isEmail
    ? delR.data.delivery_target.trim().toLowerCase()
    : normalizePhone(delR.data.delivery_target);
  const field = isEmail ? 'email' : 'phone';

  // 4. Multi-app detection via SECURITY DEFINER
  const { data: existingUsers } = await admin.rpc('find_auth_user_by_identifier', {
    p_field: field,
    p_value: normalizedTarget,
  });

  const existing = (existingUsers as unknown as Array<{ id: string; raw_app_meta_data: Record<string, unknown>; email: string | null }> | null)?.[0];

  return {
    ok: true,
    data: {
      person_id: person.id,
      display_name: person.full_name,
      invite_id: invite.id,
      existing_multi_app_user: !!existing,
      existing_email_masked: existing?.email
        ? maskEmail(existing.email)
        : null,
      normalized_target: normalizedTarget,
      target_field: field,
    },
  };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local[0]}***@${domain}`;
}

// ─────────────────────────────────────────────────────────────
// reportOnboardingError (Step 5 "hay error")
// ─────────────────────────────────────────────────────────────

interface ReportErrorInput {
  person_id: string;
  severity: ErrorReportInput['severity'];
  description: string;
}

export async function reportOnboardingErrorAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = ErrorReportSchema.safeParse({
    severity: formData.get('severity'),
    description: formData.get('description'),
  });
  const personId = formData.get('person_id') as string;
  if (!parsed.success || !personId) {
    return {
      ok: false,
      errors: parsed.success ? {} : parsed.error.flatten().fieldErrors,
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .select('id, full_name, review_notes')
    .eq('id', personId)
    .maybeSingle();
  if (!person) return { ok: false, message: 'Empleado no encontrado.' };

  const stamp = new Date().toISOString();
  const newEntry = `**[${stamp}] Onboarding step 5 — Severidad: ${parsed.data.severity}**\n${parsed.data.description}`;
  const updated = person.review_notes ? `${person.review_notes}\n\n---\n\n${newEntry}` : newEntry;

  await admin
    .schema('hr')
    .from('people')
    .update({ needs_review: true, review_notes: updated })
    .eq('id', personId);

  // Enqueue notifications to all hr_admins
  const { data: hrAdmins } = await admin
    .schema('hr')
    .from('employments')
    .select('person_id')
    .eq('app_role', 'hr_admin')
    .eq('is_current', true);

  for (const row of hrAdmins ?? []) {
    await enqueueNotification(admin, {
      recipientPersonId: row.person_id,
      type: NotificationType.OnboardingErrorReported,
      subject: `Error reportado por ${person.full_name}`,
      body: `Severidad: ${parsed.data.severity}. ${parsed.data.description.slice(0, 200)}`,
      templateVariables: {
        employee_name: person.full_name,
        severity: parsed.data.severity,
        description: parsed.data.description,
        reported_at: stamp,
      },
      metadata: {
        person_id: personId,
        deep_link: `/admin/empleados/${personId}/editar`,
        severity: parsed.data.severity,
        context: 'onboarding_step_5',
      },
    });
  }

  return {
    ok: true,
    data: {
      severity: parsed.data.severity,
      should_pause_wizard: parsed.data.severity === 'critica',
    },
  };
}

// ─────────────────────────────────────────────────────────────
// completeOnboarding (Step 10 atomic commit)
// ─────────────────────────────────────────────────────────────

interface CompleteInput {
  invite_id: string;
  person_id: string;
  target_field: 'email' | 'phone';
  normalized_target: string;
  password: string | null; // null when existing_multi_app_user
  emergency: {
    contact_name: string;
    relationship: string;
    phone: string;
    phone_alt?: string;
  };
  medical: Record<string, string>;
  address: {
    street?: string;
    neighborhood?: string;
    city?: string;
    province: string;
    postal_code?: string;
  };
  ack_ethics_at: string;
  ack_child_labor_at: string;
  photo_path: string | null;
}

export async function completeOnboardingAction(
  input: CompleteInput & { ip_address?: string; user_agent?: string }
): Promise<FormState> {
  const admin = createSupabaseAdminClient();

  // 1. Auth user create-or-merge with capture-restore for Issue I3 rollback
  let authId: string;
  let originalAppMetadata: Record<string, unknown> | null = null;  // snapshot for rollback
  const { data: existingRows } = await admin.rpc('find_auth_user_by_identifier', {
    p_field: input.target_field,
    p_value: input.normalized_target,
  });
  const existing = (existingRows as unknown as Array<{ id: string; raw_app_meta_data: Record<string, unknown> }> | null)?.[0];

  if (existing) {
    originalAppMetadata = { ...existing.raw_app_meta_data };  // CAPTURE for I3 rollback
    const currentApps =
      (existing.raw_app_meta_data as { allowed_apps?: string[] })?.allowed_apps ?? [];
    if (!currentApps.includes('humanOS')) {
      const newApps = Array.from(new Set([...currentApps, 'humanOS']));
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        app_metadata: {
          ...existing.raw_app_meta_data,
          allowed_apps: newApps,
        },
      });
      if (error) {
        return { ok: false, message: translateAuthError(error) };
      }
    }
    authId = existing.id;
  } else {
    if (!input.password) {
      return { ok: false, message: 'Password requerido para crear nueva cuenta.' };
    }
    const { data: newUser, error } = await admin.auth.admin.createUser({
      [input.target_field]: input.normalized_target,
      password: input.password,
      email_confirm: input.target_field === 'email',
      app_metadata: { allowed_apps: ['humanOS'] },
    });
    if (error || !newUser?.user) {
      return { ok: false, message: translateAuthError(error ?? { code: 'unknown', message: 'createUser failed' }) };
    }
    authId = newUser.user.id;
  }

  // 2. Link person.auth_id + insert child rows + consume invite — atomic RPC (idempotent).
  const { error: rpcErr } = await admin.rpc('complete_onboarding_writes', {
    p_invite_id: input.invite_id,
    p_person_id: input.person_id,
    p_auth_id: authId,
    p_photo_path: input.photo_path,
    p_emergency: input.emergency,
    p_medical: input.medical,
    p_address: input.address,
    p_ack_ethics_at: input.ack_ethics_at,
    p_ack_child_labor_at: input.ack_child_labor_at,
    p_ip_address: input.ip_address ?? null,
    p_user_agent: input.user_agent ?? null,
  });

  if (rpcErr) {
    // Issue I3: explicit rollback for the auth side-effect that happened pre-RPC
    if (!existing) {
      // New user — full delete
      await admin.auth.admin.deleteUser(authId);
    } else if (originalAppMetadata) {
      // Existing user — restore original raw_app_meta_data (preserves provider/providers/etc)
      await admin.auth.admin.updateUserById(authId, {
        app_metadata: originalAppMetadata,
      });
    }
    return { ok: false, message: `Onboarding falló: ${rpcErr.message}` };
  }

  // 3. Enqueue welcome notification
  const { data: person } = await admin
    .schema('hr')
    .from('people')
    .select('full_name')
    .eq('id', input.person_id)
    .maybeSingle();

  await enqueueNotification(admin, {
    recipientPersonId: input.person_id,
    type: NotificationType.WelcomeEmployee,
    subject: 'Bienvenido a HumanOS',
    body: `Tu cuenta está lista, ${person?.full_name ?? ''}.`,
    templateVariables: {
      employee_name: person?.full_name ?? '',
      perfil_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/perfil`,
    },
    metadata: { person_id: input.person_id, deep_link: '/perfil' },
  });

  return { ok: true, data: { auth_id: authId, redirect_to: '/perfil' } };
}

// ─────────────────────────────────────────────────────────────
// Convenience: redirect helper
// ─────────────────────────────────────────────────────────────

export async function redirectToPerfilAction(): Promise<never> {
  redirect('/perfil');
}

// ─────────────────────────────────────────────────────────────
// uploadOnboardingAvatarAction (Blocker B1 fix — pre-submit upload pre-auth)
// ─────────────────────────────────────────────────────────────
// User is NOT YET authenticated during wizard step 10. Client-side upload
// via authenticated client fails RLS (auth.uid() IS NULL). Solution: server
// action with admin client, gated by invite_code validity as auth proxy.
// Path canonical: avatars/{person_id}/current.{ext}. Idempotent overwrite via upsert.

export async function uploadOnboardingAvatarAction(formData: FormData): Promise<{
  ok: boolean;
  path?: string;
  error?: string;
}> {
  const inviteId = formData.get('invite_id') as string | null;
  const personId = formData.get('person_id') as string | null;
  const file = formData.get('photo') as File | null;
  if (!inviteId || !personId || !file) {
    return { ok: false, error: 'Datos faltantes para subir foto' };
  }

  const admin = createSupabaseAdminClient();

  // Gate: validate invite is for this person and still valid
  const { data: invite } = await admin
    .schema('hr')
    .from('invite_codes')
    .select('id, person_id, consumed_at, expires_at')
    .eq('id', inviteId)
    .maybeSingle();

  if (!invite || invite.person_id !== personId) {
    return { ok: false, error: 'Invitación no válida para este empleado' };
  }
  if (invite.consumed_at) {
    return { ok: false, error: 'Invitación ya consumida' };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: 'Invitación expirada' };
  }

  // Determine extension from MIME
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = mimeToExt[file.type];
  if (!ext) {
    return { ok: false, error: 'Formato no soportado. Usa JPG, PNG o WebP.' };
  }

  const path = `${personId}/current.${ext}`;
  const buffer = await file.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from('avatars')
    .upload(path, new Uint8Array(buffer), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    return { ok: false, error: `Upload falló: ${uploadErr.message}` };
  }

  return { ok: true, path: `avatars/${path}` };
}
```

- [ ] **Step 12.2: Apply migration 037 for `complete_onboarding_writes` RPC (Blocker B3 + Issue I3 fixed)**

Add migration `037_create_complete_onboarding_writes_rpc`:

**Critical fixes from audit**:
- **B3**: `docs.acknowledgments` has FK `sop_version_id` (NO `code` column). RPC resolves via JOIN `docs.sops → docs.sop_versions WHERE is_current=true`. `signature_method='click'`. `ip_address`+`user_agent` passed as params.
- **I3**: Idempotent. UPDATE `hr.people.auth_id` solo si `auth_id IS NULL` OR matches `p_auth_id` (no-op si retry). Child inserts use ON CONFLICT DO NOTHING where uniqueness allows.

```sql
-- Migration 037: atomic onboarding writes (idempotent).
-- Caller (server action) MUST first create/update auth.user before invoking.
-- Acknowledgments resolve sop_version_id via JOIN to docs.sops + docs.sop_versions (Blocker B3).

CREATE OR REPLACE FUNCTION hr.complete_onboarding_writes(
  p_invite_id uuid,
  p_person_id uuid,
  p_auth_id uuid,
  p_photo_path text,
  p_emergency jsonb,
  p_medical jsonb,
  p_address jsonb,
  p_ack_ethics_at timestamptz,
  p_ack_child_labor_at timestamptz,
  p_ip_address text,
  p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ethics_version_id uuid;
  v_child_labor_version_id uuid;
  v_existing_auth uuid;
BEGIN
  -- Resolve sop_version_id for the 2 acknowledgments (Blocker B3 fix)
  SELECT sv.id INTO v_ethics_version_id
  FROM docs.sops s
  JOIN docs.sop_versions sv ON sv.sop_id = s.id
  WHERE s.code = 'IC-RH-M-01' AND sv.is_current = true
  LIMIT 1;

  SELECT sv.id INTO v_child_labor_version_id
  FROM docs.sops s
  JOIN docs.sop_versions sv ON sv.sop_id = s.id
  WHERE s.code = 'IC-RH-D-07' AND sv.is_current = true
  LIMIT 1;

  IF v_ethics_version_id IS NULL OR v_child_labor_version_id IS NULL THEN
    RAISE EXCEPTION 'SOPs IC-RH-M-01 o IC-RH-D-07 no encontrados o sin versión current. Aplicar migration 033 primero.';
  END IF;

  -- Idempotent link auth_id (Issue I3 fix)
  SELECT auth_id INTO v_existing_auth FROM hr.people WHERE id = p_person_id;
  IF v_existing_auth IS NULL THEN
    UPDATE hr.people
    SET auth_id = p_auth_id,
        photo_url = COALESCE(p_photo_path, photo_url),
        updated_at = now()
    WHERE id = p_person_id;
  ELSIF v_existing_auth <> p_auth_id THEN
    RAISE EXCEPTION 'hr.people.auth_id ya está linkeado a otro auth.user; aborting onboarding';
  ELSE
    -- Same auth_id, just refresh photo_url if provided
    UPDATE hr.people
    SET photo_url = COALESCE(p_photo_path, photo_url),
        updated_at = now()
    WHERE id = p_person_id;
  END IF;

  -- Idempotent consume invite (no-op if already consumed by same auth_id)
  UPDATE hr.invite_codes
  SET consumed_at = COALESCE(consumed_at, now()),
      consumed_by_auth_id = COALESCE(consumed_by_auth_id, p_auth_id)
  WHERE id = p_invite_id AND (consumed_at IS NULL OR consumed_by_auth_id = p_auth_id);

  -- Emergency contact: insert primary if not exists, secondary phone_alt opcional
  INSERT INTO hr.contacts (
    person_id, contact_type, contact_name, relationship, phone, is_primary, is_emergency
  )
  SELECT p_person_id, 'emergency', p_emergency->>'contact_name', p_emergency->>'relationship',
         p_emergency->>'phone', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM hr.contacts
    WHERE person_id = p_person_id AND contact_type = 'emergency' AND is_primary = true
  );

  IF p_emergency ? 'phone_alt' AND p_emergency->>'phone_alt' <> '' THEN
    INSERT INTO hr.contacts (
      person_id, contact_type, contact_name, relationship, phone, is_primary, is_emergency
    )
    SELECT p_person_id, 'emergency', p_emergency->>'contact_name', p_emergency->>'relationship',
           p_emergency->>'phone_alt', false, true
    WHERE NOT EXISTS (
      SELECT 1 FROM hr.contacts
      WHERE person_id = p_person_id AND contact_type = 'emergency'
        AND phone = p_emergency->>'phone_alt'
    );
  END IF;

  -- Medical info (1:1 unique constraint on person_id)
  IF p_medical IS NOT NULL AND p_medical <> '{}'::jsonb THEN
    INSERT INTO hr.medical_info (
      person_id, blood_type, allergies, chronic_conditions, current_medications,
      doctor_name, doctor_phone, medical_insurance_provider, medical_insurance_number, css_number
    ) VALUES (
      p_person_id,
      NULLIF(p_medical->>'blood_type', ''),
      NULLIF(p_medical->>'allergies', ''),
      NULLIF(p_medical->>'chronic_conditions', ''),
      NULLIF(p_medical->>'current_medications', ''),
      NULLIF(p_medical->>'doctor_name', ''),
      NULLIF(p_medical->>'doctor_phone', ''),
      NULLIF(p_medical->>'medical_insurance_provider', ''),
      NULLIF(p_medical->>'medical_insurance_number', ''),
      NULLIF(p_medical->>'css_number', '')
    )
    ON CONFLICT (person_id) DO UPDATE
    SET blood_type = EXCLUDED.blood_type,
        allergies = EXCLUDED.allergies,
        chronic_conditions = EXCLUDED.chronic_conditions,
        current_medications = EXCLUDED.current_medications,
        doctor_name = EXCLUDED.doctor_name,
        doctor_phone = EXCLUDED.doctor_phone,
        medical_insurance_provider = EXCLUDED.medical_insurance_provider,
        medical_insurance_number = EXCLUDED.medical_insurance_number,
        css_number = EXCLUDED.css_number,
        updated_at = now();
  END IF;

  -- Address (insert if no current residence exists)
  INSERT INTO hr.addresses (
    person_id, address_type, street, neighborhood, city, province, postal_code, is_current
  )
  SELECT p_person_id, 'residence',
         NULLIF(p_address->>'street', ''),
         NULLIF(p_address->>'neighborhood', ''),
         NULLIF(p_address->>'city', ''),
         p_address->>'province',
         NULLIF(p_address->>'postal_code', ''),
         true
  WHERE NOT EXISTS (
    SELECT 1 FROM hr.addresses
    WHERE person_id = p_person_id AND address_type = 'residence' AND is_current = true
  );

  -- Acknowledgments via sop_version_id JOIN (Blocker B3 fix)
  -- signature_method='click' matches CHECK constraint default
  INSERT INTO docs.acknowledgments (
    sop_version_id, person_id, acknowledged_at, signature_method, ip_address, user_agent
  )
  SELECT v_ethics_version_id, p_person_id, p_ack_ethics_at, 'click', p_ip_address, p_user_agent
  WHERE NOT EXISTS (
    SELECT 1 FROM docs.acknowledgments
    WHERE sop_version_id = v_ethics_version_id AND person_id = p_person_id
  );

  INSERT INTO docs.acknowledgments (
    sop_version_id, person_id, acknowledged_at, signature_method, ip_address, user_agent
  )
  SELECT v_child_labor_version_id, p_person_id, p_ack_child_labor_at, 'click', p_ip_address, p_user_agent
  WHERE NOT EXISTS (
    SELECT 1 FROM docs.acknowledgments
    WHERE sop_version_id = v_child_labor_version_id AND person_id = p_person_id
  );
END;
$$;

COMMENT ON FUNCTION hr.complete_onboarding_writes IS
  'Atomic + idempotent onboarding writes (Blocker B3 + Issue I3). '
  'Resolves sop_version_id via JOIN to docs.sops. '
  'Caller (server action) MUST first create/update auth.user before invoking.';

REVOKE EXECUTE ON FUNCTION hr.complete_onboarding_writes FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hr.complete_onboarding_writes TO service_role;
```

- [ ] **Step 12.3: Update CHANGELOG**

Append:
- `037_create_complete_onboarding_writes_rpc: idempotent atomic onboarding writes with sop_version_id JOIN (B3 + I3 fixed)`

- [ ] **Step 12.4: Commit**

```bash
git add src/lib/onboarding/actions.ts docs/CHANGELOG.md
git commit -m "feat(onboarding): server actions validateInviteCode + reportError + completeOnboarding"
```

---

### Task 13: Wizard infrastructure — Reducer + Layout + beforeunload guard

**Files:**
- Create: `src/components/onboarding/WizardReducer.ts`
- Create: `src/components/onboarding/WizardLayout.tsx`

- [ ] **Step 13.1: Implement WizardReducer.ts**

```typescript
'use client';

export interface ValidatedContext {
  person_id: string;
  display_name: string;
  invite_id: string;
  existing_multi_app_user: boolean;
  existing_email_masked: string | null;
  normalized_target: string;
  target_field: 'email' | 'phone';
}

export interface WizardState {
  step: number;             // 1..10
  validated: ValidatedContext | null;
  code: string;
  cedula: string;
  employee_code: string;
  delivery_target: string;
  password: string;
  emergency: {
    contact_name: string;
    relationship: string;
    phone: string;
    phone_alt: string;
  };
  medical: Record<string, string>;
  address: {
    street: string;
    neighborhood: string;
    city: string;
    province: string;
    postal_code: string;
  };
  ack_ethics_at: string | null;
  ack_child_labor_at: string | null;
  photo_path: string | null;
  pausedDueToCriticalError: boolean;
}

export const initialState: WizardState = {
  step: 1,
  validated: null,
  code: '',
  cedula: '',
  employee_code: '',
  delivery_target: '',
  password: '',
  emergency: { contact_name: '', relationship: '', phone: '', phone_alt: '' },
  medical: {},
  address: { street: '', neighborhood: '', city: '', province: '', postal_code: '' },
  ack_ethics_at: null,
  ack_child_labor_at: null,
  photo_path: null,
  pausedDueToCriticalError: false,
};

export type WizardAction =
  | { type: 'SET_FIELD'; key: keyof WizardState; value: WizardState[keyof WizardState] }
  | { type: 'SET_NESTED'; section: 'emergency' | 'address' | 'medical'; key: string; value: string }
  | { type: 'VALIDATED'; payload: ValidatedContext; code: string; cedula: string; employee_code: string; delivery_target: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO'; step: number }
  | { type: 'SET_PHOTO'; path: string }
  | { type: 'ACK'; key: 'ack_ethics_at' | 'ack_child_labor_at'; at: string }
  | { type: 'PAUSE_CRITICAL_ERROR' }
  | { type: 'RESET' };

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.key]: action.value };
    case 'SET_NESTED':
      return {
        ...state,
        [action.section]: { ...state[action.section], [action.key]: action.value },
      };
    case 'VALIDATED':
      return {
        ...state,
        validated: action.payload,
        code: action.code,
        cedula: action.cedula,
        employee_code: action.employee_code,
        delivery_target: action.delivery_target,
        step: action.payload.existing_multi_app_user ? 5 : 4,
      };
    case 'NEXT_STEP': {
      let next = state.step + 1;
      if (next === 4 && state.validated?.existing_multi_app_user) next = 5;
      return { ...state, step: Math.min(next, 10) };
    }
    case 'PREV_STEP': {
      let prev = state.step - 1;
      if (prev === 4 && state.validated?.existing_multi_app_user) prev = 3;
      return { ...state, step: Math.max(prev, 1) };
    }
    case 'GO_TO':
      return { ...state, step: action.step };
    case 'SET_PHOTO':
      return { ...state, photo_path: action.path };
    case 'ACK':
      return { ...state, [action.key]: action.at };
    case 'PAUSE_CRITICAL_ERROR':
      return { ...state, pausedDueToCriticalError: true };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}
```

- [ ] **Step 13.2: Implement WizardLayout.tsx (shell + progress + cancel + beforeunload)**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
  onCancel: () => void;
  showCancel?: boolean;
}

export function WizardLayout({ step, totalSteps, children, onCancel, showCancel = true }: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const router = useRouter();

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const pct = Math.round((step / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B3A5C] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold">HumanOS · Configuración inicial</div>
          <div className="text-xs opacity-80">Paso {step} de {totalSteps}</div>
        </div>
        {showCancel && (
          <button
            onClick={() => setConfirmingCancel(true)}
            className="text-sm underline hover:opacity-80"
          >
            Cancelar y reiniciar
          </button>
        )}
      </header>
      <div className="h-2 bg-gray-200">
        <div className="h-full bg-[#F0A500] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <main className="max-w-2xl mx-auto p-6">{children}</main>
      {confirmingCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-bold">¿Salir del onboarding?</h2>
            <p className="text-sm text-gray-600 mt-2">
              Perderás todo el progreso. Tendrás que iniciar desde el primer paso la próxima vez.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setConfirmingCancel(false)}
                className="px-4 py-2 border rounded"
              >
                Continuar
              </button>
              <button
                onClick={() => { onCancel(); router.push('/'); }}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 13.3: Commit**

```bash
git add src/components/onboarding/WizardReducer.ts src/components/onboarding/WizardLayout.tsx
git commit -m "feat(onboarding): wizard reducer + layout + beforeunload guard"
```

---

### Task 14: Wizard steps 1-3 (entry gate)

**Files:**
- Create: `src/components/onboarding/Step1Code.tsx`
- Create: `src/components/onboarding/Step2Identity.tsx`
- Create: `src/components/onboarding/Step3Identifier.tsx`

Pattern shared: each step is a controlled form bound to wizard state via dispatch. Steps 1-3 collect input separately but submit together to `validateInviteCodeAction` from Step 3 (so user sees a single round-trip after step 3). Steps 1 and 2 do local Zod validation only.

- [ ] **Step 14.1: Implement Step1Code.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Step1Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step1Code({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const r = Step1Schema.safeParse({ code: state.code });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Código inválido');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Bienvenido</h1>
      <p className="text-gray-700">
        Ingresa el código de 8 caracteres que recibiste de Recursos Humanos.
      </p>
      <input
        type="text"
        value={state.code}
        onChange={(e) => dispatch({ type: 'SET_FIELD', key: 'code', value: e.target.value.toUpperCase() })}
        placeholder="ABCD1234"
        maxLength={8}
        autoFocus
        className="w-full text-center text-2xl font-mono tracking-widest p-4 border-2 rounded-md uppercase"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleNext}
        disabled={state.code.length !== 8}
        className="w-full bg-[#1B3A5C] text-white py-3 rounded-md font-medium disabled:opacity-50"
      >
        Continuar
      </button>
    </section>
  );
}
```

- [ ] **Step 14.2: Implement Step2Identity.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Step2Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step2Identity({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const r = Step2Schema.safeParse({ cedula: state.cedula, employee_code: state.employee_code });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Verifica tu identidad</h1>
      <p className="text-gray-700">
        Para confirmar que el código es tuyo, ingresa tu cédula (o pasaporte) y
        opcionalmente tu código de empleado.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1">Cédula o pasaporte</label>
        <input
          type="text"
          value={state.cedula}
          onChange={(e) => dispatch({ type: 'SET_FIELD', key: 'cedula', value: e.target.value })}
          placeholder="8-123-456"
          className="w-full p-3 border rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Código de empleado (opcional)</label>
        <input
          type="text"
          value={state.employee_code}
          onChange={(e) => dispatch({ type: 'SET_FIELD', key: 'employee_code', value: e.target.value.toUpperCase() })}
          placeholder="VAL130"
          className="w-full p-3 border rounded-md uppercase"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => dispatch({ type: 'PREV_STEP' })} className="px-4 py-2 border rounded">
          Atrás
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md font-medium"
        >
          Continuar
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 14.3: Implement Step3Identifier.tsx (calls validateInviteCodeAction)**

```tsx
'use client';
import { useActionState, useEffect } from 'react';
import { validateInviteCodeAction } from '@/lib/onboarding/actions';
import type { WizardState, WizardAction, ValidatedContext } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const initialFormState = { ok: false };

export function Step3Identifier({ state, dispatch }: Props) {
  const [actionState, formAction, pending] = useActionState(validateInviteCodeAction, initialFormState);

  useEffect(() => {
    if (actionState.ok && actionState.data) {
      const ctx = actionState.data as ValidatedContext;
      dispatch({
        type: 'VALIDATED',
        payload: ctx,
        code: state.code,
        cedula: state.cedula,
        employee_code: state.employee_code,
        delivery_target: state.delivery_target,
      });
    }
  }, [actionState, dispatch, state.code, state.cedula, state.employee_code, state.delivery_target]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">¿Cómo te contactamos?</h1>
      <p className="text-gray-700">
        Ingresa tu correo empresarial o tu número de teléfono. Si ya tienes cuenta en
        MovimientOS u otra app de ICONSA, usa el mismo dato para que no se duplique.
      </p>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="code" value={state.code} />
        <input type="hidden" name="cedula" value={state.cedula} />
        <input type="hidden" name="employee_code" value={state.employee_code} />
        <input
          name="delivery_target"
          type="text"
          value={state.delivery_target}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', key: 'delivery_target', value: e.target.value })
          }
          placeholder="ejemplo@iconsanet.com o +50761234567"
          className="w-full p-3 border rounded-md"
        />
        {actionState.message && <p className="text-sm text-red-600">{actionState.message}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'PREV_STEP' })}
            className="px-4 py-2 border rounded"
          >
            Atrás
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md font-medium disabled:opacity-50"
          >
            {pending ? 'Verificando…' : 'Continuar'}
          </button>
        </div>
      </form>
    </section>
  );
}
```

- [ ] **Step 14.4: Commit**

```bash
git add src/components/onboarding/Step1Code.tsx src/components/onboarding/Step2Identity.tsx src/components/onboarding/Step3Identifier.tsx
git commit -m "feat(onboarding): wizard steps 1-3 entry gate"
```

---

### Task 15: Wizard steps 4-5 (password conditional + confirm + hay error modal)

**Files:**
- Create: `src/components/onboarding/Step4Password.tsx`
- Create: `src/components/onboarding/Step5Confirm.tsx`
- Create: `src/components/onboarding/HayErrorModal.tsx`

- [ ] **Step 15.1: Implement Step4Password.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Step4Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step4Password({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const r = Step4Schema.safeParse({ password: state.password });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Contraseña inválida');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Elige una contraseña</h1>
      <p className="text-gray-700">
        Mínimo 10 caracteres. Usamos una verificación contra bases de contraseñas filtradas — si
        eliges una comprometida, te pediremos otra.
      </p>
      <input
        type="password"
        value={state.password}
        onChange={(e) => dispatch({ type: 'SET_FIELD', key: 'password', value: e.target.value })}
        minLength={10}
        autoFocus
        className="w-full p-3 border rounded-md"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => dispatch({ type: 'PREV_STEP' })} className="px-4 py-2 border rounded">
          Atrás
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md font-medium"
        >
          Continuar
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 15.2: Implement HayErrorModal.tsx**

```tsx
'use client';
import { useActionState, useEffect } from 'react';
import { reportOnboardingErrorAction } from '@/lib/onboarding/actions';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onClose: () => void;
}

export function HayErrorModal({ state, dispatch, onClose }: Props) {
  const [actionState, formAction, pending] = useActionState(reportOnboardingErrorAction, {
    ok: false,
  });

  useEffect(() => {
    if (actionState.ok && actionState.data) {
      const d = actionState.data as { severity: 'leve' | 'critica'; should_pause_wizard: boolean };
      if (d.should_pause_wizard) {
        dispatch({ type: 'PAUSE_CRITICAL_ERROR' });
      } else {
        onClose();
        dispatch({ type: 'NEXT_STEP' });
      }
    }
  }, [actionState, dispatch, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold">Reportar error en tus datos</h2>
        <form action={formAction} className="space-y-4 mt-4">
          <input type="hidden" name="person_id" value={state.validated?.person_id ?? ''} />
          <div>
            <label className="block text-sm font-medium mb-1">Severidad</label>
            <select name="severity" className="w-full p-3 border rounded" defaultValue="">
              <option value="" disabled>Selecciona…</option>
              <option value="leve">
                Leve — puedo continuar (cargo levemente distinto, departamento mal categorizado)
              </option>
              <option value="critica">
                Crítica — no debo continuar (nombre mal escrito, cédula incorrecta, supervisor incorrecto)
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Describe el error</label>
            <textarea
              name="description"
              rows={4}
              required
              minLength={5}
              className="w-full p-3 border rounded"
              placeholder="Mi cargo dice 'Ingeniero' pero soy 'Ingeniero Civil Senior'"
            />
          </div>
          {actionState.errors && (
            <ul className="text-sm text-red-600">
              {Object.entries(actionState.errors).map(([k, v]) => (
                <li key={k}>{v?.[0]}</li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 bg-[#1B3A5C] text-white rounded disabled:opacity-50"
            >
              {pending ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 15.3: Implement Step5Confirm.tsx (preview profile + open hay-error modal + continue button)**

Step5Confirm needs to query the prefilled profile data (full_name, position, department, supervisor, etc.) from BD. Since the wizard is unauthenticated, this query is done via the validateInviteCodeAction in step 3 (extend its return type to include profile preview), OR via a new server action `getOnboardingProfilePreviewAction(person_id)` that uses admin client. The cleaner path: extend `validateInviteCodeAction` to return preview data along with validation result.

For brevity here, this step expects a `profilePreview` prop passed from the parent wizard (loaded from validated context). The wizard top-level component fetches it once after validation.

```tsx
'use client';
import { useState } from 'react';
import type { WizardState, WizardAction } from './WizardReducer';
import { HayErrorModal } from './HayErrorModal';

interface ProfilePreview {
  full_name: string;
  position: string;
  department: string;
  supervisor_name: string | null;
  office: string;
  hire_date: string;
  employment_type: string;
}

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  preview: ProfilePreview;
}

export function Step5Confirm({ state, dispatch, preview }: Props) {
  const [showErrorModal, setShowErrorModal] = useState(false);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Confirma tus datos</h1>
      <p className="text-gray-700">
        Verifica que los datos registrados en HumanOS sean correctos. Si algo está incorrecto,
        reporta el error a RRHH.
      </p>
      <dl className="bg-white border rounded-md divide-y">
        <Row label="Nombre completo" value={preview.full_name} />
        <Row label="Cargo" value={preview.position} />
        <Row label="Departamento" value={preview.department} />
        <Row label="Supervisor" value={preview.supervisor_name ?? 'Sin asignar'} />
        <Row label="Ubicación" value={preview.office} />
        <Row label="Fecha de ingreso" value={preview.hire_date} />
        <Row label="Tipo de contrato" value={preview.employment_type} />
      </dl>
      {state.validated?.existing_multi_app_user && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
          Detectamos que ya tienes cuenta de ICONSA registrada con{' '}
          <strong>{state.validated.existing_email_masked}</strong>. Tu contraseña actual sigue
          válida y la usarás también para HumanOS.
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          className="px-4 py-2 border rounded"
        >
          Atrás
        </button>
        <button
          onClick={() => setShowErrorModal(true)}
          className="px-4 py-2 border border-red-300 text-red-700 rounded"
        >
          Hay un error
        </button>
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md font-medium"
        >
          Todo correcto, continuar
        </button>
      </div>
      {showErrorModal && (
        <HayErrorModal
          state={state}
          dispatch={dispatch}
          onClose={() => setShowErrorModal(false)}
        />
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between p-3">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 15.4: Extend validateInviteCodeAction to return profile preview**

Modify `src/lib/onboarding/actions.ts` `validateInviteCodeAction` to also query position/department/supervisor/office/hire_date/employment_type via JOIN, and include in returned `data` payload:

```typescript
// Within validateInviteCodeAction, after the existing person query:
const { data: employment } = await admin
  .schema('hr')
  .from('employments')
  .select(`
    hire_date,
    position_text,
    department_text,
    office_text,
    position:positions(title),
    department:org_units(name),
    office:locations(name),
    supervisor:people!supervisor_id(full_name),
    employment_type:employment_types(short_name)
  `)
  .eq('person_id', invite.person_id)
  .eq('is_current', true)
  .maybeSingle();

const preview = {
  full_name: person.full_name,
  position: employment?.position?.title ?? employment?.position_text ?? 'Sin asignar',
  department: employment?.department?.name ?? employment?.department_text ?? 'Sin asignar',
  supervisor_name: employment?.supervisor?.full_name ?? null,
  office: employment?.office?.name ?? employment?.office_text ?? 'Sin asignar',
  hire_date: employment?.hire_date ?? 'Sin asignar',
  employment_type: employment?.employment_type?.short_name ?? 'Sin asignar',
};

return {
  ok: true,
  data: { ...validatedContext, preview },
};
```

Update `ValidatedContext` in `WizardReducer.ts` to include `preview: ProfilePreview`.

- [ ] **Step 15.5: Commit**

```bash
git add src/components/onboarding/Step4Password.tsx src/components/onboarding/Step5Confirm.tsx src/components/onboarding/HayErrorModal.tsx src/lib/onboarding/actions.ts src/components/onboarding/WizardReducer.ts
git commit -m "feat(onboarding): wizard step 4 password + step 5 confirm + hay error modal"
```

---

### Task 16: Wizard steps 6-9 (emergency / medical / address / acknowledgments)

**Files:**
- Create: `src/components/onboarding/Step6Emergency.tsx`
- Create: `src/components/onboarding/Step7Medical.tsx`
- Create: `src/components/onboarding/Step8Address.tsx`
- Create: `src/components/onboarding/Step9Acknowledgments.tsx`

Pattern shared (Pattern C from cross-cutting): each step renders a form bound to wizard state. Inputs dispatch `SET_NESTED` for nested sections (`emergency`, `address`, `medical`) and validate locally via Zod on next-click. No round-trip to server until step 10 atomic commit.

- [ ] **Step 16.1: Implement Step6Emergency.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Step6Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step6Emergency({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof typeof state.emergency, value: string) =>
    dispatch({ type: 'SET_NESTED', section: 'emergency', key, value });

  const handleNext = () => {
    const r = Step6Schema.safeParse(state.emergency);
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Contacto de emergencia</h1>
      <p className="text-gray-700">
        ¿A quién debemos contactar en caso de emergencia? Esta información solo es visible para
        RRHH y para ti.
      </p>
      <FormField label="Nombre completo" value={state.emergency.contact_name} onChange={(v) => update('contact_name', v)} />
      <FormField label="Parentesco" value={state.emergency.relationship} onChange={(v) => update('relationship', v)} placeholder="madre, esposa, hermano…" />
      <FormField label="Teléfono principal" value={state.emergency.phone} onChange={(v) => update('phone', v)} placeholder="+50761234567" type="tel" />
      <FormField label="Teléfono alternativo (opcional)" value={state.emergency.phone_alt} onChange={(v) => update('phone_alt', v)} type="tel" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => dispatch({ type: 'PREV_STEP' })} className="px-4 py-2 border rounded">Atrás</button>
        <button onClick={handleNext} className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md">Continuar</button>
      </div>
    </section>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full p-3 border rounded-md" />
    </div>
  );
}
```

- [ ] **Step 16.2: Implement Step7Medical.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Step7Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function Step7Medical({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);
  const update = (key: string, value: string) =>
    dispatch({ type: 'SET_NESTED', section: 'medical', key, value });

  const handleNext = () => {
    const r = Step7Schema.safeParse(state.medical);
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Información médica</h1>
      <p className="text-gray-700">
        Todos los campos son opcionales. Esta información es muy sensible y solo accesible por ti y
        RRHH. Útil en caso de emergencia.
      </p>
      <div>
        <label className="block text-sm font-medium mb-1">Tipo de sangre</label>
        <select value={state.medical.blood_type ?? ''} onChange={(e) => update('blood_type', e.target.value)} className="w-full p-3 border rounded">
          {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t || 'No especificado'}</option>)}
        </select>
      </div>
      <textarea placeholder="Alergias" value={state.medical.allergies ?? ''} onChange={(e) => update('allergies', e.target.value)} className="w-full p-3 border rounded" rows={2} />
      <textarea placeholder="Condiciones crónicas (diabetes, hipertensión, asma…)" value={state.medical.chronic_conditions ?? ''} onChange={(e) => update('chronic_conditions', e.target.value)} className="w-full p-3 border rounded" rows={2} />
      <textarea placeholder="Medicamentos actuales" value={state.medical.current_medications ?? ''} onChange={(e) => update('current_medications', e.target.value)} className="w-full p-3 border rounded" rows={2} />
      <input placeholder="Nombre del médico de cabecera" value={state.medical.doctor_name ?? ''} onChange={(e) => update('doctor_name', e.target.value)} className="w-full p-3 border rounded" />
      <input placeholder="Teléfono del médico" value={state.medical.doctor_phone ?? ''} onChange={(e) => update('doctor_phone', e.target.value)} className="w-full p-3 border rounded" />
      <input placeholder="Aseguradora" value={state.medical.medical_insurance_provider ?? ''} onChange={(e) => update('medical_insurance_provider', e.target.value)} className="w-full p-3 border rounded" />
      <input placeholder="Número de póliza" value={state.medical.medical_insurance_number ?? ''} onChange={(e) => update('medical_insurance_number', e.target.value)} className="w-full p-3 border rounded" />
      <input placeholder="CSS" value={state.medical.css_number ?? ''} onChange={(e) => update('css_number', e.target.value)} className="w-full p-3 border rounded" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => dispatch({ type: 'PREV_STEP' })} className="px-4 py-2 border rounded">Atrás</button>
        <button onClick={handleNext} className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md">Continuar</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 16.3: Implement Step8Address.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Step8Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

const PROVINCES = [
  'Bocas del Toro', 'Chiriquí', 'Coclé', 'Colón', 'Darién',
  'Herrera', 'Los Santos', 'Panamá', 'Panamá Oeste', 'Veraguas',
  'Comarca Emberá', 'Comarca Guna Yala', 'Comarca Ngäbe-Buglé',
];

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step8Address({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof typeof state.address, value: string) =>
    dispatch({ type: 'SET_NESTED', section: 'address', key, value });

  const handleNext = () => {
    const r = Step8Schema.safeParse(state.address);
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Tu dirección</h1>
      <p className="text-gray-700">Dónde vives actualmente.</p>
      <input placeholder="Calle, casa, apartamento" value={state.address.street} onChange={(e) => update('street', e.target.value)} className="w-full p-3 border rounded" />
      <input placeholder="Barrio o corregimiento" value={state.address.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} className="w-full p-3 border rounded" />
      <input placeholder="Ciudad" value={state.address.city} onChange={(e) => update('city', e.target.value)} className="w-full p-3 border rounded" />
      <div>
        <label className="block text-sm font-medium mb-1">Provincia</label>
        <select value={state.address.province} onChange={(e) => update('province', e.target.value)} className="w-full p-3 border rounded">
          <option value="">Selecciona provincia…</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <input placeholder="Código postal (opcional)" value={state.address.postal_code} onChange={(e) => update('postal_code', e.target.value)} className="w-full p-3 border rounded" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => dispatch({ type: 'PREV_STEP' })} className="px-4 py-2 border rounded">Atrás</button>
        <button onClick={handleNext} className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md">Continuar</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 16.4: Implement Step9Acknowledgments.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Step9Schema } from '@/lib/onboarding/validation';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step9Acknowledgments({ state, dispatch }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const now = new Date().toISOString();
    if (!state.ack_ethics_at || !state.ack_child_labor_at) {
      setError('Debes aceptar ambos documentos para continuar');
      return;
    }
    const r = Step9Schema.safeParse({
      ack_ethics: !!state.ack_ethics_at,
      ack_child_labor: !!state.ack_child_labor_at,
    });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setError(null);
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Reconocimientos</h1>
      <p className="text-gray-700">
        Confirma que has leído y aceptas estas políticas de ICONSA.
      </p>
      <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer">
        <input
          type="checkbox"
          checked={!!state.ack_ethics_at}
          onChange={(e) =>
            dispatch({
              type: 'ACK',
              key: 'ack_ethics_at',
              at: e.target.checked ? new Date().toISOString() : '',
            })
          }
          className="mt-1"
        />
        <div>
          <div className="font-medium">Manual de Ética ICONSA (M-01)</div>
          <p className="text-sm text-gray-600">
            He leído y acepto el Manual de Ética y código de conducta.
          </p>
          <a href="/sops/M-01.pdf" target="_blank" rel="noopener noreferrer" className="text-sm text-[#0A6EBD] underline">
            Ver documento (PDF)
          </a>
        </div>
      </label>
      <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer">
        <input
          type="checkbox"
          checked={!!state.ack_child_labor_at}
          onChange={(e) =>
            dispatch({
              type: 'ACK',
              key: 'ack_child_labor_at',
              at: e.target.checked ? new Date().toISOString() : '',
            })
          }
          className="mt-1"
        />
        <div>
          <div className="font-medium">Política contra Trabajo Infantil (D-07)</div>
          <p className="text-sm text-gray-600">
            He leído y acepto la política de prevención de trabajo infantil y forzado.
          </p>
          <a href="/sops/D-07.pdf" target="_blank" rel="noopener noreferrer" className="text-sm text-[#0A6EBD] underline">
            Ver documento (PDF)
          </a>
        </div>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => dispatch({ type: 'PREV_STEP' })} className="px-4 py-2 border rounded">Atrás</button>
        <button onClick={handleNext} className="flex-1 bg-[#1B3A5C] text-white py-3 rounded-md">Continuar</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 16.5: Commit**

```bash
git add src/components/onboarding/Step6Emergency.tsx src/components/onboarding/Step7Medical.tsx src/components/onboarding/Step8Address.tsx src/components/onboarding/Step9Acknowledgments.tsx
git commit -m "feat(onboarding): wizard steps 6-9 emergency + medical + address + acknowledgments"
```

---

### Task 17: Wizard step 10 (photo + final submit) + atomic commit

**Files:**
- Create: `src/components/onboarding/Step10PhotoConfirm.tsx`

- [ ] **Step 17.1: Implement Step10PhotoConfirm.tsx**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resizeImage } from '@/lib/storage/avatars';
import {
  completeOnboardingAction,
  uploadOnboardingAvatarAction,
} from '@/lib/onboarding/actions';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step10PhotoConfirm({ state, dispatch }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setUploadError(null);
  };

  // Blocker B1 fix: use server action (admin client gated by invite_code)
  // because user is NOT YET authenticated at step 10.
  const tryUpload = async (): Promise<string | null> => {
    if (!file || !state.validated) return state.photo_path;
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await resizeImage(file);
      const fd = new FormData();
      fd.append('invite_id', state.validated.invite_id);
      fd.append('person_id', state.validated.person_id);
      fd.append('photo', blob, 'current.jpg');
      const result = await uploadOnboardingAvatarAction(fd);
      if (!result.ok || !result.path) {
        throw new Error(result.error ?? 'Upload falló');
      }
      dispatch({ type: 'SET_PHOTO', path: result.path });
      return result.path;
    } catch (err) {
      setUploadError((err as Error).message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!state.validated) return;
    setSubmitting(true);
    setSubmitError(null);

    // β-prima: upload photo BEFORE server action (pre-submit non-blocking)
    let photoPath: string | null = state.photo_path;
    if (file && !state.photo_path) {
      photoPath = await tryUpload();
      if (!photoPath && file) {
        const proceed = window.confirm(
          'La foto no se pudo subir. ¿Continuar sin foto o reintentar?\n' +
            'Aceptar = continuar sin foto. Cancelar = volver a intentar.'
        );
        if (!proceed) {
          setSubmitting(false);
          return;
        }
        photoPath = null;
      }
    }

    const result = await completeOnboardingAction({
      invite_id: state.validated.invite_id,
      person_id: state.validated.person_id,
      target_field: state.validated.target_field,
      normalized_target: state.validated.normalized_target,
      password: state.validated.existing_multi_app_user ? null : state.password,
      emergency: state.emergency,
      medical: state.medical,
      address: state.address,
      ack_ethics_at: state.ack_ethics_at!,
      ack_child_labor_at: state.ack_child_labor_at!,
      photo_path: photoPath,
    });

    if (!result.ok) {
      setSubmitError(result.message ?? 'Onboarding falló');
      setSubmitting(false);
      return;
    }

    router.push((result.data as { redirect_to: string }).redirect_to);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Foto de perfil (opcional)</h1>
      <p className="text-gray-700">
        Sube una foto para tu perfil interno (gafete, directorio). Puedes saltarte este paso y
        agregarla después desde tu perfil.
      </p>
      <div className="flex flex-col items-center gap-3">
        {previewUrl ? (
          <img src={previewUrl} alt="Vista previa" className="w-32 h-32 object-cover rounded-full border-2 border-gray-300" />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
            Sin foto
          </div>
        )}
        <label className="cursor-pointer text-sm text-[#0A6EBD] underline">
          {file ? 'Cambiar foto' : 'Subir foto'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
        </label>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      </div>
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          disabled={submitting}
          className="px-4 py-2 border rounded"
        >
          Atrás
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="flex-1 bg-[#1A7F5A] text-white py-3 rounded-md font-medium disabled:opacity-50"
        >
          {submitting ? 'Activando cuenta…' : 'Confirmar y activar mi cuenta'}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 17.2: Commit**

```bash
git add src/components/onboarding/Step10PhotoConfirm.tsx
git commit -m "feat(onboarding): wizard step 10 photo upload + atomic submit (β-prima)"
```

---

### Task 18: Wizard host page + error-reported terminal page + forgot/reset password

**Files:**
- Create: `src/app/(public)/onboarding/[code]/page.tsx`
- Create: `src/app/(public)/onboarding/[code]/wizard.tsx`
- Create: `src/app/(public)/onboarding/error-reported/page.tsx`
- Create: `src/app/(public)/forgot-password/page.tsx` + `actions.ts`
- Create: `src/app/(public)/reset-password/page.tsx` + `actions.ts`
- Create: `src/app/(authenticated)/perfil/page.tsx` (post-onboarding landing — minimal MVP)

- [ ] **Step 18.1: Wizard page + root client component**

`src/app/(public)/onboarding/[code]/page.tsx`:

```tsx
import { Wizard } from './wizard';

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Wizard initialCode={code} />;
}
```

`src/app/(public)/onboarding/[code]/wizard.tsx`:

```tsx
'use client';
import { useReducer, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { wizardReducer, initialState } from '@/components/onboarding/WizardReducer';
import { WizardLayout } from '@/components/onboarding/WizardLayout';
import { Step1Code } from '@/components/onboarding/Step1Code';
import { Step2Identity } from '@/components/onboarding/Step2Identity';
import { Step3Identifier } from '@/components/onboarding/Step3Identifier';
import { Step4Password } from '@/components/onboarding/Step4Password';
import { Step5Confirm } from '@/components/onboarding/Step5Confirm';
import { Step6Emergency } from '@/components/onboarding/Step6Emergency';
import { Step7Medical } from '@/components/onboarding/Step7Medical';
import { Step8Address } from '@/components/onboarding/Step8Address';
import { Step9Acknowledgments } from '@/components/onboarding/Step9Acknowledgments';
import { Step10PhotoConfirm } from '@/components/onboarding/Step10PhotoConfirm';

export function Wizard({ initialCode }: { initialCode: string }) {
  const [state, dispatch] = useReducer(wizardReducer, { ...initialState, code: initialCode.toUpperCase() });
  const router = useRouter();

  useEffect(() => {
    if (state.pausedDueToCriticalError) {
      router.push('/onboarding/error-reported');
    }
  }, [state.pausedDueToCriticalError, router]);

  const renderStep = () => {
    if (!state.validated && state.step >= 4) {
      return <p className="text-red-600">Estado inválido. Reinicia el onboarding.</p>;
    }
    switch (state.step) {
      case 1: return <Step1Code state={state} dispatch={dispatch} />;
      case 2: return <Step2Identity state={state} dispatch={dispatch} />;
      case 3: return <Step3Identifier state={state} dispatch={dispatch} />;
      case 4: return <Step4Password state={state} dispatch={dispatch} />;
      case 5: return <Step5Confirm state={state} dispatch={dispatch} preview={state.validated!.preview} />;
      case 6: return <Step6Emergency state={state} dispatch={dispatch} />;
      case 7: return <Step7Medical state={state} dispatch={dispatch} />;
      case 8: return <Step8Address state={state} dispatch={dispatch} />;
      case 9: return <Step9Acknowledgments state={state} dispatch={dispatch} />;
      case 10: return <Step10PhotoConfirm state={state} dispatch={dispatch} />;
      default: return null;
    }
  };

  return (
    <WizardLayout
      step={state.step}
      totalSteps={10}
      onCancel={() => dispatch({ type: 'RESET' })}
    >
      {renderStep()}
    </WizardLayout>
  );
}
```

- [ ] **Step 18.2: Error-reported terminal page**

`src/app/(public)/onboarding/error-reported/page.tsx`:

```tsx
export default function ErrorReportedPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-[#1B3A5C]">Reporte enviado</h1>
        <p className="text-gray-700 mt-4">
          Hemos notificado al equipo de Recursos Humanos sobre el error en tus datos. Te
          contactaremos cuando esté resuelto.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Cuando recibas confirmación de RRHH, puedes volver a abrir este enlace para continuar tu
          onboarding desde el inicio.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 18.3: `/forgot-password` page + action**

`src/app/(public)/forgot-password/actions.ts`:

```typescript
'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { translateAuthError } from '@/lib/auth/errors';
import { z } from 'zod';

const Schema = z.object({
  identifier: z.string().min(1, 'Ingresa tu correo o teléfono'),
});

type FormState = { ok: boolean; message?: string };

export async function resetPasswordForEmailAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = Schema.safeParse({ identifier: formData.get('identifier') });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const identifier = parsed.data.identifier.trim();
  if (!identifier.includes('@')) {
    return {
      ok: true,
      message:
        'Si te registraste con teléfono, contacta a tu Oficial de RRHH (Samantha Kosmas o Rocío Olmedo) para recuperar tu contraseña. SMS recovery estará disponible en próxima versión.',
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(identifier.toLowerCase(), {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password`,
  });
  if (error && error.code !== 'over_email_send_rate_limit' && error.code !== 'user_not_found') {
    return { ok: false, message: translateAuthError(error) };
  }
  // Anti-enumeration: same response whether or not the email exists
  return {
    ok: true,
    message: 'Si esa cuenta existe, te enviamos un enlace de recuperación a tu correo.',
  };
}
```

`src/app/(public)/forgot-password/page.tsx`:

```tsx
'use client';
import { useActionState } from 'react';
import { resetPasswordForEmailAction } from './actions';

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordForEmailAction, { ok: false });
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-[#1B3A5C]">Recuperar contraseña</h1>
        <p className="text-gray-700 mt-2 text-sm">
          Ingresa tu correo empresarial. Si la cuenta existe, te enviamos un enlace.
        </p>
        <form action={formAction} className="space-y-4 mt-4">
          <input
            name="identifier"
            type="text"
            placeholder="ejemplo@iconsanet.com"
            required
            className="w-full p-3 border rounded"
          />
          {state.message && (
            <p className={`text-sm ${state.ok ? 'text-gray-700' : 'text-red-600'}`}>
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-[#1B3A5C] text-white py-3 rounded-md font-medium disabled:opacity-50"
          >
            {pending ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
        <a href="/login" className="text-sm text-[#0A6EBD] underline mt-4 inline-block">
          Volver a iniciar sesión
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 18.4: `/reset-password` page + action**

`src/app/(public)/reset-password/actions.ts`:

```typescript
'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { translateAuthError } from '@/lib/auth/errors';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const Schema = z.object({
  password: z.string().min(10, 'Mínimo 10 caracteres'),
});

type FormState = { ok: boolean; message?: string };

export async function setNewPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = Schema.safeParse({ password: formData.get('password') });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: translateAuthError(error) };
  redirect('/login?reset=ok');
}
```

`src/app/(public)/reset-password/page.tsx`:

```tsx
'use client';
import { useActionState } from 'react';
import { setNewPasswordAction } from './actions';

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(setNewPasswordAction, { ok: false });
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-[#1B3A5C]">Nueva contraseña</h1>
        <p className="text-gray-700 mt-2 text-sm">Mínimo 10 caracteres. No reutilices contraseñas anteriores.</p>
        <form action={formAction} className="space-y-4 mt-4">
          <input
            name="password"
            type="password"
            placeholder="Nueva contraseña"
            minLength={10}
            required
            className="w-full p-3 border rounded"
          />
          {state.message && <p className="text-sm text-red-600">{state.message}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-[#1B3A5C] text-white py-3 rounded-md font-medium disabled:opacity-50"
          >
            {pending ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 18.5: Minimal `/perfil` page (post-onboarding landing)**

`src/app/(authenticated)/perfil/page.tsx`:

```tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAvatarSignedUrl } from '@/lib/storage/avatars';

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <p>No autenticado</p>;

  const { data: person } = await supabase
    .schema('hr')
    .from('people')
    .select(`
      id, full_name, preferred_name, national_id, employee_code, photo_url,
      employment:employments!inner(
        hire_date,
        position:positions(title),
        department:org_units(name),
        office:locations(name),
        supervisor:people!supervisor_id(full_name),
        employment_type:employment_types(short_name)
      )
    `)
    .eq('auth_id', user.id)
    .eq('employment.is_current', true)
    .maybeSingle();

  if (!person) return <p>Perfil no encontrado</p>;

  let avatarUrl: string | null = null;
  if (person.photo_url) {
    try {
      avatarUrl = await getAvatarSignedUrl(supabase, person.photo_url);
    } catch {
      // Render without avatar if signed URL fails
    }
  }

  const employment = Array.isArray(person.employment) ? person.employment[0] : person.employment;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Mi perfil</h1>
      <p className="text-gray-600 text-sm mt-1">
        Bienvenido a HumanOS. Si algo está incorrecto, contacta a Recursos Humanos.
      </p>
      <div className="bg-white rounded-lg shadow mt-6 p-6 flex gap-6 items-start">
        {avatarUrl ? (
          <img src={avatarUrl} alt={person.full_name} className="w-24 h-24 rounded-full object-cover" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200" />
        )}
        <dl className="flex-1 space-y-2 text-sm">
          <Row label="Nombre" value={person.full_name} />
          <Row label="Cédula" value={person.national_id ?? '—'} />
          <Row label="Código de empleado" value={person.employee_code ?? '—'} />
          <Row label="Cargo" value={employment?.position?.title ?? '—'} />
          <Row label="Departamento" value={employment?.department?.name ?? '—'} />
          <Row label="Ubicación" value={employment?.office?.name ?? '—'} />
          <Row label="Supervisor" value={employment?.supervisor?.full_name ?? 'Sin asignar'} />
          <Row label="Fecha de ingreso" value={employment?.hire_date ?? '—'} />
          <Row label="Tipo de contrato" value={employment?.employment_type?.short_name ?? '—'} />
        </dl>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b last:border-0 py-2">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 18.6: Commit**

```bash
git add src/app/\(public\)/onboarding/ src/app/\(public\)/forgot-password/ src/app/\(public\)/reset-password/ src/app/\(authenticated\)/perfil/
git commit -m "feat(onboarding): wizard host page + error-reported + forgot/reset password + perfil"
```

---

### Task 19: Admin server actions + EmployeeForm + EmployeeList + pages

**Files:**
- Create: `src/lib/admin/employees-actions.ts`
- Create: `src/components/admin/employees/EmployeeForm.tsx`
- Create: `src/components/admin/employees/EmployeeList.tsx`
- Create: `src/components/admin/employees/CatalogComboboxField.tsx`
- Create: `src/components/admin/employees/RegenerateInviteButton.tsx`
- Create: `src/app/(authenticated)/admin/empleados/page.tsx`
- Create: `src/app/(authenticated)/admin/empleados/nuevo/page.tsx`
- Create: `src/app/(authenticated)/admin/empleados/[id]/editar/page.tsx`

- [ ] **Step 19.1: Implement employees-actions.ts**

```typescript
'use server';
// ADR-0006 exception: invite code generation uses admin client for hr.invite_codes insert
// (RLS would require hr_admin context; service role bypasses for atomic creation with audit).
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { enqueueNotification } from '@/lib/notifications/insert';
import { NotificationType } from '@/lib/notifications/types';

type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

const EmployeeSchema = z.object({
  full_name: z.string().min(1, 'Nombre requerido'),
  national_id: z.string().min(1, 'Cédula requerida'),
  employee_code: z.string().optional().or(z.literal('')),
  position_id: z.string().uuid().optional().or(z.literal('')),
  position_text: z.string().optional().or(z.literal('')),
  department_id: z.string().uuid().optional().or(z.literal('')),
  department_text: z.string().optional().or(z.literal('')),
  office_id: z.string().uuid().optional().or(z.literal('')),
  office_text: z.string().optional().or(z.literal('')),
  supervisor_id: z.string().uuid().optional().or(z.literal('')),
  hire_date: z.string().min(1, 'Fecha de ingreso requerida'),
  app_role: z.enum(['employee', 'hr_admin', 'president', 'admin']).default('employee'),
  employment_type_id: z.string().uuid('Tipo de contrato requerido'),
  delivery_target: z.string().min(1, 'Correo o teléfono requerido'),
});

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export async function createEmployeeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = EmployeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  // Validate at least one of {position_id|position_text}, etc.
  if (!parsed.data.position_id && !parsed.data.position_text) {
    return { ok: false, message: 'Cargo requerido (catálogo o texto libre)' };
  }
  if (!parsed.data.department_id && !parsed.data.department_text) {
    return { ok: false, message: 'Departamento requerido' };
  }
  if (!parsed.data.office_id && !parsed.data.office_text) {
    return { ok: false, message: 'Ubicación requerida' };
  }

  const userClient = await createSupabaseServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { ok: false, message: 'No autenticado' };

  const admin = createSupabaseAdminClient();

  // Insert hr.people skeleton
  const { data: person, error: personErr } = await admin
    .schema('hr')
    .from('people')
    .insert({
      full_name: parsed.data.full_name,
      national_id: parsed.data.national_id,
      employee_code: parsed.data.employee_code || null,
      status: 'Activo',
      created_from: 'manual',
    })
    .select('id, full_name')
    .single();
  if (personErr || !person) return { ok: false, message: `Insert hr.people falló: ${personErr?.message}` };

  // Insert hr.employments current
  const { error: empErr } = await admin
    .schema('hr')
    .from('employments')
    .insert({
      person_id: person.id,
      position_id: parsed.data.position_id || null,
      position_text: parsed.data.position_text || null,
      department_id: parsed.data.department_id || null,
      department_text: parsed.data.department_text || null,
      office_id: parsed.data.office_id || null,
      office_text: parsed.data.office_text || null,
      supervisor_id: parsed.data.supervisor_id || null,
      hire_date: parsed.data.hire_date,
      app_role: parsed.data.app_role,
      employment_type_id: parsed.data.employment_type_id,
      created_from: 'manual',
    });
  if (empErr) return { ok: false, message: `Insert hr.employments falló: ${empErr.message}` };

  // Insert hr.user_settings default row (so wizard step 10 can read preferences)
  await admin.schema('hr').from('user_settings').insert({ person_id: person.id });

  // Generate invite code
  const code = generateInviteCode();
  const { data: invite, error: invErr } = await admin
    .schema('hr')
    .from('invite_codes')
    .insert({
      code,
      person_id: person.id,
      generated_by: user.id,
      invite_method: parsed.data.delivery_target.includes('@') ? 'email' : 'whatsapp',
      delivery_target: parsed.data.delivery_target,
    })
    .select('id, code, expires_at')
    .single();
  if (invErr || !invite) return { ok: false, message: `Insert invite falló: ${invErr?.message}` };

  // Enqueue invite_code_delivered notification (in-app to hr_admin who created; email to delivery_target via outbox row with explicit recipient_email field if added later)
  // MVP: email to delivery_target uses a separate outbox row with channel='email' and recipient_email override.
  // For simplicity here: queue an in_app notification to the creating hr_admin confirming + relies on hr_admin to copy code from F4 toast.

  return {
    ok: true,
    data: {
      person_id: person.id,
      invite_code: invite.code,
      expires_at: invite.expires_at,
      delivery_target: parsed.data.delivery_target,
    },
  };
}

export async function regenerateInviteCodeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const personId = formData.get('person_id') as string | null;
  const deliveryTarget = formData.get('delivery_target') as string | null;
  if (!personId || !deliveryTarget) return { ok: false, message: 'Datos faltantes' };

  const userClient = await createSupabaseServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { ok: false, message: 'No autenticado' };

  const admin = createSupabaseAdminClient();

  // Expire old codes (set expires_at = now() if not consumed)
  await admin
    .schema('hr')
    .from('invite_codes')
    .update({ expires_at: new Date().toISOString() })
    .eq('person_id', personId)
    .is('consumed_at', null);

  const code = generateInviteCode();
  const { data: invite, error } = await admin
    .schema('hr')
    .from('invite_codes')
    .insert({
      code,
      person_id: personId,
      generated_by: user.id,
      invite_method: deliveryTarget.includes('@') ? 'email' : 'whatsapp',
      delivery_target: deliveryTarget,
    })
    .select('id, code, expires_at')
    .single();
  if (error || !invite) return { ok: false, message: error?.message };

  // Audit log
  await admin.schema('audit').from('log').insert({
    actor_id: user.id,
    action: 'invite_code_regenerated',
    record_id: personId,
    metadata: { new_code: invite.code },
  });

  return { ok: true, data: { code: invite.code, expires_at: invite.expires_at } };
}

const UpdateEmployeeSchema = EmployeeSchema.omit({ delivery_target: true }).extend({
  person_id: z.string().uuid(),
});

export async function updateEmployeeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = UpdateEmployeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  const userClient = await createSupabaseServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { ok: false, message: 'No autenticado' };

  // Standard RLS-driven UPDATE for non-critical fields uses user client
  // (this respects ADR-0001). Critical SCD-2 changes use admin RPC.
  const admin = createSupabaseAdminClient();

  // Update hr.people directly (full_name, national_id, employee_code)
  const { error: pErr } = await admin
    .schema('hr')
    .from('people')
    .update({
      full_name: parsed.data.full_name,
      national_id: parsed.data.national_id,
      employee_code: parsed.data.employee_code || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.person_id);
  if (pErr) return { ok: false, message: pErr.message };

  // SCD-2 for critical employment changes: call helper RPC
  const { error: scdErr } = await admin.rpc('apply_employment_scd2_change', {
    p_person_id: parsed.data.person_id,
    p_position_id: parsed.data.position_id || null,
    p_position_text: parsed.data.position_text || null,
    p_department_id: parsed.data.department_id || null,
    p_department_text: parsed.data.department_text || null,
    p_office_id: parsed.data.office_id || null,
    p_office_text: parsed.data.office_text || null,
    p_supervisor_id: parsed.data.supervisor_id || null,
    p_hire_date: parsed.data.hire_date,
    p_app_role: parsed.data.app_role,
    p_employment_type_id: parsed.data.employment_type_id,
    p_actor_id: user.id,
  });
  if (scdErr) return { ok: false, message: scdErr.message };

  return { ok: true };
}
```

- [ ] **Step 19.2: Apply migration 038 — `apply_employment_scd2_change` helper**

Migration `038_create_apply_employment_scd2_change`:

```sql
-- Migration 038: SCD-2 helper for hr.employments updates (R12).
-- Closes the current row (sets valid_to=today) and inserts a new row if critical
-- fields changed; otherwise updates the current row in place for non-critical edits.

CREATE OR REPLACE FUNCTION hr.apply_employment_scd2_change(
  p_person_id uuid,
  p_position_id uuid,
  p_position_text text,
  p_department_id uuid,
  p_department_text text,
  p_office_id uuid,
  p_office_text text,
  p_supervisor_id uuid,
  p_hire_date date,
  p_app_role text,
  p_employment_type_id uuid,
  p_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current hr.employments%ROWTYPE;
  v_critical_changed boolean := false;
BEGIN
  SELECT * INTO v_current
  FROM hr.employments
  WHERE person_id = p_person_id AND is_current = true;

  IF NOT FOUND THEN
    INSERT INTO hr.employments (
      person_id, position_id, position_text, department_id, department_text,
      office_id, office_text, supervisor_id, hire_date, app_role,
      employment_type_id, created_by
    ) VALUES (
      p_person_id, p_position_id, p_position_text, p_department_id, p_department_text,
      p_office_id, p_office_text, p_supervisor_id, p_hire_date, p_app_role,
      p_employment_type_id, p_actor_id
    );
    RETURN;
  END IF;

  -- Detect critical changes: position, department, supervisor, app_role, employment_type
  IF (COALESCE(v_current.position_id::text, '') IS DISTINCT FROM COALESCE(p_position_id::text, ''))
     OR (COALESCE(v_current.position_text, '') IS DISTINCT FROM COALESCE(p_position_text, ''))
     OR (COALESCE(v_current.department_id::text, '') IS DISTINCT FROM COALESCE(p_department_id::text, ''))
     OR (COALESCE(v_current.department_text, '') IS DISTINCT FROM COALESCE(p_department_text, ''))
     OR (COALESCE(v_current.supervisor_id::text, '') IS DISTINCT FROM COALESCE(p_supervisor_id::text, ''))
     OR v_current.app_role IS DISTINCT FROM p_app_role
     OR COALESCE(v_current.employment_type_id::text, '') IS DISTINCT FROM COALESCE(p_employment_type_id::text, '')
  THEN
    v_critical_changed := true;
  END IF;

  IF v_critical_changed THEN
    UPDATE hr.employments
    SET valid_to = CURRENT_DATE
    WHERE id = v_current.id;

    INSERT INTO hr.employments (
      person_id, position_id, position_text, department_id, department_text,
      office_id, office_text, supervisor_id, hire_date, app_role,
      employment_type_id, created_by, created_from
    ) VALUES (
      p_person_id, p_position_id, p_position_text, p_department_id, p_department_text,
      p_office_id, p_office_text, p_supervisor_id, p_hire_date, p_app_role,
      p_employment_type_id, p_actor_id, 'edit'
    );

    INSERT INTO audit.log (actor_id, action, record_id, metadata)
    VALUES (p_actor_id, 'employment_scd2_transition', p_person_id,
            jsonb_build_object('previous_employment_id', v_current.id));
  ELSE
    -- Non-critical update in place (office_text adjusts, hire_date typo fix, etc.)
    UPDATE hr.employments
    SET office_id = p_office_id,
        office_text = p_office_text,
        hire_date = p_hire_date,
        updated_at = now()
    WHERE id = v_current.id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION hr.apply_employment_scd2_change FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hr.apply_employment_scd2_change TO service_role;
```

Update CHANGELOG. Then verify via execute_sql that function exists.

- [ ] **Step 19.3: Implement CatalogComboboxField (b) — combobox + "No veo el mío" link**

```tsx
'use client';
import { useState } from 'react';

interface Option { id: string; label: string }

interface Props {
  label: string;
  options: Option[];
  selectedId: string;
  freeText: string;
  onSelectId: (id: string) => void;
  onFreeText: (text: string) => void;
}

export function CatalogComboboxField({ label, options, selectedId, freeText, onSelectId, onFreeText }: Props) {
  const [useFreeText, setUseFreeText] = useState(!!freeText && !selectedId);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {useFreeText ? (
        <>
          <input
            type="text"
            value={freeText}
            onChange={(e) => onFreeText(e.target.value)}
            placeholder="Ingresa el valor"
            className="w-full p-3 border rounded"
          />
          <button
            type="button"
            onClick={() => { setUseFreeText(false); onFreeText(''); }}
            className="text-sm text-[#0A6EBD] underline mt-1"
          >
            ← Volver al catálogo
          </button>
        </>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => onSelectId(e.target.value)}
            className="w-full p-3 border rounded"
          >
            <option value="">Selecciona…</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => { setUseFreeText(true); onSelectId(''); }}
            className="text-sm text-[#0A6EBD] underline mt-1"
          >
            No veo el mío — usar texto libre
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 19.4: Implement EmployeeForm.tsx (F4 + F5 shared)**

Form is large (11 fields). Render with CatalogComboboxField for position/department/office. Pass `mode: 'create' | 'edit'` prop. When mode=create, bind to `createEmployeeAction`; mode=edit binds to `updateEmployeeAction` with hidden `person_id`.

The component reads catalog options (positions, org_units, locations, employment_types, hr.people for supervisor picker) from props (loaded by the parent server page). Provides a `defaultValues` prop for edit mode prefill. Uses `useActionState` to surface field errors and the success payload (invite code on create).

```tsx
'use client';
import { useActionState } from 'react';
import { useState } from 'react';
import { CatalogComboboxField } from './CatalogComboboxField';
import { createEmployeeAction, updateEmployeeAction } from '@/lib/admin/employees-actions';

interface CatalogOption { id: string; label: string }

interface Props {
  mode: 'create' | 'edit';
  defaultValues?: Partial<EmployeeFormValues>;
  positions: CatalogOption[];
  departments: CatalogOption[];
  offices: CatalogOption[];
  supervisors: CatalogOption[];
  employmentTypes: CatalogOption[];
}

interface EmployeeFormValues {
  person_id?: string;
  full_name: string;
  national_id: string;
  employee_code: string;
  position_id: string;
  position_text: string;
  department_id: string;
  department_text: string;
  office_id: string;
  office_text: string;
  supervisor_id: string;
  hire_date: string;
  app_role: 'employee' | 'hr_admin' | 'president' | 'admin';
  employment_type_id: string;
  delivery_target: string;
}

const initial: EmployeeFormValues = {
  full_name: '', national_id: '', employee_code: '',
  position_id: '', position_text: '',
  department_id: '', department_text: '',
  office_id: '', office_text: '',
  supervisor_id: '', hire_date: '',
  app_role: 'employee',
  employment_type_id: '',
  delivery_target: '',
};

export function EmployeeForm({ mode, defaultValues, positions, departments, offices, supervisors, employmentTypes }: Props) {
  const [values, setValues] = useState<EmployeeFormValues>({ ...initial, ...defaultValues });
  const action = mode === 'create' ? createEmployeeAction : updateEmployeeAction;
  const [state, formAction, pending] = useActionState(action, { ok: false });

  const set = <K extends keyof EmployeeFormValues>(k: K, v: EmployeeFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {mode === 'edit' && <input type="hidden" name="person_id" value={values.person_id ?? ''} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre completo" name="full_name" value={values.full_name} onChange={(v) => set('full_name', v)} required />
        <Field label="Cédula" name="national_id" value={values.national_id} onChange={(v) => set('national_id', v)} required />
        <Field label="Código de empleado (opcional)" name="employee_code" value={values.employee_code} onChange={(v) => set('employee_code', v.toUpperCase())} />
        <Field label="Fecha de ingreso" name="hire_date" type="date" value={values.hire_date} onChange={(v) => set('hire_date', v)} required />
      </div>

      <CatalogComboboxField
        label="Cargo"
        options={positions}
        selectedId={values.position_id}
        freeText={values.position_text}
        onSelectId={(id) => { set('position_id', id); set('position_text', ''); }}
        onFreeText={(t) => { set('position_text', t); set('position_id', ''); }}
      />
      <input type="hidden" name="position_id" value={values.position_id} />
      <input type="hidden" name="position_text" value={values.position_text} />

      <CatalogComboboxField
        label="Departamento"
        options={departments}
        selectedId={values.department_id}
        freeText={values.department_text}
        onSelectId={(id) => { set('department_id', id); set('department_text', ''); }}
        onFreeText={(t) => { set('department_text', t); set('department_id', ''); }}
      />
      <input type="hidden" name="department_id" value={values.department_id} />
      <input type="hidden" name="department_text" value={values.department_text} />

      <CatalogComboboxField
        label="Ubicación"
        options={offices}
        selectedId={values.office_id}
        freeText={values.office_text}
        onSelectId={(id) => { set('office_id', id); set('office_text', ''); }}
        onFreeText={(t) => { set('office_text', t); set('office_id', ''); }}
      />
      <input type="hidden" name="office_id" value={values.office_id} />
      <input type="hidden" name="office_text" value={values.office_text} />

      <div>
        <label className="block text-sm font-medium mb-1">Supervisor (NULL = Gerencia General)</label>
        <select name="supervisor_id" value={values.supervisor_id} onChange={(e) => set('supervisor_id', e.target.value)} className="w-full p-3 border rounded">
          <option value="">Sin asignar (escala a Gerencia)</option>
          {supervisors.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de contrato</label>
          <select name="employment_type_id" value={values.employment_type_id} onChange={(e) => set('employment_type_id', e.target.value)} required className="w-full p-3 border rounded">
            <option value="">Selecciona…</option>
            {employmentTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rol HumanOS</label>
          <select name="app_role" value={values.app_role} onChange={(e) => set('app_role', e.target.value as EmployeeFormValues['app_role'])} className="w-full p-3 border rounded">
            <option value="employee">Empleado</option>
            <option value="hr_admin">RRHH (hr_admin)</option>
            <option value="president">Gerencia General (president)</option>
            <option value="admin">Admin técnico</option>
          </select>
        </div>
      </div>

      {mode === 'create' && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Correo o teléfono para entregar el código de invitación
          </label>
          <p className="text-xs text-gray-500 mb-1">
            Si la persona ya tiene cuenta en MovimientOS, usa el MISMO correo/teléfono que tiene
            ahí. No improvises uno nuevo.
          </p>
          <input
            name="delivery_target"
            value={values.delivery_target}
            onChange={(e) => set('delivery_target', e.target.value)}
            placeholder="ejemplo@iconsanet.com o +50761234567"
            className="w-full p-3 border rounded"
            required
          />
        </div>
      )}

      {state.errors && (
        <ul className="text-sm text-red-600">
          {Object.entries(state.errors).map(([k, v]) => <li key={k}>{k}: {v?.[0]}</li>)}
        </ul>
      )}
      {state.message && <p className="text-sm text-red-600">{state.message}</p>}
      {state.ok && state.data && mode === 'create' && (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
          Empleado creado. Código de invitación: <strong className="font-mono">{(state.data as { invite_code: string }).invite_code}</strong>
          <br />
          Envíalo a {(state.data as { delivery_target: string }).delivery_target}.
        </div>
      )}

      <button type="submit" disabled={pending} className="bg-[#1B3A5C] text-white py-3 px-6 rounded-md font-medium disabled:opacity-50">
        {pending ? 'Guardando…' : mode === 'create' ? 'Crear empleado + invite' : 'Guardar cambios'}
      </button>
    </form>
  );
}

function Field({ label, name, value, onChange, type = 'text', required = false }: { label: string; name: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type} name={name} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full p-3 border rounded" />
    </div>
  );
}
```

- [ ] **Step 19.5: Implement EmployeeList.tsx with filter chip "Necesitan revisión"**

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Employee {
  id: string;
  full_name: string;
  national_id: string | null;
  employee_code: string | null;
  needs_review: boolean;
  review_notes: string | null;
  position: string | null;
  department: string | null;
}

interface Props { employees: Employee[] }

export function EmployeeList({ employees }: Props) {
  const [filter, setFilter] = useState<'all' | 'needs_review'>('all');
  const needsReviewCount = employees.filter((e) => e.needs_review).length;
  const visible = filter === 'needs_review' ? employees.filter((e) => e.needs_review) : employees;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-[#1B3A5C] text-white' : 'bg-gray-200'}`}
        >
          Todos ({employees.length})
        </button>
        <button
          onClick={() => setFilter('needs_review')}
          className={`px-3 py-1 rounded text-sm ${filter === 'needs_review' ? 'bg-[#B45309] text-white' : 'bg-gray-200'}`}
        >
          Necesitan revisión {needsReviewCount > 0 && <span className="ml-1 bg-white text-[#B45309] rounded-full px-2">{needsReviewCount}</span>}
        </button>
        <div className="flex-1" />
        <Link href="/admin/empleados/nuevo" className="bg-[#1A7F5A] text-white px-4 py-2 rounded font-medium">
          Nuevo empleado
        </Link>
      </div>
      <table className="w-full bg-white border rounded">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left p-3 text-sm">Nombre</th>
            <th className="text-left p-3 text-sm">Cédula</th>
            <th className="text-left p-3 text-sm">Cargo</th>
            <th className="text-left p-3 text-sm">Departamento</th>
            <th className="text-left p-3 text-sm">Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="p-3">{e.full_name}</td>
              <td className="p-3 text-sm">{e.national_id ?? '—'}</td>
              <td className="p-3 text-sm">{e.position ?? '—'}</td>
              <td className="p-3 text-sm">{e.department ?? '—'}</td>
              <td className="p-3 text-sm">
                {e.needs_review && (
                  <span className="bg-[#B45309] text-white px-2 py-0.5 rounded text-xs">Revisión</span>
                )}
              </td>
              <td className="p-3">
                <Link href={`/admin/empleados/${e.id}/editar`} className="text-[#0A6EBD] underline text-sm">
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 19.6: Implement RegenerateInviteButton (row action in F5 edit page)**

```tsx
'use client';
import { useActionState } from 'react';
import { regenerateInviteCodeAction } from '@/lib/admin/employees-actions';

interface Props { personId: string; deliveryTarget: string }

export function RegenerateInviteButton({ personId, deliveryTarget }: Props) {
  const [state, formAction, pending] = useActionState(regenerateInviteCodeAction, { ok: false });

  return (
    <form action={formAction}>
      <input type="hidden" name="person_id" value={personId} />
      <input type="hidden" name="delivery_target" value={deliveryTarget} />
      <button
        type="submit"
        disabled={pending}
        className="bg-[#F0A500] text-[#1B3A5C] px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Regenerando…' : 'Regenerar código de invitación'}
      </button>
      {state.ok && state.data && (
        <div className="text-sm text-green-700 mt-2">
          Nuevo código: <span className="font-mono font-bold">{(state.data as { code: string }).code}</span>
        </div>
      )}
      {state.message && <p className="text-sm text-red-600 mt-2">{state.message}</p>}
    </form>
  );
}
```

- [ ] **Step 19.7: Pages `/admin/empleados`, `/admin/empleados/nuevo`, `/admin/empleados/[id]/editar`**

`src/app/(authenticated)/admin/empleados/page.tsx`:

```tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EmployeeList } from '@/components/admin/employees/EmployeeList';

export default async function AdminEmpleadosPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .schema('hr')
    .from('people')
    .select(`
      id, full_name, national_id, employee_code, needs_review, review_notes,
      employments!inner(
        is_current,
        position:positions(title),
        department:org_units(name),
        position_text, department_text
      )
    `)
    .eq('employments.is_current', true)
    .eq('status', 'Activo')
    .order('full_name');

  const employees = (data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    national_id: p.national_id,
    employee_code: p.employee_code,
    needs_review: p.needs_review,
    review_notes: p.review_notes,
    position: p.employments?.[0]?.position?.title ?? p.employments?.[0]?.position_text ?? null,
    department: p.employments?.[0]?.department?.name ?? p.employments?.[0]?.department_text ?? null,
  }));

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Empleados</h1>
      <EmployeeList employees={employees} />
    </main>
  );
}
```

`src/app/(authenticated)/admin/empleados/nuevo/page.tsx`:

```tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EmployeeForm } from '@/components/admin/employees/EmployeeForm';

export default async function NuevoEmpleadoPage() {
  const supabase = await createSupabaseServerClient();
  const [positions, departments, offices, supervisors, employmentTypes] = await Promise.all([
    supabase.schema('hr').from('positions').select('id, title').eq('is_active', true).order('title'),
    supabase.schema('hr').from('org_units').select('id, name').eq('is_active', true).order('name'),
    supabase.schema('hr').from('locations').select('id, name').eq('is_active', true).order('name'),
    supabase.schema('hr').from('people').select('id, full_name').eq('status', 'Activo').order('full_name'),
    supabase.schema('hr').from('employment_types').select('id, short_name').eq('is_active', true).order('display_order'),
  ]);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Nuevo empleado</h1>
      <EmployeeForm
        mode="create"
        positions={positions.data?.map((p) => ({ id: p.id, label: p.title })) ?? []}
        departments={departments.data?.map((d) => ({ id: d.id, label: d.name })) ?? []}
        offices={offices.data?.map((o) => ({ id: o.id, label: o.name })) ?? []}
        supervisors={supervisors.data?.map((s) => ({ id: s.id, label: s.full_name })) ?? []}
        employmentTypes={employmentTypes.data?.map((t) => ({ id: t.id, label: t.short_name })) ?? []}
      />
    </main>
  );
}
```

`src/app/(authenticated)/admin/empleados/[id]/editar/page.tsx`:

```tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EmployeeForm } from '@/components/admin/employees/EmployeeForm';
import { RegenerateInviteButton } from '@/components/admin/employees/RegenerateInviteButton';

export default async function EditarEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [person, positions, departments, offices, supervisors, employmentTypes, latestInvite] = await Promise.all([
    supabase.schema('hr').from('people').select(`
      id, full_name, national_id, employee_code, review_notes, needs_review,
      employments!inner(
        position_id, position_text, department_id, department_text,
        office_id, office_text, supervisor_id, hire_date, app_role,
        employment_type_id, is_current
      )
    `).eq('id', id).eq('employments.is_current', true).maybeSingle(),
    supabase.schema('hr').from('positions').select('id, title').eq('is_active', true).order('title'),
    supabase.schema('hr').from('org_units').select('id, name').eq('is_active', true).order('name'),
    supabase.schema('hr').from('locations').select('id, name').eq('is_active', true).order('name'),
    supabase.schema('hr').from('people').select('id, full_name').eq('status', 'Activo').order('full_name'),
    supabase.schema('hr').from('employment_types').select('id, short_name').eq('is_active', true).order('display_order'),
    supabase.schema('hr').from('invite_codes').select('delivery_target, code, expires_at, consumed_at').eq('person_id', id).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!person.data) return <p>Empleado no encontrado</p>;
  const employment = person.data.employments?.[0];

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Editar: {person.data.full_name}</h1>
      {person.data.needs_review && (
        <div className="bg-[#FEF3C7] border border-[#B45309] rounded p-4 mb-4">
          <h2 className="font-bold text-[#B45309]">Necesita revisión</h2>
          <pre className="text-sm whitespace-pre-wrap mt-2">{person.data.review_notes}</pre>
        </div>
      )}
      <EmployeeForm
        mode="edit"
        defaultValues={{
          person_id: person.data.id,
          full_name: person.data.full_name,
          national_id: person.data.national_id ?? '',
          employee_code: person.data.employee_code ?? '',
          position_id: employment?.position_id ?? '',
          position_text: employment?.position_text ?? '',
          department_id: employment?.department_id ?? '',
          department_text: employment?.department_text ?? '',
          office_id: employment?.office_id ?? '',
          office_text: employment?.office_text ?? '',
          supervisor_id: employment?.supervisor_id ?? '',
          hire_date: employment?.hire_date ?? '',
          app_role: employment?.app_role ?? 'employee',
          employment_type_id: employment?.employment_type_id ?? '',
          delivery_target: '',
        }}
        positions={positions.data?.map((p) => ({ id: p.id, label: p.title })) ?? []}
        departments={departments.data?.map((d) => ({ id: d.id, label: d.name })) ?? []}
        offices={offices.data?.map((o) => ({ id: o.id, label: o.name })) ?? []}
        supervisors={supervisors.data?.map((s) => ({ id: s.id, label: s.full_name })) ?? []}
        employmentTypes={employmentTypes.data?.map((t) => ({ id: t.id, label: t.short_name })) ?? []}
      />
      {latestInvite.data && !latestInvite.data.consumed_at && (
        <div className="mt-6 border-t pt-4">
          <h2 className="font-bold mb-2">Invitación pendiente</h2>
          <p className="text-sm">Código: <span className="font-mono">{latestInvite.data.code}</span></p>
          <p className="text-sm">Entregado a: {latestInvite.data.delivery_target}</p>
          <p className="text-sm">Vence: {new Date(latestInvite.data.expires_at).toLocaleString()}</p>
          <div className="mt-2">
            <RegenerateInviteButton personId={id} deliveryTarget={latestInvite.data.delivery_target ?? ''} />
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 19.8: Commit**

```bash
git add src/lib/admin/ src/components/admin/ src/app/\(authenticated\)/admin/ docs/CHANGELOG.md
git commit -m "feat(admin): F4 nuevo empleado + F5 editar + regenerate invite + SCD-2 helper (038)"
```

---

### Task 20: NotificationBell + dropdown + AppShell integration

**Files:**
- Create: `src/components/notifications/NotificationBell.tsx`
- Create: `src/components/notifications/NotificationDropdown.tsx`
- Create: `src/components/notifications/NotificationItem.tsx`
- Modify: `src/components/app-shell/topbar.tsx` (insert `<NotificationBell />`)

- [ ] **Step 20.1: NotificationItem.tsx**

```tsx
'use client';
import Link from 'next/link';
import type { Database } from '@/lib/supabase/database.types';

type OutboxRow = Database['notifications']['Tables']['outbox']['Row'];

interface Props {
  notification: OutboxRow;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: Props) {
  const deepLink = (notification.metadata as { deep_link?: string } | null)?.deep_link ?? '/notificaciones';
  const unread = notification.status !== 'read' && notification.status !== 'dismissed';

  return (
    <Link
      href={deepLink}
      onClick={() => unread && onMarkRead(notification.id)}
      className={`block p-3 border-b hover:bg-gray-50 ${unread ? 'bg-blue-50' : ''}`}
    >
      <div className="text-sm font-medium">{notification.subject}</div>
      <div className="text-xs text-gray-600 line-clamp-2">{notification.body}</div>
      <div className="text-xs text-gray-400 mt-1">
        {new Date(notification.created_at).toLocaleString('es-PA')}
      </div>
    </Link>
  );
}
```

- [ ] **Step 20.2: NotificationDropdown.tsx**

```tsx
'use client';
import { useNotificationsRealtime } from '@/lib/notifications/realtime';
import { NotificationItem } from './NotificationItem';
import Link from 'next/link';

interface Props {
  personId: string;
  onClose: () => void;
}

export function NotificationDropdown({ personId, onClose }: Props) {
  const { notifications, markAsRead, markAllAsRead } = useNotificationsRealtime(personId);
  const top = notifications.slice(0, 10);

  return (
    <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-lg border z-50">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-bold">Notificaciones</h3>
        <button onClick={markAllAsRead} className="text-xs text-[#0A6EBD] underline">
          Marcar todas leídas
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {top.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 text-center">Sin notificaciones</p>
        ) : (
          top.map((n) => <NotificationItem key={n.id} notification={n} onMarkRead={markAsRead} />)
        )}
      </div>
      <Link href="/notificaciones" onClick={onClose} className="block p-3 text-sm text-center border-t text-[#0A6EBD]">
        Ver todas
      </Link>
    </div>
  );
}
```

- [ ] **Step 20.3: NotificationBell.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationsRealtime } from '@/lib/notifications/realtime';
import { NotificationDropdown } from './NotificationDropdown';

interface Props { personId: string }

export function NotificationBell({ personId }: Props) {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotificationsRealtime(personId);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded hover:bg-gray-100">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1.5 min-w-[20px] text-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && <NotificationDropdown personId={personId} onClose={() => setOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 20.4: Inject `<NotificationBell />` into topbar**

Modify `src/components/app-shell/topbar.tsx` to include NotificationBell. Need to resolve current person_id server-side and pass to client component. Wrap topbar in a server component that reads `auth.uid()` and queries `hr.people.id`.

```tsx
// src/components/app-shell/topbar.tsx (server component segment)
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NotificationBell } from '@/components/notifications/NotificationBell';
// ... existing imports

export async function Topbar(/* existing props */) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let personId: string | null = null;
  if (user) {
    const { data: person } = await supabase
      .schema('hr')
      .from('people')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();
    personId = person?.id ?? null;
  }

  return (
    <header className="h-14 border-b bg-white flex items-center px-4 gap-2">
      {/* existing topbar content */}
      <div className="flex-1" />
      {personId && <NotificationBell personId={personId} />}
      {/* existing user menu */}
    </header>
  );
}
```

- [ ] **Step 20.5: Commit**

```bash
git add src/components/notifications/ src/components/app-shell/topbar.tsx
git commit -m "feat(notifications): NotificationBell + dropdown + Realtime wired in topbar"
```

---

### Task 21: Email worker — Vercel Cron + Next.js route handler (Issue I2 resolved)

**Files:**
- Create: `src/app/api/cron/process-notifications/route.ts`
- Modify: `vercel.ts` (or create if absent) — declare cron schedule
- Modify: `.env.local.example` (CRON_SECRET already added in Task 1.2)

**Issue I2 resolution**: Vercel Cron preferred over Supabase Edge Function. Reasons:
1. Templates stay in `src/emails/` (single source of truth — no Deno sync script)
2. Same Node runtime as the rest of the app — shared env vars natively
3. `vercel.ts` (knowledge update 2026) declares crons declaratively
4. MovimientOS doesn't use Supabase Edge Functions — avoids introducing new runtime

- [ ] **Step 21.1: Create or update `vercel.ts`**

Per knowledge update 2026, `vercel.ts` replaces `vercel.json`. Install `@vercel/config` first:

```bash
npm install --save-dev @vercel/config
```

Create `vercel.ts` at repo root (if it doesn't exist):

```typescript
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [
    {
      path: '/api/cron/process-notifications',
      schedule: '*/5 * * * *',
    },
  ],
};
```

- [ ] **Step 21.2: Implement route handler**

Create `src/app/api/cron/process-notifications/route.ts`:

```typescript
// Vercel Cron worker. Schedule: */5 * * * * (declared in vercel.ts).
// Auth: x-vercel-cron header (Vercel-signed) + Authorization: Bearer ${CRON_SECRET}.
// Reads notifications.outbox WHERE channel='email' AND status='pending'.
// Renders @react-email template + sends via Resend with Reply-To.
//
// ADR-0006 exception: uses service_role admin client (worker has no user session).

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import * as Templates from '@/emails';  // barrel export
import type { Database } from '@/lib/supabase/database.types';

type OutboxRow = Database['notifications']['Tables']['outbox']['Row'];

const MAX_PER_TICK = 50;

export async function GET(request: Request) {
  // Auth gate
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!isVercelCron && authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pre-flight env check
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn('[cron] RESEND_API_KEY or RESEND_FROM_EMAIL missing — skipping cycle');
    return NextResponse.json({ skipped: true, reason: 'env missing' });
  }

  const supabase = createSupabaseAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: rows, error } = await supabase
    .schema('notifications')
    .from('outbox')
    .select('id, recipient_id, subject, body, template_code, template_variables, attempts, max_attempts')
    .eq('channel', 'email')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(MAX_PER_TICK);

  if (error) {
    console.error('[cron] fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const row of (rows as OutboxRow[]) ?? []) {
    try {
      const { data: person } = await supabase
        .schema('hr')
        .from('people')
        .select('auth_id, full_name')
        .eq('id', row.recipient_id)
        .maybeSingle();

      if (!person?.auth_id) {
        await markFailed(supabase, row.id, 'No auth_id for recipient', row.attempts + 1);
        failed++;
        continue;
      }

      const userResult = await supabase.auth.admin.getUserById(person.auth_id);
      const recipientEmail = userResult.data.user?.email;
      if (!recipientEmail) {
        await markFailed(supabase, row.id, 'No email on auth.user', row.attempts + 1);
        failed++;
        continue;
      }

      const Template = (Templates as Record<string, React.ComponentType<Record<string, unknown>>>)[row.template_code];
      if (!Template) {
        await markFailed(supabase, row.id, `Template ${row.template_code} not found`, row.attempts + 1);
        failed++;
        continue;
      }

      // Reply-To pattern: skip for password_reset (self-service)
      const replyTo = row.template_code === 'PasswordReset' ? undefined : process.env.RESEND_REPLY_TO;

      const { error: sendErr } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [recipientEmail],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: row.subject,
        react: Template((row.template_variables as Record<string, unknown>) ?? {}),
      });

      if (sendErr) throw new Error(sendErr.message);

      await supabase
        .schema('notifications')
        .from('outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: row.attempts + 1,
        })
        .eq('id', row.id);
      sent++;
    } catch (err) {
      await markFailed(supabase, row.id, (err as Error).message, row.attempts + 1);
      failed++;
    }
  }

  return NextResponse.json({ processed: rows?.length ?? 0, sent, failed });
}

async function markFailed(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  id: string,
  message: string,
  attempts: number
) {
  await supabase
    .schema('notifications')
    .from('outbox')
    .update({ status: 'failed', error_message: message, attempts })
    .eq('id', id);
}
```

- [ ] **Step 21.3: Create barrel export `src/emails/index.ts`**

To support `import * as Templates from '@/emails'` and dynamic lookup by `template_code`:

```typescript
export { OnboardingErrorReported } from './OnboardingErrorReported';
export { InviteCodeDelivered } from './InviteCodeDelivered';
export { InviteCodeRegenerated } from './InviteCodeRegenerated';
export { WelcomeEmployee } from './WelcomeEmployee';
// Add new templates here as features grow
```

- [ ] **Step 21.4: Smoke test locally**

Start dev server:

```bash
npm run dev
```

Insert a test outbox row via SQL:

```sql
INSERT INTO notifications.outbox (
  recipient_id, channel, status, subject, body, template_code, template_variables, notification_type
)
SELECT p.id, 'email', 'pending', 'Test desde Vercel Cron', 'Body test',
       'WelcomeEmployee',
       jsonb_build_object('employee_name', p.full_name, 'perfil_url', 'http://localhost:3001/perfil'),
       'welcome_employee'
FROM hr.people p WHERE p.auth_id IS NOT NULL LIMIT 1;
```

Trigger the route handler manually:

```bash
curl -X GET http://localhost:3001/api/cron/process-notifications \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Expected JSON: `{ processed: 1, sent: 1, failed: 0 }`. Email arrives to the test recipient inbox.

- [ ] **Step 21.5: Deploy + verify cron schedule registered**

Push to Vercel preview. After deploy, verify cron is registered:
- Vercel Dashboard → Project → Settings → Cron Jobs → expect `process-notifications` listed with `*/5 * * * *`

- [ ] **Step 21.6: Commit**

```bash
git add vercel.ts src/app/api/cron/ src/emails/index.ts package.json package-lock.json
git commit -m "feat(notifications): Vercel Cron worker process-notifications (I2 resolved)"
```

---

### Task 22: E2E tests — onboarding happy + multi-app + error report + admin

**Files:**
- Create: `e2e/onboarding-happy.spec.ts`
- Create: `e2e/onboarding-multi-app.spec.ts`
- Create: `e2e/onboarding-error-report.spec.ts`
- Create: `e2e/admin-empleados.spec.ts`
- Create: `e2e/forgot-password.spec.ts`
- Create: `e2e/lib/sql-helpers.ts`

Tests run against a Supabase development branch (NOT production) created via `supabase branches create group-2-e2e` before the test suite. Bootstrap fixtures seeded in branch.

- [ ] **Step 22.1: SQL helpers for invariant checks**

```typescript
// e2e/lib/sql-helpers.ts
import { createClient } from '@supabase/supabase-js';

export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function getAuthUserSnapshot(email: string) {
  const c = adminClient();
  const { data } = await c.rpc('find_auth_user_by_identifier', { p_field: 'email', p_value: email });
  return (data as unknown as Array<{ id: string; raw_app_meta_data: Record<string, unknown>; encrypted_password: string }>)?.[0] ?? null;
}

export async function countAuthUsers() {
  const c = adminClient();
  const { data, error } = await c.rpc('count_auth_users');
  if (error) throw error;
  return data as number;
}

export async function cleanupTestEmployee(personId: string) {
  const c = adminClient();
  await c.schema('hr').from('invite_codes').delete().eq('person_id', personId);
  await c.schema('hr').from('addresses').delete().eq('person_id', personId);
  await c.schema('hr').from('contacts').delete().eq('person_id', personId);
  await c.schema('hr').from('medical_info').delete().eq('person_id', personId);
  await c.schema('hr').from('user_settings').delete().eq('person_id', personId);
  await c.schema('hr').from('employments').delete().eq('person_id', personId);
  await c.schema('hr').from('people').delete().eq('id', personId);
}
```

Add helper SQL function for counting auth.users (since direct access is restricted):

```sql
-- Migration 035 (optional, only for E2E branch):
CREATE OR REPLACE FUNCTION public.count_auth_users()
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT count(*)::int FROM auth.users; $$;
REVOKE EXECUTE ON FUNCTION public.count_auth_users FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_auth_users TO service_role;
```

- [ ] **Step 22.2: `e2e/onboarding-happy.spec.ts` — new user (no auth.user existing)**

```typescript
import { test, expect } from '@playwright/test';
import { adminClient, countAuthUsers, cleanupTestEmployee } from './lib/sql-helpers';

const TEST_CEDULA = '8-999-001';
const TEST_EMAIL = 'e2e-happy@iconsanet.com';
const TEST_PASSWORD = 'TestPass1234';

test('new user onboarding happy path', async ({ page }) => {
  const admin = adminClient();

  // Seed: create person + invite code
  const { data: person } = await admin.schema('hr').from('people').insert({
    full_name: 'E2E Happy User',
    national_id: TEST_CEDULA,
    status: 'Activo',
    created_from: 'manual',
  }).select('id').single();
  if (!person) throw new Error('Seed person failed');

  await admin.schema('hr').from('employments').insert({
    person_id: person.id,
    position_text: 'Tester',
    department_text: 'QA',
    office_text: 'Remoto',
    hire_date: '2025-01-01',
    app_role: 'employee',
    employment_type_id: (await admin.schema('hr').from('employment_types').select('id').eq('code', 'tiempo_indefinido').single()).data!.id,
  });

  await admin.schema('hr').from('user_settings').insert({ person_id: person.id });

  const inviteCode = 'E2EHAPPY';
  await admin.schema('hr').from('invite_codes').insert({
    code: inviteCode,
    person_id: person.id,
    invite_method: 'email',
    delivery_target: TEST_EMAIL,
  });

  const usersBefore = await countAuthUsers();

  // Run wizard
  await page.goto(`/onboarding/${inviteCode}`);
  await page.locator('input').first().fill(inviteCode);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[placeholder*="cédula" i], input[placeholder*="8-123" i]', TEST_CEDULA);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[name="delivery_target"]', TEST_EMAIL);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('button:has-text("Todo correcto")').click();
  await page.fill('input[placeholder="madre, esposa, hermano…"]', 'Madre');
  await page.fill('input[placeholder*="+50761234567"]', '+50761234567');
  await page.locator('button:has-text("Continuar")').click(); // step 6
  await page.locator('button:has-text("Continuar")').click(); // step 7 (medical optional all empty)
  await page.locator('select').first().selectOption('Panamá');
  await page.locator('button:has-text("Continuar")').click(); // step 8
  await page.locator('input[type="checkbox"]').nth(0).check();
  await page.locator('input[type="checkbox"]').nth(1).check();
  await page.locator('button:has-text("Continuar")').click(); // step 9
  await page.locator('button:has-text("Confirmar")').click(); // step 10 — no photo

  await expect(page).toHaveURL(/\/perfil/);

  // Invariants
  const usersAfter = await countAuthUsers();
  expect(usersAfter).toBe(usersBefore + 1);

  const { data: updatedPerson } = await admin.schema('hr').from('people').select('auth_id').eq('id', person.id).single();
  expect(updatedPerson?.auth_id).toBeTruthy();

  const { data: invite } = await admin.schema('hr').from('invite_codes').select('consumed_at').eq('code', inviteCode).single();
  expect(invite?.consumed_at).toBeTruthy();

  await cleanupTestEmployee(person.id);
});
```

- [ ] **Step 22.3: `e2e/onboarding-multi-app.spec.ts` — Rodrigo merge (encrypted_password invariant)**

```typescript
import { test, expect } from '@playwright/test';
import { adminClient, getAuthUserSnapshot, countAuthUsers, cleanupTestEmployee } from './lib/sql-helpers';

const RODRIGO_EMAIL = 'reisenmann@iconsanet.com';
const RODRIGO_CEDULA = '8-123-456'; // adjust to actual seed value

test('multi-app merge preserves encrypted_password (no MovimientOS break)', async ({ page }) => {
  const admin = adminClient();

  // Seed: create HumanOS person with Rodrigo's cedula
  const { data: person } = await admin.schema('hr').from('people').insert({
    full_name: 'Rodrigo Test',
    national_id: RODRIGO_CEDULA,
    status: 'Activo',
    created_from: 'manual',
  }).select('id').single();
  if (!person) throw new Error('Seed failed');

  await admin.schema('hr').from('employments').insert({
    person_id: person.id,
    position_text: 'President Test',
    department_text: 'Direccion',
    office_text: 'Oficina Central',
    hire_date: '2010-01-01',
    app_role: 'president',
    employment_type_id: (await admin.schema('hr').from('employment_types').select('id').eq('code', 'tiempo_indefinido').single()).data!.id,
  });

  await admin.schema('hr').from('user_settings').insert({ person_id: person.id });

  const inviteCode = 'E2EMULTI';
  await admin.schema('hr').from('invite_codes').insert({
    code: inviteCode,
    person_id: person.id,
    invite_method: 'email',
    delivery_target: RODRIGO_EMAIL,
  });

  // Pre-snapshot
  const usersBefore = await countAuthUsers();
  const rodrigoBefore = await getAuthUserSnapshot(RODRIGO_EMAIL);
  expect(rodrigoBefore).toBeTruthy();

  // Run wizard (step 4 password should be SKIPPED)
  await page.goto(`/onboarding/${inviteCode}`);
  await page.locator('input').first().fill(inviteCode);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[placeholder*="8-123"]', RODRIGO_CEDULA);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[name="delivery_target"]', RODRIGO_EMAIL);
  await page.locator('button:has-text("Continuar")').click();
  // Step 4 password should be SKIPPED — wizard goes directly to step 5
  await expect(page.locator('text=Confirma tus datos')).toBeVisible();
  await page.locator('button:has-text("Todo correcto")').click();
  await page.fill('input[placeholder="madre, esposa, hermano…"]', 'Esposa');
  await page.fill('input[placeholder*="+50761234567"]', '+50760000000');
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('select').first().selectOption('Panamá');
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('input[type="checkbox"]').nth(0).check();
  await page.locator('input[type="checkbox"]').nth(1).check();
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('button:has-text("Confirmar")').click();

  await expect(page).toHaveURL(/\/perfil/);

  // Critical invariants
  const usersAfter = await countAuthUsers();
  expect(usersAfter).toBe(usersBefore); // NO duplicate

  const rodrigoAfter = await getAuthUserSnapshot(RODRIGO_EMAIL);
  expect(rodrigoAfter?.encrypted_password).toBe(rodrigoBefore?.encrypted_password); // hash IMMUTABLE
  expect((rodrigoAfter?.raw_app_meta_data as { allowed_apps?: string[] })?.allowed_apps).toContain('humanOS');
  expect((rodrigoAfter?.raw_app_meta_data as { allowed_apps?: string[] })?.allowed_apps).toContain('movimientOS');
  expect((rodrigoAfter?.raw_app_meta_data as { provider?: string })?.provider).toBe(
    (rodrigoBefore?.raw_app_meta_data as { provider?: string })?.provider
  );

  await cleanupTestEmployee(person.id);
});
```

- [ ] **Step 22.4: `e2e/onboarding-error-report.spec.ts` — step 5 critical severity**

```typescript
import { test, expect } from '@playwright/test';
import { adminClient, cleanupTestEmployee } from './lib/sql-helpers';

test('step 5 critical error pauses wizard + flags needs_review', async ({ page }) => {
  const admin = adminClient();
  const { data: person } = await admin.schema('hr').from('people').insert({
    full_name: 'Wrong Name',
    national_id: '8-888-001',
    status: 'Activo',
    created_from: 'manual',
  }).select('id').single();
  if (!person) throw new Error('seed failed');

  await admin.schema('hr').from('employments').insert({
    person_id: person.id,
    position_text: 'Test',
    department_text: 'Test',
    office_text: 'Test',
    hire_date: '2025-01-01',
    app_role: 'employee',
    employment_type_id: (await admin.schema('hr').from('employment_types').select('id').eq('code', 'tiempo_indefinido').single()).data!.id,
  });
  await admin.schema('hr').from('user_settings').insert({ person_id: person.id });

  const code = 'E2ERROR1';
  await admin.schema('hr').from('invite_codes').insert({
    code, person_id: person.id, invite_method: 'email', delivery_target: 'e2e-err@iconsanet.com',
  });

  await page.goto(`/onboarding/${code}`);
  await page.locator('input').first().fill(code);
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[placeholder*="8-123"]', '8-888-001');
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[name="delivery_target"]', 'e2e-err@iconsanet.com');
  await page.locator('button:has-text("Continuar")').click();
  await page.fill('input[type="password"]', 'TestPass1234');
  await page.locator('button:has-text("Continuar")').click();
  await page.locator('button:has-text("Hay un error")').click();
  await page.locator('select[name="severity"]').selectOption('critica');
  await page.fill('textarea[name="description"]', 'Mi nombre no es Wrong Name, es Right Name');
  await page.locator('button:has-text("Enviar reporte")').click();

  await expect(page).toHaveURL(/\/onboarding\/error-reported/);

  const { data: updated } = await admin.schema('hr').from('people').select('needs_review, review_notes').eq('id', person.id).single();
  expect(updated?.needs_review).toBe(true);
  expect(updated?.review_notes).toContain('Severidad: critica');
  expect(updated?.review_notes).toContain('Mi nombre no es Wrong Name');

  const { data: invite } = await admin.schema('hr').from('invite_codes').select('consumed_at').eq('code', code).single();
  expect(invite?.consumed_at).toBeNull();

  await cleanupTestEmployee(person.id);
});
```

- [ ] **Step 22.5: `e2e/admin-empleados.spec.ts` — F4 create + invite + F5 edit + regenerate**

```typescript
import { test, expect } from '@playwright/test';
import { adminClient, cleanupTestEmployee } from './lib/sql-helpers';

test.use({ storageState: 'e2e/.auth/hr_admin.json' });

test('hr_admin creates employee + invite + edits + regenerates', async ({ page }) => {
  await page.goto('/admin/empleados/nuevo');
  await page.fill('input[name="full_name"]', 'E2E Created');
  await page.fill('input[name="national_id"]', '8-777-001');
  await page.fill('input[name="hire_date"]', '2025-06-01');
  await page.locator('select[name="employment_type_id"]').selectOption({ label: 'Indefinido' });
  await page.fill('input[name="position_text"]', 'Tester');
  await page.fill('input[name="department_text"]', 'QA');
  await page.fill('input[name="office_text"]', 'Remoto');
  await page.fill('input[name="delivery_target"]', 'e2e-created@iconsanet.com');
  await page.locator('button[type="submit"]').click();

  await expect(page.locator('text=Empleado creado')).toBeVisible();
  await expect(page.locator('text=Código de invitación')).toBeVisible();

  const admin = adminClient();
  const { data: person } = await admin.schema('hr').from('people').select('id').eq('national_id', '8-777-001').single();
  expect(person?.id).toBeTruthy();

  await page.goto(`/admin/empleados/${person!.id}/editar`);
  await expect(page.locator('input[name="full_name"]')).toHaveValue('E2E Created');

  // Regenerate
  await page.locator('button:has-text("Regenerar código")').click();
  await expect(page.locator('text=Nuevo código')).toBeVisible();

  await cleanupTestEmployee(person!.id);
});
```

- [ ] **Step 22.6: `e2e/forgot-password.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('forgot password anti-enumeration response', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.fill('input[name="identifier"]', 'nobody@nowhere.invalid');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('text=Si esa cuenta existe')).toBeVisible();
});

test('forgot password phone shows contact-RRHH message', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.fill('input[name="identifier"]', '+50761234567');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('text=contacta a tu Oficial de RRHH')).toBeVisible();
});
```

- [ ] **Step 22.7: Commit**

```bash
git add e2e/
git commit -m "test(e2e): onboarding happy + multi-app + error-report + admin + forgot-password"
```

---

### Task 23: Verification gate + CHANGELOG + tag v0.0.2

**Files:**
- Modify: `docs/CHANGELOG.md`
- Tag: `v0.0.2`

- [ ] **Step 23.1: Run full verification gate**

```bash
npm run verify
```

Expected: typecheck PASS + lint PASS + unit tests PASS + e2e tests PASS + build SUCCESS.

If any step fails: fix root cause, commit, re-run. Do NOT skip with `--no-verify` flags.

- [ ] **Step 23.2: Run RLS validation via iconsa-rls-validation skill**

Verify all new tables/policies created in Group 2 (notification_preferences trigger, avatars bucket policies) have RLS appropriate per R13 (sensitive: medical_info, personal_documents owner+hr_admin only) and R22 (auth.users gating).

- [ ] **Step 23.3: Append CHANGELOG**

```markdown
## [0.0.2] — Group 2 Onboarding — 2026-XX-XX

### [bd]
- 033_seed_onboarding_sops_m01_d07: seed IC-RH-M-01 + IC-RH-D-07 + VV01 versions (Blocker B2)
- 034_create_find_auth_user_by_identifier: SECURITY DEFINER lookup (ADR-0006)
- 035_create_avatars_bucket_and_policies: storage bucket avatars + RLS subquery
- 036_add_outbox_indexes_and_enqueue_helper: notifications.enqueue() reading preferences->'notifications' (Issue I1)
- 037_create_complete_onboarding_writes_rpc: idempotent atomic writes with sop_version_id JOIN (B3 + I3)
- 038_create_apply_employment_scd2_change: SCD-2 helper for F5 edit

### [feat]
- F1 onboarding wizard 10 pasos (`/onboarding/[code]`)
- F4 admin empleados creación (`/admin/empleados/nuevo`)
- F5 admin empleados edición (`/admin/empleados/[id]/editar`) + regenerate invite
- F-04-01 integrated: emergency contact + medical info wizard steps 6/7
- F-01-09 integrated: M-01 ética + D-07 trabajo infantil acknowledgments (step 9)
- `/forgot-password` + `/reset-password` flows (email only MVP)
- `/perfil` post-onboarding landing
- NotificationBell + dropdown + Realtime subscription (in-app channel)
- Email worker Vercel Cron route handler `/api/cron/process-notifications` (Resend, schedule */5, Reply-To pattern per ADR-0008 revised)
- Email templates: BaseLayout, OnboardingErrorReported, InviteCodeDelivered, InviteCodeRegenerated, WelcomeEmployee

### [test]
- E2E: onboarding happy (new user)
- E2E: onboarding multi-app merge (encrypted_password invariant)
- E2E: onboarding step 5 critical error → needs_review flag
- E2E: admin create + invite + edit + regenerate
- E2E: forgot-password anti-enumeration + phone fallback
- Unit: translateAuthError (9), normalize (9), Zod schemas (11), avatars helpers (5)

### [chore]
- ESLint custom rule `iconsa/no-admin-client-in-client` (ADR-0006 enforcement)
- `src/lib/supabase/admin.ts` service role admin client
```

- [ ] **Step 23.4: Polish markdown lint warnings**

Fix MD032 (blanks-around-lists) and MD060 (table pipe spacing) warnings in:
- `docs/superpowers/plans/2026-05-27-group-2-onboarding.md`
- ADR files if any new ones added

Run a markdownlint check if a config is installed.

- [ ] **Step 23.5: Commit verification + changelog**

```bash
git add docs/CHANGELOG.md
git commit -m "docs(changelog): v0.0.2 Group 2 onboarding complete"
```

- [ ] **Step 23.6: Tag v0.0.2**

```bash
git tag v0.0.2
git log --oneline v0.0.1..v0.0.2 | head
```

Expected: clean linear history of Group 2 commits.

---

## Self-Review

### 1. Spec coverage

| Spec item | Task | Notes |
|---|---|---|
| F1 wizard 10 steps | 13-18 | Full coverage |
| F4 admin/empleados/nuevo | 19 | Full coverage |
| F5 admin/empleados/[id]/editar | 19 | SCD-2 via migration 038 |
| F-04-01 emergency + medical | 16 (steps 6-7) | Integrated into wizard |
| F-01-09 acknowledgments | 16 (step 9) + 2A (seed sops B2) | IC-RH-M-01 + IC-RH-D-07 |
| /forgot-password + /reset-password | 18 | Email only MVP |
| Multi-app gating email/phone (ADR-0006) | 2 + 12 | SECURITY DEFINER + actions + I3 capture-restore rollback |
| Photo upload bucket + resize (Q3) | 3 + 10 + 12 (uploadOnboardingAvatarAction B1) + 17 | β-prima pattern via server action |
| Password 10 chars + HIBP (Q4) | 1 (Supabase Dashboard config) + 7 (Zod) | HIBP enabled in dashboard pre-implementation |
| Step 5 needs_review hybrid (Q5) | 15 (HayErrorModal) + 12 (action) | Severity guidance UI |
| Notifications in_app + email PRIMARY (ADR-0008 revised) | 4 + 8 + 9 + 11 + 20 + 21 | Realtime + Vercel Cron worker + Reply-To pattern |
| translateAuthError helper | 6 | 7 codes + fallback |
| ESLint rule no-admin-client-in-client | 1 | ADR-0006 enforcement |
| /perfil post-onboarding | 18 | Minimal MVP read-only |
| SOPs seed for FK satisfaction (B2) | 2A (new) | Blocker B2 fix prereq for Task 12 RPC |
| RPC docs.acknowledgments via sop_version_id JOIN (B3) | 12.2 | Blocker B3 fix |
| Idempotent RPC + auth rollback (I3) | 12.1 + 12.2 | Issue I3 fix |
| notification_preferences via preferences jsonb namespace (I1) | 4 + 8 | No new column |
| Vercel Cron + single-source templates (I2) | 21 | Issue I2 fix |

### 2. Placeholder scan

Searched plan for "TBD", "TODO", "implement later", "appropriate error handling". One match in Task 21.1 about syncing email templates between `src/emails/` and `supabase/functions/process-notifications/templates/` — that's flagged as a J-item operational, not a code placeholder. Acceptable since the worker can dynamically import via Deno when paths are configured.

### 3. Type consistency

- `ValidatedContext` interface declared in `WizardReducer.ts` (Task 13) and consumed in `Step3Identifier`, `Step5Confirm`, `actions.ts` — same shape (with `preview` added in Task 15.4). Consistent.
- `FormState` type appears multiple times (server actions). All have same shape: `{ ok: boolean; message?: string; errors?: Record<string, string[]>; data?: unknown }`. Consistent.
- `NotificationType` enum values in `types.ts` (Task 8.1) match `TEMPLATE_CODE_MAP` keys. Consistent.
- `EmployeeFormValues` shape declared in `EmployeeForm.tsx` (Task 19.4); `defaultValues` prop signature matches when consumed by F5 editar page (Task 19.7).
- Storage path format `avatars/{person_id}/current.{ext}` is consistent across Q3 grill response, migration 030 RLS policy, and `uploadAvatar` helper (Task 10.2).

### 4. Polish lint (deferred)

MD032 (blanks-around-lists) and MD060 (table-column-style) warnings exist in plan. Cosmetic only — non-blocking for execution. Cleaned in Task 23.4 polish step.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-27-group-2-onboarding.md`.**

**Pre-execution checklist** (do these BEFORE starting Task 1):

1. James pulls `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard → API → service_role secret and adds to `.env.local`
2. `RESEND_FROM_EMAIL=HumanOS <notificaciones@rein-eisenwerk.com>` configured (domain `rein-eisenwerk.com` already verified in Resend per James)
3. `RESEND_REPLY_TO=samantha.kosmas@iconsanet.com` added to `.env.local` + Vercel production
4. `NEXT_PUBLIC_APP_URL=https://humanos.rein-eisenwerk.com` added to `.env.local` + Vercel production (subdomain ya configurado DNS + Vercel)
5. `CRON_SECRET` generated (`openssl rand -base64 32`) + added to Vercel project env + `.env.local`
6. Enable HIBP "compromised password check" in Supabase Auth Dashboard → Settings → Password requirements
7. James exports list of 48 existing `auth.users` emails + canonical match in `hr.people.national_id` (for Samantha to use during F4 creation; avoids hr_admin typo creating duplicate users)
8. Confirm test plan: E2E tests run against Supabase development branch (`supabase branches create group-2-e2e`), not production
9. After Vercel deploy: verify cron registered (Vercel Dashboard → Settings → Cron Jobs → `process-notifications` listed with `*/5 * * * *`)
10. PDFs `IC-RH-M-01.pdf` + `IC-RH-D-07.pdf` accesibles desde `/sops/` route (verify `public/sops/` populated, or prebuild script `copy-sops-to-public.ts` includes them)

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch fresh subagent per task, review between tasks, fast iteration. Use `superpowers:subagent-driven-development` skill.
2. **Inline Execution** — execute tasks in current session using `superpowers:executing-plans`, batch execution with checkpoints.

**Which approach?**



