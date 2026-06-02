# START HERE — Sesión nueva de Code (post 2026-06-01)

**Cómo arrancar (orden de lectura mínimo):** este doc → `docs/work/consolidated-backlog.md` (qué falta) → `docs/work/db-final-vision-design.md` (qué construir en BD) → `docs/DOC-SYSTEM-PROPOSAL.md` (cómo migrar docs, GO dado) → `docs/reference/toolstack-roadmap.md` (toolstack por fases). NO leas "mil archivos" — todo el contexto vive en esos 4 + CLAUDE.md.

Reemplaza a `HANDOFF-NEXT-SESSION-2026-06-01.md` (borrar en W0). Estado git: `main` pusheado (gate verde). Acceso BD: MCP `mcp__claude_ai_Supabase__*` (project `bzeoszympkkicwlfdtcn`; el plugin Supabase MCP se desconectó — cargar el de claude.ai vía ToolSearch). **NO `supabase db push`** (drift de migraciones sin resolver — ver MIG-DRIFT).

## Misión

Perfeccionar la **fundación (docs + BD estructura/contenido + framework)** para un workflow que se mantenga TODO el desarrollo (no solo MVP), con la BD diseñada para la **visión final** (paridad líderes de mercado). Luego construir **Group 3 ATENDIDO** por el pipeline (prueba el framework antes de habilitar overnight para Group 4+).

## Principios que rigen (en memoria + docs)

- **Schema-first:** James aprueba el diseño de BD ANTES de migrar. Forma del esquema = ahora; valores de política = data después.
- **Diseñar para la visión SIN sobre-construir:** FOUNDATION-NOW + PROVISION-NOW (hooks), DEFER-WITH-FEATURE lo especulativo.
- **Nunca decidir arquitectura en silencio** — argumentar + James decide.
- **Doc-system nuevo** (DOC-SYSTEM-PROPOSAL, GO dado): nombres topicales, `reference/` durable, `adr/` append-only, `STATUS.md` único de estado, `work/`+`_archive/`, `future/` planeado. Sin voseo. UTF-8 no BOM.

## Plan de ataque (orden de dependencia)

- **W0 — Migrar doc-system** (`DOC-SYSTEM-PROPOSAL.md`): renombrar 00-14→topical, colapsar `09-ESTADO`+`DEFERRED-ITEMS`+`AUDITS-PENDING`+handoffs → **`STATUS.md`** (sembrar con `consolidated-backlog.md`), `work/`+`_archive/`, borrar stubs 03/10 + `HANDOFF.json`, fix stale (GitHub URL `jecg2804/HumanOS`, James/Jaime, counts 9/67, schema-list Constitution §1).
- **W1 — BD schema-first** (`db-final-vision-design.md`): James aprueba → aplicar **FOUNDATION-NOW** (10 items) + **PROVISION-NOW** (8 items) → migraciones con rls-reviewer+migration-reviewer+verify. Incluye **MIG-DRIFT** (alinear 047-051 con timestamps remotos) + **TYPES-STALE** (regenerar `database.types.ts`+baseline).
- **W2 — BD data (DATA-HYGIENE):** split nombre/apellido, formato cédula DGI, backfill, dedup, addresses. Prerequisito de signup.
- **W3 — Código/seguridad (válidos de Codex):** SEC-CONSENT (Ley 81, P1), SEC-ENQUEUE (`notifications.enqueue` authZ, P1), SEC-SEQ (`next_sequence` guard), CODE-ADMIN-TX, CODE-CRON, SEC-LEGACY, SEC-DEPS, ENV-SROLE, FW-PROXY (middleware→proxy).
- **W4 — FE-3 a11y full + FE-4 íconos PWA** (logos en raíz: `Iconsa 20years HORIZ/VERT png transp.png`, `Iconsa-2011-trans2.png`).
- **W5 — capturar toolstack roadmap** en `reference/` + enlazar.
- **→ Group 3 ATENDIDO** por el pipeline (perfil/directorio/KB + signup). Las 6 decisiones de signup + DATA-HYGIENE se resuelven aquí.

## Backlog (de `consolidated-backlog.md`): 11 OPEN pre-Group-3 · 3 BLOCKED-James · ~22 DONE

**P1 pre-Group-3:** SEC-CONSENT · SEC-ENQUEUE · MIG-DRIFT.
**P2 pre-Group-3:** SEC-SEQ · TYPES-STALE · CODE-ADMIN-TX · CODE-CRON · SEC-LEGACY · SEC-DEPS · ENV-SROLE.
**BLOCKED-James:** BL-3 (form_schema sources, Group 4) · BL-4=seq-reset anual (Group 4) · BL-5..7 (SLA/delegación/Devuelta_Info, Group 4/6).

## Decisiones de James — CONFIRMADAS (2026-06-01)

1. **soft-delete:** `deleted_at` en todas; `deleted_by` solo en tablas con datos personales/Ley-81. ✅
2. **views:** schema de dominio `hr.v_*` con `security_invoker`. Empezar con `v_directory` + `v_org_chart` (Group 3); matviews para analytics = futuro. ✅
3. **audit:** extender `audit.log` (+`source_system`); `audit.changes` bitemporal DIFERIDO (YAGNI). ✅
4. **embeddings/RAG:** pgvector enabled NOW (provision); tablas de embeddings al shippear KB (Group 3+). `vector(1536)` (text-embedding-3-small) vía Vercel AI Gateway; generación en server action/cron al crear/editar contenido. Revisar dimensión solo si la calidad no alcanza. ✅
5. **Ley 81:** loggear READ de `hr.medical_info`/`personal_documents` desde día 1. ✅

**Contenido user-authored (corrección de James):** SÍ queremos features donde el usuario crea contenido (capacitaciones, blog, anuncios) — como los líderes. NO es un CMS externo: se construye sobre nuestro propio schema (`docs.articles`/`article_versions` para KB/blog/anuncios, `learning.courses`/`course_modules` para capacitaciones) + un editor (markdown/rich-text). Un CMS externo duplicaría la SOR y complicaría RLS. El SCHEMA ya existe; falta la UI de autoría (Groups 5-7).

**Offline + apps móviles (Android/iOS) — futuro deseado:** la BD se provisiona para soportarlo (soft-delete + `source_system` + columnas de sync diferidas con su feature); las apps móviles serán clientes futuros sobre la misma Supabase API. No se construye ahora, pero el diseño no lo bloquea.

**Signup (Group 3):** las 6 decisiones del signup-advisory §6 — se deciden al diseñar signup.

## Reglas duras

R1 schemas prohibidos (public/payroll/humanos). R22 auth.users (filtro allowed_apps). R13 datos sensibles owner+hr_admin. R23 encoding. NO voseo. Context7 antes de usar libs. No `db push`. Schema-first: aprobar diseño antes de migrar.
