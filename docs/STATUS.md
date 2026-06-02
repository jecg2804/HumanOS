# STATUS — HumanOS (estado vivo)

**Role:** EL ÚNICO doc mutable de "qué estamos haciendo / qué falta / qué está bloqueado". Colapsa los antiguos 6 docs de estado solapados (09-ESTADO-ACTUAL, DEFERRED-ITEMS, AUDITS-PENDING, AUDIT-HANDOFF, 2 handoffs).
**Read-when:** al abrir sesión — el camino de arranque es `CLAUDE.md → STATUS.md`, luego el pipeline jala `reference/` just-in-time.
**Maintain-when:** cuando cambia la fase, se cierra/abre un item de backlog, o se toma/desbloquea una decisión. **El estado vive SOLO aquí** — no recrear un 2.º doc de estado. Conteos vivos (personas, tickets, invite codes, tests) → BD/CI vía Supabase MCP, **nunca hardcodear**.

---

## 1. Fase actual

- **Group 2 (Onboarding) shipped** — tag `v0.0.2` (commit `32ef28b`). Group 1 (Foundation) shipped `v0.0.1`.
- **Group 3 (Perfil + Directorio + Knowledge Base)** — en *planning*. Es la prueba del framework: se construye ATENDIDO por el pipeline antes de habilitar runs overnight para Group 4+.
- Trabajo directo sobre `main` (greenfield, sin usuarios productivos). CI verde, branch protection activa.
- **Misión vigente:** perfeccionar la fundación (docs + BD-para-visión-final + framework) y luego Group 3 por el pipeline. La BD se diseña para la **visión final** (paridad líderes de mercado: mobile + offline + MDM/cross-app), no solo el MVP.

## 2. Plan de ataque (foundation → Group 3)

Orden de dependencia. Detalle de diseño en `docs/work/`.

| WS | Qué | Estado |
|----|-----|--------|
| **W0** | Migrar doc-system (reference/ topical · STATUS único · work/_archive · borrar stubs · fix stale · @imports) | **en curso** |
| **W0.5** | Framework hardening HARDEN-NOW (H-1..H-4 hechos; H-6 en framework.md; **H-5 = acción de James**) | código hecho |
| **W1** | BD schema-first — `docs/work/db-final-vision-design.md`. **James aprueba el diseño ANTES de migrar.** Incluye MIG-DRIFT + TYPES-STALE | pendiente (GATE de aprobación) |
| **W2** | DATA-HYGIENE (split nombre/apellido, cédula DGI, backfill, dedup, addresses) | pendiente |
| **W3** | Código/seguridad (válidos de Codex): SEC-CONSENT, SEC-ENQUEUE, SEC-SEQ, CODE-ADMIN-TX, CODE-CRON, SEC-LEGACY, SEC-DEPS, ENV-SROLE, FW-PROXY | pendiente |
| **W4** | FE-3 a11y full + FE-4 íconos PWA | pendiente |
| **W5** | Capturar toolstack roadmap en reference/ + enlazar | pendiente |
| **→ Group 3** | Perfil/directorio/KB + signup, ATENDIDO por el pipeline | pendiente |

## 3. Decisiones confirmadas (vigentes — NO re-preguntar)

**Diseño de BD (James, 2026-06-01):**
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
- **Principio del design pass — "forma AHORA, valores de política/config DESPUÉS (como data, dentro del grupo)":** NOW = toda tabla/columna/constraint/índice/RLS/policy determinable con confianza desde la visión. LATER = SLAs, reglas de delegación, `form_schema`/`approval_chain_template` por form. Regla: "¿puedo determinar la forma con confianza ahora?" sí→ahora; si la forma depende de lógica de feature no diseñada → **argumentar y dejar decidir a James (nunca diferir en silencio)**.

## 4. Decisiones humanas pendientes (blockers)

