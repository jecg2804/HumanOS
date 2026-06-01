# 09-ESTADO-ACTUAL.md — Snapshot live del proyecto

**Role:** snapshot volátil de fase + work in-flight + blockers + decisiones humanas pendientes. · **Read-when:** al abrir cualquier sesión, primero. · **Maintain-when:** cada sesión — "qué se hizo, qué sigue, qué bloqueo existe".

**Última actualización**: 2026-06-01

> Doc **volátil y corto** por diseño (~1 pantalla). Los counts (rows, migrations aplicadas, tablas, policies) NO se duplican aquí — **consulta la BD vía Supabase MCP** (fuente de verdad) y `CHANGELOG.md` para el log por feature/commit. Aquí solo va el estado de mando: fase, in-flight, blockers, decisiones humanas.

---

## Fase actual

- **Group 2 (Onboarding) shipped** en tag `v0.0.2` (commit `32ef28b`). Group 1 (Foundation) en `v0.0.1`.
- **Group 3 (Profile + KB) en planning.** Trabajo directo en `main` (greenfield, sin users productivos).
- Dos auditorías integrales corridas (2026-05-28 + 2026-05-29 full multi-agent). Remediación 2026-05-29 (clusters SEC/BE/DB) DONE. Audit 2026-06-01: docs restructure (esta pasada) + items no-bloqueantes.
- **Config Data API**: exposed-schemas incluye `hr`, `notifications`, `audit` (resuelto 2026-05-29; `humanos` removido por R1).

## Work in-flight / próximo

- **Docs restructure (D1-D10)** en curso esta sesión: ADR merge (D2) DONE; consolidación/democión/slim (D3/D5/D7/D8) + headers (D4) en esta pasada. Ver `docs/superpowers/specs/2026-06-01-docs-restructure-plan.md`.
- **Pre-Group-3**: cerrar fixes pendientes de audit (Batch 3 code-security, Batch 4 BD-hardening) + `form_schema` backfill para los 15 tipos sin schema (workflow vía skill `iconsa-form-implementation`).
- **Group 3 scope** (per `02-MVP-SCOPE.md`): F6 `/perfil` base · F7 `/perfil/editar` SCD-2 admin · F8 `/directorio` · F9 `/ayuda` KB full-text.
- **Pre-Group-5 (data layer paridad)**: leave_balances/accrual ledger, columnas réplica comp.

## Decisiones humanas pendientes (James / Samantha)

- **Pre-Group-4 engines** (ver `docs/adr/0020-approval-chain-template-jsonb-modes.md`): BL-2 presidente self-approval DECIDIDO (omitir paso + flag auditoría); pendientes BL-3 form_schema source en 8 seeds, BL-4 `requests.next_ticket_number` + reset anual, BL-5 enum `Devuelta_Info` huérfano, BL-6 SLA escalación, BL-7 reglas delegación.
- **"Gerencia General" ≠ President**: validar con Samantha si VP Ferrer y/o otros gerentes entran en `parallel` mode (deferred v1.1). MVP asume solo Rodrigo.
- **app_role de Javier Ferrer (FER337)**: actualmente `admin`, a revisar con Samantha.
- **Drifts diferidos a ADR de framework/constitution audit (~próximo número en `docs/adr/`)**: Constitution 5.7 (daily-dev prohibido vs E2E-suite-temporal permitido con cleanup), 6.1 (specs folder claim), R13 wording (DELETE special case hr_admin).

## Hosting

| App | Custom domain | Vercel project |
|---|---|---|
| MovimientOS | `rein-eisenwerk.com` | `prj_o28h5tYDskqF3AjBg1w5W3F3fYu4` |
| HumanOS | `humanos.rein-eisenwerk.com` | `prj_DqJQEL9LJ5qcwkw8Et6WYUpUxiLQ` |

Repo: `ICONSA-Solutions/HumanOS`. Email worker: Vercel Cron `/api/cron/process-notifications` (`*/5 * * * *`). Dominio Resend verificado: `rein-eisenwerk.com`. Detalle de integraciones en `13-INTEGRATIONS-INDEX.md`.

## Bloqueos / riesgos

| Riesgo | Mitigación |
|---|---|
| Overnight no completa | HANDOFF.json via hook PreCompact; resume en próxima sesión |
| Form schemas mal diseñados | Code lee SOPs primero + skill `iconsa-form-implementation` |
| RLS policies rotas | Skill `iconsa-rls-validation` + subagent `rls-reviewer` antes de feature done |
| Personal de campo no completa sign-up | F32 manual entry: hr_admin completa en su nombre |
| Encoding BOM/non-ASCII (R23) | Hook PostToolUse valida |

## Quick reference — al abrir sesión

1. **Code**: lee `CLAUDE.md` raíz → `docs/05-BUSINESS-RULES.md` (R1-R27) → `docs/07-SCHEMAS-PERMISOS.md` → `docs/CONTEXT.md` → skills `iconsa-*`. Documenta decisiones en `docs/adr/`, mantén `CHANGELOG.md` per commit.
2. **Estado real de BD**: Supabase MCP `execute_sql` / `list_migrations` (NO confiar en counts hardcodeados en docs).
3. **Últimos commits / features**: `CHANGELOG.md`.
4. **Deployment status**: Vercel MCP.
