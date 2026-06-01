# 06-FRAMEWORK-CLAUDE-CODE.md — Setup Claude Code + workflow

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

## Workflow correcto (cherry-pick, NO Superpowers brainstorming standalone)

| Fase | Skill correcto | Plugin |
|---|---|---|
| **Brainstorming high-level** (qué construir, decisiones arquitectónicas) | Ya hecho en Chat (Project Files son output) | Chat (no skill) |
| **Refinement con Code** (iron out detalles, vocabulary, decisiones técnicas) | **`grill-with-docs`** | mattpocock |
| **Specs por feature** | `writing-plans` | Superpowers |
| **Implementation** | `executing-plans` o `subagent-driven-development` | Superpowers |
| **Mantener docs vivos** (CONTEXT.md, docs/adr/*) durante execution | `grill-with-docs` continuo | mattpocock |
| **Verification final** | `verification-before-completion` | Superpowers |
| **Cierre overnight** | `finishing-a-development-branch` | Superpowers |
| **Handoff entre sesiones Code** | `handoff` + hook PreCompact | mattpocock + custom |
| **Diagnose problemas** | `diagnose` | mattpocock |
| **Git safety** | `git-guardrails` | mattpocock |

### Por qué grill-with-docs (no Superpowers brainstorming)

- Chat ya hizo brainstorming HIGH-LEVEL (los Project Files son el resultado)
- Code necesita REFINEMENT con James para iron out detalles antes de specs
- `grill-with-docs` está diseñado exactamente para esto: Code interroga "grilling" sobre vocabulary, decisions, edge cases y mantiene docs vivos (CONTEXT.md, docs/adr/*)
- Superpowers brainstorming es discovery de problema general — ya pasado en Chat

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
- MDM foundational: @docs/11-MDM-PRINCIPLES.md + @docs/12-SOR-MATRIX.md
- Integraciones externas: @docs/13-INTEGRATIONS-INDEX.md
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
