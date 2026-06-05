# SEC-CONSENT — Ley 81 consent wiring (final design spec)

**Decisions in scope:** ADR-0033, ADR-0035

**Slice:** SEC-CONSENT (= SEC-CONSENT-WIRING) · **P1** active prod gap · **Group 3** · HumanOS (ICONSA HR, Panamá).
**Fecha:** 2026-06-05 · **Origen:** consejo nocturno adversarial (ADR-0033, no-deferral) · síntesis de las propuestas `strict-ley81` + `mvp-pragmatic` con la evidencia de los agentes `ground-onboarding` / `ground-ley81` / `ground-db-state`.
**Migración:** este slice envía **`090`** (última aplicada = `089`, verificado live 2026-06-05).

---

## 1. El gap (verificado live 2026-06-05)

`hr.consent` table + scopes existen (W1 migs 059/060) pero **NADA escribe consent**. El onboarding shipped (Group 2, wizard Step6/Step7) captura datos médicos (`hr.medical_info`=43 filas) + emergencia + dirección **SIN** escribir ninguna fila de consentimiento Ley 81 y **SIN** bloquear el write sensible cuando falta el consentimiento. Estado:

| Métrica | Valor |
|---|---|
| `hr.consent` | **0** filas (confirma el gap) |
| `hr.medical_info` | **43** filas (43 personas distintas, `ON CONFLICT (person_id)` 1:1) |
| de esas 43, con consentimiento `medical` `granted=true` | **0** (100% del gap) |
| de esas 43, onboarded (`hr.people.auth_id NOT NULL`) | **1** (las otras 42 son ETL, sin cuenta auth) |
| `hr.contacts` con `is_emergency=true` | **0** (las 289 filas son `personal`/`is_emergency=false` — propios del empleado, vía import legacy; el write-path emergency del wizard NO ha producido filas en prod) |

Es el gap de cumplimiento **R27 / Ley 81** (protección de datos personales, Panamá; autoridad ANTAI; sanción $1,000–$10,000/infracción). Datos médicos = **sensibles (salud)** ⇒ consentimiento **previo, expreso e irrefutable**; no implícito, no bundled, no pre-marcado.

## 2. Goal

Cablear consent end-to-end:

- **(a) CAPTURA**: el onboarding obtiene consentimiento explícito Ley 81 **antes/con** los datos sensibles.
- **(b) ENFORCEMENT (defense-in-depth)**: los writes sensibles **requieren** consentimiento — guard a nivel DB **+** UI.
- **(c) las 43 filas médicas sin consentimiento**: **marcadas para re-consentir**, NUNCA backfill de consent fabricado (la Ley 81 exige consentimiento activamente dado).

## 3. Enforcement model — ONE choke point, fail-closed, 3 capas

Todo write sensible del onboarding pasa por la única RPC `SECURITY DEFINER` `hr.complete_onboarding_writes`. Esa RPC corre como owner (RLS bypassed), así que **el gate de consentimiento DEBE vivir dentro del cuerpo de la función** — RLS no puede enforcearlo (el dueño puede auto-insertar su propio `hr.medical_info` por la policy `person_id = current_person_id()`). Tres capas:

1. **L1 — RPC atomic guard (primaria).** La RPC recibe params de consentimiento, escribe filas `hr.consent` **primero** y RAISE antes del INSERT médico/emergencia si falta el scope `granted=true` requerido. Todo en una transacción ⇒ consentimiento y dato sensible son **atómicos** (ambos commit o ambos rollback). El RAISE ocurre después del people-link/invite-consume pero **antes** de los INSERTs sensibles; como la RPC es una sola transacción, el RAISE revierte todo (incl. el people-link) — fail-closed.

