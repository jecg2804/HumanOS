# HumanOS — Reporte Consolidado de Pendientes de Auditoría

**Fecha:** 2026-05-29
**Propósito:** Backlog maestro único de TODO lo pendiente de las auditorías realizadas (2026-05-28 Batches 1-4, 2026-05-29 multi-agente x2). Se folddea al nuevo set canónico cuando se reestructuren los docs.
**Idioma:** Español neutro Panamá (R15/R6 — sin voseo).

---

## 0. RATIFICADO por James (2026-05-29) — base de toda la remediación

1. **Doc set** → 9 canónicos + `docs/future/`, re-key por rol+cadencia, merge de los 2 ledgers de ADR en uno.
2. **Harness** → DROP GitHub/Filesystem/Puppeteer/Resend MCPs + setup-matt-pocock-skills; reconciliar config enabled/disabled; fix namespaces del router + tool fantasma `get_advisors`; INSTALL Stop hook + brainstorming; CLI-first (gh/vercel/supabase).
3. **SDLC** → loop de 6 fases; 2 actores (Code lee el repo DIRECTO; Chat recibe snapshot vía repomix — NO leen el mismo bundle); comprehension gate no-saltable para auth/RLS.
4. **Los 3 P1 de madurez** (CI, schema versionado, Ley 81/R27) → trabajo comprometido ANTES de más breadth.
5. **First Usable Release = TODOS los formularios** (decisión de producto de James). Orden de construcción: engine + CARTA_TRABAJO + UI de tickets primero (de-risk), luego el resto como config.
6. **BD diseñada para la VISIÓN FINAL, no el MVP** — incluye lo necesario para mobile + offline + cross-app/MDM. YAGNI en tablas especulativas; rigor en cimientos.
7. **W1-W2-W3 RECHAZADO** — re-secuenciar dentro del vocabulario de groups/tags existente.
8. **VACACIONES** → construir `hr.leave_balances` + accrual ledger (NO descopear), consistente con #6.

**Decisiones aún abiertas (James/Samantha):** BL-2 (presidente self-approval) + BL-3..7 (ADR-0011).

---

## 1. PENDIENTE — Acciones de James (infra/legal, Code no puede)

