# DB Final-Vision Design Scope — GAP entre el schema actual y la visión market-leader

**Status: PROPUESTA — pendiente de ratificación por James. Diseño, NO migraciones por aplicar.**
Fecha: 2026-06-01 · Proyecto `bzeoszympkkicwlfdtcn` (HumanOS) · PG 17.6 · Live DB compartida con MovimientOS.

Insumos: `supabase/schemas/humanos_baseline.sql` (60 tablas / 9 schemas), spec `2026-05-29-db-vision-design.md`, `reference/mvp-scope.md` (Groups 3-7), `future/11-MDM-PRINCIPLES.md` + `future/12-SOR-MATRIX.md`, `reference/business-rules.md`, y verificación en vivo del catálogo (columnas, vistas, extensiones, advisors).

## 0. Estado verificado en vivo (no asumido)

- **Vistas / matviews: CERO.** No existe ninguna vista en los 9 schemas. Hoy todo es lectura directa de tablas base.
- **Extensiones presentes:** `pgcrypto`, `uuid-ossp`, `pg_cron`, `pg_net`, `pgmq`, `wrappers`, `pg_stat_statements`, `supabase_vault`. **NO existe `vector` (pgvector).**
- **Schemas `mdm`, `etl`, `backup`: NO existen todavía.** Solo `extensions` y `vault` fuera de los 9 de la app.
- **Soft-delete (`deleted_at`):** solo en `files.uploads` (con `deleted_by`), `hr.leave_policies` y `hr.leave_assignments` (sin `deleted_by`). Ninguna otra tabla de dominio.
- **`source_system`:** solo en la familia `hr.leave_*` (4 tablas) y `hr.person_sources`. El resto usa `created_from` ad-hoc (`hr.people`, `hr.employments`) o nada.
- **`deleted_by`:** solo `files.uploads`.
- **`updated_at` faltante** en tablas mutables que lo necesitarán al escalar: `hr.invite_codes`, `requests.approvals`, `requests.revisions`, `requests.watchers` (las append-heavy y los logs append-only correctamente NO lo tienen).
- **Advisor de seguridad relevante a nuestro scope:** `requests.sequences` tiene RLS habilitada **sin policy** (rls_enabled_no_policy) — coincide con el pre-requisito de Group 4 ya anotado en MVP-SCOPE (falta el `SECURITY DEFINER` bumper + policy). Los demás security lints son de `public.*`/`humanos.*` (otras apps, fuera de R1).
- **Advisor de performance — multiple_permissive_policies: 8 ocurrencias en nuestros schemas** (lo que marcó Codex), todas por el mismo patrón (ver categoría 7).

> Implicación: el spec previo `2026-05-29` ya capturó bien el ledger de vacaciones y las convenciones de fundación. Este doc lo extiende con lo que faltaba enumerar: VIEWS (categoría 3), provisiones AI/RAG (5), analytics/eventos (6) y la corrección RLS de Codex (7).

## Convención de clasificación

- **FOUNDATION-NOW** — barato, transversal, caro de retrofitear despues. Se aplica antes de Group 3.
- **PROVISION-NOW** — reservar schema/hook/columna o ratificar convención, sin construir la feature.
- **DEFER-WITH-FEATURE** — YAGNI hasta que su grupo/feature aterrice.

---

## 1. Fundaciones transversales sobre tablas existentes

### 1.1 `deleted_at timestamptz NULL` + `deleted_by uuid NULL` en tablas de dominio mutables
Forma: columna simple (NO el dual `is_deleted`+`deleted_at` de `files.uploads`, que duplica estado). Indice parcial `WHERE deleted_at IS NULL`. Hornear `AND deleted_at IS NULL` en RLS + capa de datos del FormEngine desde el primer write de Group 4.
**Clasificacion: FOUNDATION-NOW.** Razon: caro de retrofitear (predicados de borrado hay que backfillearlos en cada policy y query ya escrita); fija ahora "sin hard-deletes en tablas de dominio" (auth.users sigue siendo la excepcion R2). Aplica a `hr.*`, `requests.tickets/comments/watchers`, `docs.*`, `workflows.*`. NO a logs append-only (`audit.log`, `requests.audit_log`, `hr.leave_ledger`).
**[James decision]** ¿`deleted_by` obligatorio en todas, o solo en tablas con datos personales/Ley 81?

