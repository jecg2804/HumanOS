# Framework — Setup Claude Code + workflow

**Role:** setup del harness Code (marketplaces, skills, subagents, hooks) + pipeline de desarrollo + sistema de documentación + protocolo de handoff Chat/Code/Jaime. · **Read-when:** al configurar el entorno, decidir qué skill usar en cada fase, mantener docs, o coordinar un handoff. · **Maintain-when:** cambia el harness, el pipeline, los hooks, el sistema de docs, o el protocolo de handoff.

---

## Setup Claude Code

- Versión: Claude Code 2.1.150
- OS: Windows 11
- Shell: PowerShell 5.1
- Repo: `C:\Users\Jaime Cucalon\Documents\iconsa_apps\HumanOS`
- Branch trabajo: `main` directo (greenfield, sin users productivos)

### Marketplaces instalados (4)

1. `claude-code-plugins` (oficial)
2. `openai-codex`
3. `claude-plugins-official`
4. `superpowers-marketplace` (mattpocock + comunidad)

### Plugins core (~20 instalados)

- **superpowers** (workflow harness, writing-plans, executing-plans, subagent-driven-development, verification-before-completion, finishing-a-development-branch, brainstorming)
- **supabase** (MCP integration)
- **vercel** (MCP)
- **playwright** (E2E tests)
- **frontend-design** (UI patterns)
- **context7** (docs library)
- mattpocock skills (project scope, instaladas en `.claude/skills/`): **grill-with-docs**, **handoff**, **diagnose**, **setup-matt-pocock-skills**
- ICONSA custom skills (project scope, instaladas en `.claude/skills/`): **iconsa-business-rules**, **iconsa-supabase-migration**, **iconsa-rls-validation**, **iconsa-form-implementation**, **iconsa-library-docs-check**

### MCPs y CLI-first (reconciliado audit 2026-05-29, H6/H11)

**Política CLI-first:** preferimos CLIs sobre MCPs cuando existe equivalente, porque son más auditables, no consumen tokens de schema y ya están autenticadas:

- **`gh`** (GitHub CLI) reemplaza el GitHub MCP — PRs, issues, branch protection, secrets, CI runs.
- **`supabase`** CLI para link/dump local; el **Supabase MCP** sigue siendo el camino para `apply_migration`/`execute_sql`/`get_advisors` (no requiere Docker). **Dos capas (F-10):** el `.mcp.json` repo-visible está en `read_only=true` (solo lectura, reproducible); las escrituras DDL (`apply_migration`) vienen del MCP del **plugin/usuario**, que NO es repo-visible. Además el **prefijo del tool varía por entorno** (`mcp__plugin_supabase_supabase__*`, `mcp__claude_ai_Supabase__*`, o un id de sesión) — cargar vía ToolSearch y usar el que esté disponible; no asumir un nombre fijo. Si `apply_migration` no está disponible, NO planear DDL en esa sesión.
- **`vercel`** CLI para env/deploy/logs (recomendado instalar: `npm i -g vercel`).

**MCPs activos (set honesto):**

- A nivel proyecto (`.mcp.json`): **solo Context7 + next-devtools**. Se DROPPEARON GitHub, Filesystem, Puppeteer, Resend y Sentry MCPs (duplicaban CLIs o no se usaban). Pinned a versión específica (no `@latest`).
- A nivel global (settings.json usuario, compartido con MovimientOS — NO tocar): Supabase plugin, Vercel plugin, Playwright plugin, chrome-devtools-mcp plugin.

---

## Pipeline canónico v2 (la fuente es CLAUDE.md §Workflow + skill-integration-design)

El pipeline operativo es el de 8 etapas (costura de 3 paradas entre Superpowers y grill). Esta es la referencia; el detalle de diseño está en `@docs/superpowers/specs/2026-05-29-skill-integration-design.md`.

```
BRAINSTORM ─► SPEC ─► GRILL(spec) ─► PLAN ─► DEV(plan+ADRs+CONTEXT) ─► VERIFY ─► REVIEW ─► CLOSE
```

| Etapa | Skill primario | Plugin dormido que se despierta |
|---|---|---|
| Brainstorm | `superpowers:brainstorming` (escribe spec, **PARA**) | — |
| Grill | `grill-with-docs` (grilla el spec vs CONTEXT/ADRs; **gate del backlog en `STATUS.md`**) | `claude-md-management` (solo en doc-drift) |
| Plan | `superpowers:writing-plans` (header `Decisions in scope: ADR-NNNN`) | — |
| Dev | `executing-plans`/`subagent-driven-development` + `test-driven-development` | `typescript-lsp` |
| Verify | `verification-before-completion` (`npm run verify` + CI) | `typescript-lsp` |
| Review | `requesting-code-review` + `iconsa-rls-validation` | `code-review`, `security-guidance` |
| Close | `finishing-a-development-branch` | `commit-commands` |

