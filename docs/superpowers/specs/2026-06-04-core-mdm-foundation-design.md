# Core MDM Foundation (SP-0b) — Design Spec

**Fecha:** 2026-06-04 · **Estado:** Draft (para grill -> ADR-0032) · **Atendido:** ADR-0026 (Jaime decide en gates).
**Pipeline:** siguiente parada = `grill-with-docs` (aterriza ADR-0032 + enmiendas + GATE de backlog). NO tocar BD hasta aprobar spec + ADRs.
**Decisions in scope:** extiende [ADR-0014](../../adr/0014-mdm-gradual-no-big-bang.md) (MDM gradual) + [ADR-0011](../../adr/0011-schemas-modulares-bd-compartida.md) (schemas) + [ADR-0025](../../adr/0025-source-system-canonical-vocabulary.md) (source_system) + [ADR-0028](../../adr/0028-planilla-time-capture-mvp-payday-input.md) (planilla/payroll). Research base: [`docs/work/2026-06-04-core-mdm-foundation-roadmap.md`](../../work/2026-06-04-core-mdm-foundation-roadmap.md) (BORRADOR no-ratificado) + Spectrum SDX captures (`spectrum-tests/`) + `SPECTRUM_INFOLINK_TLS_GUIDE_v2.md`.

---

## 1. Problema / objetivo

ICONSA tiene los mismos masters duplicados, sin sync, en varios sistemas (verificado en BD 2026-06-04):

| Master | MovimientOS `public.*` | `payroll.*` | HumanOS `hr.*` | Spectrum SDX (live) |
|---|---|---|---|---|
| People | people (182, snapshot stale de Spectrum) | — | people (370, golden) | GetEmployee (166 activos) |
| Equipment | equipment (377, ya con `spectrum_code`) | — | — | GetEquipment (420) |
| Obras/Jobs | projects | projects (23) | texto libre | GetJob (47 incl. extras) |
| Phases/cost | cost_codes (119) | phases (26) | — | GetPhase (501) |

**Objetivo:** una capa MDM (`core`) que conforme los masters compartidos desde sus fuentes autoritativas, consumida por todas las apps (HumanOS, MovimientOS, futuras), diseñada para recibir Spectrum SDX (ya), y luego Info-Link / PayDay / SkyData GPS. **MDM = la disciplina** (autoridad por campo + golden record + crosswalk); `core` = el schema.

**No-objetivo (diferido, sección 8):** repoint físico de `hr.people` -> `core.persons`; medallion completo + VPS para Info-Link; retiro de `public.people`; move físico de `payroll.projects`.

## 2. Topología (medallion como schema, gold-standard)

```
raw_<source>   (BRONZE) — landing verbatim, append-only, _ingested_at/_source/_batch
   |   (raw_spectrum ahora; stg_* RESERVADO, se construye con fuentes sucias / Info-Link)
core           (GOLD)   — masters conformados golden-record; consumidos por la app + FKs
   |
hr / requests / ...  (DOMAIN) — consumen core; hr.people sigue golden de personas
core.* governance + meta — source_systems, field_authority, sync_runs
```

Regla dura (Databricks/dbt): **siempre aterrizar en raw antes de promover a core.** Para SDX (limpio, ~1,800 registros) el Edge hace `raw_spectrum -> core` directo (transform en la promoción); `stg_spectrum` queda reservado para cuando lleguen fuentes sucias (PayDay/Excel) o el transaccional voluminoso de Info-Link.

## 3. Masters `core.*` (desde SDX) — aditivos, tablas físicas nuevas

Cada uno: RLS ON + >=1 policy, COMMENT tabla/columna, FK con `ON DELETE` explícito + **índice en cada FK**, `*_external_ids` (crosswalk multi-fuente), `source_system` + soft-delete (`deleted_at` + partial unique `WHERE deleted_at IS NULL`), `udf jsonb` donde aplique.

- `core.jobs` (obra, ej. 24-404) <- GetJob 47 + GetJobDates + GetJobUDF; `customer_code` -> `core.customers`.
- `core.job_extras` (E1, FK a job) <- Spectrum codifica obra+extra en `Job_Number` (24-404E1).
- `core.phases` (01-7113, por job+extra) <- GetPhase/GetPhaseEnhanced 501; clave `(job, extra, phase_code, cost_type)`.
- `core.equipment` <- GetEquipment 420 (conforma el modelo rico de MovimientOS + códigos/costo de Spectrum).
- `core.customers` <- GetCustomers 87.
- `core.wage_codes` (38), `core.pay_types` (20), `core.deductions_addons` (35), `core.eq_cost_categories` (3) <- refs.
- **NO** `core.inventory_items` (GetInventoryItems = 3 test).

