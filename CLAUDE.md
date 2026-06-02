# CLAUDE.md — HumanOS

App HR de ICONSA (construcción Panamá). Stack: Next.js 16 + TS strict + Tailwind 4 + Supabase + Vercel. Replaces Humand ($4/user/mes). Coexiste con MovimientOS en misma BD Supabase.

**Estado actual del repo:** Group 2 (Onboarding) shipped en tag v0.0.2 (commit `32ef28b`). Group 1 (auth foundation) shipped v0.0.1. Features F1 (wizard 10 steps), F2 (login), F3 (AppShell), F4 (admin nuevo empleado), F5 (admin editar + SCD-2) + F-04-01 + F-01-09 acks + /forgot-password + /perfil + NotificationBell + Vercel Cron worker + 7 email templates Resend ya en producción. F6-F39 pendientes (Groups 3-7). Docs en `docs/` (reference/ topical + STATUS + CONTEXT + CHANGELOG + adr/; índice en `docs/reference/README.md`), harness en `.claude/` (5 ICONSA skills + 4 mattpocock + 6 hooks).

**Para el estado actual** (counts, tablas, helpers, migrations aplicadas, invite codes): consulta la BD directamente vía Supabase MCP. No duplicamos eso aquí — la BD es la fuente de verdad.

## Commands

```bash
npm run dev        # Next.js dev server on port 3001 (NOT 3000 — MovimientOS uses 3000)
npm run build      # next build
npm run start      # next start -p 3001
npm run lint       # eslint .
npm run typecheck  # tsc --noEmit
npm test           # vitest unit tests (cuenta viva en CI, no hardcodear aqui)
npm run test:e2e   # Playwright E2E specs
npm run verify     # gate completo: typecheck + lint + vitest + e2e + build
```

Tests: vitest (jsdom env, 70% coverage thresholds) + Playwright (chromium, baseURL :3001). `npm run verify` es el gate de pre-merge — Group 2 v0.0.2 lo pasó limpio.

## The mental model

HumanOS digitaliza formularios papel ICONSA. **Cada campo del SOP papel cae en UNA de 3 categorías**, y el mapping vive en `requests.types.form_schema` JSONB con `source`:

- `'profile'` — ya existe en BD (`hr.*`): nombre, cédula, cargo, supervisor, etc. **NUNCA se le pide al usuario** (prerrellenado read-only).
- `'user_input'` — lo aporta el solicitante en cada submission (motivo, fechas, montos, attachments, firmas).
- `'computed'` — derivado por sistema (antigüedad, balance vacaciones, salario con RLS) — read-only con badge "Calculado".

**Si te descubres pidiendo al usuario un campo que ya existe en BD, estás implementando mal.** La BD es source of truth; prerrellenar es el default. Field source matrix completa + pattern end-to-end: skill `iconsa-form-implementation`.

## YOU MUST follow

Estas reglas son non-negotiable. Hooks PowerShell en `.claude/hooks/` (`pre-tool-use.ps1`, `user-prompt-submit.ps1`, `post-tool-use.ps1`, `pre-compact.ps1`, `session-start.ps1`, `audit-claude-code.ps1`) bloquean violaciones físicamente; las demás son enforcement humano + skill `iconsa-business-rules`. Router de skills en `.claude/skill-rules.json`.

1. **Schemas prohibited** — NUNCA write a `public.*`, `payroll.*`, `humanos.*`. Allowed: `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*`, `mdm.*`, `etl.*`, `backup.*`.

2. **`auth.users` shared cross-app** — Destructive ops (DELETE, UPDATE mass) REQUIEREN filter por `raw_app_meta_data->'allowed_apps'` (SQL directo) o `app_metadata->'allowed_apps'` (RLS/JS). Snapshot a `backup.auth_users_YYYYMMDD` antes. Hook bloquea unfiltered. Incident 2026-05-25 erased 47 users — no repetir. Ver `@docs/reference/business-rules.md` R22.

3. **CREATE TABLE checklist obligatorio**:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + mínimo 1 policy
   - `COMMENT ON TABLE` y `COMMENT ON COLUMN` (sin esto Dashboard inutilizable)
   - Si es golden record cross-app: `{entity}_external_ids` + columna `_source`
   - Skill: `iconsa-supabase-migration`

4. **RLS strict en cada tabla nueva** — validar con skill `iconsa-rls-validation` post-creación.

5. **Helper functions ya existen en BD** — consultar vía `pg_proc` antes de crear nuevas. NO redefinir.

6. **Idioma UI**: español neutro Panamá. NUNCA voseo argentino (vos, tenés, podés, registrá-tilde, verificá-tilde). SI: tú, tienes, puedes, registra, verifica.

7. **Encoding R23**: todos los archivos config (.json, .ps1, .ts, .tsx, .md, .css) UTF-8 sin BOM. Hooks `.ps1` ASCII puro (no em-dash, no acentos, no smart quotes).

8. **No estimar tiempos** en days/weeks/months. Usar P1/P2/P3 + trivial/non-trivial/alta-complejidad.

9. **SOP-driven approval chains** — NUNCA desviarse del SOP papel sin validar con James. Ver `@docs/reference/business-rules.md` R26.

10. **Library docs check via Context7**: antes de escribir código que use Next.js, React, Tailwind, Supabase SDK, Resend, Twilio, Documenso, Zod, o cualquier librería externa, invoca Context7 (`resolve-library-id` + `get-library-docs`) para verificar APIs actuales. Tu training puede tener APIs deprecated. Caso real: Next.js 16 renombró `middleware.ts` → `proxy.ts` — sin consultar Context7, este breaking change pasa desapercibido. Ver skill `iconsa-library-docs-check`.

