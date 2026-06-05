# Core MDM foundation: schema `core` (rename de `mdm`), masters conformados desde Spectrum SDX, people golden en `hr.people` + `core.persons` VIEW

**Decidido 2026-06-04 (Jaime).** Spec: [SP-0b](../superpowers/specs/2026-06-04-core-mdm-foundation-design.md). Research: [`docs/work/2026-06-04-core-mdm-foundation-roadmap.md`](../work/2026-06-04-core-mdm-foundation-roadmap.md) (borrador no-ratificado). Establece la capa MDM `core` + la adopción de Spectrum SDX como fuente live. **MDM = la disciplina** (autoridad por campo + golden record + crosswalk); **`core` = el schema.**

## Contexto

Los mismos masters viven duplicados, sin sync, en varios sistemas (verificado en BD 2026-06-04): people (`public.people` 182 stale + `hr.people` 370 + Spectrum 166), equipment (`public.equipment` 377 **ya con `spectrum_code`** + Spectrum 420), obras/jobs (`public.projects` + `payroll.projects` 23 + Spectrum 47), phases/cost (`public.cost_codes` 119 + `payroll.phases` 26 + Spectrum 501). Spectrum SDX está **live** (14 servicios Get, SOAP/XML, master data read-only). Las fuentes reales going-forward son **Spectrum + PayDay (+ onboarding self-service)**; el Excel de Samantha fue carga histórica de-una-vez; `public.people` es un snapshot stale de Spectrum; el demo (`humanos_v1`) es irrelevante.

## Decisión

1. **Schema `core`** = capa de masters conformados (golden record), consumida por todas las apps. Se crea renombrando el `mdm` vacío: `CREATE SCHEMA core` + `ALTER DOMAIN mdm.source_system SET SCHEMA core` (Postgres repunta solo las 16 columnas dependientes) + `DROP SCHEMA mdm`.
2. **Topología medallion:** `raw_spectrum` (bronze, landing verbatim) → `core` (gold) → dominios (`hr`/`requests`/... consumen core). `stg_*` **reservado** (se construye con fuentes sucias / Info-Link). `core.*` governance + `meta`. Regla: aterrizar en raw antes de promover; SDX (limpio, bajo volumen) va `raw_spectrum → core` directo.
3. **Masters `core.*` desde SDX (aditivos, tablas físicas nuevas):** jobs, job_extras, phases, equipment, customers, wage_codes, pay_types, deductions_addons, eq_cost_categories. Cada uno: RLS ON + ≥1 policy, COMMENT, FK con `ON DELETE` + índice, `*_external_ids` (crosswalk), `source_system` + soft-delete.
4. **Obra = jerarquía de 4 niveles:** `core.jobs` (24-404) → `core.job_extras` (E1) → `core.phases` (01-7113) → categoría = `Cost_Type` (CON/EQA/ICS). Spectrum codifica obra+extra en `Job_Number` (24-404E1).
5. **People:** `hr.people` **sigue siendo la golden record física** (75 FKs; F1/F4/F5 shipped). **`core.persons` = una VIEW sobre `hr.people`** = el contrato cross-app (MovimientOS/futuras leen la VIEW) **sin repointar los 75 FKs.** NO se crea `core.employees` como master paralelo. La data de empleado de Spectrum entra a `hr.person_sources` (crosswalk) + enriquece `hr.employments`.
6. **Autoridad por campo + survivorship + governance:** `core.source_systems` (registro), `core.field_authority` (quién gana por campo), `core.sync_runs` (log idempotente). Autoridad: empleo/org ← Spectrum; identidad self-entered (cédula/contacto/emergencia/dependientes) ← onboarding + histórico + PayDay; salario ← PayDay; `employment_status` ← local (NUNCA overwrite ciego). Survivorship conservador: nuevo-activo-en-Spectrum → crear (guard Z-sentinel `*9999`); conflicto en campo Spectrum → flag > overwrite.
7. **Ingesta:** Edge Function `sdx-sync` (Deno, SOAP/XML, **sin VPS** — el VPS es para Info-Link), raw→core idempotente, `service_role` least-privilege.

## Reconciliación con ADR-0014 (lección `core.identities`)