### 1.2 `updated_at` mantenido por trigger (`extensions.moddatetime`) en toda tabla mutable
Forma: un `BEFORE UPDATE` trigger por tabla; reusar helper si `pg_proc` ya tiene uno (R5). Agregar la columna donde falta (1.0).
**Clasificacion: FOUNDATION-NOW.** Razon: `updated_at` autoritativo server-side = comparador LWW para sync futuro; es la base de cualquier proyeccion/vista incremental; trivial ahora, tedioso de auditar tabla-por-tabla despues.

### 1.3 `source_system text NOT NULL DEFAULT 'humanos'` (CHECK `humanos|payday|b2w|spectrum|manual_entry`) en tablas de dominio nuevas/canonicas
Forma: columna inline; estandariza los `created_from` ad-hoc de `hr.people`/`hr.employments`. Responde "quien es dueno de esta fila" sin join.
**Clasificacion: FOUNDATION-NOW** (en tablas que tocara Group 3-4) **+ PROVISION-NOW** (ratificar el CHECK como convencion para tablas de Groups 5-7). Razon: alinea con Pilar 8 de MDM (data lineage); barato inline, costoso si toca poblarlo retroactivo cuando llegue PayDay.

### 1.4 Columnas offline/sync (`row_version bigint`, vectores de version)
**Clasificacion: DEFER-WITH-FEATURE.** Razon: aditivo y barato cuando aparezca un conflicto concurrente real; LWW-sobre-`updated_at` + delete-wins cubre ~95% (ya ratificado en spec previo). PWA offline-first es explicitamente v1.1 en MVP-SCOPE. **NO pertenece ahora.**

### 1.5 `uuidv7()` default para PKs de tablas append-heavy NUEVAS
Forma: default SQL puro `uuidv7()` (PG 17.6 no lo trae nativo; PG18 si, swap sin migracion). NO re-keyear PKs UUIDv4 existentes.
**Clasificacion: PROVISION-NOW** (ratificar la convencion) **/ FOUNDATION-NOW** para el leave_ledger y para las tablas de eventos de la categoria 6 si se crean. Razon: re-keyear una tabla caliente poblada es caro; gratis si nace con el default correcto.

---

## 2. Completitud de módulos (Groups 3-7) a profundidad market-leader

### 2.1 Requests / Forms engine (Group 4-5) — `requests.*`
Tablas centrales existen (`tickets`, `types`, `approvals`, `revisions`, `comments`, `watchers`, `sequences`). Gaps:
- **`requests.sequences`: agregar policy + `requests.next_sequence(seq_type) SECURITY DEFINER`** (bumper atomico R17). Hoy RLS sin policy -> el primer ticket falla.
  **FOUNDATION-NOW.** Razon: bloqueante de Group 4; ya en el checklist de MVP-SCOPE.
- **`requests.approvals`: agregar `updated_at` + trigger; CHECK anti-self-approval (R5)** `approver_id <> requester del ticket`.
  **FOUNDATION-NOW.** Razon: R5 es critical y a nivel BD; barato antes del primer write.
- **Estado de aprobacion paralelo:** el `approval_state` JSONB por step (R24) puede vivir en `requests.tickets` (ya hay `form_data` JSONB) — NO requiere tabla nueva.
  **PROVISION-NOW** (documentar que vive inline, no crear tabla). Razon: evitar tabla especulativa; el engine la materializa en runtime.
- **SLA/escalation tracking** (cron que vence SLAs): `tickets.sla_deadline` ya existe; falta solo el worker.
  **DEFER-WITH-FEATURE** (Group 4 NotificationEngine/cron). Razon: es logica de app, no schema.

