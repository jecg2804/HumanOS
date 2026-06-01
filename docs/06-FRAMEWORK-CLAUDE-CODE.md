# 06-FRAMEWORK-CLAUDE-CODE.md — Setup Claude Code + workflow

**Role:** setup del harness Code (marketplaces, skills, subagents, hooks) + pipeline de desarrollo + protocolo de handoff Chat/Code/James. · **Read-when:** al configurar el entorno, decidir qué skill usar en cada fase, o coordinar un handoff. · **Maintain-when:** cambia el harness, el pipeline, los hooks, o el protocolo de handoff.

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
- **`supabase`** CLI para link/dump local; el **Supabase MCP** (`mcp__plugin_supabase_supabase__*`) sigue siendo el camino para `apply_migration`/`execute_sql`/`get_advisors` (no requiere Docker).
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
| Grill | `grill-with-docs` (grilla el spec vs CONTEXT/ADRs; **gate de `DEFERRED-ITEMS.md`**) | `claude-md-management` (solo en doc-drift) |
| Plan | `superpowers:writing-plans` (header `Decisions in scope: ADR-NNNN`) | — |
| Dev | `executing-plans`/`subagent-driven-development` + `test-driven-development` | `typescript-lsp` |
| Verify | `verification-before-completion` (`npm run verify` + CI) | `typescript-lsp` |
| Review | `requesting-code-review` + `iconsa-rls-validation` | `code-review`, `security-guidance` |
| Close | `finishing-a-development-branch` | `commit-commands` |

**Por qué grill ENTRE spec y plan, no en vez de brainstorming:** Superpowers escribe el *qué/cómo* (spec+plan+tests); grill escribe el *por qué/vocabulario* (CONTEXT.md + ADRs). Son complementarios, no redundantes. Grill se inserta sobre el spec (barato de revisar), nunca sobre el plan (cargado de código). Diagnose/systematic-debugging para bugs duros. NO apilar GSD/gstack/ECC/Ralph.

---

## ICONSA custom skills (5 instaladas)

Verificadas en sesión 2026-05-28 audit Batch 1 — `.claude/skills/iconsa-*/SKILL.md`:

1. **`iconsa-form-implementation`** — patrón end-to-end por form HumanOS desde `requests.types.form_schema`. Incluye: FormEngine usage, validation patterns Zod, field source matrix (profile/user_input/computed)
2. **`iconsa-rls-validation`** — queries Q1-Q5 (pg_policies + pg_class) post-cambio RLS para verificar tablas HumanOS con RLS habilitada + policy count + sensitive tables R13
3. **`iconsa-business-rules`** — checklist R1-R26 antes de migrations, RLS policies, approval logic, ticket state, auth.users ops. Triggered por keywords: approval, ticket, prestamo, vacaciones, hr_admin, allowed_apps, schema, RLS
4. **`iconsa-supabase-migration`** — workflow migrations: nombre snake_case `NNN_action_target`, COMMENT obligatorio, RLS habilitada, helpers existentes, CHANGELOG entry `[bd]`
5. **`iconsa-library-docs-check`** — verifica APIs externas via Context7 antes de implementar (Next.js 16 middleware->proxy, React 19, Tailwind 4, Supabase SSR, Zod 4). Evita deprecated APIs de training cutoff

Router en `.claude/skill-rules.json` — hook `user-prompt-submit.ps1` los suggest según keywords.

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

| Hook | Función real (verificada 2026-05-28) |
|---|---|
| `SessionStart` | Emite `<EXTREMELY_IMPORTANT>` framing con schemas prohibidos + R22 + R23 + idioma neutro |
| `UserPromptSubmit` | Skill router — lee `.claude/skill-rules.json`, ordena por priority, emite `<skill_router>` block con skills relevantes al prompt |
| `PreToolUse` | Bloquea: (1) writes a schemas prohibidos `public/payroll/humanos`, (2) DELETE/UPDATE en `auth.users` sin WHERE + filtro `allowed_apps` (R22), (3) destructive ops en golden records (`hr.people`, `requests.tickets`, etc.) sin WHERE, (4) bash dangerous (`rm -rf /`, force push), (5) Edit/Write a `.env.local` |
| `PostToolUse` | (1) Edit/Write `.ts/.tsx` → `npx tsc --noEmit` debounced 30s (artifact `.claude/hooks/last-tsc-check.txt` gitignored). (2) Migration applied → reminder RLS + COMMENT + external_ids + advisors |
| `PreCompact` | Genera `docs/HANDOFF.json` antes de context compaction para continuidad cross-session |
| ~~`Stop`~~ | **No implementado**. Originalmente planeado para final verification (tests + lint + tsc). Hoy se ejecuta manual via `npm run verify`. Considerar agregar si el manual gate falla repetido |