2. **L2 — trigger `BEFORE INSERT/UPDATE` en `hr.medical_info` (defensa profunda).** Bloquea CUALQUIER ruta (la RPC, un insert directo authenticated vía `/perfil` futuro, tooling admin futuro, SQL ad-hoc de un rol no-superuser) que intente escribir datos médicos sin una fila de consentimiento `medical` `granted=true` vigente para esa persona. Es la garantía real de "imposible sin consentimiento" — no confía en el caller. Permite soft-delete/metadata (write sin cambio de payload sensible) para no romper correcciones de hr_admin ni el touch de `updated_at`.

   > **Orden obligatorio:** la RPC escribe la fila de consentimiento ANTES del INSERT médico, así el trigger ve el consentimiento committed-in-tx. Este orden es mandatorio.

   **Por qué se conserva el trigger (vs la propuesta mvp que lo cortó como YAGNI):** la RLS de `hr.medical_info` permite al owner auto-insertar su fila médica, y la RPC corre como owner saltándose RLS — así que un guard "solo en la RPC" deja abierta la ruta owner-self-insert. Para un gap P1 de Ley 81, el trigger a nivel tabla es la elección defendible y fail-closed. Costo: una lookup STABLE por insert/update médico (raro; el path médico no es hot).

3. **L3 — UI gate.** Un nuevo paso de consentimiento **antes** de Step6/Step7, bloqueando `NEXT_STEP` hasta marcar las casillas (Zod `z.literal(true)`), espejando exactamente `Step9Acknowledgments`.

## 4. Consent scopes + legal_version

`hr.consent.scope` CHECK (migs 059/060) admite 6: `medical | emergency_contact | data_processing | photo_image | data_sharing | background_check`.

Scopes que el onboarding escribe (una fila append-only por scope, `granted=true`, solo si la casilla está marcada):

| Scope | Gate | Obligatorio | Nota |
|---|---|---|---|
| `medical` | Step7 → `hr.medical_info` | sí (si hay datos médicos) | sensible/salud — el más estricto |
| `emergency_contact` | Step6 → `hr.contacts` emergency | sí (si hay contacto) | dato de tercero |
| `data_processing` | umbrella aviso de privacidad (identidad, dirección, contacto) | sí | aceptación del aviso |

`photo_image` queda **fuera de este slice** (el paso de foto es opcional y no es el gap de dato sensible R27; gatearlo bloquearía a quien omite la foto). Logueado como assumption, no blocker.

Cada fila guarda: `person_id`, `scope`, `legal_version`, `granted=true`, `consent_at` (default `now()`), `actor_id` = la persona misma (auto-consentimiento en onboarding), `ip` (de `headers()` `x-forwarded-for`), `user_agent` (de `headers()`), `source_system='humanos_app'` (default).

**`legal_version` convención:** string content-versioned que pinea el texto exacto consentido. Valor v1: **`ley81-onboarding-v1`**. Fuente única de verdad en código (`src/lib/consent/legal-text.ts`) para que el texto renderizado y el `legal_version` guardado no puedan divergir. Se incrementa el string SOLO cuando cambia el copy aprobado; nunca se reusa una versión para copy distinto. Esto hace que el swap post-revisión-legal sea limpio y auditable.

## 5. Captura UI + texto exacto

### 5a. `src/lib/consent/legal-text.ts` (fuente única)

```ts
// Ley 81 (R27) aviso de privacidad + consentimiento. BORRADOR - PENDIENTE DE REVISION LEGAL.
// legal_version se incrementa SOLO si cambia el texto aprobado (no reusar version para copy distinto).
export const LEY81_CONSENT_VERSION = 'ley81-onboarding-v1';
export const LEY81_AVISO = `...`; // texto completo abajo
```

**Texto v1 (borrador fiel neutro-Panamá, sin voseo — verificado: solo tú/tienes/puedes; etiquetado needs-legal-review per ADR-0033 no-deferral):**