### 2.2 Documentos + E-sign (Group 6) — `docs.*` + `files.*`
`docs.signature_requests` YA tiene `provider`+`external_id`+`external_url`+`signed_file_url` (patron Documenso). `files.uploads` ya tiene checksum/retention/legal_hold.
- **Detalle por firmante** (rol SIGNER/APPROVER/VIEWER/CC + `signing_order` + estado por firmante): hoy `required_signers`/`signed_by` son arrays uuid[] — suficiente para MVP, insuficiente para market-leader (orden, rechazos por firmante).
  **DEFER-WITH-FEATURE** (Documenso es v1.1 explicito). Razon: columnas incrementales; YAGNI hasta integrar Documenso.
- **RLS owner+hr_admin en docs sensibles regardless del provider (R13).**
  **FOUNDATION-NOW** cuando se escriba la primera policy de `docs.*`. Razon: critical legal; no depende de la feature.

### 2.3 Performance (v2) — `performance.*`
7 tablas de scaffolding ya existen y bien modeladas (cycles/reviews/templates/calibrations/feedback/goals/goal_updates).
- Retrofit `deleted_at` + `source_system` + `uuidv7` (feedback/goal_updates) + RLS por tier (subject/reviewer/supervisor/hr_admin) + COMMENT por columna.
  **DEFER-WITH-FEATURE.** Razon: modulo v2 explicito en MVP-SCOPE; seedear/poblar scaffolding ahora es especulativo. Las columnas de fundacion se aplican AL activarlo, no antes.

### 2.4 Learning (v2) — `learning.*`
8 tablas de scaffolding ya existen. Angulo ICONSA de alto valor: `learning.certification_assignments.expiration_date` -> alertas de vencimiento de certificados de seguridad (trabajo en altura) en construccion.
- Seed catalogo `learning.certifications` + RLS + COMMENT al activar.
  **DEFER-WITH-FEATURE.** Razon: modulo v2. SCORM/xAPI -> LRS externo, no tablas aqui.

### 2.5 Time-off + ledger de acumulacion — `hr.leave_*`
Ya creado (policies/assignments/ledger/balances) con `source_system` + `deleted_at` parciales. Gaps menores:
- Falta `deleted_by` y trigger `updated_at` consistente; falta la `next-balance` write-RPC `SECURITY DEFINER` (si no esta).
  **FOUNDATION-NOW** (esta en la ruta critica de VACACIONES/Group 5). Razon: el balance "dias disponibles" depende de esto; ya identificado como el item mas profundo del spec previo.

---

## 3. VIEWS — proyecciones de lectura (HOY: CERO)

La visión market-leader (directorio, organigrama, dashboards) hoy se arma con queries ad-hoc repetidas en el FE. Una capa de vistas estabiliza el contrato de lectura y centraliza los predicados RLS-friendly (`is_current`, `deleted_at IS NULL`, `status='Activo'`).

- **`hr.v_directory`** — directorio (F8): person + employment actual + position + department + location + foto, solo activos. Sketch: `SELECT p.id, p.full_name, p.photo_url, e.position_text, ou.name dept, loc.name office, sup.full_name supervisor FROM hr.people p JOIN hr.employments e ON e.person_id=p.id AND e.is_current ...`.
  **FOUNDATION-NOW.** Razon: F8 (Group 3) la consume ya; definir el shape una vez evita N variantes divergentes en el FE; barata, no destructiva.
- **`hr.v_org_chart`** — recursiva supervisor->reports para organigrama / "Mi Equipo" (F34). Sketch: CTE recursiva sobre `employments.supervisor_id`.
  **FOUNDATION-NOW** (Group 3 perfil + directorio). Razon: misma logica de jerarquia se necesita en RLS (`is_supervisor_of`) y en UI; centralizar.
- **`requests.v_ticket_summary`** — ticket + tipo + requester + estado + % progreso (de `approval_state`) + SLA restante, para `/solicitudes` (F28) y dashboard (F31).
  **PROVISION-NOW** (definir contrato; materializar en Group 4 cuando el engine fije la forma de `approval_state`). Razon: depende del shape final del engine; reservar el nombre/contrato evita refactor del FE.
