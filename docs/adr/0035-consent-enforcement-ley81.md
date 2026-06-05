# 0035 — Enforcement de consentimiento Ley 81 (SEC-CONSENT): captura en onboarding + guard fail-closed defense-in-depth + las 43 = flag-for-reconsent

**Fecha:** 2026-06-05 · **Status:** Accepted · **Decidido por:** consejo adversarial nocturno (ADR-0033, no-deferral) — síntesis de las propuestas `strict-ley81` + `mvp-pragmatic`; Jaime revisa/prueba en la mañana. **Relacionado:** R27 (Ley 81), R13 (RLS médica owner+hr_admin), ADR-0001 (RLS access-control), ADR-0006 (service-role sin sesión), ADR-0003 (snapshot al submit). **Spec/plan:** `docs/superpowers/specs/2026-06-05-sec-consent-ley81-design.md` (+ plan derivado).

## Contexto (verificado live 2026-06-05)

`hr.consent` table + scopes existen (migs 059/060) pero **0 filas**: nada escribe consent. El onboarding shipped (Group 2, Step6 emergencia / Step7 médicos) captura datos sensibles **sin** consentimiento Ley 81 y **sin** bloquear el write. `hr.medical_info`=43 (43 personas, `ON CONFLICT (person_id)` 1:1), **0** con consentimiento `medical` `granted=true`. De las 43: 1 onboarded (`auth_id` set), 42 ETL sin cuenta auth. Datos médicos = **sensibles (salud)** ⇒ Ley 81 exige consentimiento **previo, expreso e irrefutable**; ANTAI sanciona $1,000–$10,000/infracción; el uso interno no exime. No existe texto lawyer-validated en repo ni GDrive (la pregunta legal sigue abierta en `compliance-ley81.md` línea 51). Helpers `hr.current_person_id()` / `hr.is_hr_admin()` existen; `pg_proc` no tiene `record_consent` ni `has_active_consent`. `hr.people` ya tiene `needs_review boolean` + `review_notes text`. Última migración = `089` ⇒ este slice = `090`.

La RPC `hr.complete_onboarding_writes` es el **único choke point** de los writes sensibles del onboarding; corre `SECURITY DEFINER` (RLS bypassed), y la RLS de `hr.medical_info` permite además al owner auto-insertar su propia fila ⇒ **RLS no puede enforcear el consentimiento**.

## Decisión

1. **Enforcement defense-in-depth de 3 capas, fail-closed:**
   - **L1 — guard atómico en la RPC (primaria):** `hr.complete_onboarding_writes` recibe 4 params nuevos de consentimiento (`p_consent_medical/_emergency/_data_processing boolean`, `p_consent_legal_version text`, todos con DEFAULT ⇒ `CREATE OR REPLACE` preserva grants), escribe las filas `hr.consent` **primero** y RAISE antes del INSERT médico/emergencia si falta el scope `granted=true` requerido. Todo una transacción ⇒ consentimiento y dato sensible **atómicos** (RAISE revierte incluso el people-link).
   - **L2 — trigger `BEFORE INSERT/UPDATE` en `hr.medical_info`:** función `hr.enforce_medical_consent()` (SECURITY DEFINER, `search_path=''`) que RAISE si no hay consentimiento `medical` vigente para la persona; permite soft-delete/metadata (UPDATE sin cambio de columnas sensibles). Es la garantía real "imposible sin consentimiento" — no confía en el caller, cubre la ruta owner-self-insert y SQL ad-hoc.
   - **L3 — gate UI:** nuevo paso de consentimiento (Step 6) **antes** de emergencia/médicos, espejando `Step9Acknowledgments`, con `z.literal(true)` en las 3 casillas. Wizard pasa de 10 a 11 pasos.
   - **Orden obligatorio:** la RPC escribe el consent ANTES del INSERT médico para que el trigger L2 vea el consentimiento committed-in-tx.

2. **Helper compartido `hr.has_active_consent(person_id, scope)`** (STABLE, SECURITY DEFINER, `search_path=''`, REVOKE PUBLIC + GRANT authenticated): última fila por scope gana (append-only; revocación = fila `granted=false` que gana). Lo consumen el guard L1 y el trigger L2. **NO** se crea el wrapper `record_consent` (3 INSERTs inline en una función no justifican un objeto SECURITY DEFINER extra que mantener).

3. **Las 43 = flag-for-reconsent, NUNCA fabricar consent.** La Ley 81 exige consentimiento activamente dado; backfill de filas falsas es en sí una infracción. UPDATE flag-only que **reusa `hr.people.needs_review` + `review_notes`** (ya existen; son las columnas que escribe `reportOnboardingErrorAction`) con un marcador `SEC-CONSENT`. Vista read-only `hr.v_pending_reconsent` (hereda RLS, sin payload médico) para la worklist hr_admin. Las 42 ETL re-consienten al onboardear (el nuevo gate las cubre); la 1 onboarded vía banner `/perfil` (follow-up P2).