**Por qué grill ENTRE spec y plan, no en vez de brainstorming:** Superpowers escribe el *qué/cómo* (spec+plan+tests); grill escribe el *por qué/vocabulario* (CONTEXT.md + ADRs). Son complementarios, no redundantes. Grill se inserta sobre el spec (barato de revisar), nunca sobre el plan (cargado de código). Diagnose/systematic-debugging para bugs duros. NO apilar GSD/gstack/ECC/Ralph.

---

## ICONSA custom skills (5 instaladas)

Verificadas en sesión 2026-05-28 audit Batch 1 — `.claude/skills/iconsa-*/SKILL.md`:

1. **`iconsa-form-implementation`** — patrón end-to-end por form HumanOS desde `requests.types.form_schema`. Incluye: FormEngine usage, validation patterns Zod, field source matrix (profile/user_input/computed). Pre-flight + DoD en el body (W0.5 H-1).
2. **`iconsa-rls-validation`** — queries Q1-Q5 (pg_policies + pg_class) post-cambio RLS para verificar tablas HumanOS con RLS habilitada + policy count + sensitive tables R13
3. **`iconsa-business-rules`** — checklist R1-R27 antes de migrations, RLS policies, approval logic, ticket state, auth.users ops. Triggered por keywords: approval, ticket, prestamo, vacaciones, hr_admin, allowed_apps, schema, RLS
4. **`iconsa-supabase-migration`** — workflow migrations: nombre snake_case `NNN_action_target`, COMMENT obligatorio, RLS habilitada, helpers existentes, CHANGELOG entry `[bd]`. Pre-flight + DoD en el body (W0.5 H-1).
5. **`iconsa-library-docs-check`** — verifica APIs externas via Context7 antes de implementar (Next.js 16 middleware->proxy, React 19, Tailwind 4, Supabase SSR, Zod 4). Evita deprecated APIs de training cutoff

Router en `.claude/skill-rules.json` — hook `user-prompt-submit.ps1` los suggest según keywords (matcher con word-boundary para keywords cortas, W0.5 H-4). **El routing es consejo, no gate**: el framing `[CRITICAL]` de las 2 iconsa críticas es el refuerzo; no se enforcea la invocación.

---

## ICONSA subagents (instalados, H10)

**Estado 2026-05-29:** existen 4 subagents en `.claude/agents/`. Se invocan vía la herramienta Agent (`subagent_type`) o desde un Workflow, y mantienen el contexto pesado (queries de catálogo, diffs grandes) FUERA del loop principal:

1. **`rls-reviewer`** — revisa RLS de tablas nuevas/alteradas (read-only): RLS habilitada, >=1 policy, tablas sensibles R13 owner+hr_admin, helpers en vez de `auth.uid()`, USING/WITH CHECK. Corre `get_advisors` y reporta solo lints nuevos.
2. **`migration-reviewer`** — revisa un `.sql` de migración contra el checklist (RLS+COMMENT, search_path en SECURITY DEFINER, FK ON DELETE, timestamptz, R1 schemas prohibidos, no UUIDs hardcoded, helper reuse, CHANGELOG).
3. **`sop-chain-auditor`** — compara el `approval_chain_template` de un tipo de solicitud contra el SOP papel en `docs/sops/` (R26). Reporta pasos faltantes/extra/orden/condiciones.
4. **`test-runner`** — corre el gate (typecheck/lint/test/build/verify) y reporta solo lo que falla, distinguiendo error vs warning.

Cobertura complementaria: hook `pre-tool-use.ps1` (block schemas/auth.users sin filter) + skill `iconsa-business-rules`. Subagents futuros (pdf-template-tester) se crean cuando lleguen sus features.

---

## Hooks (custom ICONSA + R22 + R23)