> **Aviso de privacidad y consentimiento (Ley 81 de 2019)** — _BORRADOR — PENDIENTE DE REVISIÓN LEGAL_
>
> Ingeniería Continental, S.A. (ICONSA), como responsable del tratamiento, recolecta y trata tus datos personales conforme a la Ley 81 de 26 de marzo de 2019 sobre Protección de Datos Personales de la República de Panamá y su reglamento (Decreto Ejecutivo 285 de 2021).
>
> **¿Qué datos tratamos y para qué?** Recopilamos tus datos de identificación, contacto, dirección, contacto de emergencia e información médica con la finalidad de gestionar tu relación laboral, cumplir obligaciones legales y laborales, y poder asistirte ante una emergencia. No usaremos tus datos para fines distintos a los aquí declarados.
>
> **Datos sensibles (salud).** Tu información médica (tipo de sangre, alergias, condiciones, medicamentos, aseguradora, número de CSS) es un dato sensible. La Ley 81 exige tu consentimiento previo, expreso e informado para tratarla. Solo tú y el personal de Recursos Humanos autorizado pueden acceder a ella.
>
> **Tus derechos.** En cualquier momento puedes solicitar el acceso, la rectificación, la cancelación o la oposición al tratamiento de tus datos (derechos ARCO), así como revocar este consentimiento, escribiendo a Recursos Humanos. La revocación no afecta la licitud del tratamiento previo.
>
> **Conservación.** Conservamos tus datos mientras dure la relación laboral y, posteriormente, solo por el plazo que exijan las obligaciones legales aplicables; cumplido ese plazo se eliminan o anonimizan.
>
> Al marcar las casillas siguientes, declaras que has leído y comprendido este aviso y otorgas tu consentimiento libre, informado y expreso.

Tres casillas **separadas, no-bundled, ninguna pre-marcada** (granular, para que el consentimiento de salud quede solo — Ley 81 prohíbe bundling para salud):

- `[ ]` "Otorgo mi consentimiento para el tratamiento de mis datos personales conforme a este aviso." → `data_processing`
- `[ ]` "Otorgo mi consentimiento para el tratamiento de los datos de mi **contacto de emergencia**." → `emergency_contact`
- `[ ]` "Otorgo mi consentimiento expreso para el tratamiento de mi **información médica** con fines de emergencia y gestión laboral." → `medical`

### 5b. Nuevo `src/components/onboarding/Step6Consent.tsx` (clon de Step9Acknowledgments)

Insertado como **nuevo Step 6** (ANTES de emergencia/médicos). El wizard pasa a **11 pasos**; emergencia→7, médicos→8, dirección→9, acks→10, foto→11. Es el renumber más limpio (consentimiento antes del dato que gatea). Espeja `Step9Acknowledgments` exactamente: heading navy `text-navy-500`, cards de checkbox `flex items-start gap-3 p-4 border rounded-md`, botón `bg-navy-500 text-white`, error `role="alert"`, link al aviso `text-info-500`, estado timestamped vía la acción `CONSENT`. Renderiza `LEY81_AVISO` en una card scrollable.

**Design call (logueado):** la UI **requiere las tres** casillas para avanzar (los pasos de datos siguen siendo opcionales). Razón: mantiene el flujo simple y asegura que cualquier dato luego ingresado esté cubierto; quien consiente pero no llena nada solo tiene filas de consentimiento sin dato (legalmente inocuo y auditable). El guard de la RPC solo *enforcea* cuando el dato está presente, así que el modelo ya soporta un futuro "consent solo si llenas la sección" sin cambio de DB.

### 5c. `WizardReducer.ts`

`WizardState` += `consent_medical_at`, `consent_emergency_at`, `consent_data_processing_at` (`string | null`, espejo de `ack_*_at`). `initialState` += los tres en `null`. Se extiende la union `ACK` (reusa el mecanismo timestamped existente):

```ts
| { type: 'ACK'; key: 'ack_ethics_at' | 'ack_child_labor_at'
      | 'consent_medical_at' | 'consent_emergency_at' | 'consent_data_processing_at'; at: string }
```

`NEXT_STEP` clamp `Math.min(state.step + 1, 11)`.

### 5d. `wizard.tsx`

Insertar `case 6: return <Step6Consent .../>;` y correr 6→7 (emergencia), 7→8 (médicos), 8→9 (dirección), 9→10 (acks), 10→11 (foto). `totalSteps={11}`. El guard `state.step >= 4` no se afecta (consent es paso 6, ≥4).

### 5e. `validation.ts` — `ConsentSchema`

```ts
export const ConsentSchema = z.object({
  consent_data_processing: z.literal(true, { error: 'Debes aceptar el aviso de privacidad para continuar' }),
  consent_emergency: z.literal(true, { error: 'Debes otorgar el consentimiento de contacto de emergencia' }),
  consent_medical: z.literal(true, { error: 'Debes otorgar el consentimiento de informacion medica' }),
});
```

### 5f. `actions.ts` — params de consentimiento + ip/user_agent

