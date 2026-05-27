# Service role admin client: excepción a ADR-0001 + multi-app gating via email/phone lookup

Para el flow de onboarding F1 (`/onboarding/[code]` wizard step 10) y para la regeneración manual de invite codes en F4/F5, HumanOS instancia un cliente Supabase con `SUPABASE_SERVICE_ROLE_KEY` (god mode, bypass RLS) desde una server action única `onboardEmployee()`. Esto es una excepción explícita y nombrada a la decisión técnica ADR-0001 (RLS-driven access via JWT). La excepción aplica SOLO cuando coinciden TODAS estas condiciones: (a) el caller no está autenticado todavía (`auth.users` row con sesión activa todavía no existe para esta persona), (b) la operación requiere `auth.admin.createUser` o `auth.admin.updateUserById` que son endpoints HTTP del auth service (no SQL, no invocables via RLS), y (c) la operación afecta una sola fila identificada por filtros explícitos (`auth.users.id` específico, `hr.people.id` específico via invite code). NUNCA mass-updates: R22 sigue vigente como guardrail conceptual.

El cliente admin vive en `src/lib/supabase/admin.ts` y exporta `createSupabaseAdminClient()` que llama `createClient` de `@supabase/supabase-js` con `auth: { persistSession: false, autoRefreshToken: false }` (no cookies, no session). Solo importable desde server actions que llevan comment header `// ADR-0006 exception` en el call site. ESLint custom rule (added in Group 2) bloquea import desde archivos con `'use client'`. Lint + review humano + type-check guard en E2E forman las 3 capas de defensa contra abuse accidental.

## Multi-app detection: lookup por email/phone, NO por national_id

La estrategia Chat-level ADR-0003 establece que `auth.users.raw_app_meta_data.allowed_apps` JSONB array gating per app es la decisión correcta. ADR-0003 menciona "national_id match" como mecanismo de detección — ese fue pseudo-plan nunca implementado: `auth.users.raw_app_meta_data` en la BD real NO contiene `national_id` (verificado via `execute_sql` durante grill 2026-05-27). El matching concreto se hace por `auth.users.email` o `auth.users.phone`, que son campos top-level (no JSONB) y existen para todos los 48 auth.users actuales (todos provider='email' con email empresarial `@iconsanet.com`).

Contexto operacional que valida este approach: ICONSA usa email empresarial canonical `@iconsanet.com` por persona. 50 empleados activos tienen email corporativo, 60 solo phone, 74 gap (no MVP-onboardables). hr_admin captura en F4 el `delivery_target` (email O phone E.164) que ya usa el empleado — si existe en MovimientOS, hr_admin usa el MISMO valor. El email empresarial no varía entre apps.

Algoritmo (en `onboardEmployee()`, post triple-validation R14):

```typescript
// ADR-0006 exception
const supabaseAdmin = createSupabaseAdminClient();
const isEmail = input.deliveryTarget.includes('@');
const field = isEmail ? 'email' : 'phone';

const { data: existing } = await supabaseAdmin
  .schema('auth')
  .from('users')
  .select('id, raw_app_meta_data, email, phone, encrypted_password')
  .eq(field, input.deliveryTarget)
  .maybeSingle();

let authId: string;
if (existing) {
  const currentApps: string[] = existing.raw_app_meta_data?.allowed_apps ?? [];
  if (!currentApps.includes('humanOS')) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      app_metadata: {
        ...existing.raw_app_meta_data,
        allowed_apps: [...new Set([...currentApps, 'humanOS'])],
      },
      // NO password, NO email, NO phone, NO user_metadata
    });
  }
  authId = existing.id;
} else {
  const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
    [field]: input.deliveryTarget,
    password: input.password,
    email_confirm: isEmail,
    app_metadata: { allowed_apps: ['humanOS'] },
  });
  authId = newUser!.user.id;
}

// Link hr.people.auth_id (RLS bypass por service role, pero filtro explícito por person_id)
await supabaseAdmin
  .from('hr.people')
  .update({ auth_id: authId })
  .eq('id', input.personId);
```

El spread `...existing.raw_app_meta_data` es CRÍTICO: preserva `provider`, `providers`, y cualquier metadata pre-existente de MovimientOS. Sin el spread, MovimientOS rompe post-onboarding HumanOS porque su lookup de provider falla.

**Prerrequisito de configuración**: el schema `auth` debe estar listado en `exposed_schemas` del proyecto Supabase (Dashboard → API → Settings) para que `.schema('auth').from('users')` funcione via PostgREST. Si no está expuesto, alternativa: crear SECURITY DEFINER function en schema `hr` que wraps el SELECT y se invoca via `supabaseAdmin.rpc()`. Group 2 plan verifica esto en pre-flight.

## UX bifurcado: skip password step si existing_multi_app_user

`validateInviteCode(code, cedula, deliveryTarget)` retorna:

```typescript
{
  valid: true,
  person_id: string,
  display_name: string,
  existing_multi_app_user: boolean,
  existing_email_masked: string | null  // ej. 'r***@iconsanet.com'
}
```