| Hook | Función real (verificada 2026-05-28, actualizada 2026-06-01) |
|---|---|
| `SessionStart` | Emite `<EXTREMELY_IMPORTANT>` framing con schemas prohibidos + R22 + R23 + idioma neutro |
| `UserPromptSubmit` | Skill router — lee `.claude/skill-rules.json`, ordena por priority, emite `<skill_router>` block. Word-boundary match para keywords cortas (W0.5 H-4) |
| `PreToolUse` | Bloquea: (1) writes a schemas prohibidos `public/payroll/humanos`, (2) DELETE/UPDATE en `auth.users` sin WHERE + filtro `allowed_apps` (R22), (3) destructive ops en golden records (`hr.people`, `requests.tickets`, etc.) sin WHERE, (4) bash dangerous (`rm -rf /`, force push), (5) Edit/Write a `.env.local` |
| `PostToolUse` | (1) Edit/Write `.ts/.tsx` → `npx tsc --noEmit` debounced 30s (artifact `.claude/hooks/last-tsc-check.txt` gitignored). (2) Migration applied → reminder RLS + COMMENT + external_ids + advisors. (3) Encoding guard R23: advierte (exit 0) si un `.json/.ps1/.md/.ts/.tsx/.css` se escribe con BOM, o si un `.ps1` trae bytes no-ASCII (W0.5 H-2) |
| `PreCompact` | Genera `docs/HANDOFF.json` (gitignored, local) antes de context compaction para continuidad cross-session |
| `Stop` | **Implementado** (`stop.ps1`, registrado en `settings.json`): advisory verify-reminder. Cuando quedan `.ts/.tsx/.sql/.css` sin commitear, recuerda correr `npm run verify` (debounced 10 min). Exit 0 — NUNCA bloquea; el gate duro de merge es CI |

Diagnóstico (no auto-fired): `.claude/hooks/audit-claude-code.ps1` — script manual de inspección. Ubicación general: `.claude/hooks/*.ps1` ASCII puro (R23 verificado).

---

## Settings.json strict-schema (R23)

`.claude/settings.json`:
- UTF-8 sin BOM
- Solo fields documentados por Anthropic
- NO custom fields
- Permissions allow/deny explícitas para los MCPs

---

## Sistema de documentación (mantenimiento) — ADR-0024

Cuatro ciclos de vida, cuatro hogares (decisión en `../adr/0024-doc-system-topical-living-docs.md`):

- **`reference/`** — VERDAD DURABLE, nombres topicales (sin números), **edit-in-place**, nunca se archiva: `vision`, `mvp-scope`, `domain`, `business-rules`, `framework`, `schemas-permisos`, `integrations`, `compliance-ley81`, `toolstack-roadmap`; `README` = índice.
- **`adr/`** — DECISIONES, append-only, inmutables (IDs `0001..`). Una decisión superada se marca `Superseded` + nuevo ADR, no se edita.
- **`STATUS.md`** — EL ÚNICO doc mutable de estado (fase + in-flight + blockers + backlog con triggers/gate). **Ningún otro doc tiene estado** → mata el desync. `CHANGELOG.md` = historia append-only.
- **`work/`** — spec/plan/diseño del trabajo en construcción; al shippear, su artefacto → `work/_archive/`. `future/` = conocimiento planeado, no operacional. `superpowers/specs+plans` = archivo histórico de specs/plans por grupo (groups 1-2 ya shipped).

**Reglas:** docs cambian en el MISMO commit que el código; gate de `grill-with-docs`; NUNCA crear un 2.º doc de estado fuera de `STATUS.md`; UTF-8 sin BOM, español neutro sin voseo (R23/R6). Arranque de sesión: `CLAUDE.md → STATUS.md` (el pipeline jala `reference/` just-in-time).

---

## CLAUDE.md raíz

Minimal entry point con @imports condicionales. Pattern real:

```markdown
# CLAUDE.md HumanOS

## Conditional imports (load when relevant)
- Implementando form/feature: @docs/reference/domain.md (catalogo + dominio)
- Implementing approval chain: leer SOP en docs/sops/ (Filesystem MCP / Read; NO Google Drive)
- Past decisions: @docs/adr/README.md (canonical index) + @docs/adr/*.md
- Vocabulario en duda: @docs/CONTEXT.md (vivo)
- MDM foundational (aspiracional): @docs/future/11-MDM-PRINCIPLES.md + @docs/future/12-SOR-MATRIX.md
- Integraciones LIVE: @docs/reference/integrations.md · planned/ETL: @docs/future/13-INTEGRATIONS-PLANNED.md
- Estado operacional: @docs/STATUS.md + BD vía MCP
```

Ver `CLAUDE.md` raíz real para el set completo de reglas YOU MUST follow + anti-patterns.

---

## Smoke tests bedrock (pre-ejecución de plan)

Antes de arrancar la ejecución de un plan ejecutar:

