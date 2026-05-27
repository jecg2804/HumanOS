# 06-FRAMEWORK-CLAUDE-CODE.md — Setup Claude Code + workflow

**Última actualización**: 2026-05-27 (grill-with-docs como refinement workflow, no Superpowers brainstorming)

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
- mattpocock skills (project scope, ya instaladas en `.claude/skills/`): **grill-with-docs**, **handoff**, **diagnose**, **setup-matt-pocock-skills**
- ICONSA custom skills (project scope, en `.claude/skills/`): **iconsa-business-rules**, **iconsa-supabase-migration**, **iconsa-rls-validation**, **iconsa-form-implementation**

### MCPs activos

- A nivel proyecto (`.claude/settings.local.json`): Context7, Filesystem, GitHub, Resend, Sentry
- A nivel global (settings.json usuario): Supabase, Google Drive, Notion, Vercel, otros

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

## ICONSA custom skills (4 pendientes crear)

1. **`iconsa-form-implementation`** — template + best practices para crear forms HumanOS desde `requests.types.form_schema`. Incluye: FormEngine usage, validation patterns Zod, accessibility checklist
2. **`iconsa-rls-validation`** — queries SQL de validación RLS por feature. Ej: "user X no debe ver ticket de user Y" con query test específica
3. **`iconsa-business-rules`** — recordatorio + enforcement de R1-R26 antes de cada feature. Auto-check ej: si touching `auth.users`, validar filtro `allowed_apps`
4. **`iconsa-supabase-migration`** — template para crear migrations con RLS + COMMENT + helpers requeridos

Ubicación: `.claude/skills/iconsa-*/SKILL.md`

---

## ICONSA subagents (4 pendientes crear)

1. **`security-reviewer`** — invoca skill iconsa-business-rules + revisa cada PR para violaciones R1, R5, R13, R22
2. **`rls-validator`** — invoca skill iconsa-rls-validation, corre suite contra BD branch test
3. **`pdf-template-tester`** — genera PDF de cada tipo y compara visual contra SOP original (Playwright screenshot + diff)
4. **`form-schema-builder`** — asistente para diseñar `form_schema` JSONB consistente, consulta SOP relevante, valida tipos campos

Ubicación: `.claude/agents/*.md`

---

## Hooks (custom ICONSA + R22 + R23)

| Hook | Función |
|---|---|
| `PreToolUse` | Bloquea: 1) `DELETE FROM auth.users` sin WHERE filtro `allowed_apps` (R22), 2) modificación schemas prohibidos `public.*`, `payroll.*`, `humanos.*` (R1) |
| `PostToolUse` | Valida: 1) archivos `.ps1` ASCII puro (R23), 2) JSON files sin BOM (R23) |
| `PreCompact` | Genera `HANDOFF.json` automático antes de compactación contexto (para continuidad entre sesiones Code) |
| `Stop` | Verificación final: tests pasan + lint clean + tsc clean |

Ubicación: `.claude/hooks/*.ps1` ASCII puro.

---

## Settings.json strict-schema (R23)

`.claude/settings.json`:
- UTF-8 sin BOM
- Solo fields documentados por Anthropic
- NO custom fields
- Permissions allow/deny explícitas para los MCPs

---

## CLAUDE.md raíz (≤4.3KB)

Minimal entry point con @imports condicionales:

```markdown
# CLAUDE.md HumanOS v2

@docs/business-rules.md
@docs/schemas-permisos.md

## Conditional imports
- Working on form/feature: @docs/form-catalog.md
- Need ICONSA dominio: @docs/iconsa-knowledge.md
- Implementing approval: @docs/sops/*.md (read relevant SOP)
```

---

## Smoke tests bedrock (pre-overnight)

Antes de arrancar overnight ejecutar:
1. `npx tsc --noEmit` → 0 errors
2. `npm run lint` → 0 errors
3. `npm run build` → success
4. Conexión Supabase MCP → OK
5. Helper functions BD existen: `hr.is_hr_admin()`, `hr.current_app_role()`, etc.
6. CHECK constraints aplicados: `app_role` 4 valores, `files.uploads.category` 13 valores
7. Hook PreToolUse cargado (test: intentar `DELETE FROM auth.users` debe bloquear)
8. ICONSA skills cargadas
9. 4 subagents responde a invocación

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
- Docs vivos actualizados (CHANGELOG, ROADMAP, ADRs)

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
