# Framework Hardening — Design Doc

**Fecha:** 2026-06-01
**Alcance:** Endurecer el harness Claude Code de HumanOS antes de empezar Group 3.
**Fuentes:** best-practice research (8 temas) + auditoria real del harness (lectura de archivos `.claude/` + `.github/` el 2026-06-01).
**Estado:** propuesta. Los items HARDEN-NOW se ejecutan antes de la primera feature de Group 3.

## TL;DR

El harness ya tiene la base correcta: hooks deterministas que bloquean lo no-negociable (R1 schemas prohibidos, R22 auth.users sin filtro, golden-record DELETE/UPDATE sin WHERE, bash peligroso, `.env.local`), un router de skills, el pipeline de 3 paradas, y — corrigiendo dos afirmaciones de la auditoria — **el Stop hook YA existe y YA esta documentado como advisory** (`stop.ps1` lineas 1-3), y **CI YA corre `npm run verify` en cada PR a main** (`.github/workflows/verify.yml` corre typecheck + lint + test; build en job aparte). Esa es la enforcement que sostiene todo el pipeline.

Lo que queda advisory/honor-system: encoding R23, R2-R27 de negocio, todo el doc-system (STATUS singularity, gate DEFERRED-ITEMS), las etapas de pipeline, y los subagents.

**El gap real de mayor leverage frente al campo es UNO solo:** no existe revisor adversarial de modelo distinto sobre el diff antes de merge. El Stop-hook auto-reentrante que el research pide es de bajo valor aqui porque CI ya es el gate duro de merge; un Stop hook bloqueante en Windows/PowerShell agrega riesgo de loops sin ganar mucho sobre CI. Por eso lo dejamos en PROVISION, no HARDEN-NOW.

---

## 1. Gap table

