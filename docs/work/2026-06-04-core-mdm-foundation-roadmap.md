> **STATUS: BORRADOR / NO RATIFICADO (2026-06-04).** Artefacto de investigacion (workflow) para discusion con Jaime. NINGUNA decision aqui esta aprobada hasta que Jaime cierre la discusion y se aterrice en ADR. Puntos ABIERTOS en curso que el borrador NO refleja aun: (1) modelo people/sync — como se actualiza `hr.people` desde Spectrum/PayDay/Samantha (survivorship por campo, no cerrado); (2) jerarquia de obra es **obra -> extra -> phase -> category** (4 niveles; el borrador decia "una sola core.jobs" — INCORRECTO); (3) alcance final. NO usar como fuente de verdad.

---

# ROADMAP — Adopción de Spectrum SDX + reestructuración MDM de la BD HumanOS (capa `core` / medallion)

**Autor:** Lead Data Architect · **Fecha:** 2026-06-04 · **Estado:** decisión-grade, para ratificación de Jaime
**Alcance:** aditivo y de bajo riesgo en su mayoría. El ÚNICO cambio HumanOS-directo de alta-complejidad (`hr.people -> core.persons`) se **difiere** explícitamente.
**Hechos verificados en vivo (Supabase, 2026-06-04):** `mdm` y `projects` vacíos (0 tablas); `core`/`raw_spectrum`/`stg_spectrum`/`meta` no existen; `hr.people` = 370 filas, **75 FKs entrantes** confirmadas (hr 20, requests 14, performance 11, docs 11, learning 8, workflows 5, audit 2, files 2, payroll 1, notifications 1); `hr.person_sources` = 453 filas con shape MDM (`person_id, source_system, external_id, external_data jsonb, last_synced_at`); su CHECK admite hoy solo 7 fuentes (`movimientos, excel_samantha, payday, spectrum, manual, humanos_v1, onboarding`); `public.people` = 182 (deuda dual-master); el DOMAIN `mdm.source_system` es **el único objeto** en `mdm` y lo usan **16 columnas** (audit.log, audit.access_log, hr.people + 13 hr.*); cluster payroll conectado por FKs entrantes (project_extras<-3, projects<-2, phases<-1).

> **Corrección al inventario:** el inventario decía "13 columnas" usan el DOMAIN; la BD dice **16**. La migración de rename debe re-COMMENT/verificar 16, no 13. Confianza: alta (consulta directa a `information_schema.columns`).

---

## 1. Topología objetivo (con justificación best-practice)

### Layout de schemas (capas medallion como **schema**, no como prefijo de tabla)

```
raw_spectrum   (BRONZE) — landing verbatim SDX SOAP/XML, append-only, _ingested_at/_source/_service, jsonb suelto
   |  (promote, nunca write directo a silver)
stg_spectrum   (SILVER) — proyección tipada 1:1 por servicio SDX, dedup, normalización A/S->bool, flag Z-sentinel
   |  (survivorship / per-field authority vive AQUI, en la promoción)
core           (GOLD)   — masters conformados golden-record, consumidos por la app y FKs
   |
hr / requests / docs / ...  (DOMAIN) — consumen core; hr.people sigue golden record de personas
meta / core.* governance — registro de fuentes, autoridad por campo, log de corridas ETL
```

