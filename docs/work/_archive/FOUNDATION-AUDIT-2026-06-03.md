# Auditoría de Fundación HumanOS — consolidada (2026-06-03)

> **Autor:** Claude Code (sesión `claude/codex-audit-80R3g`).
> **Método:** verificación empírica contra la BD viva (Supabase MCP, proyecto `bzeoszympkkicwlfdtcn`), lectura del código, y dos sub-agentes de lectura profunda (framework + documentos). NO es una re-lectura ciega de un audit de Codex — cada hallazgo de peso fue verificado contra la realidad.
> **Scope:** foundations + Groups 1-2 (auth, onboarding, employee admin, notificaciones base) + el sistema de framework/harness + el sistema de documentos. EXCLUIDO por instrucción: OCR, legal/compliance como feature, y producto de Groups 3-7 (salvo drift ya aplicado).
> **Para qué sirve este archivo:** referencia única y compartible del estado real de la fundación. Es un **documento de trabajo (WORK)** — borrar o archivar cuando sus hallazgos se hayan resuelto.

---

## 0. La causa raíz (lo más importante)

El sistema tiene un **núcleo sólido en las tres capas** (BD, harness, docs) pero **la sincronización entre lo documentado y lo real es 100% humana — nada la enforcea.** ADR-0024 lo admite literalmente: *"no hay hook que lo garantice."*

Esto es lo que explica los tres síntomas que motivaron esta auditoría:

1. **El intent de diseño se pierde.** ADR-0001 rechaza explícitamente el patrón `service_role`, pero ese intent vivía en un doc que nadie re-leyó al implementar — por eso el gap de grants (y mi propio parche 075) no se cazó en 10+ sesiones.
2. **Los docs acumulan hechos stale** sin que nada falle: ~10 contradicciones concretas conviviendo con docs correctos.
3. **El harness apunta a herramientas/skills que no existen** sin que nada lo detecte.

**No es que haya "demasiados docs".** El modelo (ADR-0024, four-lifecycle) es bueno y el router de `CLAUDE.md` (conditional-imports) es lo mejor del repo. El problema es la **ausencia de enforcement automático** de las reglas maintain-when. Ese es el fix de mayor leverage de toda esta auditoría (ver §4).

---

## 1. Base de datos

### 1.1 Lo que está bien (verificado, no asumido)

Barrido de integridad de diseño sobre los 10 schemas HumanOS (`hr, requests, docs, files, workflows, audit, notifications, learning, performance, mdm`):

| Check | Resultado |
|---|---|
| Tablas con RLS deshabilitada | **0** (todas tienen RLS) |
| Funciones `SECURITY DEFINER` sin `search_path` pineado | **0** |
| Policies permisivas múltiples (mismo rol+comando) | **0** |
| Tablas RLS-on con 0 policies (deny-all accidental) | **0** |

**La disciplina de diseño de la BD es genuinamente sólida.** No está hecha un desastre. Esto importa decirlo: el problema de la BD es UNO y es arquitectónico, no una acumulación de descuidos.

### 1.2 🔴 075 / service_role vs ADR-0001 — el hallazgo de fondo

**Hecho verificado:** `service_role` tenía **0 privilegios de tabla en los 62 tablas HumanOS** (solo schema USAGE + BYPASSRLS) vs **44/44 tablas en `public`** (MovimientOS). Mi migración 075 le dio `GRANT ALL` en los 10 schemas.

**El conflicto de diseño:** ADR-0001 (`docs/adr/0001-rls-driven-db-access.md:5-7`) dice textual:

> *"Alternativa rechazada: service role en server actions con validación manual de R5, R13, R22 en cada path. Demasiado fácil olvidar un check; los incidentes 2026-05-25 (47 users borrados) ocurrieron exactamente por ese pattern."*

La arquitectura documentada es: **JWT autenticado + RLS** (primario) → **RPCs `SECURITY DEFINER`** (writes cross-RLS) → **service_role directo RECHAZADO**. La ausencia de grants a service_role era **coherente con esa decisión**, no necesariamente un bug.

**Dónde está el verdadero problema (el código, no los grants):**

| Path | Cliente usado | Contexto | Veredicto |
|---|---|---|---|
| `employees-actions.ts` `regenerateInviteCodeAction` | `createSupabaseAdminClient()` (service_role) | hr_admin **logueado** (`requireHrAdmin()`) | ❌ **Viola ADR-0001** — debería ser authenticated+RLS o RPC |
| `employees-actions.ts` `updateEmployeeAction` | service_role (people update) + RPC (employment) | hr_admin **logueado** | ❌ Mixto — el people update debería ser RPC/authenticated |
| `employees-actions.ts` `createEmployeeAction` | RPC `create_employee_with_invite` | — | ✅ Ya convertido (la dirección correcta, CODE-ADMIN-TX) |
| `api/cron/process-notifications` | service_role | **sin sesión** (worker Vercel) | ✅ Legítimo (ADR-0006) |
| `onboarding/actions.ts` (validate/reads) | service_role | **pre-auth** (no hay JWT) | ✅ Legítimo (ADR-0006) — idealmente RPCs |

