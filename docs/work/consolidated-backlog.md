# HumanOS — Backlog Consolidado de Auditoría (fuente única)

**Fecha:** 2026-06-01
**Propósito:** Backlog único, deduplicado y priorizado de TODO lo pendiente, fusionando tres
fuentes: registro propio (`DEFERRED-ITEMS.md`), master previo (`AUDITS-PENDING-CONSOLIDATED-2026-05-29.md`)
y la auditoría Codex (`AUDIT-HANDOFF-CLAUDE-CODE-2026-06-01.md`). Cruzado contra
`CHANGELOG.md [Unreleased]` para marcar lo ya hecho.
**Idioma:** Español neutro Panamá (sin voseo).

**Cómo leer.** `source` = de dónde viene (mine / Codex / both). `status`:
OPEN (pendiente código/BD/seguridad), BLOCKED-on-James (decisión humana), DONE.
Las secciones (a)/(b)/(c) separan lo accionable de lo bloqueado y lo cerrado.

**Dedups clave aplicados:**
- `seq-reset` (mine) == `BL-4`-adjacente, NO es el guard. El guard de `requests.next_sequence`
  (Codex) es distinto: la función YA existe (migración 050) sin authZ interno → **SEC-SEQ**.
  El reset-por-año queda como decisión SOP → **DB-SEQRESET** (BLOCKED-on-James, Group 4).
- `BE-3b` (mine, rollback returns en onboarding) ≠ Codex cron-errors. BE-3b ya está DONE;
  los updates sin chequear del worker de cron son un hallazgo NUEVO → **CODE-CRON**.
- `DB-VISION` (mine) = sub-proyecto; sólo el leave-ledger (047) está hecho. El resto =
  **DB-VISION-B/C** (retrofit soft-delete + offline + comp/custom-fields).
- `P1-LEY81` (mine, P1 de madurez) == **SEC-CONSENT** (Codex, P1 consentimiento Step6/7).
  Mismo item, Codex aporta evidencia y fix concreto.
- `notifications.enqueue` idempotencia (BE-2, mine) está DONE; el authZ interno faltante
  (Codex) es un hallazgo NUEVO sobre la misma función → **SEC-ENQUEUE**.

---

## Tabla maestra