| # | Dimension | Estado actual (verificado) | Best practice | Fix | Clasificacion |
|---|---|---|---|---|---|
| G1 | Hook layer deteminista | PreToolUse bloquea R1/R22/golden-record/bash/.env. PostToolUse corre tsc (debounce 30s) + recordatorio migracion. Stop advisory. SessionStart/PreCompact OK. | Capa de politica-como-codigo fuera del razonamiento del LLM | Mantener. Ya es solido. | OK |
| G2 | Encoding R23 (UTF-8 no-BOM / .ps1 ASCII) | NO enforced por hook. `audit-claude-code.ps1` lo detecta pero no se dispara automatico. | Guardrail fisico, no advisory | Agregar check BOM en PostToolUse para `.json/.ps1/.md/.ts/.tsx/.css` escritos; advertir (no bloquear) si hay BOM o no-ASCII en `.ps1`. | **HARDEN-NOW** |
| G3 | Voseo R6 (lint guard H9) | `eslint.config.mjs` linea 42: `'iconsa/no-voseo': 'warn'`. Memory + CLAUDE.md dicen escalar a `error`. | Constraint fisico, no advisory | Confirmar conteo==0 (`npm run lint`), luego subir a `'error'`. Cierra el gap doc-vs-realidad. | **HARDEN-NOW** |
| G4 | Router de skills (matcher) | `user-prompt-submit.ps1` linea 36 usa `.Contains()` substring sobre prompt en minuscula -> falsos positivos ("update", "page", "layout" disparan constante). | Routing confiable sin colision | Para keywords cortas/comunes, exigir limite de palabra (regex `\b`). Keywords largas siguen con Contains. | **HARDEN-NOW** |
| G5 | Router: skills `superpowers:*`/plugin | Router solo emite texto; nombra plugin-skills pero no los invoca ni enforcea. | Routing como sugerencia explicita; paradas no encadenan solas | Documentar en CLAUDE.md que routing = consejo, no gate; confiar en framing `[CRITICAL]` para las 2 iconsa criticas. | DEFER (aceptar como advisory) |
| G6 | Gate DEFERRED-ITEMS | `DEFERRED-ITEMS.md` existe; grep en `.claude/` = cero referencias. El "gate no-saltable" es solo prosa. | Doc/state-sync por gate, no fuerza de voluntad | Insertar lectura de DEFERRED-ITEMS como paso literal de checklist en el cuerpo de `iconsa-form-implementation/SKILL.md` y `iconsa-supabase-migration/SKILL.md` (los unicos docs que un agent ejecutor carga confiablemente). | **HARDEN-NOW** |
| G7 | Doc-system: STATUS singularity, edit-in-place, work-archive | Puramente advisory (prosa en 00-INDEX + handoff). Nada en `.claude` lo enforcea. | Living docs por gate | Aceptar como human-enforced. NO afirmar "enforced" en ningun doc. Anadir a checklist de SKILL bodies (G6) la regla "actualiza CHANGELOG/CONTEXT/ADR antes de cerrar". | **HARDEN-NOW** (solo el wording + checklist) |
| G8 | Spec -> acceptance criteria como tests | Etapas del pipeline son skills suggest/high; nada exige capturar acceptance criteria ni convertirlas en tests (TDD). | SDD + TDD; criterio -> test que debe pasar | Anadir al cuerpo de `iconsa-form-implementation/SKILL.md` la regla DoD: "cada acceptance criterion del spec = al menos 1 test (E2E happy + edge + RLS) antes de marcar done". | **HARDEN-NOW** (en SKILL body) |
| G9 | Gate verify-before-merge | CI `verify.yml` corre typecheck+lint+test en PR a main. Build en job separado (necesita secrets que James debe poblar). Stop hook recuerda correr `npm run verify`. | Gate determinista que bloquea avance de estado | Confirmar que branch protection en GitHub exige el job `checks` para merge. Poblar secrets del job `build`. E2E aun fuera (necesita server+DB). | **HARDEN-NOW** (config GitHub, no codigo) |
| G10 | Subagents (rls-reviewer, migration-reviewer, sop-chain-auditor, test-runner) | Bien escritos; nunca auto-invocados. Dependen de que el main agent los elija. | Roles separados en contexto aislado; review != generacion | Nombrarlos como pasos REQUERIDOS de la etapa Review en CLAUDE.md y en el cuerpo de los SKILL. | PROVISION |
| G11 | Revisor adversarial cross-model | No existe. El modelo valida su propio output. | Critic de modelo distinto ve solo el diff, premiado por hallar fallos | Cablear `codex:rescue` / `code-review` plugin como paso de review sobre el diff antes de merge. Empezar manual; medir senal antes de hacerlo gate. | PROVISION |
| G12 | Stop hook auto-reentrante hasta verify | Stop es advisory (exit 0). | Stop exit 2 + stderr reentra el loop hasta que tests pasen | NO en Windows/PowerShell por ahora: riesgo de loop, y CI ya es el gate duro de merge. Reevaluar si los overnight runs muestran "done" prematuro frecuente. | PROVISION |
| G13 | MCP higiene | `.mcp.json` lean (Context7 + next-devtools); Supabase/Vercel/Playwright globales. `CONTEXT7_API_KEY` vacio. | Pocos, auditados, deny-by-default, scope por rol | Verificar que Context7 responde sin auth antes de confiar en library-docs-check. No scope-por-rol aun (no hay sub-sesiones por rol). | DEFER |
| G14 | tsc full-project en PostToolUse | Debounce 30s, pero corre typecheck de todo el proyecto en cada edit `.ts/.tsx`. | Feedback rapido, no ruidoso | Sera lento al crecer el codebase. Scoping o mover a Stop-only mas adelante. | DEFER |
| G15 | Defense-in-depth + audit log | Hooks en multiples capas; `audit-claude-code.ps1` existe. Toda accion via hooks queda en `errors.log`. | Guardrails en capas + log completo | Suficiente para ahora. | OK |
| G16 | Doc-vs-realidad: Stop hook | Auditoria afirmaba que `06-FRAMEWORK` dice Stop "No implementado". `stop.ps1` existe Y esta registrado en settings.json. | Docs reflejan realidad | Verificar el texto de `06-FRAMEWORK-CLAUDE-CODE.md`; si afirma "No implementado", corregir a "implementado (advisory verify-reminder)". | **HARDEN-NOW** (si el doc miente) |

---

