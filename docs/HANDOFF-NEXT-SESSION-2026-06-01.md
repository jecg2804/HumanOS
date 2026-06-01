# Handoff — próxima sesión Code (2026-06-01)

**Misión #1:** el **pase comprehensivo de diseño de BD (schema-first)** — el gate real antes de Groups 3+.
James decidió: diseñar la BD COMPLETA antes de código de features. Ver principio en memoria
`feedback_schema_first_no_silent_defers` y `@docs/DEFERRED-ITEMS.md`.

## Estado (lo que ya quedó listo — no re-trabajar)

Sesión 2026-06-01: ~11 commits, `main` pusheado, gate verde. Detalle en `@docs/CHANGELOG.md` [Unreleased]
y `@docs/AUDITS-PENDING-CONSOLIDATED-2026-05-29.md` §0.5.

- ✅ Docs: restructure D1-D10 + 06-stale; set canónico; ADR ledger ÚNICO en `docs/adr/0001-0023` (08-ADRs borrado); CLAUDE.md 134 líneas.
- ✅ P2.24 COMMENT backfill gap=0/879. ✅ FK indexes (049). ✅ next_sequence (050). ✅ notif idempotencia (048). ✅ rollback-returns.
- ✅ Harness: Stop hook, 4 subagents, router, CLI-first, anti-voseo/hex guards (error), CI verde, branch protection.
- ✅ Signup mini-audit → `@docs/superpowers/specs/2026-06-01-signup-advisory.md`. Fix seguridad: invite codes con CSPRNG (no más Math.random).
- ✅ migración 047 leave ledger (DB-VISION Parte A).

## El principio que rige la próxima sesión

**Forma del esquema = AHORA. Valores de política/config = después (como data, dentro del group).**
- AHORA: toda tabla/columna/constraint/índice/RLS/policy/exposed-schema que se pueda determinar con confianza de la visión (groups 3-7 + offline + MDM + cimientos: soft-delete `deleted_at`+`deleted_by`, `source_system`, hooks audit/MDM).
- DESPUÉS (data en el group): SLA durations, reglas de delegación, `form_schema` por-form, `approval_chain_template`.
- Regla: "¿puedo determinar la forma con confianza ahora?" sí→ahora. Si la forma depende de lógica de feature no diseñada → se ARGUMENTA y James decide (nunca defer en silencio).

## Plan de la próxima sesión (ordenado)

1. **LEER el audit de Codex** `docs/AUDIT-HANDOFF-CLAUDE-CODE-2026-06-01.md` (untracked) — foldearlo a este plan.
2. **Pase comprehensivo de diseño de BD** (multi-agente, exhaustivo): esquema ACTUAL (ver `supabase/schemas/humanos_baseline.sql`) vs VISIÓN COMPLETA (groups 3-7 + offline/mobile + MDM + cimientos transversales). Producir un **doc de diseño** (cada gap con forma propuesta + argumento; lo "forma-depende-de-feature" marcado para decisión de James). **James aprueba ANTES de migrar.** Luego implementar con rls-reviewer + migration-reviewer + verify. Acceso BD: MCP `mcp__claude_ai_Supabase__*` (project `bzeoszympkkicwlfdtcn`) — el plugin Supabase MCP se desconectó; cargar el de claude.ai vía ToolSearch.
3. **Data-hygiene (CONTENIDO, nunca auditado):** split nombre/apellido (no hay columna `apellido`), formato cédula DGI, backfill (~14% con cédula), dedup, `addresses`. Prerequisito de signup (código Spectrum = 3 apellido + 3 cédula — fórmula CONFIRMADA por James; falla solo por data sucia). Ver `DEFERRED-ITEMS.md` DATA-HYGIENE.
4. **FE-3 a11y** pasada profunda (teclado, contraste, ARIA). Autónomo.
5. **Items que Code DEFINE (no son decisión de James):** BL-5 `Devuelta_Info` (huérfano → proponer eliminar o sumar status); BL-3 `form_schema` sources (derivar de SOPs en `docs/sops/`); BL-4 reset anual ticket (default: sí resetea); **FE-4 íconos** (James puso logos en raíz: `Iconsa 20years HORIZ png transp.png`, `...VERT...`, `Iconsa-2011-trans2.png` → generar PNG cuadrados 192/512 maskable, moverlos a `public/`).

## Decisiones genuinas de James (NO bloquean la forma del esquema — son data/policy en Group 4/6)

- BL-6 (SLA + escalación al vencer step), BL-7 (delegación de aprobaciones) → `docs/adr/0020-approval-chain-template-jsonb-modes.md`. Code propone defaults; James decide.
- 6 decisiones de signup → `signup-advisory.md` §6 (email canónico vs co-igual, SSO Google, obra sin mailbox, formato código fallback, `employee_code` vs `login_alias`, deprecar phone-as-identifier).

## Punteros clave

- Registro autoritativo de diferidos + GATE del pipeline: `@docs/DEFERRED-ITEMS.md`.
- Plan de reestructura (ya ejecutado, referencia): `docs/superpowers/specs/2026-06-01-docs-restructure-plan.md`.
- Framework v2: `docs/superpowers/specs/2026-05-29-skill-integration-design.md` + CLAUDE.md §Pipeline.
- Diseño DB-VISION previo (Parte A + foundations): `docs/superpowers/specs/2026-05-29-db-vision-design.md`.