- **`requests.v_admin_dashboard` / metricas** — conteos por estado/tipo/SLA-vencido para F31.
  **DEFER-WITH-FEATURE** (Group 7). Razon: dashboard es Group 7; la forma depende de que metricas pida Samantha.
- **Matviews para analytics pesados** (tendencias, agregados historicos).
  **DEFER-WITH-FEATURE.** Razon: volumen (370 personas) no lo justifica aun; vistas normales bastan.

**[James decision]** ¿Las vistas viven en su schema de dominio (`hr.v_*`, `requests.v_*`) o en un schema de presentacion dedicado? Recomendacion: en el schema de dominio con prefijo `v_`, `security_invoker=true` (PG15+) para que respeten la RLS del que consulta.

## 4. MDM hooks

`hr.person_sources` (453 filas) ES el link-table golden-record (NO `people_external_ids`, que nunca se creo). Pilares MDM internos de HumanOS ya cumplidos (golden record, lineage parcial, audit, COMMENT, RLS).
- **`source_system` inline** (ver 1.3) — el "data lineage" por fila (Pilar 8).
  **FOUNDATION-NOW/PROVISION-NOW** (ya cubierto en 1.3).
- **Crosswalks `{entity}_external_ids` para entidades no-person** (positions/org_units/employments -> PayDay/Spectrum), bajo schema **`mdm.*`**.
  **PROVISION-NOW** (crear el schema `mdm` vacio + ratificar el template copiado de `person_sources`; NO crear tablas hasta integracion real). Razon: 11-MDM-PRINCIPLES es explicitamente "gradual, no big-bang"; el schema-namespace es barato de reservar, las tablas son YAGNI.
- **`etl.*` staging + `mdm.field_resolution_rules`** (Pilares 6-7).
  **DEFER-WITH-FEATURE** (primera integracion real: Skydata/Spectrum/PayDay). Razon: sin integracion no hay nada que stagear; over-engineering hoy.
- **`audit.changes` bitemporal** (valid_from/valid_to + source_system) descrito en MDM Pilar 4 — hoy solo existe `audit.log` (transaction-time).
  **PROVISION-NOW** (decidir si `audit.log` se extiende con `source_system`+`valid_from/to` o se crea `audit.changes`). Razon: agregar `source_system` a `audit.log` ahora es barato y da lineage; el bitemporal completo es DEFER.
  **[James decision]** ¿Extender `audit.log` o introducir `audit.changes` separada?

## 5. Provisiones AI / RAG (pgvector + embeddings)

El toolstack contempla un AI assistant (KB Q&A, "¿cuántos días de vacaciones me quedan?") — explicitamente **v2** en MVP-SCOPE. HOY no existe `vector`. La KB completa (F9, Group 3) ya carga `docs.articles` + `docs.sops` — el corpus para RAG nace en Group 3.
- **Habilitar extension `vector`** en `extensions`.
  **PROVISION-NOW.** Razon: habilitar la extension es trivial y no destructivo; permite que el corpus de Group 3 sea embebible despues sin recargar.
- **`docs.article_chunks`** (article_version_id, chunk_index, content text, `embedding vector(N)`, token_count) + indice HNSW.
  **DEFER-WITH-FEATURE** (AI assistant v2). Razon: la dimension del embedding depende del modelo elegido (no decidido); construir la tabla ahora la ata a un modelo. Reservar via extension basta.
- **`docs.kb_queries`** (log de preguntas/respuestas/feedback del chatbot) para evaluacion.
  **DEFER-WITH-FEATURE** (v2). Razon: no hay chatbot que loguear.

**[James decision]** ¿Modelo de embeddings (dimension del `vector(N)`) y donde corre la generacion (edge function vs externo)? Bloquea solo la tabla de chunks, no la extension.

## 6. Analytics / event tables