`CompleteOnboardingInput` += `consent_medical: boolean; consent_emergency: boolean; consent_data_processing: boolean; consent_legal_version: string`. En `completeOnboardingAction`, leer `headers()` (async, Next.js 16) para poblar `ip_address`/`user_agent` (hoy llegan `undefined` porque Step10 nunca los pasa) y pasar los params al RPC. Mismo patrón que `validateInviteCodeAction` (actions.ts:51-54).

### 5g. `Step10PhotoConfirm.tsx` (ahora Step 11)

Al call de `completeOnboardingAction({...})`: `consent_medical: !!state.consent_medical_at`, `consent_emergency: !!state.consent_emergency_at`, `consent_data_processing: !!state.consent_data_processing_at`, `consent_legal_version: LEY81_CONSENT_VERSION`.

## 6. Migración `090` — additive only

File: `supabase/migrations/<ts>_090_consent_enforcement_and_reconsent_flag.sql` (UTF-8 sin BOM). Contenido:

1. **`hr.has_active_consent(p_person_id uuid, p_scope text) RETURNS boolean`** — STABLE SECURITY DEFINER `SET search_path TO ''`. "¿Tiene esta persona consentimiento vigente para scope X?" — última fila por scope gana (append-only). Usado por el guard de la RPC y por el trigger. `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO authenticated` (predicado read-only). COMMENT.
2. **`hr.enforce_medical_consent()` + trigger `trg_medical_consent_guard BEFORE INSERT OR UPDATE ON hr.medical_info`** — SECURITY DEFINER `search_path=''`. Fail-closed: RAISE si no hay consentimiento `medical` vigente; permite soft-delete/metadata (UPDATE sin cambio de columnas sensibles). COMMENT.
3. **`CREATE OR REPLACE hr.complete_onboarding_writes`** (+4 params consent con DEFAULT, guard atómico, INSERTs append-only idempotentes vía `NOT EXISTS`). Preserva grants. COMMENT refrescado.
4. **Flag de las 43** (reusa `hr.people.needs_review` + `review_notes`, NO nueva columna): UPDATE flag-only, sin insertar consent. Marcador `SEC-CONSENT` en `review_notes` para filtrar la worklist.
5. **`hr.v_pending_reconsent`** (vista read-only para hr_admin; hereda RLS de `hr.people`; sin payload médico). COMMENT.

SQL exacto en el plan adjunto (ver §"Migration changes" del plan).

**Helpers reusados (NO redefinir):** `hr.current_person_id()`, `hr.is_hr_admin()`. No existe `record_consent` ni `has_active_consent` previos (verificado `pg_proc` = none). **Síntesis:** se conserva `hr.has_active_consent` (la lógica live-consent debe compartirse entre RPC y trigger), pero se **descarta** el wrapper `hr.record_consent` de la propuesta strict — 3 INSERTs inline en una función no justifican un nuevo objeto SECURITY DEFINER que mantener (decisión mvp-pragmatic, correcta).

## 7. Remediación de las 43 filas médicas sin consentimiento

**Nunca fabricar consent** (Ley 81: el consentimiento debe darse activamente; backfill de filas falsas es en sí una infracción). En su lugar: **marcar para re-consentir** — additive, evidence-grounded, reversible.

**Síntesis (vs strict que proponía una columna nueva `needs_reconsent`):** se **reusa `hr.people.needs_review` + `review_notes`** (ya existen — verificado live; son las columnas que escribe `reportOnboardingErrorAction`). Evita estado duplicado. Se estampa un marcador `SEC-CONSENT` en `review_notes` para que la worklist/vista filtre limpio.

```sql
UPDATE hr.people p
SET needs_review = true,
    review_notes = COALESCE(NULLIF(review_notes,'') || ' | ', '')
                   || 'SEC-CONSENT: re-consentimiento Ley 81 pendiente (datos medicos sin consentimiento) ' || now()::date,
    updated_at = now()
WHERE EXISTS (SELECT 1 FROM hr.medical_info m WHERE m.person_id = p.id AND m.deleted_at IS NULL)
  AND NOT hr.has_active_consent(p.id, 'medical');
-- Esperado: 43 filas flagged.
```