El rollback de `core.identities` (migraciones 029-031, 2026-05-27) fue **PUSH** — anticipar MDM de **personas** sin consumidor. ADR-0032 es distinto y consistente con esa lección: **(a)** construye masters **NO-people** (equipment/jobs/phases/...) donde el **PULL YA existe** (MovimientOS los duplica HOY + Spectrum SDX live); **(b)** mantiene **people deferido** (hr.people físico + `core.persons` VIEW), honrando la deferral de 0014. No repite el error: satisface su condición (PULL real) para lo no-people y respeta la deferral para people. El "person canonical eventual" de 0014 ahora se llama `core.persons` y arranca como VIEW.

## Alternativas rechazadas

- **Reconstruir `hr.people` desde cero en core** — rehace una consolidación ya correcta + paga el repoint de 75 FKs sin beneficio inmediato; la VIEW da cross-app sin el costo.
- **`core.employees` como master de personas paralelo** — recrea el dual-master (el problema que veníamos a resolver).
- **Aplanar obra a una tabla** — la jerarquía obra→extra→phase→category es real (confirmado Jaime + data: `24-404E1`).
- **`stg_*` materializado ahora** — SDX es limpio/bajo-volumen; raw→core directo; stg cuando lleguen fuentes sucias / el transaccional de Info-Link.
- **Construir core de people ya (estilo 029-031)** — rechazado por la lección de 0014 (people sin pull = push).

## Consecuencias / cross-refs

- **Enmienda** ADR-0011 (core/raw/meta first-class), ADR-0014 (master layer = core; people VIEW), ADR-0025 (DOMAIN `mdm.source_system` → `core`; crosswalks en core), ADR-0028 (obra → `core.jobs`; planilla referencia core).
- **Enforcers (lockstep):** allowlist += `core`/`raw_spectrum`/`meta` en los ~12 archivos; corregir los 6 docs que aún llaman `payroll.*` prohibido.
- **HumanOS: cero impacto en F1-F5** (su superficie es `hr.*`/`requests.*`, no core). Único alta (people físico) **diferido** vía VIEW.
- **Diferido (SP-0b §8):** people físico, medallion completo + VPS + time-series (TimescaleDB/partitioning) para Info-Link, SkyData GPS, retiro de `public.people`, move físico de `payroll.projects` (views de compatibilidad primero).
- **Exposed Schemas (Dashboard, acción de Jaime):** exponer `core`; **NO** exponer `raw_spectrum` (service_role only).
- **Backlog (STATUS §6):** item `CORE-MDM`; reconcilia DB-VISION-B (external_ids/source_system/soft-delete formalizados aquí), PAYROLL-RLS, AUDIT2B-BASELINE + TYPES-STALE (regenerar baseline + types tras el cambio), PLANILLA-MVP (hereda core.jobs/phases), SIGNUP-datamodel (onboarding = fuente live de cédula).
- Secuenciación: SP-0b §10 (F0.1 ADRs → F0.2 BD aditiva → F0.3 docs + SP-0a → MVP).

## Update 2026-06-04 (post query SDX en vivo)

- **Jerarquía de obra confirmada contra SDX en vivo:** los extras SÍ tienen phases propias (`GetPhase pJob_Number=24-404E1` = 91 phases; `22-208E1` = 61; obra base `24-404` = 53). Modelo `obra → extra → phase → category` confirmado. `core.phases` → FK a job+extra (`Job_Number` con sufijo E); clave `(Job_Number, Phase_Code, Cost_Type)`. (La captura `spectrum-tests/GetPhase.response.xml` de 501 filas estaba INCOMPLETA — no traía las phases de extras.)
- **Principio: SOR de data SDX = la API en vivo, NO los snapshots** (`spectrum-tests/` = referencia de estructura/contrato, parcial/stale — ver su README). Toda decisión de modelo/conteo se valida live (bash curl o Edge `sdx-sync`). A sembrar en canonical-facts (SP-0a / F0.3).

## Update 2026-06-05 (F0.2 masters construidos — Design A ratificado)

Migraciones **080-085 aplicadas** (BD aditiva, cero impacto cross-app, `core` aún NO expuesto). El **#4 de la Decisión original (que listaba `core.job_extras` como master separado) queda ENMENDADO a Design A** tras research (4 threads + 3 lentes adversariales) ratificado por Jaime y validado LIVE 2026-06-05.