| # | Item | Estado | Notas |
|---|------|--------|-------|
| J1 | `ONBOARDING_TOKEN_SECRET` en Vercel | ✅ HECHO | James lo agregó 2026-05-29 |
| J2 | Proyecto Sentry + DSN | ✅ HECHO | Wizard creó el proyecto; DSN como fallback env-overridable. Code reconcilió a R13-safe (commit cce3f06) |
| J3 | Reconciliar config MCP (`~/.claude.json` disabled vs `settings.local.json` enabled) | PENDIENTE | 4 MCPs inertes. Code edita los del repo; `~/.claude.json` es user-level (James, o confirmar que Code lo edite) |
| J4 | Revisión legal Ley 81/2019 | PENDIENTE | Code redacta compliance doc + R27; el sign-off legal es humano (abogado Panamá) |
| J5 | BL-2 (presidente self-approval) | ✅ DECIDIDO | (a) omitir el paso + flag de auditoría (no hay autoridad sobre el presidente). Falta capturar en ADR-0011 |
| J6 | GitHub Actions secrets para el job `build` de CI | PENDIENTE (James) | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ONBOARDING_TOKEN_SECRET` (+ opcional `SENTRY_ORG/PROJECT/AUTH_TOKEN`) |
| J7 | Branch protection en `main` | Code puede (post-CI) | Code lo activa vía `gh` tras CI verde + git-flow decidido |
| — | BL-3..7 (ADR-0011) | PENDIENTE | Decisión James/Samantha |

---

## 2. PENDIENTE — Los 3 P1 de madurez (nuevos, mayor ROI)

| # | Item | Detalle |
|---|------|---------|
| P1-CI | `.github/workflows/verify.yml` + branch protection | verify (tsc+lint+vitest+e2e+build) + gitleaks + `npm audit --audit-level=high`. Hoy verify es manual. Mayor ROI single-artifact |
| P1-SQL | Schema versionado | `supabase db pull` → commit a `supabase/migrations/`. Hoy 0 archivos .sql; 43 migraciones solo en remoto. Todo DDL futuro como SQL committeado, revisado como diff |
| P1-LEY81 | Compliance Ley 81 + R27 | Doc de compliance + R27: consentimiento en onboarding, retención (límite 7 años), breach runbook, ack de confidencialidad hr_admin, derecho de acceso/rectificación |

---

## 3. PENDIENTE — Framework / Harness (remediación del Operating Model)

Detalle completo en `docs/superpowers/specs/2026-05-29-operating-model-and-groups-verdict.md`. Resumen accionable:

| # | Item | Tipo |
|---|------|------|
| H1 | Fix router namespaces (`superpowers:writing-plans`, etc.) — hoy emite nombres bare → `Skill(name)` no resuelve | P1 bug |
| H2 | Fix `post-tool-use.ps1` tool fantasma `mcp__supabase__get_advisors` → `mcp__plugin_supabase_supabase__get_advisors` | P2 bug |
| H3 | INSTALL Stop hook (advisory primero: corre/recuerda verify si tocó .ts/.tsx/.sql) | Install |
| H4 | INSTALL brainstorming en el router (suggest) | Install |
| H5 | Subir requesting-code-review a `high` + agregar receiving-code-review | Config |
| H6 | DROP MCPs: GitHub, Filesystem, Puppeteer, Resend (duplicado) | Cleanup |
| H7 | DROP skill `setup-matt-pocock-skills` (muerto) | Cleanup |
| H8 | Single-source la lista de helper functions (hoy duplicada 4×) en iconsa-supabase-migration | Cleanup |
| H9 | **Lint guard anti-voseo** en .tsx/.ts (como el de hex) — R15/R6 enforceable | P1 NUEVO |
| H10 | Crear subagents `.claude/agents/`: rls-reviewer, migration-reviewer, sop-chain-auditor, test-runner | Install |
| H11 | CLI-first: promover `gh` (reemplaza GitHub MCP), wire `vercel`, wire `supabase` | Config |

---

## 4. PENDIENTE — Docs (reestructura del set canónico)

| # | Item |
|---|------|
| D1 | Kill el split por audiencia (00-INDEX triple-stack, ADR-0007, headers Owner/Audiencia, Constitution §7) |
| D2 | Merge 08-ADRs.md → docs/adr/ (un solo ledger, renumerar una vez, borrar tabla cross-ref); README index leído primero |
| D3 | Merge 03 → 02 (deferred); merge 10 → 06 (process doc); 04 vocab → CONTEXT.md |
| D4 | Header de 3 líneas por doc (Role / Read-when / Maintain-when) |
| D5 | Slim 09-ESTADO-ACTUAL a ~1 pantalla (fase + in-flight + blockers + decisiones humanas) |
| D6 | CLAUDE.md < 200 líneas; quitar párrafo de live-status (stale: dice 8 files/58 tests vs CHANGELOG 9/65) + mental-model prose + tokens completos |
| D7 | Demote 11-MDM + 12-SOR a docs/future/; **fix contradicción `hr.people_external_ids`** (existe en 11/12, no en 09 → marcar PLANNED) |
| D8 | Split 13-INTEGRATIONS por status (LIVE vs planned/ETL→future) |
| D9 | Corregir `repomix.config` para que el snapshot de Chat incluya el set canónico correcto |
| D10 | DOC-3 (naming people_external_ids→person_sources en docs MDM), DOC-4 (07-SCHEMAS stale) — del audit 2026-05-29 |

---

## 5. PENDIENTE — Código / Backend

| # | Item | Origen |
|---|------|--------|
| BE-2 | Idempotencia en enqueue de notificaciones | Audit 2026-05-29 |
| BE-3b | Chequear return values de rollback en mutaciones Supabase (parte Sentry ya hecha) | Audit 2026-05-29 |
| BE-4 | (HECHO) admin route guard | ✅ commit 5ad21c4 |

---

## 6. PENDIENTE — Frontend

| # | Item | Origen |
|---|------|--------|
| FE-1b | Migrar ~47 hex hardcoded → design tokens (26 archivos); luego subir el lint guard de warn→error | Audit 2026-05-29 (guard warn ya puesto) |
| FE-2 | Agregar loading.tsx / error.tsx / not-found.tsx + arreglar 5 nav links rotos | Audit 2026-05-29 |
| FE-3 | a11y: labels, role=alert, focus management en dialogs | Audit 2026-05-29 |
| FE-4 | Mobile-first + PWA (manifest/viewport) — **ahora con peso: James quiere apps móviles + offline** | Audit 2026-05-29 + directiva 2026-05-29 |

---

## 7. PENDIENTE — Base de Datos

| # | Item | Origen |
|---|------|--------|
| DB-1 | Audit triggers SECURITY DEFINER (reemplazan el write app-level de audit) | Audit 2026-05-29 |
| DB-VISION | **Sub-proyecto: diseño de schema para la VISIÓN FINAL** — leave_balances+accrual, people_external_ids (MDM), columnas comp, custom-fields, columnas sync/soft-delete/UUID-cliente para offline+mobile, performance/learning | Directiva James 2026-05-29 |
| P2.23 | FK indexes (63 sin indexar, hot en requests.tickets) | Audit 2026-05-28 (diferido) |
| P2.24 | COMMENT ON COLUMN backfill (38 tablas, peor hr.user_settings) | Audit 2026-05-28 (diferido) |
| seq | `requests.sequences` sin policy → crear `requests.next_sequence()` definer antes del primer ticket | Audit 2026-05-28 |

---

## 8. PENDIENTE — Decisiones de scope/secuencia (a ADR)

| # | Item |
|---|------|
| S1 | Re-secuencia de grupos (Group 3 perfil/dir; Group 4 = slice CARTA_TRABAJO + UI; G5 forms simples; G6 forms president-gated; G7 extras) — capturar en 1 ADR |
| S2 | First Usable Release = todos los forms (scope) con orden de construcción de-risk (engine+1 form primero) |
| S3 | Conteo honesto: ~33 unidades de build, no 39 (ACCION_PERSONAL = 1 familia) |
| S4 | Reframe Decision #5 de 01-VISION ("39 = catálogo completo" + "First Usable Release" = milestone) |

---

## 9. HECHO (referencia rápida — no re-trabajar)

- **BD:** migraciones 039-046 (rate-limit, drop backup, search_path, scd2 fix, revoke grants seguridad, revoke requests.audit_log). Advisors críticos resueltos. Data API expuesto (hr/notifications/audit) por James.
- **Seguridad:** cluster SECURITY DEFINER revokes (044), find_auth_user regresión corregida.
- **Código:** BE-1 Cron retry reescrito; cluster audit-log/actor (DB-5); admin route guard (BE-4/SEC-5); requireHrAdmin; token HMAC onboarding; open-redirect fix.
- **Observabilidad:** Sentry + Vercel Analytics cableados (R13-safe), `reportError` sink. (commit a43081b)
- **Docs:** DOC-2 (ROADMAP revertido, refs corregidas). 09-ESTADO sincronizado.
- **Lint:** guard anti-hex (warn-level).

Commits clave de la sesión: 8b95fdd, 4f64ba5, 5ad21c4, 61d5be0, 24dfca8, a43081b.