**Justificación (gold-standard):**
- **Medallion bronze/silver/gold** = raw/stg/core. Regla dura de Databricks: *nunca escribir a silver directo desde ingestión — siempre aterrizar en raw primero*, o el schema-drift/registros corruptos rompen el pipeline ([Databricks medallion](https://www.databricks.com/blog/what-is-medallion-architecture); [Microsoft Learn medallion](https://learn.microsoft.com/en-us/azure/databricks/lakehouse/medallion)). Aplica incluso al Edge Function de SDX-ahora: escribe `raw_spectrum` primero, luego MERGE a `core`.
- **Schema-per-layer naming**: la capa se codifica en el nombre del **schema** (no en prefijo de tabla); reservar columnas de linaje con underscore inicial (`_source`, `_ingested_at`, `_batch_id`) ([medallion naming cheatsheet](https://dev.to/thesius_code_7a136ae718b7/medallion-architecture-guide-naming-conventions-cheatsheet-2688)).
- **Disciplina dbt de 3 capas**: staging es 1:1 con cada tabla fuente, light-touch (rename/cast/dedup), SIN joins/agregaciones/lógica de negocio, organizado por sistema fuente, materializado como views; merges/survivorship viven en marts/core ([dbt staging](https://docs.getdbt.com/best-practices/how-we-structure/2-staging); [dbt marts](https://docs.getdbt.com/best-practices/how-we-structure/4-marts)).

### Tablas `core.*` (mapeo de las 14 entidades SDX)

| core.* (GOLD master) | Servicio SDX (filas) | Natural key | Crosswalk | Notas |
|---|---|---|---|---|
| `core.employees` (+ `core.employee_external_ids`) | GetEmployee 166 + GetEmployeeUDF 166 | `employee_code` | sí | **NO** es el golden record de persona (eso es hr.people). UDF -> `udf jsonb`. Flag `is_z_sentinel`. NO trae cédula/hire_date/email/salary/supervisor |
| `core.jobs` (+ `core.job_external_ids`) | GetJob 47 + GetJobDates 47 + GetJobUDF 47 | `job_code` | sí | = las 47 obras. GetJobDates -> columnas; GetJobUDF -> `udf jsonb`. Reconcilia `payroll.projects` |
| `core.phases` (+ `core.phase_external_ids`) | GetPhase 501 + GetPhaseEnhanced 501 | `phase_code` (¿+ `job_code`?) | sí | Supersede `payroll.phases`; verificar si phases son globales o por-job |
| `core.equipment` (+ `core.equipment_external_ids`) | GetEquipment 420 | `equipment_code` | sí | Mayor catálogo. Crosswalk futuro SkyData GPS device<->equipment |
| `core.customers` (+ `core.customer_external_ids`) | GetCustomers 87 | `customer_code` | sí | Referenciado por `core.jobs.customer_code` |
| `core.wage_codes` (+ external_ids) | GetWageCode 38 | `wage_code` | sí | Ref pequeña; crosswalk PayDay futuro |
| `core.pay_types` (+ external_ids) | GetPayType 20 | `pay_type_code` | sí | Ref pequeña; crosswalk PayDay futuro |
| `core.deductions_addons` (+ external_ids) | GetDedAddon 35 | `ded_addon_code` | sí | Ref; tipo deduction/addon si distinguible |
| `core.eq_cost_categories` | GetEqCostCategory 3 | `eq_cost_category_code` | opcional (3 filas) | Referenciado por `core.equipment` |
| ~~core.inventory_items~~ | GetInventoryItems 3 (TEST) | — | — | **NO construir** (solo data de prueba); documentar en 12-SOR-MATRIX |

Extensiones de atributo (NO entidades): GetJobDates/GetJobUDF/GetEmployeeUDF se pliegan en columnas/`udf jsonb` del padre (recomendación simple-now).

### Tablas de gobierno (`core.*` meta — hacen real la autoridad por campo)

- `core.source_systems(code PK, display_name, precedence, trust_rank, is_live, notes)` — registro espejo del vocab de `hr.person_sources` (movimientos, excel_samantha, payday, spectrum, manual, humanos_v1, onboarding, spectrum_infolink, skydata, b2w, projectsight, traqspera, gdrive).
- `core.field_authority(entity, field_name, authoritative_source, strategy, precedence)` — `strategy ∈ {sor_wins, most_recent, manual_override}`. Declara quién gana por campo.
- `core.sync_runs(id, source_system, service_name, started_at, finished_at, rows_in, rows_upserted, status, error)` — log idempotente de corridas ETL (raw/stg/core).

### Autoridad por campo (per-field source authority — la matriz SoR)

MDM moderno asigna survivorship a nivel de **atributo**, no de registro ([Profisee survivorship](https://profisee.com/blog/mdm-survivorship/); [LatentView golden record](https://www.latentview.com/blog/mdm-golden-record/)). Para HumanOS:

| Entidad.campo | Fuente autoritativa | Estrategia | Razón |
|---|---|---|---|
| persona: `cedula`, `hire_date`, `birth_date`, `email`, `salary`, `supervisor` | excel_samantha / payday / onboarding / manual | `sor_wins` | **Spectrum GetEmployee NO los devuelve** |
| persona/empleo: `Department/Union/Wage_Class/Occupation/Trade/Cost_Center` | **spectrum** | `sor_wins` | Spectrum es la fuente de organización/oficio |
| `employment_status` (Activo/Inactivo) | local (hr) | `manual_override` | **2 casos Active-en-Spectrum pero correctamente Inactivo local** -> local gana o exige confirmación humana, NUNCA overwrite silencioso |

**Crosswalk Z-sentinel:** ejecutivos usan códigos Z (`ZEIS99999` = Rodrigo Eisenmann = `EIS772` en hr). Ambos mapean al mismo `person_id` vía `hr.person_sources` (`source_system='spectrum'`, `external_id='ZEIS99999'`). Es exactamente el problema que resuelve el crosswalk hub data-vault ([Data Vault](https://www.databricks.com/glossary/data-vault); [Infinite Lambda](https://infinitelambda.com/data-vault-components/)).

**Dimensiones conformadas (Kimball bus matrix):** los masters no-persona de `core` (jobs, equipment, phases, customers, wage_codes, pay_types, deductions) son dimensiones conformadas. Construirlas aditivamente AHORA, antes de que lleguen los hechos transaccionales de Info-Link (PO/AP/JC/GL), hace que esos hechos futuros conformen el día uno ([Kimball SCD2](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-2/)).

**Anti-patrón dual-master:** `hr.people` queda golden record; `public.people` (174 filas compartidas, sin sync) debe convertirse en **fuente** que alimenta el crosswalk o un consumidor downstream — **nunca un segundo master par** ([MDM survivorship approaches](https://mdmlist.com/2019/08/22/three-master-data-survivorship-approaches/)). Esto se difiere (sección 8) pero la topología lo contempla.

> **Disputado / baja confianza:** (a) si `core.phases` necesita `job_code` en su clave natural depende de si GetPhaseEnhanced trae el linkage de job — **verificar contra el WSDL/captura real antes de la migración B**. (b) `core.jobs` vs `core.projects` como una o dos tablas — recomiendo **una** (`core.jobs` = obra financiera Spectrum, `project_code` operacional en external_ids); decisión abierta para Jaime (§5).

---

## 2. Qué afecta a HumanOS directo vs aditivo

**El ÚNICO alta-complejidad HumanOS-directo es `hr.people -> core.persons` (75 FKs verificadas en 10 schemas) -> SE DIFIERE.** Estrategia: mantener `hr.people` golden record + `hr.person_sources` crosswalk; cuando llegue el momento, exponer `core.persons` como VIEW sobre `hr.people` (cero churn de FKs), luego repointar los 75 FKs en una migración dedicada posterior — NUNCA en este change-set. Esto es consistente con la decisión "simple-now/vision-ready" y con ADR-0014 (MDM gradual).

**Todo lo demás es ADITIVO o de bajo riesgo:**

| Cambio | Clasificación | Impacto en features shipped (F1-F5 = hr.* + requests.*) |
|---|---|---|
| CREATE `core`, `raw_spectrum`, `stg_spectrum`, `meta` | ADITIVO | cero |
| 9 masters `core.*` SDX + `*_external_ids` | ADITIVO | cero |
| `core.source_systems` / `core.field_authority` / `core.sync_runs` | ADITIVO | cero |
| Edge Function `sdx-sync` | ADITIVO | cero (escribe raw/stg/core + hr.person_sources rows nuevas) |
| RLS + grants en las tablas nuevas | ADITIVO | cero |
| Rename `mdm.source_system` -> `core.source_system` (DOMAIN) | BAJO (Postgres auto-repointa las 16 columnas) | cero si se usa `ALTER DOMAIN ... SET SCHEMA` |
| Ampliar CHECK de `hr.person_sources` (añadir spectrum_infolink/skydata/b2w/projectsight/traqspera/gdrive) | BAJO | cero (solo añade valores permitidos) |
| Allowlist en hooks/skills/docs (core/raw_spectrum/stg_spectrum/meta) | TRIVIAL (mensaje, no lógica — el hook solo bloquea public/humanos) | cero |
| `payroll.projects -> core` (move) | MEDIO (repoint FKs o compatibility views; cluster con FKs entrantes) | cero en HumanOS (blast radius = cluster payroll + lectores MovimientOS) |

> Honestidad: el move de payroll es **medio**, no trivial — hay FKs entrantes (project_extras<-3, projects<-2, phases<-1), así que DROP+recreate es inseguro; hay que **repointar o usar views de compatibilidad**. Pero no toca HumanOS (ningún código de app referencia `payroll.projects`; la superficie de 75 FKs es `hr.people`).

---

## 3. Roadmap paso a paso, EN ORDEN

**Convención Fase 0 vs feature-time:** *Fase 0 = irreversible o contrato-compartido cross-app* (rename de DOMAIN, allowlist en enforcers, ADRs, exposición PostgREST) — debe ratificarse y hacerse en lockstep. *Feature-time = aditivo, se puede iterar* (tablas core, Edge Function).

### (A) DB: crear core/raw/stg/meta + tratar `mdm`

- **A1 — Rename del DOMAIN, NO del schema.** `ALTER DOMAIN mdm.source_system SET SCHEMA core` (después de `CREATE SCHEMA core`). Verificado: `mdm` contiene **solo** ese DOMAIN; Postgres re-repointa automáticamente las **16 columnas** dependientes (la dependencia sigue al objeto). Luego `DROP SCHEMA mdm` (queda vacío). **Más limpio que `ALTER SCHEMA mdm RENAME TO core`** porque deja `mdm` libre para borrar y evita confusión con el schema reservado `projects`. NUEVA migración (nunca editar 057/058/059). Re-COMMENT las 16 columnas. **[Fase 0 — contrato compartido; irreversible-ish]** · *complejidad: non-trivial* · depende de: nada.
- **A2 — `CREATE SCHEMA core, raw_spectrum, stg_spectrum, meta`** + `GRANT USAGE ON SCHEMA core TO authenticated, service_role`; raw/stg USAGE solo `service_role`. `ALTER DEFAULT PRIVILEGES` allowlist-opt-in (REVOKE en schemas internos para que tablas nuevas no se auto-expongan). **[Fase 0]** · *trivial* · depende de: A1 (mismo migration batch).
- **A3 — Decidir suerte de `projects` (schema reservado vacío).** Recomiendo `DROP SCHEMA projects` (la decisión es `core.jobs`/`core.projects` viven en core). Registrar en ADR. **[Fase 0]** · *trivial* · depende de: §5(a) ratificada.
- **A4 — Ampliar CHECK `hr.person_sources.source_system`** para admitir spectrum_infolink/skydata/b2w/projectsight/traqspera/gdrive (hoy solo 7 valores; spectrum YA está). NUEVA migración, idempotente. **[Fase 0 — contrato compartido]** · *trivial* · depende de: nada (independiente).

### (B) Masters `core.*` para entidades SDX (aditivo)

- **B1 — Tablas de gobierno**: `core.source_systems`, `core.field_authority`, `core.sync_runs` + seed de la matriz SoR de §1. **[feature-time]** · *non-trivial* · depende de: A2.
- **B2 — Masters de referencia pequeños** (wage_codes, pay_types, deductions_addons, eq_cost_categories) + external_ids. **[feature-time]** · *trivial c/u* · depende de: A2.
- **B3 — Masters grandes** (customers, equipment, phases, jobs, employees) + external_ids + `udf jsonb`. Cada tabla: RLS ON + ≥1 policy, COMMENT tabla/columna, FK con `ON DELETE` explícito, **índice en cada FK** (Postgres no los crea solos — #1 killer silencioso de performance; el advisor lo marca), índice en `(source_system, external_id)` del crosswalk, soft-delete `deleted_at` + **partial unique index `WHERE deleted_at IS NULL`** ([Cybertec FK index](https://www.cybertec-postgresql.com/en/index-your-foreign-key/); [soft-delete partial unique](https://www.phparch.com/2026/02/advanced-unique-index-patterns-for-soft-deletes-mysql-and-postgresql/)). **[feature-time]** · *non-trivial c/u* · depende de: B1 (field_authority), B2 (FKs a refs). **Verificar GetPhaseEnhanced antes de B3-phases** (§1 baja confianza).
- **B4 — `get_advisors` (security + performance) tras cada migración**; corregir FKs sin índice. **[feature-time]** · *trivial* · depende de: B3.

### (C) Ingestión SDX (Edge Function `sdx-sync`)

- **C1 — Edge Function Deno** que pull los 13 servicios usables SDX (SOAP/XML, sin VPS), aterriza verbatim en `raw_spectrum` (batch_id, received_at, raw_xml/jsonb), proyecta tipado a `stg_spectrum` (uno por servicio), y MERGE/upsert idempotente a `core.*` por clave natural. **Land-raw-then-promote estricto.** Status NO se confía ciegamente: respeta `core.field_authority` (Spectrum pierde en status/cédula/hire_date). Escribe filas `hr.person_sources` para linkage de empleado (Z-sentinel via crosswalk). Cada corrida loguea a `core.sync_runs`. service_role (least-privilege, patrón mig 077). **Antes de codear: Context7 (`resolve-library-id` + `get-library-docs`) para Deno/Supabase Edge runtime + SOAP** (R10). **[feature-time]** · *non-trivial* · depende de: B1-B3.
- **C2 — Scheduling** vía Vercel Cron / pg_cron (reusar patrón del cron worker existente). **[feature-time]** · *trivial* · depende de: C1.

### (D) Mover `payroll.projects -> core`

- **D1 — Construir `core.jobs/phases/cost_centers` desde SDX** (parte de B3). · depende de: B3.
- **D2 — Backfill crosswalk** usando `legacy_project_id`/`legacy_phase_id` + `base_project_code`/`phase_code` para mapear filas payroll a core. · *non-trivial* · depende de: D1.
- **D3 — Repointar FKs intra-payroll** (person_project_assignments, project_extras) a `core` **O** dejar `payroll.*` como **views de compatibilidad** sobre `core.*` (para no romper MovimientOS). Recomiendo views primero (reversible), repoint físico después. **[Fase 0 parcial — contrato compartido con MovimientOS]** · *alta* · depende de: D2. **Validar con lectores MovimientOS antes de ejecutar.**

### (E) Cambios en enforcers (lockstep — deben coincidir byte-a-byte en intención)

Los 8 lugares con el allowlist hardcodeado (el drift es exactamente lo que mordió a payroll):

- **E1 — `pre-tool-use.ps1`** (líneas 62-63): añadir `core, raw_spectrum, stg_spectrum, meta` al mensaje; quitar/reemplazar `mdm`. ASCII puro (R23). El BLOCK logic no cambia (solo bloquea public/humanos). **[Fase 0]** · *trivial*.
- **E2 — `pre-tool-use.tests.ps1`**: casos positivos (write a core/raw_spectrum/stg_spectrum/meta = ALLOWED, espejo de los "payroll allowed". **[Fase 0]** · *trivial*.
- **E3 — `session-start.ps1`** (líneas 24-30): reencuadrar bloque de schemas a raw/stg/core + meta; Spectrum SDX como fuente live read-only. ASCII puro. **[Fase 0]** · *trivial*.
- **E4 — `iconsa-business-rules/SKILL.md`** (R1, línea 12): rename mdm->core, añadir raw/stg/meta. **[Fase 0]** · *trivial*.
- **E5 — `iconsa-supabase-migration/SKILL.md`**: (1) fix STALE — quitar payroll de prohibidos (líneas 8,150); (2) bloque MDM-ready -> core.*, FK-index como checklist, idempotencia (DO $$ IF NOT EXISTS / ON CONFLICT DO NOTHING), Spectrum como fuente live de crosswalks. **[Fase 0]** · *non-trivial*.
- **E6 — `iconsa-rls-validation/SKILL.md`**: añadir core/raw_spectrum/stg_spectrum/meta a la query de cobertura RLS; quitar payroll de "forbidden". **[feature-time]** · *trivial*.
- **E7 — `skill-rules.json`**: keywords spectrum/sdx/core/source authority/medallion. **[feature-time]** · *trivial*.
- **E8 — `.claude/agents/migration-reviewer.md` + `rls-reviewer.md`**: quitar payroll de prohibidos, rename mdm->core + raw/stg/meta, apuntar a crosswalk core + autoridad por campo. **[Fase 0]** · *trivial*.
- **E9 — `post-tool-use.ps1`** (línea 114): apuntar reminder al crosswalk core + autoridad por campo (opcional). · *trivial*.

> El cambio de allowlist es **accuracy del mensaje**, no de lógica (el hook hoy YA permitiría writes a core). Pero el lockstep es obligatorio: el drift es la causa raíz del bug de payroll.

### (F) Cambios en docs (lista exhaustiva en §4)

Agrupados: enforcer-mirror (CLAUDE.md, PROJECT_CONSTITUTION.md, AGENTS.md, business-rules.md R1) · permisos/estado (schemas-permisos.md, integrations.md, STATUS.md, CHANGELOG.md, framework.md, vision.md) · glosario (CONTEXT.md) · MDM/SoR (future/11, future/12, future/13, domain.md, toolstack-roadmap.md). **[F-enforcer-mirror = Fase 0; resto feature-time]**.

### (G) ADRs nuevas/enmendadas

- **G1 — NUEVA ADR-0032** (la decisión completa): rename mdm->core; allowlist += core/raw_spectrum/stg_spectrum/meta; Spectrum SDX = fuente live read-only (14 servicios SOAP/XML, campos exactos vs faltantes, quirk Z-sentinel, quirk status stale) -> external_ids crosswalk + autoridad por campo; core.* = masters cross-app; projects desde payroll; Info-Link futuro = medallion via VPS; `hr.people->core.persons` diferido. Alternativas rechazadas (mantener nombre mdm, etc.). **[Fase 0]** · *alta*.
- **G2 — Enmendar ADR-0011** (schemas-modulares): bloque `## Update` append-only — core de primera clase, raw/stg/meta añadidos, capa master cross-app. **[Fase 0]** · *non-trivial*.
- **G3 — Enmendar ADR-0014** (MDM-gradual): el master layer ahora se llama core; person canonical eventual = `core.persons` (diferido, hr.people sigue golden); reconciliar la lección "core.identities prematuro" con "core es el nombre, masters no-persona aditivos ahora". **[Fase 0]** · *alta*.
- **G4 — Enmendar ADR-0025** (source_system vocab): DOMAIN ahora `core.source_system`; crosswalks en core; Spectrum live alimentando crosswalks + autoridad por campo (qué campos posee/no posee). Rename en vivo por NUEVA migración, no editando 057. **[Fase 0]** · *alta*.
- **G5 — Enmendar ADR-0028** (planilla/payroll): projects -> core; masters no-persona aditivos en core. **[feature-time]** · *non-trivial*.
- **G6 — `adr/README.md`**: añadir 0032, bump "continue from 0033", nota de enmiendas a 0011/0014/0025/0028; `npm run docs:check` valida los links. **[Fase 0]** · *non-trivial*.

### (H) Items diferidos (NO en este change-set)

- **H1 — `core.persons`** (repoint de 75 FKs): VIEW-sobre-hr.people primero, repoint schema-por-schema en migración dedicada futura. *alta* — la ÚNICA alta HumanOS-directa, NO ahora.
- **H2 — Medallion completo + VPS para Info-Link** (5856 tablas, transaccional PO/AP/JC/GL via DigitalOcean VPS ODBC/TLS): reservar el schema/diseño hoy (raw_spectrum recibe `infolink_*`), construir después. Mismo pipeline raw->stg->core, dos productores (Edge SDX + VPS Info-Link). *alta* (futuro).
- **H3 — Retirar/reconciliar `public.people`** (dual-master, 174 compartidas sin sync): plegar a `hr.person_sources`; backlog separado, no este delta. *alta* (futuro).
- **H4 — `core.inventory_items`**: solo cuando exista data real (hoy 3 filas test). *trivial* (futuro).
- **H5 — Schema `api`/`app_humanos` de views security_invoker** como contrato app<->core ([PostgREST authz](https://docs.postgrest.org/en/v14/explanations/db_authz.html); [security_invoker PG15](https://www.mydbops.com/blog/security-invoker-views-in-postgresql-15)): recomendado antes de que Group 3+ profundice el acoplamiento, pero **fuera de scope mínimo** — proponer como decisión (§5).

---

## 4. Lista exhaustiva de archivos a tocar

### DB / migraciones (NUEVAS — nunca editar 057/058/059)

| Archivo / objeto | Qué cambia | Complejidad |
|---|---|---|
| NUEVA mig `NNN_rename_source_system_domain_to_core` | `CREATE SCHEMA core`; `ALTER DOMAIN mdm.source_system SET SCHEMA core`; `DROP SCHEMA mdm`; re-COMMENT 16 columnas | non-trivial |
| NUEVA mig `NNN_create_medallion_schemas` | `CREATE SCHEMA raw_spectrum, stg_spectrum, meta`; grants/default-privileges | trivial |
| NUEVA mig `NNN_extend_person_sources_check` | ampliar CHECK source_system (+6 valores) | trivial |
| NUEVA mig `NNN_core_governance` | core.source_systems/field_authority/sync_runs + seed SoR | non-trivial |
| NUEVA mig(s) `NNN_core_masters_*` | 9 masters core.* + external_ids + RLS + COMMENT + FK-index + partial unique | non-trivial |
| NUEVA mig `NNN_payroll_projects_to_core` (o views) | move/views payroll->core, backfill crosswalk, repoint | alta |
| `supabase/functions/sdx-sync/*` | NUEVA Edge Function | non-trivial |
| `src/lib/supabase/database.types.ts` | REGENERAR (CLI/MCP `generate_typescript_types`), NO hand-edit; key `mdm` desaparece, aparecen core/raw_spectrum/stg_spectrum/meta | non-trivial |
| `supabase/schemas/humanos_baseline.sql` | REGENERAR baseline (ya stale), no hand-edit | trivial |
| `migrations/...057/058/059` | **DO NOT EDIT** — solo verificar que el DOMAIN renombrado sigue resolviendo | trivial |

### Enforcers (.ps1 / skills / agents / scripts)

| Archivo | Qué cambia | Complejidad |
|---|---|---|
| `.claude/hooks/pre-tool-use.ps1` | allowlist msg += core/raw/stg/meta; ASCII | trivial |
| `.claude/hooks/pre-tool-use.tests.ps1` | casos positivos core/raw/stg/meta allowed | trivial |
| `.claude/hooks/session-start.ps1` | framing schemas raw/stg/core/meta + Spectrum live | trivial |
| `.claude/hooks/post-tool-use.ps1` | reminder -> crosswalk core (opcional) | trivial |
| `.claude/skill-rules.json` | keywords spectrum/sdx/core/source authority | trivial |
| `.claude/skills/iconsa-business-rules/SKILL.md` | R1 rename mdm->core + raw/stg/meta | trivial |
| `.claude/skills/iconsa-supabase-migration/SKILL.md` | fix STALE payroll + core crosswalk + FK-index + idempotencia | non-trivial |
| `.claude/skills/iconsa-rls-validation/SKILL.md` | query cobertura += core/raw/stg/meta; quitar payroll forbidden | trivial |
| `.claude/agents/migration-reviewer.md` | quitar payroll forbidden, mdm->core+raw/stg/meta, crosswalk core | trivial |
| `.claude/agents/rls-reviewer.md` | idem (set de schemas a validar) | trivial |
| `scripts/_probe-schemas.mjs` | lista de schemas += core/raw/stg/meta, quitar mdm | trivial |
| `scripts/check-docs.mjs` | sin cambio de contenido; **correr** para validar link ADR-0032 | trivial |

### Docs (CLAUDE / CONTEXT / STATUS / CHANGELOG / business-rules / schemas-permisos / framework / future / reference)

| Archivo | Qué cambia | Complejidad |
|---|---|---|
| `CLAUDE.md` | Rule 1 (línea 38) allowlist rename+add; mental-model nota Spectrum live + core | trivial |
| `PROJECT_CONSTITUTION.md` | 1.1/1.2 (línea 14) core de primera clase, +raw/stg/meta | trivial |
| `AGENTS.md` | línea 13 quitar payroll forbidden, mdm->core+raw/stg/meta (sync con CLAUDE.md) | trivial |
| `docs/reference/business-rules.md` | R1 (línea 20) elevar core + raw/stg/meta + Spectrum live | trivial |
| `docs/reference/schemas-permisos.md` | tabla (16 stale payroll-fix; 28 rename+add); Exposed-Schemas (92) += core/raw/stg; subsección autoridad por campo | non-trivial |
| `docs/reference/integrations.md` | Exposed-Schemas (68) += core/raw/stg; HumanOS schemas (120) += core; entrada Spectrum SDX LIVE | non-trivial |
| `docs/reference/framework.md` | hooks desc (103, 207) fix payroll; allowlist += core/raw/stg/meta | trivial |
| `docs/reference/vision.md` | anti-decision (56) fix payroll; Spectrum SDX live (73); core como master layer | trivial |
| `docs/reference/domain.md` | línea 182 mdm.persons -> core.persons (diferido) | trivial |
| `docs/reference/toolstack-roadmap.md` | Spectrum SDX live now (Edge); medallion+VPS diferido Info-Link | trivial |
| `docs/CONTEXT.md` | glosario: Spectrum SDX, per-field source authority, core.*, raw_spectrum/stg_spectrum, Z-sentinel, field_authority; source_system DOMAIN -> core; payroll entry -> core real | non-trivial |
| `docs/STATUS.md` | NUEVO backlog (§6): schema rename + core master-layer + SDX foundation (Edge-now vs medallion+VPS-later) con trigger/gate; nota W1 mdm->core | non-trivial |
| `docs/CHANGELOG.md` | entradas [bd] (rename, core masters) + [docs] (allowlist + SDX live + autoridad por campo) cuando aterrice | trivial |
| `docs/future/11-MDM-PRINCIPLES.md` | mdm.* -> core.* en todo; raw/stg en pilar medallion; Spectrum SDX-live-now + Info-Link-VPS-later; field_resolution_rules en core; reconciliar core.identities | alta |
| `docs/future/12-SOR-MATRIX.md` | mdm.* -> core.*; **corregir filas SoR Spectrum** (NO es SoR de cédula/hire_date; SÍ de Dept/Union/Wage_Class/Occupation/Trade/Cost_Center); quirks Z-sentinel + status stale; filas jobs/equipment/phases/customers/wage/pay/deductions | alta |
| `docs/future/13-INTEGRATIONS-PLANNED.md` | Spectrum SDX LIVE now (14 servicios, counts); Info-Link futuro VPS ETL ODBC/TLS medallion; Skydata/app-futuras mdm->core | alta |

### ADRs

| Archivo | Qué cambia | Complejidad |
|---|---|---|
| `docs/adr/0032-...new.md` | NUEVA — decisión completa (ver G1) | alta |
| `docs/adr/0011-schemas-modulares-bd-compartida.md` | `## Update` append-only (G2) | non-trivial |
| `docs/adr/0014-mdm-gradual-no-big-bang.md` | enmienda (G3) | alta |
| `docs/adr/0025-source-system-canonical-vocabulary.md` | enmienda (G4) | alta |
| `docs/adr/0028-planilla-time-capture-mvp-payday-input.md` | enmienda (G5) | non-trivial |
| `docs/adr/README.md` | índice +0032, bump, nota enmiendas (G6) | non-trivial |
| `docs/superpowers/specs/2026-06-03-doc-sync-foundation-design.md` | amend SP-0a: añadir mdm->core + SDX-live + autoridad-por-campo + core-masters como siguiente batch del doc-sync | non-trivial |

### Fix oportunista en el mismo paso (bug independiente, in-scope)

`payroll.*` se des-prohibió 2026-06-04 pero **6+ archivos aún lo llaman prohibido** y contradicen el hook vivo: `iconsa-supabase-migration/SKILL.md` (8,150), `schemas-permisos.md` (16), `vision.md` (56), `framework.md` (103,207), `AGENTS.md` (13), `migration-reviewer.md` (15), `rls-reviewer.md` (28). Corregir en la misma pasada.

---

## 5. Decisiones abiertas para Jaime

1. **`core.persons` ahora vs diferir** — **Recomiendo DIFERIR.** 75 FKs en 10 schemas (verificado), features F1/F4/F5 dependen de hr.people. VIEW-sobre-hr.people cuando se necesite; repoint físico en migración dedicada. Costo de diferir: casi cero (el crosswalk ya da la unificación). Costo de hacerlo ahora: alto y sin beneficio inmediato.
2. **Medallion completo ahora vs Edge-directo para SDX** — **Recomiendo Edge Function para SDX ahora** (raw->stg->core, sin VPS), **medallion completo + VPS para Info-Link después**. SDX es SOAP/XML directo y ligero; Info-Link (5856 tablas, transaccional) exige el VPS ODBC/TLS. Un solo pipeline, dos productores.
3. **`core.jobs` vs `core.jobs`+`core.projects`** — **Recomiendo una sola `core.jobs`** (obra financiera Spectrum) con `project_code` operacional en external_ids, reconciliando `payroll.projects` adentro. Ratificar antes de la migración B3/D.
4. **`payroll.projects` move: views de compatibilidad vs repoint físico** — **Recomiendo views primero** (reversible, no rompe MovimientOS), repoint físico en paso posterior validado con lectores MovimientOS.
5. **Cuánto scaffolding upfront** — **Recomiendo construir TODA la capa core aditiva ahora** (es el momento más barato: solo Groups 1-2 shipped) pero **NO** construir Info-Link/VPS ni `core.persons` (solo reservar schema + ADR). Las dimensiones conformadas construidas hoy hacen que los hechos futuros conformen el día uno.
6. **Schema `api`/`app_humanos` de views security_invoker (contrato app<->core)** — decisión nueva no en el inventario original: **recomiendo SÍ, pero como paso separado** antes de Group 3, no en este change-set. Es el segundo compromiso arquitectónico mayor (junto al schema-per-layer) y merece su propia ADR.
7. **Retirar `public.people`** — **Recomiendo backlog separado** (no este delta). Reconciliar a hr.person_sources; es deuda dual-master real pero ortogonal a SDX.
8. **Exposed Schemas (PostgREST, ajuste de Dashboard, NO en repo)** — Jaime debe añadir `core` (y decidir si exponer raw/stg — **recomiendo NO exponer raw_spectrum/stg_spectrum**, service_role only, lección del incidente humanos-drop). Documentado en schemas-permisos.md + integrations.md pero el setting es externo al repo.

---

## 6. Secuenciación vs el resto de Fase 0 (SP-0a) y el MVP

**Relación con SP-0a (doc-sync foundation):** SP-0a (`2026-06-03-doc-sync-foundation-design.md`) ya está propagando decisiones de schema (solo public prohibido, payroll usable, planilla en MVP), pero PRE-DATA estas decisiones (mdm->core, SDX-live, autoridad por campo, core-masters). **Recomiendo plegar este change-set como el SIGUIENTE batch de SP-0a** (mismo mecanismo de propagación lockstep a los 8 lugares de allowlist + docs), no como un esfuerzo separado. El fix de drift de payroll (6 archivos) entra en la misma pasada. Así SP-0a cierra con docs + enforcers + ADRs coherentes de una vez.

**Orden recomendado:**
1. **Fase 0 primero** (todo lo marcado [Fase 0]): rename DOMAIN (A1), crear schemas (A2-A4), enforcers lockstep (E1-E5, E8), ADRs (G1-G4, G6), docs enforcer-mirror (F). Es el contrato compartido; irreversible-ish; barato ahora.
2. **feature-time después**: gobierno core (B1), masters core (B2-B3), Edge `sdx-sync` (C), advisors (B4), docs SoR/future (11/12/13).
3. **payroll move (D)** cuando los lectores MovimientOS estén validados (views primero).
4. **Diferidos (H)** fuera del MVP.

**Tradeoff honesto:** esto **retrasa las features del MVP (Group 3)**. PERO: (a) es **aditivo y de bajo riesgo** — cero impacto en F1-F5 (su superficie es hr.*/requests.*, no core); (b) es **el momento más barato** — solo Groups 1-2 shipped, antes de que Group 3+ profundice el acoplamiento; (c) las dimensiones conformadas construidas hoy hacen que Info-Link/PayDay/SkyData conformen el día uno en lugar de exigir retrofit. El único trabajo no-aditivo (payroll move, core.persons) se difiere o se hace con views reversibles. **Recomendación:** ejecutar Fase 0 + capa core aditiva + Edge SDX ANTES de Group 3; diferir payroll-físico, core.persons, Info-Link/VPS.

> **Gate de backlog (regla del pipeline):** cualquier plan que toque core/payroll/spectrum tablas debe reconciliarse contra el nuevo item de `docs/STATUS.md §6` (paso F-STATUS) antes de arrancar — por eso el backlog item es parte de Fase 0, no opcional.

---

**Fuentes best-practice más fuertes citadas:** Databricks/Microsoft medallion (land-raw-then-promote); dbt 3-layer staging discipline; Kimball SCD2 + bus matrix (conformed dims); Profisee/LatentView per-field survivorship; Data Vault hub+crosswalk; Cybertec FK-index; PG15 security_invoker views; PostgREST db_authz. **Items de baja confianza marcados:** clave natural de `core.phases` (depende de GetPhaseEnhanced — verificar WSDL) y one-vs-two tables jobs/projects (decisión de Jaime). **Corrección al inventario:** el DOMAIN lo usan 16 columnas (no 13); `hr.people` confirma 75 FKs; `hr.person_sources` CHECK admite hoy solo 7 fuentes (necesita ampliación). Mecánica de rename recomendada: `ALTER DOMAIN ... SET SCHEMA core` + `DROP SCHEMA mdm` (más limpio que `ALTER SCHEMA RENAME`, dado que mdm solo contiene el DOMAIN).