1. `npm run verify` (encadena tsc + lint + vitest + playwright + build) → 0 errors
2. Conexión Supabase MCP → OK (e.g., `list_projects`)
3. Helper functions BD existen: `hr.current_person_id()`, `hr.current_app_role()`, `hr.is_hr_admin()`, `hr.is_president_or_admin()`, `hr.is_supervisor_of()`, `hr.has_direct_reports()`, `requests.can_view_ticket()`, `hr.touch_updated_at()`
4. CHECK constraints aplicados: `app_role` 4 valores, `files.uploads.category` 13 valores, `requests.tickets.status` 8 valores
5. Hook PreToolUse cargado (test: intentar `DELETE FROM auth.users;` sin WHERE debe ser blocked por hook)
6. ICONSA skills (5) cargadas via `.claude/skill-rules.json` router
7. mattpocock skills (4) cargadas en `.claude/skills/`

---

## Plan-execution readiness

La ejecución de un plan aprobado sigue el **pipeline canónico v2** de arriba (BRAINSTORM→...→CLOSE), NO una lista aparte. (La vieja nota "brainstorming skip — ya hecho en Chat" está superada por `@docs/superpowers/specs/2026-05-29-skill-integration-design.md`.)

Antes de ejecutar sin interrupción un plan que abarca un grupo completo, TODO esto debe ser verdad (criterios de `../work/_archive/framework-hardening-design.md` §4):

1. El gate de merge **bloquea**, no solo recuerda (branch protection exige los checks de CI — H-5, acción de Jaime).
2. Los no-negociables son físicos (PreToolUse R1/R22/golden-record/bash/.env; R23 advertido en PostToolUse; voseo = `error`).
3. El agente lee el gate del backlog (`STATUS.md` §6) + DoD al implementar (pre-flight en los SKILL bodies — H-1).
4. `npm run verify` corre limpio local + CI (E2E al menos happy-path de la feature).
5. Existe un revisor independiente del diff antes de merge (subagents de review; idealmente cross-model — PROVISION).
6. El handoff/audit log captura lo que pasó (PreCompact + `errors.log` de hooks).
7. El run tiene un Definition-of-Done explícito y acotado (lista de features F-NN), no "haz el MVP".

Mientras (1) y (5) no estén probados, la ejecución sin interrupción se limita a planes acotados y de bajo riesgo, con revisión humana del diff antes de merge.

---

## Promise mechanism

Code declara el promise al arrancar un **plan aprobado**:
```xml
<promise>PLAN_COMPLETE</promise>
```

Y lo redime cuando: todas las tasks del plan done + gate verde (tsc + lint + vitest + Playwright + build) + RLS validada + docs vivos actualizados (CHANGELOG, STATUS.md, CONTEXT/ADR si hubo decisión) en el MISMO commit.

Si queda parcial: `<promise>PARTIAL</promise>` con la lista exacta de lo pendiente. La definición canónica vive en `CLAUDE.md §Promise mechanism` + ADR-0026.

---

## Anti-patterns Code

- ❌ NO hardcodear UUIDs en migrations
- ❌ NO crear tablas sin RLS habilitada
- ❌ NO crear columnas sin COMMENT
- ❌ NO escribir SQL sin WHERE en DELETE/UPDATE de tablas críticas
- ❌ NO modificar archivos `public.*`, `payroll.*`, `humanos.*` legacy
- ❌ NO confiar en mi memoria de SOPs — leer `docs/sops/` (Filesystem MCP / Read; NO Google Drive)
- ❌ NO desviarse de R26 (SOP-driven chains) sin documentar + validar con Samantha (autoridad RRHH; ver R26)

---

## Handoff protocol — Chat / Code / Jaime

> Esta sección absorbe el antiguo `10-HANDOFF-PROTOCOL.md` (D3 merge 2026-06-01). Cómo las tres entidades que colaboran intercambian estado.

### Tres entidades que colaboran

1. **Chat (Claude.ai conversational)** — strategy, decisiones grandes, dominio extenso, BD migrations bloqueantes, mantiene los docs estratégicos
2. **Code (Claude Code CLI agent)** — implementación, repo, tests, deploy, mantiene `docs/` operativos
3. **Jaime (humano)** — owner final, valida decisiones, paste docs Chat→Code, commit repo

## Direcciones de handoff

### Chat → Code (al arrancar sesión Code nueva)