Market-leaders tienen un event stream para audit fino, "quién vio qué", funnels de adopcion y feeding de analytics. Hoy solo `audit.log` (cambios de datos) + `notifications.outbox`.
- **`audit.access_log` / event stream** (actor, event_type `view|search|export|login`, entity, metadata, created_at) con PK `uuidv7()`, append-only, sin `updated_at`/`deleted_at`.
  **PROVISION-NOW** (reservar el patron; encender selectivamente). Razon: util para Ley 81 (R27 — trazabilidad de acceso a datos sensibles) y adopcion; pero loguear TODO desde dia 1 es volumen sin consumidor. Reservar shape, encender en accesos sensibles primero.
  **[James decision]** ¿Loguear accesos de lectura a `hr.medical_info`/`personal_documents` desde el inicio por Ley 81, o diferir?
- **Dashboards/funnels agregados.**
  **DEFER-WITH-FEATURE.** Razon: sin event stream poblado no hay que agregar; se construye cuando haya datos.

## 7. Correccion RLS / policies / schemas expuestos + warnings de Codex

### 7.1 `requests.sequences` — RLS habilitada SIN policy (security advisor confirmado)
Resultado: con RLS on y cero policies, todo acceso queda denegado -> el primer `next_sequence` falla. Fix: `requests.next_sequence() SECURITY DEFINER` (bypassa RLS) + policy SELECT minima si se lee directo.
**FOUNDATION-NOW.** Razon: bloqueante de Group 4; ya en el checklist.

### 7.2 multiple_permissive_policies — 8 tablas en nuestros schemas (warning de Codex CONFIRMADO)
Tablas: `hr.leave_assignments`, `hr.leave_policies`, `hr.locations`, `hr.org_units`, `hr.positions`, `requests.approvals`, `requests.revisions`, `requests.types`. Patron en todas: existe una policy de escritura `*_modify`/`*_write_admin` definida `FOR ALL` (que por ser permisiva tambien se evalua en SELECT) **mas** una policy `*_select`. Postgres evalua AMBAS en cada SELECT (OR de permisivas) -> overhead por fila y semantica difusa.
Fix: separar la policy de escritura a comandos especificos (`FOR INSERT`/`FOR UPDATE`/`FOR DELETE`) en vez de `FOR ALL`, dejando una sola permisiva por accion SELECT.
**FOUNDATION-NOW.** Razon: barato (re-CREATE POLICY), elimina los 8 warnings, evita propagar el anti-patron a las ~30 tablas que faltan crear en Groups 3-7. Establece el patron correcto antes de multiplicarlo.

### 7.3 Convencion de policies para tablas nuevas
PROVISION-NOW: ratificar plantilla — una policy permisiva por accion (`_select` FOR SELECT, `_ins` FOR INSERT, `_upd` FOR UPDATE, `_del` FOR DELETE), nunca `FOR ALL` permisivo solapado con un SELECT; usar `(SELECT auth.uid())` envuelto para evitar el lint `auth_rls_initplan` (re-evaluacion por fila).
**PROVISION-NOW.** Razon: convencion barata que previene reintroducir ambos warnings en Groups 3-7.

### 7.4 Schemas expuestos en PostgREST
Verificar que `performance.*`/`learning.*`/`workflows.*` (scaffolding sin RLS-policies completas) NO esten en el `exposed_schemas` de PostgREST hasta tener RLS completa, para no exponer tablas a medio-asegurar via API.
**FOUNDATION-NOW (verificacion).** Razon: tablas con RLS incompleta + schema expuesto = fuga; verificar es gratis.

---

## 8. Resumen de clasificacion