Realidad operativa (verificada): **1 de las 43 tiene `auth_id`** (puede ser prompted al próximo login); **42 no tienen cuenta auth** (ETL) ⇒ re-consienten automáticamente cuando onboarden (el nuevo gate del wizard escribe su consentimiento). La RPC debe limpiar el flag (`needs_review` solo si el motivo era SEC-CONSENT) tras escribir la fila `medical` — implementación: si tras escribir consent `medical` el `review_notes` contiene el marcador SEC-CONSENT, removerlo y poner `needs_review=false` si no quedan otros motivos. (Conservador: dejar el flag como audit trail también es aceptable; el plan elige limpiar el marcador SEC-CONSENT específicamente.)

Vista worklist hr_admin (additive, RLS heredada, COMMENT, sin payload médico):

```sql
CREATE OR REPLACE VIEW hr.v_pending_reconsent AS
  SELECT p.id AS person_id, p.full_name, p.auth_id,
         (p.auth_id IS NOT NULL) AS can_prompt_now
  FROM hr.people p
  WHERE EXISTS (SELECT 1 FROM hr.medical_info m WHERE m.person_id = p.id AND m.deleted_at IS NULL)
    AND NOT hr.has_active_consent(p.id, 'medical');
```

El banner `/perfil` de re-consentimiento (para el 1 onboarded) + el tile de dashboard hr_admin que lee esta vista son **follow-up P2** (1 persona hoy); el gap queda cerrado para todos los writes futuros por §3–§6. La UI `/perfil` self-service reusaría el texto de `Step6Consent` + un `GRANT EXECUTE` explícito scoped-a-self (diferido a ese follow-up para no abrir el grant prematuramente).

## 8. Testing

- **Unit (vitest)**
  - `ConsentSchema`: rechaza false/undefined en cada casilla; acepta `true`×3.
  - `Step6Consent`: render del aviso; botón Continuar bloqueado hasta las 3 casillas; dispatch `CONSENT` con timestamp ISO; error `role="alert"` con copy sin voseo.
  - `WizardReducer`: acción `CONSENT` setea el timestamp; `NEXT_STEP` clamp a 11; `consent_*_at` en `initialState`.
- **DB (SQL / pgTAP-style asserts via execute_sql en test harness)**
  - `hr.has_active_consent`: false si 0 filas; true tras `granted=true`; false si la última fila es `granted=false` (revocación gana).
  - Trigger L2: INSERT en `hr.medical_info` sin consentimiento `medical` ⇒ RAISE (`check_violation`); con consentimiento ⇒ pasa; UPDATE soft-delete (solo `deleted_at`) ⇒ pasa sin consentimiento.
  - RPC L1: `p_medical` no vacío + `p_consent_medical=false` ⇒ RAISE, **rollback total** (people-link no persiste); con consentimiento ⇒ escribe `hr.consent` (medical/emergency/data_processing) + `hr.medical_info`; re-run idéntico ⇒ no duplica filas de consent (`NOT EXISTS`).
  - `p_consent_legal_version` NULL/'' ⇒ RAISE.
  - Flag de las 43: tras la migración, `hr.v_pending_reconsent` lista exactamente 43; tras escribir consent `medical` para una, sale de la vista y se limpia el marcador.
- **E2E (Playwright)**
  - Happy path: wizard llega a Step6, marca las 3 casillas, completa hasta submit ⇒ onboarding OK + (verificación DB) filas `hr.consent`.
  - Edge: en Step6, intentar Continuar sin marcar ⇒ error visible, no avanza.
  - RLS: `iconsa-rls-validation` post-migración — `hr.consent`/`hr.medical_info`/`hr.people` RLS intactas; la vista hereda RLS; sin nuevas policies requeridas.
- **Gate:** `npm run verify` (typecheck + lint + vitest + docs:check + build) verde + `npm run verify:e2e`.

## 9. Backlog-gate (STATUS §6) — matches del slice

Filtrado por Group 3 + tablas/schemas tocadas (`hr.consent`, `hr.medical_info`, `hr.people`, `hr.contacts`, onboarding wizard):