4. **Scopes + `legal_version`:** se escriben `medical`, `emergency_contact`, `data_processing` (del CHECK existente). `legal_version='ley81-onboarding-v1'`, content-versioned, fuente única en `src/lib/consent/legal-text.ts` para que texto renderizado y versión guardada no diverjan; se incrementa solo al cambiar el copy aprobado. `photo_image` queda fuera del slice (foto opcional, no es el gap R27). Texto v1 = borrador fiel neutro-Panamá (sin voseo) etiquetado `BORRADOR — PENDIENTE DE REVISIÓN LEGAL`.

## Alternativas rechazadas

- **Solo guard en la RPC, sin trigger L2 (propuesta `mvp-pragmatic`, YAGNI):** deja abierta la ruta owner-self-insert (RLS lo permite) y cualquier SQL ad-hoc / tooling futuro; insuficiente para un gap P1 de Ley 81. El costo del trigger (una lookup STABLE por insert/update médico, path no-hot) es aceptable a cambio de la garantía table-level.
- **Backfill de consent para las 43:** ilegal — el consentimiento no puede defaultarse ni fabricarse.
- **Nueva columna `hr.people.needs_reconsent` (propuesta `strict-ley81`):** estado duplicado; `needs_review` + `review_notes` ya existen y ya manejan una superficie de review. Se reusan con un marcador.
- **Wrapper `hr.record_consent`:** over-engineering para 3 call sites en una sola función.
- **Modal/overlay en vez de paso:** pierde el affordance "Paso X de N" y complica "Atrás"; el renumber del switch es mecánico.
- **Gatear `photo_image`:** bloquearía a quien omite la foto (opcional).

## Consecuencias

- Cierra el gap R27 de captura + enforcement para todos los writes sensibles futuros del onboarding (atómico + table-level fail-closed). `compliance-ley81.md` §2 "Consentimiento" pasa de ❌ a hecho (texto aún pendiente revisión legal).
- Migración `090` **additive only** (helper + trigger + `CREATE OR REPLACE` RPC + UPDATE flag + vista); cero ops destructivas; las 43 filas médicas intactas (solo se flagean sus personas). Reversible vía migración compensatoria (drop trigger/helper/vista, restaurar firma RPC).
- Primer consumidor real de `hr.consent` (de tabla vacía a vivo).
- Riesgo aceptado: el texto del aviso es borrador needs-legal-review; el `legal_version` pointer hace el swap post-revisión limpio y auditable (ADR-0033 no-deferral). Confirmar nombre del responsable (Ingeniería Continental, S.A.) en revisión legal.
- Pendiente (follow-up, no bloquea): UI `/perfil` self-service de re-consentimiento + ARCO + grant `authenticated` scoped-a-self (P2); runbook de brechas, política de retención, `audit.access_log` read-logging, consent `photo_image` (slices aparte).
- **Aplicado + L2 live-verificado 2026-06-05** (migration `090`, version `20260605065009`): firma única de 15 args viva, overload viejo de 11 args **DROPpeado** (al añadir params la firma cambia ⇒ NO fue un replace in-place; se dropeó el overload para que no quedara como ruta de bypass, y se fijaron grants explícitos service_role-only en la firma de 15). `hr.consent`=0 (0 fabricados), **43 personas flagged** para re-consentimiento, L2 probado en vivo (un INSERT médico sin consentimiento fue bloqueado con `check_violation`, 0 filas residuales). Snapshot `backup.people_pre_consent_flag_20260605`. pgTAP (`090_consent_enforcement.test.sql`) cubre L1 RPC + L2 + flag + view (corre vía `supabase test db`, aún NO en el gate `npm run verify`).
- **Asimetría medical vs emergency_contact = P3 ACEPTADO (no defecto):** `medical` tiene L1+L2 (es la categoría sensible estricta de Ley 81 y su RLS permite owner-self-insert ⇒ requiere garantía table-level). `emergency_contact` queda **L1-only** (sin trigger en `hr.contacts`): la única ruta viva que escribe contactos de emergencia es la RPC de onboarding, que el guard L1 ya cubre; añadir un trigger L2 a `hr.contacts` (tabla multi-propósito: contactos normales + emergencia) sería sobre-ingeniería para una ruta hoy inexistente. Si en el futuro aparece una ruta de escritura directa de contactos de emergencia (p. ej. /perfil), reevaluar un L2 acotado a `is_emergency=true`.
