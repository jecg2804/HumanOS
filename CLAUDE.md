# CLAUDE.md — HumanOS

App HR de ICONSA (construcción Panamá). Stack: Next.js 16 + TS strict + Tailwind 4 + Supabase + Vercel. Replaces Humand ($4/user/mes). Coexiste con MovimientOS en misma BD Supabase.

**Estado actual del repo:** Group 2 (Onboarding) shipped en tag v0.0.2 (commit `32ef28b`). Group 1 (auth foundation) shipped v0.0.1. Features F1 (wizard 10 steps), F2 (login), F3 (AppShell), F4 (admin nuevo empleado), F5 (admin editar + SCD-2) + F-04-01 + F-01-09 acks + /forgot-password + /perfil + NotificationBell + Vercel Cron worker + 7 email templates Resend ya en producción. F6-F39 pendientes (Groups 3-7). Docs strategy vivos en `docs/` (14 numerados + CONTEXT + CHANGELOG + HANDOFF), harness en `.claude/` (5 ICONSA skills + 4 mattpocock + 5 hooks firing).

**Para el estado actual** (counts, tablas, helpers, migrations aplicadas, invite codes): consulta la BD directamente vía Supabase MCP. No duplicamos eso aquí — la BD es la fuente de verdad.

## Commands

```bash
npm run dev        # Next.js dev server on port 3001 (NOT 3000 — MovimientOS uses 3000)
npm run build      # next build
npm run start      # next start -p 3001
npm run lint       # eslint .
npm run typecheck  # tsc --noEmit
npm test           # vitest unit tests (8 archivos, 58 tests al cierre v0.0.2)
npm run test:e2e   # Playwright E2E specs (6 al cierre v0.0.2)
npm run verify     # gate completo: typecheck + lint + vitest + e2e + build
```

Tests: vitest (jsdom env, 70% coverage thresholds) + Playwright (chromium, baseURL :3001). `npm run verify` es el gate de pre-merge — Group 2 v0.0.2 lo pasó limpio.

## The mental model

HumanOS digitaliza formularios papel ICONSA. **Cada campo del SOP papel cae en UNA de 3 categorías**:

1. **Identidad** (`source: 'profile'`) — ya existe en BD (`hr.people`, `hr.employments`, `hr.org_units`, `hr.positions`, `hr.locations`). NUNCA pedir al usuario: nombre, cédula, employee_code, cargo, departamento, ubicación, supervisor, foto, fecha contratación, tipo contrato.

2. **Input nuevo** (`source: 'user_input'`) — lo da el solicitante en cada submission: motivo, fechas específicas, montos, descripciones, attachments, firmas.

3. **Computed** (`source: 'computed'`) — derivado por sistema: antigüedad, días vacaciones disponibles, salario (con RLS), status, chain preview.

Code lee cada SOP papel (PDF en `docs/sops/` versionados en repo), identifica cada campo, y lo mapea a una de las 3 categorías. El mapping vive en `requests.types.form_schema` JSONB con `source: 'profile' | 'user_input' | 'computed'`. FormEngine renderiza: profile prerrellenados read-only opacidad reducida, user_input editables, computed read-only con badge "Calculado".

**Si te descubres pidiendo al usuario un campo que ya existe en BD, estás implementando mal.** La BD es source of truth. Prerrellenar es el default. Ver skill `iconsa-form-implementation` para field source matrix completa.

## YOU MUST follow

Estas reglas son non-negotiable. Hooks PowerShell en `.claude/hooks/` (`pre-tool-use.ps1`, `user-prompt-submit.ps1`, `post-tool-use.ps1`, `pre-compact.ps1`, `session-start.ps1`, `audit-claude-code.ps1`) bloquean violaciones físicamente; las demás son enforcement humano + skill `iconsa-business-rules`. Router de skills en `.claude/skill-rules.json`.

1. **Schemas prohibited** — NUNCA write a `public.*`, `payroll.*`, `humanos.*`. Allowed: `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*`, `mdm.*`, `etl.*`, `backup.*`.

2. **`auth.users` shared cross-app** — Destructive ops (DELETE, UPDATE mass) REQUIEREN filter por `raw_app_meta_data->'allowed_apps'` (SQL directo) o `app_metadata->'allowed_apps'` (RLS/JS). Snapshot a `backup.auth_users_YYYYMMDD` antes. Hook bloquea unfiltered. Incident 2026-05-25 erased 47 users — no repetir. Ver `@docs/05-BUSINESS-RULES.md` R22.

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