## 2. Cambios HARDEN-NOW (antes de Group 3)

Concretos, en orden de leverage. Todos respetan R23 (archivos UTF-8 no-BOM; `.ps1` ASCII puro).

### H-1. Gate DEFERRED-ITEMS + DoD dentro de los SKILL bodies (G6, G7, G8)

Es el fix de mayor leverage porque los SKILL bodies son los unicos docs que un agent ejecutor carga de forma confiable. Editar el cuerpo (no el frontmatter) de:

- `.claude/skills/iconsa-form-implementation/SKILL.md`
- `.claude/skills/iconsa-supabase-migration/SKILL.md`

Anadir cerca del inicio del cuerpo un bloque de checklist obligatorio:

```
## Pre-flight (obligatorio antes de implementar)
1. Lee docs/DEFERRED-ITEMS.md. Si esta feature toca un item diferido, resuelvelo o confirma con James — NO lo saltes silenciosamente.
2. Confirma acceptance criteria del spec en docs/superpowers/specs/. Cada criterio = al menos 1 test (E2E happy + edge + iconsa-rls-validation). Sin criterios no hay implementacion.

## Definition of Done (obligatorio antes de marcar completo)
- npm run verify limpio (typecheck + lint + test + build).
- Subagents de review corridos: migration-reviewer / rls-reviewer (migraciones), sop-chain-auditor (cadenas de aprobacion).
- Docs vivos actualizados: CHANGELOG.md, CONTEXT.md (si cambio vocabulario), docs/adr/ (si hubo decision). Edit-in-place; STATUS vive en un solo lugar.
```

Esto convierte tres reglas de prosa (DEFERRED gate, acceptance-as-tests, doc-maintenance) en pasos que el agent ejecutor lee. No es un hook deterministra — es enforcement humano + framing fuerte — pero es la unica palanca que toca al agent en el momento correcto.

### H-2. R23 BOM check en PostToolUse (G2)

Editar `.claude/hooks/post-tool-use.ps1`: en la rama `Edit/Write`, tras la verificacion de tsc, anadir un check que lea los primeros bytes del archivo escrito. Si `.json/.ps1/.md/.ts/.tsx/.css` tiene BOM UTF-8 (`EF BB BF`), emitir bloque advisory `<encoding_warning>` recordando R23. Para `.ps1`, advertir tambien si hay bytes no-ASCII. Advisory (exit 0), no bloqueante — un bloqueo aqui rompe escrituras legitimas si el editor reintroduce BOM. Mantener el script ASCII puro.

### H-3. Voseo guard a `error` (G3)

1. `npm run lint` para confirmar conteo de voseo == 0.
2. En `eslint.config.mjs` linea 42, cambiar `'iconsa/no-voseo': 'warn'` -> `'error'`.
3. `npm run lint` de nuevo para confirmar verde. Cierra el gap memory/CLAUDE.md-vs-config (H9).

### H-4. Router word-boundary para keywords cortas (G4)

Editar `.claude/hooks/user-prompt-submit.ps1` linea 36. Para keywords de longitud <= 5 o en una denylist de comunes (`update`, `page`, `layout`, `form`, `policy`), usar match con limite de palabra (`$promptLower -match "\b$([regex]::Escape($kw.ToLower()))\b"`) en vez de `.Contains()`. Keywords largas/especificas (codigos `F-05-01`, `apply_migration`) siguen con `.Contains()`. Reduce falsos positivos que entrenan al agent a ignorar el router.

### H-5. Confirmar el gate de merge en GitHub (G9)