**Conclusión honesta:** mi 075 es un **parche que re-habilita el patrón que ADR-0001 prohíbe.** El fix arquitectónicamente correcto NO es "darle todo a service_role" — es:
1. Convertir `regenerateInviteCode` y `updateEmployee` a RPCs `SECURITY DEFINER` (como ya se hizo con `createEmployee`) o a authenticated+RLS.
2. A lo sumo, grants **estrechos** a service_role solo en las tablas que cron/onboarding-preauth tocan sin sesión (`notifications.outbox`, `hr.people`, `hr.invite_codes`, `hr.employments`).

**Por qué no se cazó en 10 sesiones:** porque la app casi no ha corrido estos flujos contra la BD real (foundation reality-check: ~0 logins históricos) y los RPCs `SECURITY DEFINER` corren como owner y **bypassean grants**, enmascarando que los paths directos darían 403. Es exactamente el tipo de bug que solo aparece cuando lees el intent de diseño, no cuando corres los tests (que están mockeados).

### 1.3 073 / FK covering indexes — NO es sospechoso

Postgres **nunca** crea índices en columnas FK automáticamente. Los 9 que agregué son sobre columnas nuevas (`hr.consent`, `audit.access_log`, las `*.deleted_by` de la migración 054/059). Batches previos (026, 049) hicieron la misma hygiene. Es deuda de performance diferida, P3, inofensiva en tablas vacías. **No es diseño, no es bug interesante.** Sin acción urgente.

### 1.4 074 / docs.* KB read policies — scope creep (Group 3)

Aplicada en la primera ronda; es superficie de KB (F9 = Group 3 explícito en `mvp-scope.md`). Decisión previa: KEEP + document. **Bajo reconsideración** junto a 075 (ver §5).

---

## 2. Framework / harness

### 2.1 Lo que está bien

- **Capa de seguridad sólida y determinística.** Los 7 hooks `.ps1` son ASCII-puros (ADR-0017 cumplido, 0 BOM). `pre-tool-use.ps1` bloquea de verdad lo catastrófico: writes a schemas prohibidos, `DROP SCHEMA public`, `DELETE FROM auth.users` sin filtro (el incidente exacto de 2026-05-25), mass-mutation de golden records, bash peligroso, edits a `.env.local`. **Esto NO depende de que el modelo coopere** — es la mejor parte del harness.
- `session-start.ps1` inyecta framing de alta calidad cada sesión.
- El router de skills (`user-prompt-submit.ps1` + `skill-rules.json`) es lógicamente sano (advisory, no gate).

### 2.2 🔴 P1 — Subagents potencialmente ciegos

`migration-reviewer.md:4`, `rls-reviewer.md:4`, `sop-chain-auditor.md:4` declaran en su frontmatter `tools: ... mcp__plugin_supabase_supabase__execute_sql` (rls-reviewer además `__get_advisors`). **Ese prefijo NO resuelve** en este entorno (el server real es `mcp__supabase__*`). El `tools:` frontmatter es un allowlist vinculante: un subagent cuyo único tool de BD no existe **no puede consultar la BD** → un "review" de RLS/migración podría dar visto bueno sin haber mirado nada. Mis notas en el body mitigan narrativamente, pero el frontmatter es el contrato.

### 2.3 🔴 P1 — read-only vs write-tool

`.mcp.json:24` pinea `read_only=true`. `iconsa-supabase-migration/SKILL.md:8` dice "usa `mcp__supabase__apply_migration` para DDL". El server repo-visible **no puede** aplicar migraciones; los writes vienen de un MCP plugin/usuario NO repo-visible. `framework.md:38` reconcilia esto, pero el body de la skill no lleva el caveat → un agente choca con un fallo silencioso de read-only.

### 2.4 🟠 P2 — Punteros muertos

- `iconsa-library-docs-check/SKILL.md:23-24` usa `mcp__context7__...get-library-docs`; el server real es `Context7` y el tool es `query-docs` (mal en case y en nombre).
- `skill-rules.json` rutea a `superpowers:*` y `frontend-design:*` que **no están enabled** en `settings.json:97-99` (solo `claude-code-setup@claude-plugins-official`). Un agente recibe "[HIGH PRIORITY] superpowers:writing-plans" para algo posiblemente no invocable.
- `CLAUDE.md:5` dice "4 mattpocock" pero hay **3** en disco (`setup-matt-pocock-skills` no existe); `framework.md:30` lo lista igual.