## Business rules R1-R27

Vivien en `@docs/reference/business-rules.md`. Las invocadas + reforzadas por skill `iconsa-business-rules`. Lee la doc o invoca el skill cuando el prompt mencione: aprobación, ticket, préstamo, vacaciones, sello, supervisor, hr_admin, schemas, allowed_apps, manual entry, datos personales/médicos, Ley 81, consentimiento. R27 = compliance Ley 81 (`@docs/reference/compliance-ley81.md`).

## Schemas y permisos

Ver `@docs/reference/schemas-permisos.md` para tabla writable vs read-only vs prohibited + helper functions + RLS patterns.

## Workflow Claude Code

Setup completo en `@docs/reference/framework.md` + integracion de skills en `@docs/superpowers/specs/2026-05-29-skill-integration-design.md`.

### Pipeline canonico (costura de 3 paradas entre Superpowers y grill)

1. `superpowers:brainstorming` -> escribe spec en `docs/superpowers/specs/`. **PARA** — no dejes que auto-encadene a writing-plans.
2. `grill-with-docs` -> grilla ESE spec contra `CONTEXT.md` + `docs/adr/`; captura ADRs antes de congelar el plan. Solo escribe `CONTEXT.md` + ADRs. **GATE: lee el backlog en `@docs/STATUS.md` (§6), filtra por el grupo + las tablas/schemas que el plan tocará, y para cada match: incluirlo en el plan o re-diferirlo con razon. No arranques el plan con matches sin resolver.**
3. `superpowers:writing-plans` (mismo spec) -> plan en `docs/superpowers/plans/` con header `**Decisions in scope:** ADR-NNNN`.
4. dev: `superpowers:executing-plans`/`subagent-driven-development` + `test-driven-development`. Lee **plan=que sigue · ADR=permitido? · CONTEXT=que significa**. `typescript-lsp` en el loop.
5. `verification-before-completion` -> `npm run verify` (+ CI).
6. review (`requesting-code-review` + `iconsa-rls-validation` + plugins `code-review`/`security-guidance`) -> `finishing-a-development-branch` + `commit-commands`.

Bugs duros: `diagnose` / `systematic-debugging`. Per feature: E2E happy path + edge case + RLS validation + tsc/lint/build clean. No apilar GSD/gstack/ECC/Ralph (caos de skills compitiendo — ver design doc).

## Conditional imports (load when relevant)

- Implementando form/feature: `@docs/reference/domain.md` (catálogo formularios + dominio)
- Implementing approval chain: leer SOP relevante en `docs/sops/` (Filesystem MCP, NO Google Drive)
- Past decisions: `@docs/adr/README.md` (canonical index) + `@docs/adr/*.md`
- Vocabulario en duda: `@docs/CONTEXT.md` (vivo, mantén con grill-with-docs)
- MDM foundational (aspiracional): `@docs/future/11-MDM-PRINCIPLES.md` + `@docs/future/12-SOR-MATRIX.md`
- Integraciones LIVE (email/cron/hosting/monitoring): `@docs/reference/integrations.md` · planned/ETL: `@docs/future/13-INTEGRATIONS-PLANNED.md`
- Estado actual operacional: `@docs/STATUS.md` + estado vivo en BD

## ICONSA custom skills

Disponibles en `.claude/skills/iconsa-*/`. Auto-triggered por hook `user-prompt-submit.ps1` según `.claude/skill-rules.json`.

- `iconsa-business-rules` — R1-R27 enforcement (critical)
- `iconsa-supabase-migration` — migrations workflow (critical)
- `iconsa-rls-validation` — RLS post-change validation (high)
- `iconsa-form-implementation` — end-to-end pattern por form (high)

## Promise mechanism

Declarar al inicio overnight:
```xml
<promise>MVP_COMPLETE</promise>
```

Redimir cuando: features F1-F39 done (lista en `@docs/reference/mvp-scope.md`) + tsc/lint/build clean + docs vivos actualizados (CONTEXT.md, adr/*, CHANGELOG). Tests E2E se sumarán cuando el framework esté instalado.

Si partial: `<promise>PARTIAL_MVP</promise>` con lista explícita.

## Project constitution

`@PROJECT_CONSTITUTION.md` — principios non-negotiable + R1-R27.

## Anti-patterns Code

- ❌ Hardcodear UUIDs en migrations
- ❌ Crear tablas sin RLS habilitada
- ❌ Crear columnas sin COMMENT
- ❌ DELETE/UPDATE de tablas críticas sin WHERE
- ❌ Modificar archivos en `public.*`, `payroll.*`, `humanos.*`
- ❌ Confiar en memoria de SOPs — leer PDFs en `docs/sops/` (NO Google Drive MCP, no está habilitado)
- ❌ Desviarse de R26 sin documentar + validar con James
- ❌ Implementar logic per-form custom — usar FormEngine + ApprovalEngine
- ❌ Hardcodear chain steps — están en `requests.types.approval_chain_template`
- ❌ Duplicar info que BD ya tiene — consultar via MCP

## Design Tokens

Single source of truth: `src/app/globals.css` (`--color-navy-*`, `--color-gold-*`, semantic tokens para status). NO hardcodear hex en componentes — usar los tokens. Brand: Navy `#1B3A5C` + Gold `#F0A500`.
