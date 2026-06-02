# STATUS — HumanOS (estado vivo)

**Role:** EL ÚNICO doc mutable de "qué estamos haciendo / qué falta / qué está bloqueado". Colapsa los antiguos 6 docs de estado solapados (09-ESTADO-ACTUAL, DEFERRED-ITEMS, AUDITS-PENDING, AUDIT-HANDOFF, 2 handoffs).
**Read-when:** al abrir sesión — el camino de arranque es `CLAUDE.md → STATUS.md`, luego el pipeline jala `reference/` just-in-time.
**Maintain-when:** cuando cambia la fase, se cierra/abre un item de backlog, o se toma/desbloquea una decisión. **El estado vive SOLO aquí** — no recrear un 2.º doc de estado. Conteos vivos (personas, tickets, invite codes, tests) → BD/CI vía Supabase MCP, **nunca hardcodear**.

---

## 1. Fase actual

- **Group 2 (Onboarding) shipped** — tag `v0.0.2` (commit `32ef28b`). Group 1 (Foundation) shipped `v0.0.1`.
- **Group 3 (Perfil + Directorio + Knowledge Base)** — en *planning*. Es la prueba del framework: se construye ATENDIDO por el pipeline canónico (diseño atendido + ejecución de plan aprobado, ADR-0026).
- Trabajo directo sobre `main` (greenfield, sin usuarios productivos). CI verde, branch protection activa.
- **Misión vigente:** perfeccionar la fundación (docs + BD-para-visión-final + framework) y luego Group 3 por el pipeline. La BD se diseña para la **visión final** (paridad líderes de mercado: mobile + offline + MDM/cross-app), no solo el MVP.

## 2. Plan de ataque (foundation → Group 3)

Orden de dependencia. Detalle de diseño en `docs/work/`.

| WS | Qué | Estado |
|----|-----|--------|
| **W0** | Migrar doc-system (reference/ topical · STATUS único · work/_archive · borrar stubs · fix stale · @imports) | **en curso** |
| **W0.5** | Framework hardening HARDEN-NOW (H-1..H-4 hechos; H-6 en framework.md; **H-5 resuelto:** enforce_admins OFF, ADR-0026) | código hecho |
| **W1** | BD schema-first — `docs/work/db-final-vision-design.md`. Aprobado por Jaime batch-por-batch. | **DONE** (054-062: foundation + vistas + mdm DOMAIN + pgvector + audit lineage + SEC-CONSENT; MIG-DRIFT + TYPES-STALE; gate verde) |
| **W2** | DATA-HYGIENE — **forma DONE** (063 given/surnames, 064 national_id UNIQUE; audit read-only). Valores (backfill cédula, split, ubicación, dup-merge) + CHECK DGI = gated en data fresca de Samantha + signup → Group 3. Plan: `docs/work/2026-06-02-w2-data-hygiene-plan.md` | **forma DONE** |
| **W3** | Código/seguridad (válidos de Codex): SEC-CONSENT, SEC-ENQUEUE, SEC-SEQ, CODE-ADMIN-TX, CODE-CRON, SEC-LEGACY, SEC-DEPS, ENV-SROLE, FW-PROXY | **DONE** — SEC-CONSENT/SEC-SEQ ya en W1 (057-060/055); SEC-ENQUEUE (065), CODE-CRON, SEC-LEGACY (066, **incidente prod §5**), SEC-DEPS, ENV-SROLE, FW-PROXY + HOOK-MCP-GAP (`01a6355`..`fdbe665`+`c198b4e`); CODE-ADMIN-TX (068/070/071 RPC atómico) |
| **W4** | FE-3 a11y full + FE-4 íconos PWA | **PARTIAL** — FE-4 PWA DONE (`29bdb67`) + FE-3 guard/labels DONE (`48fde02`); **FE-3 part 2 (manual ARIA) → sesión fresca** (itemizado en §6 row `FE-3-full`) |
| **W5** | Capturar toolstack roadmap en reference/ + enlazar | pendiente |
| **→ Group 3** | Perfil/directorio/KB + signup, ATENDIDO por el pipeline | pendiente |