**Jerarquía de obra (confirmada Jaime):** `obra -> extra -> phase -> category` (4 niveles); category = `Cost_Type` de GetPhase (CON/EQA/ICS). Ej.: `24-404 / E1 / 01-7113 / ICS`.

### Gobierno (hace real la autoridad por campo)
- `core.source_systems(code PK, display_name, precedence, trust_rank, is_live)` — vocab de fuentes.
- `core.field_authority(entity, field_name, authoritative_source, strategy)` — `strategy ∈ {sor_wins, most_recent, manual_override}`.
- `core.sync_runs(...)` — log idempotente de cada corrida ETL.

## 4. Modelo de personas (la pieza crítica)

**`hr.people` (370) sigue siendo la golden record física** (75 FKs, features F1/F4/F5 shipped). **`core.persons` = una VIEW sobre `hr.people`** = el contrato cross-app (MovimientOS/futuras leen la view) **sin repointar los 75 FKs.** NO se crea `core.employees` como master paralelo (eso recrearía el dual-master). La data de empleado de Spectrum entra a `hr.person_sources` (crosswalk) + enriquece `hr.employments`.

### Fuentes reales (Jaime, 2026-06-04)
- **Spectrum SDX** — live (ya); fuente de empleados nuevos + atributos de empleo/org.
- **onboarding** — live; el empleado auto-actualiza identidad en signup, **incluida la cédula**.
- **PayDay** — futuro (salario, cédula).
- **Excel de Samantha** — carga histórica de-una-vez (ya hecha, incl. ex-empleados); no se actualiza más.
- `public.people` (movimientos) = snapshot **stale** de Spectrum -> superseded por SDX live. demo (humanos_v1) = irrelevante.

### Autoridad por campo (survivorship)
| Campo(s) | Fuente autoritativa | Estrategia |
|---|---|---|
| empleo/org: department, occupation, union, wage_class, cost_center | **Spectrum** (SDX) | `sor_wins` -> `hr.employments` |
| identidad self-entered: cédula, contacto, emergencia, dependientes | **onboarding** + histórico-Samantha + PayDay-futuro | `sor_wins` (self) / fill |
| salario | **PayDay** (futuro) | `sor_wins` |
| `employment_status` (Activo/Inactivo) | **local (hr)** | `manual_override` — NUNCA overwrite ciego (los 2 stale lo probaron) |

### Sync de Spectrum (defaults conservadores, aprobados por Jaime "confío")
- Match por `employee_code` vía `hr.person_sources` (`source='spectrum'`, `external_id`, `external_data jsonb`).
- **Nuevo activo en Spectrum, no en hr** -> crear en `hr.people` (source=spectrum). **Guard: ignorar Z-sentinel/test** (`ZEIS99999`=Rodrigo, `ZRIO9999`=Damaris, patrón `*9999`).
- **Conflicto en campo que Spectrum posee** -> **flag para revisión** > overwrite.
- Cadencia: nightly (decidible).
- Ex-empleados (Excel, no en Spectrum) -> el sync de Spectrum nunca los toca.

## 5. Ingestión (Edge Function `sdx-sync`)

Deno Edge Function (SDX = SOAP/XML, **no necesita el VPS** — el VPS es para Info-Link): pull de los servicios usables -> land verbatim en `raw_spectrum` -> upsert idempotente a `core.*` por clave natural, aplicando `core.field_authority` -> escribe filas `hr.person_sources` para linkage. Cada corrida loguea a `core.sync_runs`. `service_role` least-privilege (patrón mig 077). Antes de codear: **Context7** para Deno/Supabase Edge + SOAP (R10). Scheduling: reusar patrón del cron worker existente.

## 6. Qué afecta a HumanOS directo vs aditivo

- **Único alta-complejidad = `hr.people -> core.persons` físico (75 FKs) -> DIFERIDO** (se resuelve con la VIEW; repoint físico = migración dedicada futura, quizá nunca necesaria).
- **Todo lo demás aditivo / bajo riesgo:** crear schemas, masters core, governance, Edge `sdx-sync`, `core.persons` VIEW, ampliar CHECK person_sources, allowlist en enforcers (accuracy de mensaje, no lógica), rename `mdm.source_system` DOMAIN -> `core` (`ALTER DOMAIN ... SET SCHEMA core`, Postgres repunta las 16 columnas solo). Cero impacto en F1-F5.