### 2.5 🟢 P3 — Conteos en docs

- `CLAUDE.md:5` "6 hooks" vs **7** `.ps1` (defendible: 6 registrados + 1 manual `audit-claude-code.ps1`).
- `framework.md:43` dice ".mcp.json: solo Context7 + next-devtools" pero hay **3** (falta el `supabase` read-only).

---

## 3. Documentos

### 3.1 Lo que está bien

El modelo (ADR-0024, four-lifecycle: LIVING/REFERENCE/FUTURE/WORK + ARCHIVE) es sólido. El router de `CLAUDE.md` (conditional-imports, líneas 87-93) es coherente y es lo mejor del repo. ~70% de los docs ya tienen el header Role/Read-when/Maintain-when.

### 3.2 🔴 Paths rotos que un agente SÍ pega

- `STATUS.md:24` y `STATUS.md:18` → `docs/work/db-final-vision-design.md` (movido a `_archive/`).
- `framework.md:174` → `../work/framework-hardening-design.md` (en `_archive/`).
- `ADR-0026:16` → ambos paths no-archive (frozen wrong, pero citado en ADR activo).

### 3.3 🔴 Decisión muerta presentada como viva

`vision.md:41` lista **"13. Triple stack docs"** como "decisión grande (no reabrir)" — pero ADR-0024:3 y ADR-0016:12 la **mataron**. `vision.md` es la lista más load-bearing de "no reabrir" y enshrina el modelo muerto.

### 3.4 🟠 Residuo del split Chat/Code (que ADR-0024 retiró)

- `mvp-scope.md:7` "**Owner: Claude Chat**".
- `framework.md:213-298` — toda la sección "Handoff Protocol" describe el modelo tres-actores Chat/Code/Jaime, contradiciendo ADR-0024/ADR-0026 + Constitution §7.3. Es el bloque stale más grande de `reference/`. El archivo se contradice a sí mismo entre dos secciones.

### 3.5 🟠 MCPs fantasma

`integrations.md:81-88` anuncia MCPs Filesystem, Notion y Google Drive que `framework.md:43` dice que se dropearon. Un agente que confía en `integrations.md` planea trabajo con tools que no tiene.

### 3.6 🟠 Duplicación

- **Tabla tipo→modo de approval, verbatim 3×:** `business-rules.md:194-219` (R11), `domain.md:103-150`, `mvp-scope.md:67-103`. Un cambio de chain (R26, SOP-driven = lo que MÁS va a cambiar) = 3 ediciones.
- **Glosario 2×:** `CONTEXT.md` (dueño) vs `domain.md:186-200` (subset stale, sin el vocabulario de ADR-0025).

### 3.7 🟠 Huérfanos y bootstrap muerto

- `docs/agents/` (3 archivos: `domain.md`, `issue-tracker.md`, `triage-labels.md`) — config de skills mattpocock parqueada en `docs/` como si fueran docs de proyecto. No los alcanza ningún @import ni router. `triage-labels.md` hasta termina con boilerplate de editor.
- `_archive/NEXT-SESSION-START-HERE.md` — un "START HERE" con 3 paths muertos, superseded por STATUS.md.
- `STATUS §6` item DRIVE-SPEC referencia `humanos-mvp-spec.md` (Google Drive) que no existe en el repo.

### 3.8 🟠 Drift numérico

`vision.md:68` "48 usuarios en MovimientOS" vs `integrations.md:106` / `future/11:28` "17 daily users". Pueden ser métricas distintas, pero se leen contradictorias — y la regla del propio repo dice no hardcodear counts vivos en docs.

### 3.9 🟠 CLAUDE.md hardcodea estado

`CLAUDE.md:5` mete un párrafo de estado vivo (con los counts de hooks/skills mal) — viola su propia regla "la BD es la fuente de verdad". Debería ser una línea "fase actual: ver STATUS.md".

---

## 4. El fix durable (causa raíz)

Las reglas maintain-when existen pero **nada las enforcea** → el drift se re-acumula. La recomendación de mayor leverage:

**Un check de CI que falle el build ante:**
1. Cualquier link relativo `docs/` que apunte a un archivo inexistente (caza §3.2 y los huérfanos).
2. La presencia de un segundo "doc de estado" fuera de STATUS.md.
3. (Opcional) Conteos hardcodeados de hooks/skills que no cuadren con el disco.