## 3. Decisiones confirmadas (vigentes — NO re-preguntar)

**Diseño de BD (Jaime, 2026-06-01):**
1. **soft-delete:** `deleted_at` en todas las tablas de dominio mutables; `deleted_by` solo en tablas con datos personales/Ley 81.
2. **views:** schema de dominio `hr.v_*` con `security_invoker`. Empezar con `v_directory` + `v_org_chart` (Group 3); matviews de analytics = futuro.
3. **audit:** extender `audit.log` (+`source_system`); `audit.changes` bitemporal **DIFERIDO** (YAGNI).
4. **embeddings/RAG:** `pgvector` enabled NOW (provision); tablas de embeddings al shippear KB (Group 3+). `vector(1536)` (text-embedding-3-small) vía Vercel AI Gateway; generación en server action/cron. Revisar dimensión solo si la calidad no alcanza.
5. **Ley 81:** loggear READ de `hr.medical_info` / `hr.personal_documents` desde día 1.

**Producto / alcance (ratificadas):**
- **Contenido user-authored:** SÍ — features donde el usuario crea contenido (capacitaciones, blog, anuncios) sobre nuestro propio schema (`docs.articles`/`article_versions`, `learning.courses`/`course_modules`) + editor. NO un CMS externo (duplicaría la SOR, complicaría RLS). El schema ya existe; falta la UI de autoría (Groups 5-7).
- **Offline + apps móviles (Android/iOS):** futuro deseado. La BD se provisiona para soportarlo (soft-delete + `source_system` + columnas de sync diferidas con su feature); las apps serán clientes futuros sobre la misma Supabase API. No se construye ahora; el diseño no lo bloquea.
- **First Usable Release = TODOS los forms** (decisión de producto). Build order para de-riskear: engine + CARTA_TRABAJO + ticket UI primero, el resto como config (ADR-0009).
- **VACACIONES:** construir `hr.leave_balances` + accrual ledger; **no descopear** (parte ya hecha: migración 047).
- **DB diseñada para la VISIÓN FINAL, no el MVP** (mobile + offline + cross-app/MDM); YAGNI en tablas especulativas, rigor en las fundaciones.
- **Principio del design pass — "forma AHORA, valores de política/config DESPUÉS (como data, dentro del grupo)":** NOW = toda tabla/columna/constraint/índice/RLS/policy determinable con confianza desde la visión. LATER = SLAs, reglas de delegación, `form_schema`/`approval_chain_template` por form. Regla: "¿puedo determinar la forma con confianza ahora?" sí→ahora; si la forma depende de lógica de feature no diseñada → **argumentar y dejar decidir a Jaime (nunca diferir en silencio)**.

## 4. Decisiones humanas pendientes (blockers)