1. Chat actualiza docs (especialmente `STATUS.md`) — viven en repo `docs/`, son single source
2. Chat genera **prompt inicial Code** con:
   - Resumen contexto actual
   - Trigger sesión `grill-with-docs` (mattpocock, ya instalada en `.claude/skills/`)
   - Lista de tareas concretas
   - Referencia a docs (Code los lee via @imports CLAUDE.md + `STATUS.md`)
3. Jaime commit docs actualizados al repo HumanOS
4. Jaime abre Code en repo + pega prompt inicial
5. Code lee `CLAUDE.md` raíz → `STATUS.md` → @imports condicionales + arranca grill-with-docs si aplica

### Code → Chat (al cerrar un plan o cuando Jaime reporta)

1. Code mantiene `docs/CHANGELOG.md` con entries per feature
2. Code mantiene el status en `STATUS.md` (status por-feature en `reference/mvp-scope.md`)
3. Code genera `docs/adr/*` con decisiones técnicas
4. Code mantiene `docs/CONTEXT.md` con vocabulary vivo
5. Al cerrar un plan, Code emite `<promise>PLAN_COMPLETE</promise>` o `<promise>PARTIAL</promise>` (ver CLAUDE.md §Promise)
6. Jaime reporta a Chat: copia summary final Code → Chat
7. Chat actualiza `STATUS.md` reflejando nuevo state

### Code ↔ Code (handoff de sesión, con context compactation)

1. Hook `PreCompact` genera `HANDOFF.json` (gitignored, local) automático antes de compactación
2. Próxima sesión Code lee `HANDOFF.json` al arrancar
3. `mattpocock handoff` skill estructura el HANDOFF.json

### Layout repo docs

Estructura real bajo `docs/`:

```
docs/
├── STATUS.md           (EL ÚNICO doc de estado: fase + backlog + blockers; Code mantiene)
├── CHANGELOG.md        (entries por feature/version, append-only)
├── CONTEXT.md          (vocabulario vivo, Code mantiene via grill-with-docs)
├── reference/          (VERDAD DURABLE, nombres topicales, edit-in-place: vision, mvp-scope,
│                        domain, business-rules, framework, schemas-permisos, integrations,
│                        compliance-ley81, toolstack-roadmap; README = índice)
├── adr/                (ledger canónico ADRs 0001+, append-only; Code genera al implementar)
├── work/               (spec/plan/diseño en construcción) + work/_archive/ (consumidos al shippear)
├── future/             (foundational/aspiracional: 11-MDM, 12-SOR, 13-INTEGRATIONS-PLANNED)
├── sops/               (PDFs originales — varios imagen-only SIN texto extraíble; markdown extraído PENDIENTE, ver backlog AUDIT2-SOP-MD. Solo README.md como .md hoy)
└── superpowers/        (specs/ + plans/ históricos Code-generated por grupo)

CLAUDE.md (raíz repo) — entry point con @imports condicionales a docs/
PROJECT_CONSTITUTION.md (raíz repo) — principios non-negotiable
HANDOFF.json (docs/) — generado por hook PreCompact, gitignored
```

### Bootstrap invite codes

Los códigos de invitación vivos (sin consumir, por persona, con expiración) son **estado de la BD** — consultarlos vía Supabase MCP, no duplicarlos aquí (se desactualizan). hr_admin regenera vía `/admin/empleados/[id]/invitar`. Entregar personalmente (R14: triple validación code + national_id + employee_code).

### Quick handoff cheat sheet

| Situación | Acción |
|---|---|
| Nueva sesión Chat | Sincroniza con repo docs + BD vía MCP al inicio |
| Nueva sesión Code | Abrir Code en repo, leer `CLAUDE.md` → `STATUS.md`, pegar prompt inicial |
| Code cerró un plan | Jaime reporta summary a Chat, Chat actualiza `STATUS.md` |
| Cambio decisión grande | Chat actualiza docs + crea/actualiza ADR + notifica Jaime |
| Bug en producción | Code corre `diagnose` skill, genera report, Jaime reporta a Chat |
| Migration BD necesaria | Chat ejecuta vía Supabase MCP con approval per bloque Jaime |

### Anti-patterns handoff

- ❌ Chat ejecutando código en repo HumanOS (no es su rol — Code lo hace)
- ❌ Code tomando decisiones grandes sin consultar (cuando aplica, escala vía grill-with-docs)
- ❌ Jaime perdiendo invite codes (entregar personalmente Y mantener registro)
- ❌ Sessions Code sin handoff (siempre genera HANDOFF.json antes de compact)
- ❌ Docs quedando obsoletos (actualizar per sesión, en el mismo commit que el código)