| ID | Ítem | Source | Sev | Status | Categoría | Bloquea |
|----|------|--------|-----|--------|-----------|---------|
| SEC-CONSENT | Consentimiento Ley 81 antes de Step6/7 (médico/emergencia) + BD de consentimiento versionado (`consent_at/version/scope/actor/IP`) + bloquear write sin consentimiento. Texto validado por abogado | both (P1-LEY81/R27 + Codex) | P1 | OPEN | security | pre-Group-3 |
| SEC-ENQUEUE | `notifications.enqueue` SECURITY DEFINER ejecutable por `authenticated` sin validar que el caller pueda notificar al `recipient_id`. REVOKE de authenticated + llamar sólo service-role, o guard interno; `import 'server-only'` en `insert.ts` | Codex | P1 | OPEN | security | pre-Group-3 |
| SEC-SEQ | `requests.next_sequence` (migración 050) SECURITY DEFINER con grant `authenticated` y sin guard → cualquier usuario puede quemar numeración. REVOKE authenticated o guard interno | Codex (≈seq) | P2 | OPEN | security | pre-Group-3 |
| MIG-DRIFT | `supabase/migrations/047..051` no alineados con `supabase_migrations` (locales `047..051` vs remotos `20260601130108...`). Renombrar a timestamps reales o mover a `snippets/` y documentar. NO `db push` hasta resolver | Codex | P1/P2 | OPEN | DB-structure | pre-Group-3 |
| TYPES-STALE | `database.types.ts` + `humanos_baseline.sql` desfasados vs BD viva (faltan `leave_ledger/leave_balances/post_leave_ledger_entry/next_sequence/dedupe_key`). Regenerar desde live + revisar diff | Codex | P2 | OPEN | code | pre-Group-3 |
| CODE-ADMIN-TX | Creación admin de empleado no transaccional (`people`→`employments`→`user_settings`→invite); falla parcial deja empleado roto. Mover a RPC service-role transaccional o compensating cleanup + chequeo de errores | Codex | P2 | OPEN | code | pre-Group-3 |
| CODE-CRON | Worker de cron de notificaciones ignora `{ error }` en updates (`sent`/`markPermanent`/`markRetryable`) → reporta estado falso, duplicados o reintentos eternos | Codex (≠ BE-3b) | P2 | OPEN | code | pre-Group-3 |
| SEC-LEGACY | Schema legacy `humanos.*` con policies permisivas (`WITH CHECK true`) + 36 filas; si se re-expone, `authenticated` escribe legacy. Confirmar exposed-schemas; revocar/endurecer/droppear | Codex | P2 | OPEN | security | pre-Group-3 |
| SEC-DEPS | `npm audit` falla con highs (`path-to-regexp` via @vercel/config; `postcss` via next). NO `--force`; seguir upstream Next/Vercel + excepción documentada | Codex | P2 | OPEN | security | pre-Group-3 |
| ENV-SROLE | `SUPABASE_SERVICE_ROLE_KEY` local no valida con supabase-js (Invalid API key). Verificar local + Vercel sin imprimir/rotar secretos | Codex | P2 | OPEN (verif James/Code) | security | pre-Group-3 |
| FW-PROXY | `middleware.ts` deprecated en Next 16 → migrar a `proxy.ts` antes de Next 17 (R10/Context7) | both (Codex + nota v0.0.1) | P3 | OPEN | framework | pre-Next-17 |
| DRIVE-SPEC | Revalidar Drive (`humanos-mvp-spec.md`) antes de cambiar scope; conector falló por timeout | Codex | P3 | OPEN | docs | antes de cambio de scope |
| DB-1 | Audit triggers SECURITY DEFINER (reemplazan write app-level de audit); acoplado al ApprovalEngine | both | P2 | OPEN | DB-structure | Group 4 |
| DB-SEQRESET | `requests.next_sequence` reset por año (hoy monotónico). Validar formato `HUM-2027-0001` con SOP | mine (seq-reset) | P3 | BLOCKED-on-James | DB-data | Group 4 |
| DB-VISION-B | Retrofit soft-delete (`deleted_at` + no-hard-delete) + `source_system` + columnas sync/offline (client-uuid, updated_at server-authoritative) + bake `AND deleted_at IS NULL` en RLS de tablas `hr.*`/`requests.*` EXISTENTES. **Gap real de future-vision readiness** | mine | P2 | OPEN | DB-structure | pre-mobile/offline (Group 3/4 temprano) |
| DB-VISION-C | Columnas de compensación + custom-fields (EAV/JSONB) + completar performance/learning. YAGNI hasta la feature | mine | P3 | OPEN | DB-structure | Groups 5-7 |
| BL-3..7 | Decisiones de approval-chain en `docs/adr/0020`. BL-2 ya decidido | both | P2 | BLOCKED-on-James | docs | Group 6 (president-gated) |
| SIGNUP-formula | Fórmula `employee_code` (3 letras apellido + 3 cédula) confirmada correcta; manejar colisiones con índice único + secuencia local | mine | P2 | OPEN | DB-data | Group 3 (signup) |
| DATA-HYGIENE | Normalización de CONTENIDO (nunca auditado): split nombre/apellido, formato cédula DGI, backfill cédula (~14% poblada), dedup, addresses. Bloquea computar código Spectrum + cédula-como-identidad | mine | P2 | OPEN | DB-data | Group 3 (signup) |
| SIGNUP-guardrails | 11 reglas de seguridad no-negociables de signup (advisory §4) | mine | P2 | OPEN | security | Group 3 (signup) |
| SIGNUP-datamodel | `national_id` UNIQUE + CHECK DGI; link `employee_code`↔`person_sources`; índice único CI | mine | P2 | OPEN | DB-structure | Group 3 (signup) |
| SIGNUP-session-bug | `completeOnboardingAction` aprovisiona pero NO crea sesión → rebota a /login | mine | P2 | OPEN | code | Group 3 (signup) |
| SIGNUP-phone | Onboarding mintea `auth.users` por teléfono pero login es email-only → cuentas no-logueables | mine | P2 | OPEN | code | Group 3 (signup) |
| FE-3-full | a11y comprehensivo (keyboard nav, contraste, ARIA en todo interactivo); baseline hecho | mine | P3 | OPEN | FE | pasada a11y dedicada |
| FE-4-pwa | Íconos PWA + offline real (service worker); baseline (manifest+viewport) hecho; íconos necesitan assets | mine | P3 | BLOCKED-on-James (assets) | FE | pasada PWA dedicada |
| S1-S4 | ADR de re-secuencia de groups + First Usable Release scope + conteo honesto (~33 unidades) + reframe Decisión #5 | mine | P3 | OPEN | docs | pre-Group-3 (planning) |
| D1 | Kill split por audiencia (00-INDEX triple-stack, headers Owner/Audiencia, Constitution §7) | mine | P3 | OPEN | docs | pasada docs |
| D3 | Merge 03→02, 10→06, 04→CONTEXT.md | mine | P3 | OPEN | docs | pasada docs |
| D4 | Header de 3 líneas (Role/Read-when/Maintain-when) por doc | mine | P3 | OPEN | docs | pasada docs |
| D5 | Slim 09-ESTADO-ACTUAL a ~1 pantalla | mine | P3 | OPEN | docs | pasada docs |
| D6-slim | Quitar tokens completos + mental-model prose de CLAUDE.md (conteo de tests ya corregido) | mine | P3 | OPEN | docs | pasada docs |
| D7-demote | Mover 11-MDM + 12-SOR a `docs/future/` (naming `person_sources` ya corregido) | mine | P3 | OPEN | docs | pasada docs |
| D8 | Split 13-INTEGRATIONS por status (LIVE vs planned/ETL) | mine | P3 | OPEN | docs | pasada docs |
| D10-DOC4 | 07-SCHEMAS-PERMISOS stale (fechado 2026-05-27, counts viejos) | mine | P3 | OPEN | docs | pasada docs |
| 06-stale | 06-FRAMEWORK tiene tabla "Workflow correcto" + "Overnight phases" viejas que contradicen pipeline v2 | mine | P3 | OPEN | docs | pasada docs |
| DOC-GH-URL | 09-ESTADO dice GitHub `ICONSA-Solutions/HumanOS` pero remoto real es `jecg2804/HumanOS` | Codex | P3 | OPEN | docs | pasada docs |
| — | **DONE (no re-trabajar)** ↓ | | | | | |
| P2.24-bulk | COMMENT en 879 columnas (gap=0) — migraciones 052/053 | both | — | DONE 2026-06-01 | DB-data | — |
| D2-merge | Renumber físico de 14 ADR legacy → `docs/adr/0010-0023`; 08-ADRs.md borrado | both | — | DONE 2026-06-01 | docs | — |
| BE-2 | Idempotencia `enqueue` (`dedupe_key` + `p_dedupe_key` + callers) — migración 048 | both | — | DONE 2026-06-01 | code | — |
| BE-3b | Rollback returns chequeados en `completeOnboarding` (≠ CODE-CRON) | both | — | DONE 2026-06-01 | code | — |
| P2.23 | 68 FK covering indexes — migración 049 | both | — | DONE 2026-06-01 | DB-structure | — |
| seq (función) | `requests.next_sequence()` creada — migración 050 (authZ pendiente = SEC-SEQ) | both | — | DONE 2026-06-01 | DB-structure | — |
| P1-CI | CI verde (`verify.yml` + secrets J6) | mine | — | DONE 2026-06-01 | framework | — |
| P1-SQL | Schema baseline (`humanos_baseline.sql` por introspección) | mine | — | DONE 2026-06-01 | DB-structure | — |
| J7 | Branch protection en `main` | mine | — | DONE 2026-06-01 | framework | — |
| H1-H11 | Harness (router namespaces, Stop hook, brainstorming, subagents, CLI-first, anti-voseo guard, DROP MCPs muertos) | mine | — | DONE 2026-06-01 | framework | — |
| FE-1b | 49 hex→tokens + guard a error | mine | — | DONE 2026-06-01 | FE | — |
| FE-2 | Boundaries App Router + 5 nav links | mine | — | DONE 2026-06-01 | FE | — |
| FE-3 | a11y baseline (modal + role=alert) | mine | — | DONE 2026-06-01 | FE | — |
| FE-4 | viewport + manifest (PWA baseline) | mine | — | DONE 2026-06-01 | FE | — |
| BE-1 | Cron retry reescrito (transient vs permanent) | mine | — | DONE 2026-05-29 | code | — |
| BE-4/SEC-5 | `requireHrAdmin` a nivel ruta `/admin` | mine | — | DONE 2026-05-29 | security | — |
| J1/J2/J3/J5/J6 | ONBOARDING_TOKEN_SECRET, Sentry, MCP config, BL-2, CI secrets | mine | — | DONE | framework | — |
| 044-046 | SECURITY DEFINER revokes + scd2 audit fix + revoke requests.audit_log | mine | — | DONE 2026-05-29 | security | — |
| 039-043 | Rate-limit, drop backup, search_path pin, scd2, find_auth_user | mine | — | DONE 2026-05-28 | DB-structure | — |