## 7. ADRs a aterrizar (en el grill)

- **ADR-0032 (NUEVA):** la decisión completa — topología raw/core + medallion; `core` (rename de `mdm` DOMAIN); masters cross-app desde SDX; obra 4-niveles; `hr.people` físico + `core.persons` VIEW; autoridad por campo + survivorship; Spectrum SDX live (campos que posee/no posee, Z-sentinel, status stale); Info-Link/SkyData/PayDay futuros; alternativas rechazadas (reconstruir people; core.employees paralelo; flatten obra).
- **Enmiendas:** ADR-0011 (core/raw/meta de primera clase), ADR-0014 (master layer = core; person canonical = core.persons VIEW, físico diferido), ADR-0025 (DOMAIN -> core; crosswalks en core), ADR-0028 (obra -> core.jobs; planilla referencia core).

## 8. Diferido (NO en este change-set)

- `core.persons` físico (repoint 75 FKs) — VIEW basta por ahora.
- Medallion completo + **VPS** para Info-Link (5,856 tablas, transaccional) **+ estrategia time-series** (TimescaleDB/partitioning para GPS/EC_ACTUAL_COST/GL — ahí muerde el volumen).
- **SkyData GPS** (API aparte, no Info-Link) — crosswalk device <-> core.equipment.
- Retiro de `public.people` (dual-master) — backlog separado.
- Move físico `payroll.projects -> core` — views de compatibilidad primero (no romper MovimientOS).

## 9. Backlog reconciliado (GATE — STATUS §6)

Items que este spec toca: **PAYROLL-RLS** (policies/grants se diseñan al consumir; payroll superseded por core), **DB-VISION-B** (source_system/external_ids/soft-delete = ahora formalizados en core — este spec lo cubre), **AUDIT2B-BASELINE** + **TYPES-STALE** (regenerar baseline + `database.types.ts` tras el rename/creación), **PLANILLA-MVP** (hereda core.jobs/phases), **SIGNUP-datamodel** (onboarding = fuente live de cédula, encaja con autoridad por campo). Ninguno bloquea; todos se incluyen o re-difieren con razón en el grill.

## 10. Secuenciación + gates

- **F0.1** spec (este doc) -> grill -> ADR-0032 + enmiendas. **Gate: Jaime aprueba.**
- **F0.2** BD aditiva + Edge `sdx-sync` + enforcers lockstep. **Gate: verify + advisors + reviewers verdes.**
- **F0.3** docs al día + **SP-0a** (canonical-facts seed + checker — cierra el doc-sync justo cuando más docs se tocaron). **Gate: docs:check verde.**
- **Fase 1** MVP (Group 3+).

## 11. Preguntas abiertas para el grill

1. Una `core.jobs` con `job_extras` hija (recomendado) vs un solo nivel job aplanado — confirmar contra el uso real de extras en costeo.
2. `core.phases` clave natural exacta `(job, extra, phase_code, cost_type)` — verificar contra GetPhaseEnhanced (¿cost_type es parte de la fila phase o dimensión aparte?).
3. Schema `api`/views `security_invoker` como contrato app<->core (decisión #6 del roadmap) — ¿en este change-set o su propio ADR antes de Group 3?
4. Cadencia del sync (nightly default) + ¿auto-crear nuevos de Spectrum o encolar para Samantha? (default: crear con guard de Z-sentinel).
5. Exposed Schemas (Dashboard, acción de Jaime): exponer `core`; NO exponer `raw_spectrum` (service_role only).

## 12. Update 2026-06-04 (post query SDX en vivo) — #2 RESUELTA + principio anti-asuncion

**#2 (clave de `core.phases`) RESUELTA contra SDX en vivo (no snapshot):** los extras SI tienen phases propias — `GetPhase pJob_Number=24-404E1` = **91**, `22-208E1` = **61**, obra base `24-404` = **53**. Interpretacion correcta = **(A): obra -> extra -> phase -> category**. `core.phases` -> FK a job+extra (`Job_Number` con sufijo E); clave `(Job_Number, Phase_Code, Cost_Type)`. `core.jobs` = una fila por `Job_Number` (base o extra) con `obra_code`+`extra_code` parseados.

**Principio anti-asuncion (a sembrar en SP-0a canonical-facts):** SOR de data SDX = la **API en vivo**, NO los snapshots de `spectrum-tests/` (la captura `GetPhase` 501 estaba incompleta). Validar modelo/conteo contra live SDX (bash curl o Edge `sdx-sync`). Ver `spectrum-tests/README.md`.