9. **SOP-driven approval chains** — NUNCA desviarse del SOP papel sin validar con James. Ver `@docs/05-BUSINESS-RULES.md` R26.

10. **Library docs check via Context7**: antes de escribir código que use Next.js, React, Tailwind, Supabase SDK, Resend, Twilio, Documenso, Zod, o cualquier librería externa, invoca Context7 (`resolve-library-id` + `get-library-docs`) para verificar APIs actuales. Tu training puede tener APIs deprecated. Caso real: Next.js 16 renombró `middleware.ts` → `proxy.ts` — sin consultar Context7, este breaking change pasa desapercibido. Ver skill `iconsa-library-docs-check`.

## Business rules R1-R26

Vivien en `@docs/05-BUSINESS-RULES.md`. Las invocadas + reforzadas por skill `iconsa-business-rules`. Lee la doc o invoca el skill cuando el prompt mencione: aprobación, ticket, préstamo, vacaciones, sello, supervisor, hr_admin, schemas, allowed_apps, manual entry.

## Schemas y permisos

Ver `@docs/07-SCHEMAS-PERMISOS.md` para tabla writable vs read-only vs prohibited + helper functions + RLS patterns.

## Workflow Claude Code

Setup framework completo en `@docs/06-FRAMEWORK-CLAUDE-CODE.md`.

Resumen overnight:
1. **grill-with-docs** (mattpocock) — interview riguroso con James antes de specs. Mantiene `docs/CONTEXT.md` + `docs/adr/*` vivos.
2. **writing-plans** (Superpowers) — specs JTBD por feature/grupo, código completo en steps, self-review (coverage, placeholders, type consistency).
3. **executing-plans** o **subagent-driven-development** — implementación con TDD red-green-refactor.
4. **verification-before-completion** — gate por feature: tests + lint + tsc + build + RLS check.
5. **finishing-a-development-branch** — cierre overnight.

Per feature: tests E2E happy path + 1+ edge case + RLS validation + tsc + lint + build clean.

## Conditional imports (load when relevant)

- Implementando form/feature: `@docs/04-DOMAIN-RRHH.md` (catálogo formularios + dominio)
- Implementing approval chain: leer SOP relevante en `docs/sops/` (Filesystem MCP, NO Google Drive)
- Past decisions: `@docs/08-ADRs.md` + `@docs/adr/*.md` (Code-generated)
- Vocabulario en duda: `@docs/CONTEXT.md` (vivo, mantén con grill-with-docs)
- MDM foundational: `@docs/11-MDM-PRINCIPLES.md` + `@docs/12-SOR-MATRIX.md`
- Integraciones externas: `@docs/13-INTEGRATIONS-INDEX.md`
- Estado actual operacional: `@docs/09-ESTADO-ACTUAL.md` + estado vivo en BD

## ICONSA custom skills

Disponibles en `.claude/skills/iconsa-*/`. Auto-triggered por hook `user-prompt-submit.ps1` según `.claude/skill-rules.json`.

- `iconsa-business-rules` — R1-R26 enforcement (critical)
- `iconsa-supabase-migration` — migrations workflow (critical)
- `iconsa-rls-validation` — RLS post-change validation (high)
- `iconsa-form-implementation` — end-to-end pattern por form (high)

## Promise mechanism

Declarar al inicio overnight:
```xml
<promise>MVP_COMPLETE</promise>
```

Redimir cuando: features F1-F39 done (lista en `@docs/02-MVP-SCOPE.md`) + tsc/lint/build clean + docs vivos actualizados (CONTEXT.md, adr/*, CHANGELOG). Tests E2E se sumarán cuando el framework esté instalado.

Si partial: `<promise>PARTIAL_MVP</promise>` con lista explícita.

## Project constitution

`@PROJECT_CONSTITUTION.md` — principios non-negotiable + R1-R26.

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

```text
Navy:   #1B3A5C  (primary — headers, nav, branding)
Gold:   #F0A500  (accent — ICONSA brand)
Blue:   #0A6EBD  (info, links, estado Enviada)
Green:  #1A7F5A  (success, Completada)
Orange: #B45309  (warning, Urgente, En Proceso)
Red:    #C0392B  (error, Vencida, Cancelada)
Purple: #553C9A  (Programada, asignaciones)
Gray:   #5A6272  (secondary text)
```