- **W1 [Jaime decision] (en `db-final-vision-design.md` §9):** `deleted_by` ¿todas o solo Ley 81? · ubicación de vistas (`hr.v_*` recomendado) · audit lineage (extender `audit.log` vs `audit.changes`) · modelo/dimensión de embeddings · Ley 81 read-logging desde inicio. *(Las 5 ya tienen recomendación + las confirmadas en §3 cubren la mayoría — ratificar al presentar el diseño.)*
- **Signup (Group 3):** las 6 decisiones de `docs/superpowers/specs/2026-06-01-signup-advisory.md` §6 (email canónico vs co-igual, SSO Google, obra sin buzón, formato de fallback code, `employee_code` vs `login_alias`, deprecar teléfono-como-identificador).
- **Approval-chain (Group 4/6, ADR-0020):** BL-3 (sources de `form_schema` en 8 seeds) · BL-4 (reset anual de numeración) · BL-5 (enum huérfano `Devuelta_Info`: drop o agregar status) · BL-6 (SLA + escalation) · BL-7 (reglas de delegación). BL-2 ya DECIDIDO (president self-approval: omitir step + audit flag).
- **Gerencia General ≠ President:** validar con **Samantha** si VP Ferrer / otros gerentes entran en modo `parallel` (diferido v1.1; MVP asume solo Rodrigo).
- **app_role de Javier Ferrer (FER337):** hoy `admin`, a revisar con Samantha.
- **FE-4-pwa:** íconos necesitan assets de diseño (logos colocados en raíz por Jaime).
- **Identidad / username (Group 3 — ITEM DE DISEÑO, NO W2):** el modelo de auth NO es la cédula. username = `employee_code` (código Spectrum, p.ej. CUC166; 98% en activos) y/o correo de empresa; falta diseñar el link `user`↔`persona`. La cédula es un **campo de perfil** que el empleado llena/actualiza en onboarding (no es llave de auth). **Revisitar R14** (triple-validación con `national_id`) dado el gap de cédula (134 activos sin) — diseño de signup por el pipeline (brainstorm→grill→plan), NO se resuelve en W2. El backfill de cédula se cubre en onboarding + data de Samantha; no bloquea la puerta de entrada.

## 5. Hechos operacionales