- **W1 [James decision] (en `db-final-vision-design.md` §9):** `deleted_by` ¿todas o solo Ley 81? · ubicación de vistas (`hr.v_*` recomendado) · audit lineage (extender `audit.log` vs `audit.changes`) · modelo/dimensión de embeddings · Ley 81 read-logging desde inicio. *(Las 5 ya tienen recomendación + las confirmadas en §3 cubren la mayoría — ratificar al presentar el diseño.)*
- **Signup (Group 3):** las 6 decisiones de `docs/superpowers/specs/2026-06-01-signup-advisory.md` §6 (email canónico vs co-igual, SSO Google, obra sin buzón, formato de fallback code, `employee_code` vs `login_alias`, deprecar teléfono-como-identificador).
- **Approval-chain (Group 4/6, ADR-0020):** BL-3 (sources de `form_schema` en 8 seeds) · BL-4 (reset anual de numeración) · BL-5 (enum huérfano `Devuelta_Info`: drop o agregar status) · BL-6 (SLA + escalation) · BL-7 (reglas de delegación). BL-2 ya DECIDIDO (president self-approval: omitir step + audit flag).
- **Gerencia General ≠ President:** validar con **Samantha** si VP Ferrer / otros gerentes entran en modo `parallel` (diferido v1.1; MVP asume solo Rodrigo).
- **app_role de Javier Ferrer (FER337):** hoy `admin`, a revisar con Samantha.
- **FE-4-pwa:** íconos necesitan assets de diseño (logos colocados en raíz por James).
- **Nombre del owner — James vs Jaime:** docs/memory/CLAUDE.md usan "James"; git user es "Jaime"; mismo persona. Estandaricé los docs que toqué a **James**; confirmar el spelling canónico (o si prefieres "Jaime").
- **Autoridad de desviación de SOP (CLAUDE.md regla 9):** hoy dice "validar con James". R26 / Constitution §7 indican que la autoridad de RRHH/SOP es **Samantha**. No lo cambié en silencio — ¿"validar con James" (que coordina con Samantha) o repuntar a Samantha?

## 5. Hechos operacionales