- **SEC-CONSENT / SEC-CONSENT-WIRING** — ESTE slice. Resuelto.
- **compliance-ley81.md §2 "Consentimiento"** — la fila ❌ "no se captura" pasa a hecho; §5 "paso de consentimiento + aviso antes de Step 6/7" shipped (texto aún "pendiente revisión legal").
- Re-diferidos con razón (fuera de scope, no bloquean este slice): derechos ARCO self-service en `/perfil` (slice aparte), runbook de brechas, política de retención/purga, acuse de confidencialidad hr_admin, `audit.access_log` read-logging (control distinto = auditoría de lectura, no captura de consentimiento), consent `photo_image`. Ninguno comparte la ruta crítica de captura/enforcement de este slice.

## 10. Assumptions logged (morning report)

1. **Responsable legal = Ingeniería Continental, S.A. (ICONSA)** — de los forms de empleador en GDrive; confirmar en revisión legal.
2. **No existe texto lawyer-validated** (verificado: `compliance-ley81.md` línea 51 lo marca como pregunta legal abierta; no hay string verbatim en repo ni GDrive ICONSA→empleado) ⇒ se envía borrador fiel neutro-Panamá etiquetado `BORRADOR — PENDIENTE DE REVISIÓN LEGAL`, `legal_version='ley81-onboarding-v1'`; el version pointer hace el swap post-revisión limpio + auditable (ADR-0033 no-deferral).
3. **`photo_image` fuera de este slice** (paso de foto opcional, no es el gap R27 de dato sensible).
4. **UI requiere las 3 casillas para avanzar** (pasos de datos opcionales); el guard de la RPC solo *enforcea* cuando el dato está presente ⇒ el modelo soporta un futuro "consent solo si llenas la sección" sin cambio de DB.
5. **`/perfil` self-service re-consent + grant `authenticated` en cualquier helper de consent = follow-up P2 fino** (este slice aterriza el flag, la vista, y la captura/enforcement de onboarding).
6. **`hr.consent.ip` es `inet`** (no text como `docs.acknowledgments.ip_address`) ⇒ la RPC castea `NULLIF(p_ip_address,'')::inet`.
7. **Las 42 personas ETL re-consienten al onboardear**; solo 1 (con `auth_id`) necesita prompt activo, vía el follow-up `/perfil`.

## Alternativas rechazadas (ver ADR-0035)

- Solo guard en la RPC, sin trigger (propuesta mvp YAGNI) — deja abierta la ruta owner-self-insert / SQL ad-hoc; insuficiente para P1 Ley 81.
- Backfill de consent para las 43 — ilegal (consentimiento debe darse activamente).
- Nueva columna `hr.people.needs_reconsent` (propuesta strict) — estado duplicado; `needs_review`+`review_notes` ya existen y ya manejan una superficie de review.
- Wrapper helper `hr.record_consent` (propuesta strict) — over-engineering para 3 INSERTs en una función.
- Modal/overlay de consentimiento en vez de paso — pierde el affordance "Paso X de N" y complica "Atrás"; el renumber del switch es mecánico y bajo riesgo.
- Gatear `photo_image` — bloquearía a quien omite la foto (opcional).

## Files manifest

- **NEW** `supabase/migrations/<ts>_090_consent_enforcement_and_reconsent_flag.sql`
- **NEW** `src/lib/consent/legal-text.ts`
- **NEW** `src/components/onboarding/Step6Consent.tsx`
- `src/components/onboarding/WizardReducer.ts`
- `src/lib/onboarding/validation.ts`
- `src/app/(public)/onboarding/[code]/wizard.tsx`
- `src/lib/onboarding/actions.ts`
- `src/components/onboarding/Step10PhotoConfirm.tsx`
- Docs (mismo commit): `docs/CHANGELOG.md`, `docs/STATUS.md`, `docs/reference/compliance-ley81.md` (§2/§5), `docs/adr/0035-consent-enforcement-ley81.md` + index `docs/adr/README.md`.

**Verificación de APIs externas (regla CLAUDE.md §10):** el slice de implementación DEBE correr Context7 (`resolve-library-id` + `get-library-docs`) para Next.js 16 / React 19 / Tailwind 4 / @supabase/ssr antes de escribir el componente + las ediciones de action. Zod 4 `z.literal(true, { error })` ya es el patrón del repo; Next.js 16 `headers()` es async.
