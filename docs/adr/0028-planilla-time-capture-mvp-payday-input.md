# Planilla / time-capture en el MVP: HumanOS captura el insumo de PayDay, no lo reemplaza

**Decidido 2026-06-04 (Jaime).** Incorpora la planilla (registro de tiempo y asistencia) al alcance del MVP como insumo de datos hacia PayDay, y fija la topología de schemas para la captura de tiempo. Respaldo: instructivo `IC-GP-IT-01` (GDrive GESTION DE PROYECTOS), análisis del schema `payroll.*` en la BD (2026-06-04), e investigación de software líder de construcción (Trimble Vista, Procore, Rhumbix, hh2, Sage 300 CRE, Arcoro/ExakTime).

## Contexto

La planilla es la captura de tiempo/asistencia y asignación de costo de mano de obra: el **capataz** llena, por proyecto y bisemana, una grilla de su cuadrilla (empleados × días) con códigos de proyecto/fase/tipo de tiempo; el sistema computa horas; el resultado se exporta a **PayDay** (la nómina computarizada externa). Las formas viven en GESTION DE PROYECTOS (`IC-GP-*`), no en RECURSOS HUMANOS — por eso no estaban en el espejo `docs/sops/` y casi se omiten del MVP. El PO de planilla (PO-06) sí vive en RRHH.

`payroll.*` ya existe en la BD: lo creó un compañero para una herramienta que mueve datos entre PayDay y ProjectSight. **Ese compañero no usa Supabase** — agregó las tablas solo como contexto. Por lo tanto `payroll.*` es nuestro para usar/restructurar libremente (ver ADR-0011 update). Contiene, ya poblado, el catálogo de códigos que la planilla debe validar: `projects` (`base_project_code` ej. "22-208"), `project_extras` (los "extras"), `phases` (cost codes CSI ej. "013100"), `cost_centers`; más tablas `stg_*` (staging ETL) y `person_project_assignments` (puente a `hr.people`, vacío).

## Decisión

1. **La planilla entra al MVP** como insumo de datos. HumanOS **no reemplaza** PayDay (ni a corto/mediano plazo) — lo **complementa**: captura las horas codificadas y las exporta. PayDay sigue siendo el motor de cálculo de nómina.

2. **La captura de tiempo (datos user-facing) vive en `hr.*`** con RLS estricta, referenciando por FK los catálogos de `payroll.*`. NO se escribe la captura dentro del schema ETL `payroll.*` (que hoy tiene RLS deshabilitada — ver Riesgos).

3. **`payroll.*` = master data de proyectos/códigos** (referencia read para validación + prefill). Es la semilla de MDM (ADR-0014); estos catálogos son candidatos a migrar al futuro `core.*` (datos compartidos cross-app) — fuera de scope MVP.

4. **El export a PayDay es un contrato estructurado, code-keyed y validado** (columnas fijas: Emp No. = `employee_code`, Project Code, Phase, Work Code, horas computadas, periodo), no un volcado CSV libre. Se valida contra los códigos existentes (reject unknown).

5. **La planilla es "un formulario más" en el modelo de datos** (FormEngine + `form_schema` con `source` profile/user_input/computed + gate de ApprovalEngine). La superficie genuinamente nueva, acotada: (a) UI de **grilla masiva** (capataz × cuadrilla × días) en vez de form individual; (b) **recurrencia bisemanal**; (c) **export CSV**; (d) máquina de estados con **lock + edición restringida post-aprobación** (table-stakes que la investigación marcó faltante).

## Alternativas descartadas

- **HumanOS como motor de nómina / reemplazar PayDay** — rechazado: el mercado asigna a la capa HR/captura (hh2/ExakTime/Arcoro) un rol distinto del motor (Sage/Vista/PayDay); incluso Arcoro ("our own Arcoro") separa captura de ERP. Reemplazar PayDay es alto riesgo y no es la meta.
- **Escribir la captura directamente en `payroll.*`** — rechazado: heredaríamos un schema ETL con RLS apagada; mejor `hr.*` RLS-estricto + FK a los catálogos.
- **Construir el catálogo de códigos de cero** — rechazado: ya existe y poblado en `payroll.*`, alimentado por el mismo sistema (PayDay/ProjectSight) al que exportamos.
- **Diferir planilla a post-MVP** — rechazado (Jaime): es insumo crítico y de los pocos formularios con valor diario.

## Consecuencias / riesgos / cross-refs

- **Riesgo de seguridad (P1):** las 9 tablas de `payroll.*` tienen **RLS deshabilitada** — expuestas a anon/authenticated; una (`person_project_assignments`) ya referencia `hr.people`. Antes de que HumanOS se apoye en `payroll.*` hay que habilitar RLS + policies + COMMENTs (subirlo a estándar foundation: checklist CREATE TABLE). No hay consumidor externo que se rompa (el compañero no usa Supabase).
- El diseño de detalle (tablas exactas de time-capture, cómo modela la asignación de cuadrilla vs `payroll.person_project_assignments`, dónde viven los catálogos: `payroll.*` vs futuro `core.*`) se define en el grill + spec de Planilla/Time&Attendance.
- Amend ADR-0009 (la planilla entra al alcance FUR + secuencia de grupos). Relacionado: ADR-0011 (payroll.* usable), ADR-0014 (MDM gradual), ADR-0015 (engines genéricos), ADR-0020 / ADR-0027 (cadena: lock/aprobación de planilla = `kind=approval`), ADR-0025 (PayDay como `source_system`).
- Vocab nuevo en `CONTEXT.md` (Planilla, time-capture, capataz/cuadrilla, Project/Phase/Work Code, payroll catalogs, PayDay downstream).

## Update 2026-06-04 (SP-0b / ADR-0032) — la obra/proyecto vive en `core`, no en `payroll.*`

ADR-0032 supersede la dirección "FK a `payroll.projects`" de este ADR: el master de obra vive en **`core`** con jerarquía de 4 niveles **`core.jobs` (24-404) → `core.job_extras` (E1) → `core.phases` (01-7113) → categoría (`Cost_Type`)**, conformado desde Spectrum SDX `GetJob`/`GetPhase`. La planilla referencia `core.jobs`/`core.job_extras`/`core.phases` (no `payroll.*`). El catálogo de códigos que la planilla valida = `core`, alimentado live por Spectrum. `payroll.projects` queda superseded (move físico diferido).