- **Hosting:** MovimientOS `rein-eisenwerk.com` (Vercel `prj_o28h5tYDskqF3AjBg1w5W3F3fYu4`); HumanOS `humanos.rein-eisenwerk.com` (Vercel `prj_DqJQEL9LJ5qcwkw8Et6WYUpUxiLQ`); email worker Vercel Cron `/api/cron/process-notifications` (`*/5 * * * *`); Resend dominio verificado `rein-eisenwerk.com`.
- **BD:** proyecto Supabase `bzeoszympkkicwlfdtcn` (PG 17.6, compartido con MovimientOS). Acceso vía MCP `mcp__claude_ai_Supabase__*` (cargar vía ToolSearch; el plugin Supabase MCP se desconecta). **NO `supabase db push`** mientras MIG-DRIFT esté abierto.
- **GitHub:** repo correcto `github.com/jecg2804/HumanOS` (NO `ICONSA-Solutions/*`).
- **Branch protection (`main`):** required status checks = [`typecheck / lint / test / scan`, `build`]; `allow_force_pushes=false`; `allow_deletions=false`; `enforce_admins=false`; `required_pull_request_reviews=null`. **Nota (push 2026-06-01):** un push directo del owner reporta *"Bypassed rule violations: 2 of 2 required status checks"* — los 2 checks aplican vía PR, pero el owner los bypassa en push directo. **H-5 (acción de James):** (a) decidir si se exige el check en push directo / se trabaja por PR para runs desatendidos; (b) poblar los secrets del job `build` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ONBOARDING_TOKEN_SECRET`).
- **ENV-SROLE:** `SUPABASE_SERVICE_ROLE_KEY` local de `.env.local` falla con supabase-js (Invalid API key) — no prueba que prod esté roto (Vercel puede diferir). Verificar sin imprimir/rotar secretos.
- **Recipe de revalidación** (preservada de la auditoría Codex): typecheck/lint/test/build · `npm audit --audit-level=high` · Playwright auth smoke · `supabase migration list --linked` · `supabase db advisors --linked` · `supabase gen types ... | Select-String 'post_leave_ledger_entry|next_sequence|leave_ledger|leave_balances|dedupe_key'` · `vercel link` antes de cualquier `vercel ls` (sin `.vercel/project.json` lista deployments del proyecto equivocado). **Cuidado:** no `supabase db push` contra el proyecto compartido; `vercel env pull` escribe archivos de env locales.

---

## 6. Backlog (fuente única; con triggers/gate)

`source` = de dónde viene (mine / Codex / both). `status`: OPEN (código/BD/seguridad), BLOCKED-on-James (decisión humana), DONE.

| ID | Ítem | Source | Sev | Status | Categoría | Trigger / Bloquea |
|----|------|--------|-----|--------|-----------|-------------------|
| SEC-CONSENT | Consentimiento Ley 81 antes de Step6/7 (médico/emergencia) + BD de consentimiento versionado (`consent_at/version/scope/actor/IP`) + bloquear write sin consentimiento. Texto validado por abogado | both | P1 | OPEN | security | pre-Group-3 |
| SEC-ENQUEUE | `notifications.enqueue` SECURITY DEFINER ejecutable por `authenticated` sin validar que el caller pueda notificar al `recipient_id`. REVOKE de authenticated + solo service-role o guard interno; `import 'server-only'` en `insert.ts` | Codex | P1 | OPEN | security | pre-Group-3 |
| MIG-DRIFT | `supabase/migrations/047..051` no alineados con `supabase_migrations` (locales vs remotos `20260601130108...`). Renombrar a timestamps reales o mover a `snippets/` + documentar. NO `db push` hasta resolver | Codex | P1/P2 | OPEN | DB-structure | pre-Group-3 (W1) |
| SEC-SEQ | `requests.next_sequence` (050) SECURITY DEFINER con grant `authenticated` sin guard → cualquiera quema numeración. REVOKE authenticated o guard interno | Codex | P2 | OPEN | security | pre-Group-3 |
| TYPES-STALE | `database.types.ts` + `humanos_baseline.sql` desfasados vs BD viva (faltan `leave_ledger/leave_balances/post_leave_ledger_entry/next_sequence/dedupe_key`). Regenerar desde live + revisar diff | Codex | P2 | OPEN | code | pre-Group-3 (W1) |
| CODE-ADMIN-TX | Creación admin de empleado no transaccional (`people`→`employments`→`user_settings`→invite); falla parcial deja empleado roto. RPC service-role transaccional o compensating cleanup | Codex | P2 | OPEN | code | pre-Group-3 |
| CODE-CRON | Worker de cron ignora `{ error }` en updates (`sent`/`markPermanent`/`markRetryable`) → estado falso, duplicados o reintentos eternos | Codex | P2 | OPEN | code | pre-Group-3 |
| SEC-LEGACY | Schema legacy `humanos.*` con policies permisivas (`WITH CHECK true`) + 36 filas. Confirmar exposed-schemas; revocar/endurecer/droppear. *(Nota: exposed-schemas se resolvió 2026-05-29 — `humanos` removido; queda confirmar + endurecer/dropear las tablas legacy.)* | Codex | P2 | OPEN | security | pre-Group-3 |
| SEC-DEPS | `npm audit` falla con highs (`path-to-regexp` via @vercel/config; `postcss` via next). NO `--force`; seguir upstream + excepción documentada | Codex | P2 | OPEN | security | pre-Group-3 |
| ENV-SROLE | `SUPABASE_SERVICE_ROLE_KEY` local no valida. Verificar local + Vercel sin imprimir/rotar | Codex | P2 | OPEN | security | pre-Group-3 |
| FW-PROXY | `src/middleware.ts` deprecated en Next 16 → migrar a `src/proxy.ts` antes de Next 17 (R10/Context7) | both | P3 | OPEN | framework | pre-Next-17 |
| DRIVE-SPEC | Revalidar Drive (`humanos-mvp-spec.md`) antes de cambiar scope; conector falló por timeout | Codex | P3 | OPEN | docs | antes de cambio de scope |
| DB-1 | Audit triggers SECURITY DEFINER (reemplazan write app-level de audit); acoplado al ApprovalEngine — decidir DENTRO del mismo ADR/plan | both | P2 | OPEN | DB-structure | Group 4 |
| DB-SEQRESET | `requests.next_sequence` reset por año (hoy monotónico). Validar formato `HUM-2027-0001` con SOP | mine | P3 | BLOCKED-on-James | DB-data | Group 4 |
| DB-VISION-B | Retrofit soft-delete (`deleted_at` + no-hard-delete) + `source_system` + columnas sync/offline + bake `AND deleted_at IS NULL` en RLS de tablas `hr.*`/`requests.*` EXISTENTES. **Gap real de future-vision readiness** (047 solo cubrió tablas NUEVAS) — necesita brainstorm+grill dedicado antes de mobile/offline | mine | P2 | OPEN | DB-structure | al TOCAR tablas existentes (Group 3/4 temprano) |
| DB-VISION-C | Columnas de compensación + custom-fields (EAV/JSONB) + completar performance/learning. YAGNI hasta la feature | mine | P3 | OPEN | DB-structure | Groups 5-7 |
| BL-3..7 | Modos de approval-chain en `docs/adr/0020`. BL-2 ya decidido | both | P2 | BLOCKED-on-James | docs | Group 6 (president-gated) |
| SIGNUP-formula | `employee_code` (3 letras apellido + 3 cédula, p.ej. CUC166) **CONFIRMADA correcta** por James; el "84-90% failure" fue falso-negativo por data sucia, no por la fórmula. Manejar colisiones con índice único + secuencia local | mine | P2 | OPEN | DB-data | Group 3 (signup) |
| DATA-HYGIENE | Normalización de CONTENIDO (nunca auditado): split nombre/apellido (no hay columna `apellido`), formato cédula DGI, backfill cédula (poblada parcialmente — % vivo en BD), dedup, addresses. Bloquea computar `employee_code` + cédula-como-identidad | mine | P2 | OPEN | DB-data | Group 3 (signup, W2) |
| SIGNUP-guardrails | 11 reglas de seguridad no-negociables de signup (advisory §4; 3/3 reviewers refutaron la versión naive) | mine | P2 | OPEN | security | Group 3 (signup) |
| SIGNUP-datamodel | `national_id` UNIQUE + CHECK DGI; link `employee_code`↔`person_sources`; índice único CI | mine | P2 | OPEN | DB-structure | Group 3 (signup) |
| SIGNUP-session-bug | `completeOnboardingAction` aprovisiona pero NO crea sesión → rebota a /login | mine | P2 | OPEN | code | Group 3 (signup) |
| SIGNUP-phone | Onboarding mintea `auth.users` por teléfono pero login es email-only → cuentas no-logueables | mine | P2 | OPEN | code | Group 3 (signup) |
| FE-3-full | a11y comprehensivo (keyboard nav, contraste, ARIA en todo interactivo); baseline hecho | mine | P3 | OPEN | FE | W4 |
| FE-4-pwa | Íconos PWA + offline real (service worker); baseline (manifest+viewport) hecho; íconos necesitan assets | mine | P3 | BLOCKED-on-James (assets) | FE | W4 |
| S1-S4 | ADR de re-secuencia de groups + First Usable Release scope + conteo honesto (~33 unidades) + reframe Decisión #5 (en vision.md) | mine | P3 | OPEN | docs | pre-Group-3 (planning) |
| D-docs-resto | Folds menores de docs aún abiertos (slim de prosa CLAUDE.md, headers de 3 líneas pendientes, demote info ya hecho) | mine | P3 | OPEN | docs | pasada docs |

**DONE (no re-trabajar) — referencia:** W0.5 harness hardening (H-1..H-4) · doc-system migration (W0) · P2.24 COMMENT backfill (gap=0/879) · D2 ADR-ledger merge (0010-0023) · BE-2 enqueue idempotencia (048) · BE-3b rollback returns · P2.23 FK indexes (049) · `next_sequence` función (050) · P1-CI (verify.yml verde) · P1-SQL baseline · J7 branch protection · H1-H11 harness previo · FE-1b/FE-2/FE-3/FE-4 baselines · BE-1 cron retry · BE-4/SEC-5 requireHrAdmin · migraciones 039-046 · signup CSPRNG fix. Detalle en `CHANGELOG.md [Unreleased]`.

### Decisiones ratificadas de fundación (James, 2026-05-29 — load-bearing context)
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