### FOUNDATION-NOW (aplicar ANTES de Group 3)
1. `deleted_at` (+`deleted_by`) single-col + indice parcial + "no hard-delete" horneado en RLS/capa de datos (1.1).
2. `updated_at` por trigger `moddatetime` en toda tabla mutable, agregando la columna donde falta (1.2).
3. `source_system` inline en tablas de dominio que toca Group 3-4 (1.3).
4. `requests.sequences`: policy + `next_sequence() SECURITY DEFINER` bumper (2.1 / 7.1).
5. `requests.approvals`: `updated_at`+trigger + CHECK anti-self-approval R5 (2.1).
6. `hr.leave_*`: `deleted_by` + trigger `updated_at` + write-RPC del balance (2.5).
7. Vistas `hr.v_directory` + `hr.v_org_chart` con `security_invoker` (3) — consumidas por F8/F34 de Group 3.
8. Corregir las 8 `multiple_permissive_policies` (split `FOR ALL` -> por-accion) (7.2).
9. RLS owner+hr_admin en `docs.*` sensibles al escribir su primera policy (2.2 / R13).
10. Verificar `exposed_schemas` de PostgREST (7.4).

### PROVISION-NOW (reservar schema/hook/convencion, NO construir)
1. Convencion `source_system` CHECK + `uuidv7()` default para tablas append-heavy nuevas (1.3 / 1.5).
2. Crear schema `mdm` vacio + ratificar template `{entity}_external_ids` copiado de `person_sources` (4).
3. Habilitar extension `vector` (pgvector) sin crear tablas de embeddings aun (5).
4. Contrato de vista `requests.v_ticket_summary` (materializar en Group 4) (3).
5. `approval_state` JSONB vive inline en `requests.tickets` (documentar, no crear tabla) (2.1).
6. Patron de event stream `audit.access_log` (shape reservado, encendido selectivo) (6).
7. Plantilla de policies por-accion + `(SELECT auth.uid())` para tablas nuevas (7.3).
8. Decision `audit.log` extendido con `source_system` vs `audit.changes` bitemporal (4).

### DEFER-WITH-FEATURE
**Conteo: 9 items.** Headline: *todo lo de los modulos v2/v1.1 y de integraciones que aun no aterrizan no se construye hoy.*
1. Columnas offline/sync `row_version` (PWA v1.1) — 1.4.
2. Detalle por-firmante de e-sign / Documenso (v1.1) — 2.2.
3. Modulo `performance.*` completo (v2) — 2.3.
4. Modulo `learning.*` completo (v2) — 2.4.
5. Worker SLA/escalation (Group 4 app-logic) — 2.1.
6. `etl.*` staging + `mdm.field_resolution_rules` (primera integracion real) — 4.
7. `docs.article_chunks` + `docs.kb_queries` embeddings (AI assistant v2) — 5.
8. Matviews/dashboards de analytics agregados (Group 7+) — 3 / 6.
9. `audit.changes` bitemporal completo (valid_from/to) — 4.

---

## 9. Items que requieren decision de James

1. **`deleted_by`** — ¿obligatorio en todas las tablas de dominio o solo en las con datos personales/Ley 81? (1.1)
2. **Ubicacion de vistas** — ¿`hr.v_*`/`requests.v_*` en schema de dominio (recomendado, `security_invoker`) o schema de presentacion dedicado? (3)
3. **Audit lineage** — ¿extender `audit.log` con `source_system`+`valid_from/to` o introducir `audit.changes` bitemporal separada? (4)
4. **Embeddings** — modelo + dimension `vector(N)` + donde corre la generacion; bloquea solo la tabla de chunks, no la extension. (5)
5. **Ley 81 access logging** — ¿loguear accesos de LECTURA a `hr.medical_info`/`hr.personal_documents` desde el inicio (R27) o diferir? (6)

## 10. Compliance checklist (toda tabla/vista nueva)
R1 (solo schemas permitidos) · R2 (RLS + >=1 policy) · R3 (COMMENT tabla+columnas) · R5 (reusar helpers `pg_proc` antes de crear: moddatetime, next_sequence, balance-RPC) · R13 (docs/medical owner+hr_admin) · R22 (nada toca auth.users) · R23 (migraciones UTF-8 sin BOM) · `iconsa-rls-validation` post-creacion · advisor `multiple_permissive_policies` debe quedar en 0 para nuestros schemas tras 7.2.