No es codigo. James debe:
1. Settings > Branches > branch protection en `main`: exigir que el job `checks` de `verify.yml` pase antes de merge.
2. Poblar los secrets del job `build`: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ONBOARDING_TOKEN_SECRET`.

Sin (1), el pipeline entero es honor-system: CI corre pero no bloquea. Este es el unico enforcement load-bearing del pipeline; debe ser un required check.

### H-6. Corregir doc-vs-realidad del Stop hook (G16)

Leer `docs/06-FRAMEWORK-CLAUDE-CODE.md`. Si la tabla de hooks dice Stop "No implementado", corregir: Stop ESTA implementado como `stop.ps1`, registrado en settings.json, advisory verify-reminder (debounce 10 min). Un doc que miente sobre la enforcement erosiona la confianza en toda la tabla.

---

## 3. Lo que queda advisory (PROVISION / DEFER) hasta probarse

- **R2-R21, R24-R27 de negocio (sello, no-self-approval, request_number, Ley 81, cadenas SOP):** sin probar hasta que existan los forms de Group 4. La enforcement real es la ApprovalEngine + RLS, no un hook de prompt. Cablear `sop-chain-auditor` como paso de review cuando lleguen las cadenas. (PROVISION)
- **Subagents como pasos requeridos (G10):** nombrados en CLAUDE.md/SKILL bodies, pero sin dispatcher automatico. Quedan a eleccion del main agent hasta tener evidencia de que se saltan. (PROVISION)
- **Revisor adversarial cross-model (G11):** `codex:rescue` / `code-review` sobre el diff, empezando manual. Hacerlo gate solo tras medir que encuentra senal real. (PROVISION)
- **Stop hook auto-reentrante (G12):** CI ya es el gate duro; un Stop bloqueante en PowerShell arriesga loops. Reevaluar solo si los runs muestran "done" prematuro repetido. (PROVISION)
- **Routing como gate (G5):** queda como consejo. El framing `[CRITICAL]` de las 2 iconsa criticas es suficiente; no enforceamos invocacion. (DEFER)
- **MCP scope-por-rol + Context7 sin auth (G13):** verificar Context7 responde sin key antes de confiar en library-docs-check; sin scope-por-rol hasta tener sub-sesiones por rol. (DEFER)
- **tsc scoping (G14):** aceptable hoy; revisar cuando el typecheck full-project se vuelva lento. (DEFER)
- **STATUS singularity / edit-in-place / work-archive (G7):** human-enforced. No afirmar "enforced" en ningun doc. (mitigado parcialmente por el checklist de H-1)

---

## 4. Criterios de "overnight-build readiness"

Antes de que James pueda confiar en un run desatendido (ej. `<promise>MVP_COMPLETE</promise>` overnight), TODO esto debe ser verdad:

1. **El gate de merge bloquea, no solo recuerda.** Branch protection en `main` exige el job `checks` de CI (H-5). Sin esto, un run desatendido puede mergear codigo roto. *Bloqueante para confianza.*
2. **Los no-negociables son fisicos.** PreToolUse sigue bloqueando R1/R22/golden-record/bash/.env (ya OK). R23 advertido en PostToolUse (H-2). Voseo es `error` (H-3). Un run desatendido no puede violar R1/R22 ni hacer ship de voseo.
3. **El agent lee el gate DEFERRED + DoD en el momento de implementar** (H-1). El agent ejecutor no salta items diferidos ni marca done sin tests + verify + docs.
4. **`npm run verify` corre limpio localmente y en CI** (typecheck + lint + test + build). E2E al menos en happy-path para la feature en curso. Evidencia, no aserciones.
5. **Existe un revisor independiente del diff** antes de cualquier merge — idealmente cross-model (G11), como minimo los subagents de review (G10) corridos como paso explicito. La generacion no se auto-aprueba.
6. **El handoff/audit log captura lo que paso.** PreCompact handoff + `errors.log` de hooks permiten reconstruir el run a la manana siguiente.
7. **El run tiene un Definition-of-Done explicito y acotado** (lista de features F-NN del spec), no "haz el MVP". Direccion la pone el humano; enforcement los hooks.

**Estado hoy:** criterios 2 (parcial), 6, 7 ya se cumplen. Criterios 1, 3 se cierran con H-5 y H-1 (HARDEN-NOW). Criterios 4 (E2E), 5 (revisor independiente) quedan PROVISION — por eso el primer overnight run debe ser de alcance corto y revisado a la manana, no fire-and-forget.

**Regla:** hasta que 1+3 esten hechos y 5 probado al menos una vez en modo manual, los runs desatendidos se limitan a una feature de bajo riesgo con revision humana al despertar — no a un grupo completo.