ADR-0024 ya nombró este link-checker como mitigación — **nunca se construyó.** Esa es la razón mecánica de que toda la clase de drift de §3 persista.

---

## 5. Decisiones abiertas (para discutir)

### 5.1 DB — 075/074 vs ADR-0001

| Opción | Qué implica | Trade-off |
|---|---|---|
| **A. Revertir 075+074** (mi inclinación) | Migración 076 que quita los grants y restaura docs.* admin-only. `main`/PR #1 queda sin los cambios cuestionables. Los paths directos (cron/onboarding) quedan rotos PERO no se ejercen en prod (greenfield, sin users). El fix correcto se hace como plan propio. | Más honesto arquitectónicamente; deja flujos "rotos en teoría" hasta el fix real |
| **B. Mantener como deuda documentada** | 075/074 quedan aplicados (la app corre), marcados como deuda; el refactor a RPCs es un plan futuro. | Menos churn; normaliza temporalmente el patrón que ADR-0001 rechaza |
| **C. Fix completo ahora** | Convertir `regenerateInviteCode`/`updateEmployee` a RPCs + reducir 075 a grants estrechos (cron/onboarding). | Es el end-state correcto, pero es refactor de código real con su propio ciclo TDD/review |

**Por qué me inclino por A (revertir) en vez de C (fix completo ahora):** ver §6.

### 5.2 Limpieza — qué ejecutar

| Bloque | Qué es, en llano |
|---|---|
| **Sync docs+harness (P1/P2)** | Arreglar hechos stale: los paths rotos, `vision.md` triple-stack, los MCPs fantasma de `integrations.md`, los nombres de tools de los subagents, los conteos. **Edits seguros, sin cambiar diseño.** Bajo riesgo. |
| **Consolidación estructural** | Dejar la tabla tipo→modo en UN solo lugar (R11) y que los otros 2 apunten ahí; mover `docs/agents/` a `.claude/`; borrar el bootstrap muerto. **Cambia dónde viven cosas**, no qué dicen. Riesgo medio (hay que repuntar referencias). |
| **Enforcement CI** | Construir el link-checker que falla el build ante drift. **Es código nuevo (un script + step de CI)**, no toca docs. El fix durable. |

---

## 6. Por qué "revertir" en vez de "fix completo ahora" (respuesta directa)

Tres razones, en orden de peso:

1. **El fix completo es refactor de código real y merece el pipeline propio.** Convertir `regenerateInviteCode`/`updateEmployee` a RPCs `SECURITY DEFINER` toca lógica de Group 2 ya shipped, necesita su migración (con `migration-reviewer` + `rls-reviewer`), tests, y validación RLS. Hacerlo "rápido" dentro de una limpieza de auditoría es **exactamente el error que cometí con 075** — actuar sin el grounding de diseño completo. No quiero repetirlo.
2. **Revertir es el paso mínimo, reversible, que para la hemorragia.** Quita de `main` el cambio arquitectónicamente cuestionable AHORA, sin comprometerme a un diseño apurado. Desacopla "parar de normalizar el anti-patrón" de "hacerlo bien".
3. **No hay urgencia de runtime.** Es greenfield, sin usuarios productivos (decisión de scope explícita). Los paths que quedarían "rotos" tras revertir no se ejercen en prod todavía — así que no rompo a nadie, y gano el tiempo de diseñar el fix correcto bien.

**Contraargumento honesto:** la opción C (fix completo ahora) es válida si prefieres invertir el tiempo y dejarlo correcto de una vez; y la opción B (mantener como deuda) es válida porque la app efectivamente funciona hoy. Mi inclinación por A no es dogma — es "no apures una decisión arquitectónica que ya se apuró una vez". Lo discutimos.

---

## 7. Apéndice — método de verificación

- BD: consultas SQL directas vía Supabase MCP (`has_table_privilege`, `pg_policy`, `pg_proc`, `information_schema`) — no asumido desde docs.
- Código: lectura directa de `src/lib/onboarding/actions.ts`, `src/lib/admin/employees-actions.ts`, `src/app/api/cron/process-notifications/route.ts`, `src/lib/supabase/{admin,server}.ts`, `src/proxy.ts`, `src/lib/auth/constants.ts`.
- Framework + docs: dos sub-agentes de lectura exhaustiva con citas `file:line` (sus reportes completos están sintetizados en §2 y §3).
- Lo NO verificado en vivo esta sesión: advisors de seguridad de Supabase a fondo (output de ~150k chars, pendiente pase 2); cada policy RLS semánticamente una por una; ejecución real de E2E (sin secrets/DB en el contenedor).