- **Jobs = Design A (adjacency list / Single-Table-Inheritance), NO dos tablas.** `core.jobs` = una fila por `Job_Number` (obra base **y** extra; LIVE 52 = 14 base + 38 extras). Fundamento citado: adjacency list para jerarquía fija/somera con niveles idénticos (PG docs *WITH RECURSIVE*/*ltree*; Kimball *Fixed-Depth Hierarchy*; Ackee); STI cuando los subtipos comparten el 100% de columnas (Fowler PoEAA); Design B forzaría la **polymorphic-association anti-pattern** en `core.phases` (Karwin *SQL Antipatterns* ch.7; PG *Constraints 5.5*). Refutación empírica de Design B: hay **extras huérfanos** (obra base ausente de Spectrum: `24-401E1`, `25-501E1/2/3`, `25-502E1/5/6/7`) — un FK `job_extras→jobs(base)` no tendría target.
- **`obra_code` = agrupador derivado** (siempre presente desde `Job_Number`); **`parent_job_id` = self-FK NULLABLE soft** (NULL para base y para huérfanos). NO hay entidad obra física (Spectrum no la da); `core.obras` sería una VIEW de `obra_code` distintos si se quiere. base vs extra **difieren** en atributos (ej. `24-404`="Costa Norte" vs `24-404E1`="Camino de acceso"), confirmando que cada `Job_Number` es fila de primera clase.
- **`core.phases` grano = `(job_id, phase_code)` (estructural), NO `(job, phase, cost_type)`.** LIVE: un `Phase_Code` (ej. `015200`="Campamento") se abre en **8 `Cost_Type`** (CON/EQA/EQI/ICS/MAT/OTR/SAL/SUB) con **description/status/uom/cost_center constantes por phase_code** → phase y categoría son niveles distintos (jerarquía literal de 4 niveles confirmada). El nivel **categoría (`Cost_Type`, 8 valores live — no 3) + actuales `$`** (JTD/Projected/Estimated) → **`core.phase_costs` (fact, DIFERIDO** SP-0b §8, con el consumidor planilla). Decisión Jaime: "structural master only". Separación master/transaccional citada (Kimball facts/dims; medallion gold; dbt marts).
- **PK = surrogate `uuid`** en cada master; la clave Spectrum se conserva como columna natural `UNIQUE` (parcial `WHERE deleted_at IS NULL`). Citado: Kimball *Dimension Surrogate Key* + *Durable Super-Natural Keys* (futuro re-key PayDay/SkyData).
- **`{master}_external_ids` xref por master** (patrón MDM XREF — Informatica/Profisee) para crosswalk multi-fuente. El seam real hoy es **equipment** (`public.equipment.spectrum_code` 377/377) y **jobs/phases** (vs `payroll.projects`/`payroll.phases`). `payroll.*` queda **superseded** por core (y su forma B ni siquiera calza con live: asume phases solo bajo extras, pero las obras base tienen phases). Move físico de `payroll.*` sigue diferido (§8).
- **`core.persons` = VIEW `security_invoker=true`** sobre `hr.people` (sin repoint de 75 FKs). Expone solo identidad/linkage segura — **SIN PII** (cédula/DOB/género/dependientes). `security_invoker` es obligatorio (sin él la VIEW fugaría todo `hr.people`). Person refs en jobs (PM/super/estimator) = **texto**, NO FK a la VIEW (una VIEW no puede ser target de FK).
- **Operativo SDX:** los pulls live usan `<GUID></GUID>` **vacío** (full data); un GUID ya consumido devuelve 1 fila vacía, uno arbitrario 0 → el GUID es token de sesión/dedup. Resolver el patrón de auth correcto al construir el Edge `sdx-sync`. El sufijo extra es **multi-dígito y no-contiguo** (`E10`, `E11`, `E7` sin `E1-6`) → el parser `Job_Number→obra_code/extra_code` debe ser robusto + testeado (persistir `Job_Number` raw; derivar).
- **Integridad jobs (deferral consciente):** los 3 CHECK garantizan `is_extra ⇔ extra_code`, base sin parent, no self-parent. NO se fuerza "parent es base" ni consistencia de `obra_code` (requeriría trigger; `parent_job_id` es hint soft y `obra_code` es el agrupador real). El Edge setea `parent_job_id` correctamente; no crea cadenas.
- **Pendiente F0.2:** Edge Function `sdx-sync` (ingesta raw→core idempotente) + enforcers lockstep (allowlist += `core`/`raw_spectrum`/`meta`) + fix docs `payroll.*`. **Acción Jaime (Dashboard):** exponer `core`, NO `raw_spectrum`/`meta`; re-correr `get_advisors` tras exponer (el linter no evalúa schemas no-expuestos) + validar el deny-path RLS con un JWT no-admin.