Diagnóstico (no auto-fired): `.claude/hooks/audit-claude-code.ps1` — script manual de inspección. Ubicación general: `.claude/hooks/*.ps1` ASCII puro (R23 verificado).

---

## Settings.json strict-schema (R23)

`.claude/settings.json`:
- UTF-8 sin BOM
- Solo fields documentados por Anthropic
- NO custom fields
- Permissions allow/deny explícitas para los MCPs

---

## CLAUDE.md raíz (≤4.3KB)

Minimal entry point con @imports condicionales. Pattern real (numerado):

```markdown
# CLAUDE.md HumanOS v2

## Conditional imports (load when relevant)
- Implementando form/feature: @docs/04-DOMAIN-RRHH.md (catalogo + dominio)
- Implementing approval chain: leer SOP en docs/sops/ (Filesystem MCP)
- Past decisions: @docs/adr/README.md (canonical index) + @docs/adr/*.md
- Vocabulario en duda: @docs/CONTEXT.md (vivo)
- MDM foundational (aspiracional): @docs/future/11-MDM-PRINCIPLES.md + @docs/future/12-SOR-MATRIX.md
- Integraciones LIVE: @docs/13-INTEGRATIONS-INDEX.md · planned/ETL: @docs/future/13-INTEGRATIONS-PLANNED.md
- Estado operacional: @docs/09-ESTADO-ACTUAL.md + BD vía MCP
```

Ver `CLAUDE.md` raíz real para el set completo de reglas YOU MUST follow + anti-patterns.

---

## Smoke tests bedrock (pre-overnight)

Antes de arrancar overnight ejecutar:

1. `npm run verify` (encadena tsc + lint + vitest + playwright + build) → 0 errors
2. Conexión Supabase MCP → OK (e.g., `list_projects`)
3. Helper functions BD existen: `hr.current_person_id()`, `hr.current_app_role()`, `hr.is_hr_admin()`, `hr.is_president_or_admin()`, `hr.is_supervisor_of()`, `hr.has_direct_reports()`, `requests.can_view_ticket()`, `hr.touch_updated_at()`
4. CHECK constraints aplicados: `app_role` 4 valores, `files.uploads.category` 13 valores, `requests.tickets.status` 8 valores
5. Hook PreToolUse cargado (test: intentar `DELETE FROM auth.users;` sin WHERE debe ser blocked por hook)
6. ICONSA skills (5) cargadas via `.claude/skill-rules.json` router
7. mattpocock skills (4) cargadas en `.claude/skills/`

---

## Overnight execution phases

Sigue Superpowers harness:

1. **brainstorming** (skip — ya hecho en Chat)
2. **writing-plans** per feature/feature-group
3. **executing-plans** o **subagent-driven-development** ejecuta
4. **grill-with-docs** continuo mantiene docs vivos
5. **verification-before-completion** gate por feature
6. **finishing-a-development-branch** al final
7. Output: `<promise>MVP_COMPLETE</promise>` cuando 39 features done + tests verde

---

## Promise mechanism

Code declara promise al inicio:
```xml
<promise>MVP_COMPLETE</promise>
```

Y la "redime" cuando:
- 39 features F1-F39 implementadas
- Tests E2E suite full pass
- tsc + lint + build clean
- Docs vivos actualizados (CHANGELOG, 02-MVP-SCOPE status, ADRs)

Si no completa: `<promise>PARTIAL_MVP</promise>` con lista exacta de qué quedó.

---

## Anti-patterns Code

- ❌ NO hardcodear UUIDs en migrations
- ❌ NO crear tablas sin RLS habilitada
- ❌ NO crear columnas sin COMMENT
- ❌ NO escribir SQL sin WHERE en DELETE/UPDATE de tablas críticas
- ❌ NO modificar archivos `public.*`, `payroll.*`, `humanos.*` legacy
- ❌ NO confiar en mi memoria de SOPs — leer `docs/sops/*.md` o GDrive vía MCP
- ❌ NO desviarse de R26 (SOP-driven chains) sin documentar + validar con James

---

## Handoff protocol — Chat / Code / James

> Esta sección absorbe el antiguo `10-HANDOFF-PROTOCOL.md` (D3 merge 2026-06-01). Cómo las tres entidades que colaboran intercambian estado.

### Tres entidades que colaboran

1. **Chat (Claude.ai conversational)** — strategy, decisiones grandes, dominio extenso, BD migrations bloqueantes, mantiene los docs estratégicos
2. **Code (Claude Code CLI agent)** — implementación, repo, tests, deploy, mantiene `docs/` operativos
3. **James (humano)** — owner final, valida decisiones, paste docs Chat→Code, commit repo