Cuando `existing_multi_app_user=true`, el `useReducer` del wizard:

- Omite step 4 (password) — `wizardState.skipPasswordStep = true`
- Renderea screen informativo: "Detectamos que ya tienes cuenta de ICONSA registrada con `{existing_email_masked}`. Tu contraseña actual sigue válida y la usarás también para HumanOS."
- Step 10 server action recibe `password=null` y la branch existing del algoritmo NO toca password.

La normalización de `national_id` para R14 triple-validation usa `(s) => s.trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase()` en ambos lados del compare, defendiendo contra cédulas con/sin guiones, espacios, o leading zeros. Email no normaliza (canonical empresarial). Phone normaliza a `+507XXXXXXXX`.

## Tests E2E obligatorios (SQL-only, no Playwright cross-app)

1. **Onboard nuevo usuario** (sin auth.user existing): pre-snapshot `SELECT COUNT(*) FROM auth.users`; ejecutar `onboardEmployee()`; post-snapshot debe mostrar `count+=1`, nuevo row tiene `raw_app_meta_data.allowed_apps = ['humanOS']`, `hr.people.auth_id` linked.
2. **Onboard multi-app merge** (auth.user existing en MovimientOS, ej. Rodrigo): pre-snapshot `encrypted_password` + `raw_app_meta_data`; ejecutar `onboardEmployee()`; post-snapshot verifica:
   - `after.encrypted_password === before.encrypted_password` (hash INMUTADO — invariante crítico para no romper MovimientOS)
   - `after.raw_app_meta_data.allowed_apps` incluye `'humanOS'` Y `'movimientOS'`
   - `after.raw_app_meta_data.provider === before.raw_app_meta_data.provider`
   - `after.raw_app_meta_data.providers === before.raw_app_meta_data.providers`
   - `SELECT COUNT(*) FROM auth.users` sin cambio (NO duplicado)
   - `hr.people.auth_id = existing.id`
3. **Idempotencia**: ejecutar `onboardEmployee()` 2 veces con el mismo invite_code consumido falla en step 1 (R14 triple-validation: `invite_codes.consumed_at IS NOT NULL` rechaza), garantizando que el algoritmo nunca corre dos veces sobre el mismo person_id.

Tests corren contra Supabase development branch (creada via `supabase branches create` antes del test suite) para no contaminar production. Bootstrap fixtures: Rodrigo (auth.user existing) + un user nuevo (Samantha como ejemplo si su auth.user no existe en MovimientOS, o un dummy del seed).

## Riesgo operacional + mitigación

Si hr_admin (Samantha) captura en F4 un email DIFERENTE al que la persona usa en MovimientOS, el lookup falla → se crea auth.user DUPLICADO → MovimientOS y HumanOS terminan con auth.user distinto por misma persona. Es un fallo grave pero NO catastrófico: no se pierden datos, queda merge humano post-MVP.

Mitigación operacional (NO arquitectural):

- F4 UI muestra placeholder y helper text: "Si la persona ya tiene cuenta en MovimientOS, usa el MISMO email/teléfono que tiene ahí. No improvises uno nuevo."
- James pasa a Samantha lista pre-onboarding de los 48 emails empresariales existentes en `auth.users` (export una sola vez vía SQL) para que copie textual al crear invite codes
- Risk reducido por contexto: emails `@iconsanet.com` son canonical (no varían), phone numbers empresariales tampoco
- Si ocurre a pesar de mitigación: J-item P2 v1.1 "Merge auth.users duplicados detectados (SQL admin manual)"

## Alternativas rechazadas

**(a) Matching via `raw_app_meta_data.national_id`** (lo que ADR-0003 sugiere textual): el campo nunca fue populado en la BD real. Era pseudo-plan estratégico sin implementación concreta. Verificado en sesión 2026-05-27.

**(b) Lookup cross-schema a `public.people.cedula` → `public.people.auth_id`**: acopla HumanOS al schema legacy de MovimientOS, viola ADR-0005 Chat-level (MDM gradual, no big-bang). Si MovimientOS renombra/migra `public.people`, HumanOS rompe. No es nuestra responsabilidad consumir su modelo.

**(c) Crear schema `mdm.persons` o `core.persons` ahora**: viola ADR-0005 Chat-level explícito ("esperar a que otra app pida MDM"). MVP pre-MDM, deferred.

**(d) SECURITY DEFINER SQL function via `supabase.rpc()` con anon client**: Supabase Auth admin (createUser, updateUserById) son endpoints HTTP del auth service, no SQL. La ruta SQL-only no existe.

## Cambios futuros que invalidan esta excepción

Cuando llegue `mdm.persons` (ADR-0005 paso 2 post-MVP), el matching mechanism se reevalúa: `mdm.persons` se vuelve la fuente de verdad cross-app y el lookup probablemente migra a JOIN contra `mdm.persons.canonical_email` o equivalente. Este ADR se actualiza con `Supersedes` cuando suceda.