- **⚠️ Incidente prod 2026-06-02 (resuelto):** `DROP SCHEMA humanos CASCADE` (066, W3 SEC-LEGACY) rompió PostgREST del proyecto compartido — `humanos` aún estaba en **Exposed schemas** → el schema-cache no reconstruyó (`schema "humanos" does not exist` en loop) → **503 en `/rest/v1/*`** de MovimientOS + HumanOS (auth OK). Jaime restauró quitando `humanos` de Exposed schemas. Causa: Exposed schemas NO es legible por SQL (`pgrst.db_schemas`=null) y la pre-flight lo asumió. Guardrail en **R1** + skill `iconsa-supabase-migration` (confirmar Exposed schemas con Jaime antes de cualquier `DROP SCHEMA`).
- **Hosting:** MovimientOS `rein-eisenwerk.com` (Vercel `prj_o28h5tYDskqF3AjBg1w5W3F3fYu4`); HumanOS `humanos.rein-eisenwerk.com` (Vercel `prj_DqJQEL9LJ5qcwkw8Et6WYUpUxiLQ`); email worker Vercel Cron `/api/cron/process-notifications` (`*/5 * * * *`); Resend dominio verificado `rein-eisenwerk.com`.
- **BD:** proyecto Supabase `bzeoszympkkicwlfdtcn` (PG 17.6, compartido con MovimientOS). Acceso vía MCP `mcp__claude_ai_Supabase__*` (cargar vía ToolSearch; el plugin Supabase MCP se desconecta). **NO `supabase db push`** mientras MIG-DRIFT esté abierto.
- **GitHub:** repo correcto `github.com/jecg2804/HumanOS` (NO `ICONSA-Solutions/*`).
- **Branch protection (`main`):** required status checks = [`typecheck / lint / test / scan`, `build`]; `allow_force_pushes=false`; `allow_deletions=false`; `enforce_admins=false`; `required_pull_request_reviews=null`. **Nota (push 2026-06-01):** un push directo del owner reporta *"Bypassed rule violations: 2 of 2 required status checks"* — los 2 checks aplican vía PR, pero el owner los bypassa en push directo. **H-5 RESUELTO (2026-06-02, ADR-0026):** (a) `enforce_admins` queda OFF — el trabajo es atendido y directo a `main`, CI es la señal visible; (b) los secrets del job `build` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ONBOARDING_TOKEN_SECRET`) están poblados (confirmado por Jaime).
- **ENV-SROLE (RESUELTO 2026-06-02):** Jaime agregó la `sb_secret_` key al `.env.local` + confirmó que el legacy `service_role` estaba correcto. El proyecto tiene legacy + nuevas API keys (legacy NO disabled, OK hasta fines 2026). Migración full a `sb_publishable_`/`sb_secret_` en todos lados = workstream futuro coordinado (no urgente).
- **Recipe de revalidación** (preservada de la auditoría Codex): typecheck/lint/test/build · `npm audit --audit-level=high` · Playwright auth smoke · `supabase migration list --linked` · `supabase db advisors --linked` · `supabase gen types ... | Select-String 'post_leave_ledger_entry|next_sequence|leave_ledger|leave_balances|dedupe_key'` · `vercel link` antes de cualquier `vercel ls` (sin `.vercel/project.json` lista deployments del proyecto equivocado). **Cuidado:** no `supabase db push` contra el proyecto compartido; `vercel env pull` escribe archivos de env locales.

---

## 6. Backlog (fuente única; con triggers/gate)

`source` = de dónde viene (mine / Codex / both). `status`: OPEN (código/BD/seguridad), BLOCKED-on-Jaime (decisión humana), DONE.

| ID | Ítem | Source | Sev | Status | Categoría | Trigger / Bloquea |
|----|------|--------|-----|--------|-----------|-------------------|
| SEC-CONSENT | **GAP R27 EN PROD (severidad elevada):** el onboarding **shipped** (Group 2, Step6/7) captura datos médicos/emergencia SIN el consentimiento Ley 81 — `hr.consent` se creó (W1 059) pero el **wiring no existe** (no se escribe consent ni se bloquea el write médico sin él). Texto validado por abogado. Atar al **rework de signup de Group 3** | both | P1 | OPEN | security | Group 3 (signup) — **gap activo en prod** |
| SEC-ENQUEUE | ~~`notifications.enqueue` ejecutable por `authenticated`~~ **DONE (W3 065):** `REVOKE EXECUTE ... FROM authenticated, anon, public` (ACL post: postgres + service_role); callers de prod = admin/service-role; `import 'server-only'` en `insert.ts` + alias vitest | Codex | P1 | DONE | security | — |
| MIG-DRIFT | ~~`047..053` locales sin prefijo timestamp~~ **DONE (W1):** renombrados a `<timestamp>_NNN_*.sql` matching `supabase_migrations`. | Codex | P1/P2 | DONE | DB-structure | — |
| SEC-SEQ | ~~`requests.next_sequence` ejecutable por authenticated~~ **DONE (W1 055):** `REVOKE EXECUTE ... FROM authenticated`; solo service-role + el bumper SECURITY DEFINER. | Codex | P2 | DONE | security | — |
| TYPES-STALE | ~~`database.types.ts` desfasado~~ **DONE (W1):** regenerado multi-schema vía CLI + 061/062 (`DEFAULT NULL` en params opcionales) + call-sites `?? undefined`. `humanos_baseline.sql` en su próxima pasada de baseline. | Codex | P2 | DONE | code | — |
| CODE-ADMIN-TX | ~~Creación admin de empleado no transaccional; falla parcial deja empleado roto~~ **DONE (068/070/071):** RPC `hr.create_employee_with_invite` SECURITY DEFINER atómico (4 escrituras → 1 invocación, all-or-nothing); `createEmployeeAction` ahora 1 `.rpc()`. Encontró+arregló insert redundante de `user_settings` (trigger ya lo crea) + descarte de error línea 109. Atomicity + happy-path verificados, migration-reviewer PASS | Codex/mine | P2 | DONE | code | — |
| CODE-CRON | ~~Worker de cron ignora `{ error }` en updates → duplicados~~ **DONE (W3 Batch 2):** at-most-once vía `idempotencyKey: 'outbox/<id>'` en Resend (Opción B, Context7-verificada, dedup 24h) + captura de `{ error }` en las 3 escrituras con log. Sin schema change | Codex | P2 | DONE | code | — |
| CODE-TEMPLATE-GAP | El cron trata "template faltante" como fallo permanente; `TEMPLATE_CODE_MAP` referencia 9 tipos pero solo existen 5 templates `@react-email` → los de tickets (Group 4+) morirían silenciosamente (`status='failed'`) si se encolan antes de crear su template. No es bug hoy (no se encolan aún) | mine | P3 | OPEN | code | Group 4 (guard) |
| TEST-CRON-WORKER | El worker de email (`process-notifications/route.ts`) no tiene test unitario (gap pre-existente; BE-1 + CODE-CRON lo tocaron sin uno). Extraer el procesamiento per-row a función testeable + cubrir idempotencyKey, error-capture en updates, markRetryable exhausted | mine | P3 | OPEN | code | pasada de tests |
| SEC-LEGACY | **DONE-con-incidente (W3 066):** `DROP SCHEMA humanos CASCADE` (snapshot R22; data ya en `hr.*`; advisors limpios). **⚠️ INCIDENTE PROD 2026-06-02 (resuelto):** `humanos` seguía en Exposed schemas → el drop rompió el schema-cache de PostgREST → **503 en todo `/rest/v1/*`** (MovimientOS+HumanOS; auth OK). Jaime restauró quitando `humanos` de Exposed schemas. Guardrail nuevo (R1 + skill): verificar Exposed schemas con Jaime antes de cualquier DROP SCHEMA | Codex | P2 | DONE | security | — |
| HOOK-MCP-GAP | ~~`pre-tool-use`/`post-tool-use` no matcheaban `claude_ai_Supabase`~~ **DONE (W3 4a):** wildcard `mcp__.*supabase.*__` en AMBOS hooks (fix de la CLASE, no del prefijo) + nuevo CHECK 1a-bis que bloquea `DROP SCHEMA public/payroll/humanos` (antes `DROP SCHEMA public CASCADE` no se bloqueaba). Verificado por stdin: hr.* write→exit0, create public.*→exit2, drop schema public→exit2 | mine | P1 | DONE | security | — |
| SEC-DEPS | ~~`npm audit` highs~~ **DONE (W3 4b):** sin fix no-breaking (los "fixes" son downgrades `@vercel/config@0.0.32` / `next@9.3.3`); ambas cadenas (`path-to-regexp` via @vercel/config, `postcss` via next) son build-time, no runtime-exploitable. Excepción durable en `docs/reference/security-dependency-exceptions.md`; NO `--force` | Codex | P2 | DONE | security | — |
| ENV-SROLE | ~~service_role local Invalid API key~~ **DONE (2026-06-02):** Jaime agregó `sb_secret_` al `.env.local` + confirmó legacy `service_role` correcto. Legacy + nuevas keys coexisten (legacy OK hasta fines 2026). Migración full a keys nuevas = workstream futuro coordinado | Codex | P2 | DONE | security | — |
| FW-PROXY | ~~`src/middleware.ts` deprecated Next 16~~ **DONE (W3 4b):** `middleware.ts`→`proxy.ts` + export `middleware`→`proxy` (Context7-verificado; nodejs runtime, sin edge; `@supabase/ssr` OK; `matcher` sin cambio); test migrado a `proxy.test.ts`. Gate verde (67 tests), build muestra `Proxy` | both | P3 | DONE | framework | — |
| DRIVE-SPEC | Revalidar Drive (`humanos-mvp-spec.md`) antes de cambiar scope; conector falló por timeout | Codex | P3 | OPEN | docs | antes de cambio de scope |
| DB-1 | Audit triggers SECURITY DEFINER (reemplazan write app-level de audit); acoplado al ApprovalEngine — decidir DENTRO del mismo ADR/plan | both | P2 | OPEN | DB-structure | Group 4 |
| DB-SEQRESET | `requests.next_sequence` reset por año (hoy monotónico). Validar formato `HUM-2027-0001` con SOP | mine | P3 | BLOCKED-on-Jaime | DB-data | Group 4 |
| DB-VISION-B | Retrofit soft-delete (`deleted_at` + no-hard-delete) + `source_system` + columnas sync/offline + bake `AND deleted_at IS NULL` en RLS de tablas `hr.*`/`requests.*` EXISTENTES. **Gap real de future-vision readiness** (047 solo cubrió tablas NUEVAS) — necesita brainstorm+grill dedicado antes de mobile/offline | mine | P2 | OPEN | DB-structure | al TOCAR tablas existentes (Group 3/4 temprano) |
| DB-VISION-C | Columnas de compensación + custom-fields (EAV/JSONB) + completar performance/learning. YAGNI hasta la feature | mine | P3 | OPEN | DB-structure | Groups 5-7 |
| BL-3..7 | Modos de approval-chain en `docs/adr/0020`. BL-2 ya decidido | both | P2 | BLOCKED-on-Jaime | docs | Group 6 (president-gated) |
| SIGNUP-formula | `employee_code` (3 letras apellido + 3 cédula, p.ej. CUC166) **CONFIRMADA correcta** por Jaime; el "84-90% failure" fue falso-negativo por data sucia, no por la fórmula. Manejar colisiones con índice único + secuencia local | mine | P2 | OPEN | DB-data | Group 3 (signup) |
| DATA-HYGIENE | Normalización de CONTENIDO. **Forma DONE (W2: 063 given/surnames, 064 national_id UNIQUE; audit read-only).** Valores DIFERIDOS/gated → Group 3: backfill cédula (data Samantha + signup), split de valores (Opción B), ubicación (Prov/Distrito/Correg, vocab Samantha), merge de 6 dup ` 2`. Plan: `docs/work/2026-06-02-w2-data-hygiene-plan.md` | mine | P2 | PARTIAL (forma done, valor gated) | DB-data | Group 3 (signup) |
| SIGNUP-guardrails | 11 reglas de seguridad no-negociables de signup (advisory §4; 3/3 reviewers refutaron la versión naive) | mine | P2 | OPEN | security | Group 3 (signup) |
| SIGNUP-datamodel | **`national_id` UNIQUE DONE (W2 064).** CHECK DGI DIFERIDO (soft-flag `needs_review`; validar variantes E-/pasaporte/asiento-corto con Samantha); link `employee_code`↔`person_sources` | mine | P2 | PARTIAL | DB-structure | Group 3 (signup) |
| SIGNUP-session-bug | `completeOnboardingAction` aprovisiona pero NO crea sesión → rebota a /login | mine | P2 | OPEN | code | Group 3 (signup) |
| SIGNUP-phone | Onboarding mintea `auth.users` por teléfono pero login es email-only → cuentas no-logueables | mine | P2 | OPEN | code | Group 3 (signup) |
| FE-3-full | **Guard DONE (W4):** `eslint-plugin-jsx-a11y` recommended a `error` (piso a11y permanente, como anti-voseo) + 12 violaciones arregladas (labels↔control EmployeeForm/Step2/7/8, labels nuevos Step1Code/Step4Password, autoFocus removido, depth:3 para ack-checkboxes). **Manual ARIA PENDIENTE:** roles progressbar/menu/combobox, skip-to-main (AppShell), table caption/scope (EmployeeList), new-tab aria-labels (Step9), avatar role=img (perfil), focus-visible rings (NotificationBell/icon-only), focus-trap (WizardLayout) | mine | P3 | IN-PROGRESS (guard done) | FE | W4 |
| FE-4-pwa | **DONE (W4):** iconos PWA generados (sharp, marca ICONSA navy/gold sobre **blanco** — el logo es navy/gold transp., blanco confirmado por Jaime): `public/icon-192/512/maskable-512` + `app/icon.png`/`apple-icon.png`/`favicon.ico`; manifest `icons[]` + `metadata.appleWebApp`. Build auto-linkea `/icon.png` `/apple-icon.png` `/manifest.webmanifest`. Offline/SW FUERA de scope | mine | P3 | DONE | FE | — |
| S1-S4 | ADR de re-secuencia de groups + First Usable Release scope + conteo honesto (~33 unidades) + reframe Decisión #5 (en vision.md) | mine | P3 | OPEN | docs | pre-Group-3 (planning) |
| D-docs-resto | Folds menores de docs aún abiertos (slim de prosa CLAUDE.md, headers de 3 líneas pendientes, demote info ya hecho) | mine | P3 | OPEN | docs | pasada docs |

**DONE (no re-trabajar) — referencia:** W0.5 harness hardening (H-1..H-4) · doc-system migration (W0) · P2.24 COMMENT backfill (gap=0/879) · D2 ADR-ledger merge (0010-0023) · BE-2 enqueue idempotencia (048) · BE-3b rollback returns · P2.23 FK indexes (049) · `next_sequence` función (050) · P1-CI (verify.yml verde) · P1-SQL baseline · J7 branch protection · H1-H11 harness previo · FE-1b/FE-2/FE-3/FE-4 baselines · BE-1 cron retry · BE-4/SEC-5 requireHrAdmin · migraciones 039-046 · signup CSPRNG fix. Detalle en `CHANGELOG.md [Unreleased]`.

### Decisiones ratificadas de fundación (Jaime, 2026-05-29 — load-bearing context)
1. Doc set → canónico + `docs/future/`; re-key por rol+cadencia; merge de los 2 ledgers de ADR (hecho).
2. Harness → drop MCPs muertos + fix router namespaces + Stop hook + brainstorming + CLI-first (hecho).
3. SDLC → loop de 6 fases; 2 actores (Code lee el repo DIRECTAMENTE; Chat recibe repomix — NO leen el mismo bundle); gate de comprensión no-saltable para auth/RLS.
4. Los 3 P1 de madurez (CI, schema versionado, Ley81/R27) ANTES de más breadth.
5. Sequencing W1-W2-W3 (de Chat) RECHAZADO — re-secuenciar dentro de grupos/tags existentes.

## 7. Gate del pipeline (no-saltable) — gobierna brainstorm/grill/plan

> En el pipeline canónico (CLAUDE.md §Workflow), `grill-with-docs` + `writing-plans` de CADA grupo/feature DEBEN leer la **sección 6 (Backlog) de este STATUS.md**, filtrar por el grupo Y por los schemas/tablas que el plan tocará, y para cada match: **(a)** incluirlo en el plan como task, o **(b)** re-diferirlo explícitamente con razón. **Arrancar un plan con matches sin resolver está prohibido.** Las skills `iconsa-form-implementation` e `iconsa-supabase-migration` apuntan a este gate.

**Framing por trigger-event** (no solo por número de grupo):
- **Group 4** (engines + tickets + primer form): DB-1 (decisión de audit-trigger) se hace DENTRO del mismo ADR/plan que el ApprovalEngine (acoplado; aislado arriesga rework).
- **Al TOCAR tablas existentes `hr.*`/`requests.*`** (idealmente temprano en Group 3/4): DB-VISION-B (retrofit soft-delete + sync) necesita brainstorm+grill dedicado antes de mobile/offline.
- **Features sobre `learning.*`/`performance.*`/`workflows.*` (Groups 5-7):** diseñar DB-VISION-C con la feature consumidora; no especular ahora.
- **Pasadas dedicadas:** DOCS (folds restantes), A11Y/MOBILE (FE-3/FE-4).

**Mantenimiento del backlog:** un item que se completa pasa a "DONE" con su commit; uno nuevo se agrega con su trigger/gate. Referenciar CHANGELOG, nunca duplicar.