## Direcciones de handoff

### Chat → Code (al arrancar sesión Code nueva)

1. Chat actualiza docs numerados (especialmente `09-ESTADO-ACTUAL.md`) — viven en repo `docs/`, son single source
2. Chat genera **prompt inicial Code** con:
   - Resumen contexto actual
   - Trigger sesión `grill-with-docs` (mattpocock, ya instalada en `.claude/skills/`)
   - Lista de tareas concretas
   - Referencia a docs via Filesystem MCP (si Code los necesita explícitamente — Code igual los lee via @imports CLAUDE.md)
3. James commit docs actualizados al repo HumanOS
4. James abre Code en repo + pega prompt inicial
5. Code lee `CLAUDE.md` raíz + @imports condicionales + arranca grill-with-docs si aplica

### Code → Chat (al completar overnight o cuando James reporta)

1. Code mantiene `docs/CHANGELOG.md` con entries per feature
2. Code mantiene el status por grupo en `02-MVP-SCOPE.md` + `09-ESTADO-ACTUAL.md`
3. Code genera `docs/adr/*` con decisiones técnicas
4. Code mantiene `docs/CONTEXT.md` con vocabulary vivo
5. Al final overnight, Code emite `<promise>MVP_COMPLETE</promise>` o `<promise>PARTIAL_MVP</promise>`
6. James reporta a Chat: copia summary final Code → Chat
7. Chat actualiza `09-ESTADO-ACTUAL.md` reflejando nuevo state

### Code ↔ Code (entre sesiones overnight con context compactation)

1. Hook `PreCompact` genera `HANDOFF.json` automático antes de compactación
2. Próxima sesión Code lee `HANDOFF.json` al arrancar
3. `mattpocock handoff` skill estructura el HANDOFF.json

### Layout repo docs

Estructura real bajo `docs/`:

```
docs/
├── 00-INDEX.md         (índice + read-cadence map)
├── 01-VISION.md a 14-COMPLIANCE-LEY81.md (numerados; 03/10 son stubs de redirect, 11/12 movidos a future/)
├── CONTEXT.md          (vocabulario vivo, Code mantiene via grill-with-docs)
├── CHANGELOG.md        (entries por feature/version, Code mantiene)
├── adr/                (ledger canónico ADRs 0001+, Code genera durante implementación)
├── future/            (docs foundational/aspiracional: 11-MDM, 12-SOR, 13-INTEGRATIONS-PLANNED)
├── sops/               (PDFs originales GDrive + markdown extraído)
└── superpowers/        (specs/ + plans/ Code-generated)

CLAUDE.md (raíz repo) — entry point con @imports condicionales a docs/
PROJECT_CONSTITUTION.md (raíz repo) — principios non-negotiable
HANDOFF.json (docs/) — generado por hook PreCompact, gitignored
```

### Bootstrap invite codes (entregar personalmente)

| Code | Persona | Acción esperada |
|---|---|---|
| `F1F3D92A` | Samantha Kosmas | Usar al abrir `https://humanos.rein-eisenwerk.com/onboarding/F1F3D92A` |
| `F1F738DF` | Rocío Olmedo | Idem |
| `A4046851` | Milagros Manyoma | Idem |
| `A65376E1` | Jerelyn Mendoza | Idem |
| `8917F9DB` | Rodrigo Eisenmann | Idem |
| `A16E6D56` | Octavio Javier Ferrer | Idem |

Expiran 2026-08-25 (90 días). Si expiran sin uso, hr_admin regenera vía `/admin/empleados/[id]/invitar`.

### Quick handoff cheat sheet

| Situación | Acción |
|---|---|
| Nueva sesión Chat | Sincroniza con repo docs + BD vía MCP al inicio |
| Nueva sesión Code | Abrir Code en repo, pegar prompt inicial Chat-generado |
| Code completó overnight | James reporta summary a Chat, Chat actualiza 09-ESTADO-ACTUAL |
| Cambio decisión grande | Chat actualiza docs + crea/actualiza ADR + notifica James |
| Bug en producción | Code corre `diagnose` skill, genera report, James reporta a Chat |
| Migration BD necesaria | Chat ejecuta vía Supabase MCP con approval per bloque James |

### Anti-patterns handoff

- ❌ Chat ejecutando código en repo HumanOS (no es su rol — Code lo hace)
- ❌ Code tomando decisiones grandes sin consultar (cuando aplica, escala vía grill-with-docs)
- ❌ James perdiendo invite codes (entregar personalmente Y mantener registro)
- ❌ Sessions Code sin handoff (siempre genera HANDOFF.json antes de compact)
- ❌ Docs quedando obsoletos (actualizar per sesión)