---

## (a) OPEN — código/BD/seguridad pre-Group-3 (lo que DEBE terminar antes de features)

**P1**
- SEC-CONSENT — consentimiento Ley 81 antes de Step6/7 + BD de consentimiento (launch-blocker legal).
- SEC-ENQUEUE — revocar `authenticated` de `notifications.enqueue` / guard interno + `server-only`.
- MIG-DRIFT — alinear `supabase/migrations/047..051` con `supabase_migrations` (o mover a snippets); NO `db push` hasta resolver.

**P2**
- SEC-SEQ — cerrar `requests.next_sequence` (revoke authenticated / guard interno).
- TYPES-STALE — regenerar `database.types.ts` + actualizar/marcar `humanos_baseline.sql`.
- CODE-ADMIN-TX — creación admin de empleado a RPC transaccional / compensating cleanup.
- CODE-CRON — chequear `{ error }` en todos los updates del worker de cron.
- SEC-LEGACY — confirmar exposed-schemas y endurecer/droppear `humanos.*`.
- SEC-DEPS — resolver/excepcionar `npm audit` highs (sin `--force`).
- ENV-SROLE — verificar service-role local + Vercel (sin imprimir/rotar secretos).

> Nota de secuencia: SIGNUP-* y DATA-HYGIENE son P2 pero pertenecen al *diseño* de Group 3
> (signup), no a la remediación previa; se listan en la tabla maestra como "Group 3 (signup)".
> Si Group 3 se define como signup, DATA-HYGIENE + SIGNUP-datamodel/guardrails/formula se
> vuelven prerequisitos de ESE grupo.

## (b) BLOCKED-on-James (decisiones humanas)

- BL-3..7 — modos de approval-chain (`docs/adr/0020`); bloquea forms president-gated (Group 6).
- DB-SEQRESET — reset por año de numeración de tickets (validar formato con SOP); Group 4.
- FE-4-pwa (íconos) — necesita assets de diseño de James.

## (c) DONE (referencia — no re-trabajar)

Sesión 2026-06-01: P2.24-bulk, D2-merge, BE-2, BE-3b, P2.23, seq(función), P1-CI, P1-SQL,
J7, H1-H11, FE-1b, FE-2, FE-3, FE-4. Sesión 2026-05-29: BE-1, BE-4/SEC-5, 044-046, J1/J2/J3/J5/J6.
Sesión 2026-05-28: migraciones 039-043. (Detalle en `CHANGELOG.md [Unreleased]` y
`AUDITS-PENDING-CONSOLIDATED-2026-05-29.md` §0.5/§9.)
