# Dominio RRHH ICONSA

**Role:** catálogo de dominio RRHH ICONSA — SOPs, formularios, equipo, type→mode mapping, departamentos/cargos/ubicaciones. · **Read-when:** JIT al construir un formulario o entender un SOP/tipo de solicitud. · **Maintain-when:** nuevo SOP, nuevo request type, o cambio en el mapping tipo→chain.

**Última actualización**: 2026-05-27 (mapping definitivo + equipo gerencia ampliado)

---

## Equipo HR + Gerencia (verificado BD)

### Equipo RRHH (app_role=`hr_admin`)

| Persona | employee_code | Cargo |
|---|---|---|
| Samantha Kosmas | KOSM01 | Gerente RRHH y ADM |
| Rocío Olmedo | OLM206 | Oficial RRHH |
| Milagros Manyoma | MAN943 | Oficial Planillas |
| Jerelyn Mendoza | MEN943 | Asistente Adm RRHH |

### Gerencia

| Persona | employee_code | Cargo |
|---|---|---|
| Rodrigo Eisenmann | EIS772 | Presidente |
| Octavio Javier Ferrer | FER337 | Vice Presidente |

### Otros gerentes en BD

> **Gerencia General (canonical):** Gerencia General (SOP) = el rol president (MAPPING RESUELTO 2026-06-03); president (Rodrigo) aprueba+recibe los steps GG. ABIERTO solo si el VP Javier Ferrer u otros gerentes de esta tabla tambien gatean en algun tipo (ver ADR-0020 + ADR-0027). El roster de abajo es factual (titulos BD), no implica que gaten hoy.

| Persona | employee_code | Cargo | Departamento |
|---|---|---|---|
| Adolfo Valderrama | VAL130 | Gerente | Equipo |
| Argelia Ugarte | UGA301 | Gerente | Cumplimiento |
| Jorge D. Beluche | BEL359 | Gerente de Calidad | Proyectos |
| Millie Marie Monteza | MON432 | Gerente de Calidad | Proyectos |
| Olmedo Zamora | (sin code) | Gerente de Equipo | Equipo |
| Damaris Rios | RIO806 | Gerente de Finanzas y Contabilidad | Administración |
| Andrés Solís | SOL236 | Gerente de Proyecto | Proyectos |

> Conteos vivos (personas, activos, invite codes sin consumir, roles): consultar la BD via Supabase MCP - la BD es la fuente de verdad (no se duplican aqui).

---

## Catálogo SOPs RRHH (GDrive folder `1qS-MkGRH2Vmt9rwI5ihNLWdkduh5v1A4`)

### Manuales (M)

- **IC-RH-M-01** Manual Ética y Conducta — acknowledgment obligatorio en onboarding

### Documentos políticas (D — educativos)

- IC-RH-D-01 Inducción Personal Campo
- **IC-RH-D-02 Condiciones Especiales Solicitud Préstamo** — base de R4
- IC-RH-D-04 Tablas y ejemplos cálculo ISR
- IC-RH-D-05 Glosario prestaciones laborales
- IC-RH-D-06 Política Comedor
- IC-RH-D-07 Política Trabajo Infantil — acknowledgment obligatorio

### Instrucciones Técnicas (IT)

- IC-RH-IT-01 Manejo expediente personal
- IC-RH-IT-02 Llenar descuentos en BD planillas
- IC-RH-IT-03 Cálculo ISR
- IC-RH-IT-04 Llenado F-03-04

### Procedimientos Operativos (PO)

- **IC-RH-PO-05 Acciones Personal** — base de F-05-01 a F-05-05
  - §5.5 Préstamos chain
  - §5.8-5.10 Vacaciones chain
  - §5.11 Reclamo Pago SLA 48h

### Formularios Generales (F-00-*)

- F-00-01 Alcoholímetro (NO HumanOS, SSOA)
- F-00-02 Matriz PNC (NO HumanOS, Calidad)
- F-00-03 Matriz NC (NO HumanOS, Calidad)
- F-00-04 Entrega Combustible (NO HumanOS, Logística)
- **F-00-05 Entrevista Salida** — HumanOS direct_hr_admin
- **F-00-06 Referencias Laborales** — HumanOS direct_hr_admin (workflow inverso)
- **F-00-07 Actualización Datos** — HumanOS direct_hr_admin
- **F-00-08 Permiso Laboral (horas)** — HumanOS parallel

### Formularios módulos (F-NN-NN)

| Módulo | Form | Estado HumanOS |
|---|---|---|
| RH-01 Selección | PO-01 + F-01-08 Solicitud Empleo + F-01-09 Inducción/contrato | F-01-09 v2 onboarding workflow. F-01-08 v3 ATS |
| RH-02 Capacitación | F-02-04 Lista Asistencia | v2 learning |
| RH-02 | F-02-05 Eval post-entrenamiento | v2 learning |
| RH-02 | **F-02-07 Firma Inducción** | MVP parcial (acknowledgments en onboarding) |
| RH-02 | **F-02-09 Capacitación** | MVP HumanOS parallel |
| RH-03 Evaluación | F-03-03, F-03-04 | v2 performance |
| RH-05 Acciones Personal | **F-05-01 Acción de Personal** (6 sub-tipos) | MVP HumanOS parent + 6 sub-tipos parallel con president |
| RH-05 | **F-05-02 Préstamo** | MVP HumanOS parallel con president |
| RH-05 | **F-05-03 Vacaciones** | MVP HumanOS parallel con president |
| RH-05 | F-05-04 Memo Amonestación | v2 disciplinary |
| RH-05 | **F-05-05 Reclamo Pago** | MVP HumanOS parallel SLA 48h |
| F-04-01 | Info Emergencia | MVP integrada a perfil (NO ticket) |
| F-00-08 | Permiso horas | MVP HumanOS parallel |

---

## Mapping definitivo tipos → mode + chain (24 tipos verificados BD)

> **Mode/SLA/steps canónicos en `business-rules.md` R11** (única fuente editable; verdad runtime = BD `requests.types.approval_chain_template`). Esta tabla se conserva por su **traza a SOP** (códigos de forma + secciones PO-05, que R11 no enumera). Si un mode/SLA cambia, edita R11; refleja aquí solo la columna SOP.

### parallel con president (8 tipos per SOP)

| Tipo | SOP | SLA | Chain (paralelo) |
|---|---|---|---|
| PRESTAMO | F-05-02 + PO-05 §5.5 | 72h | supervisor + hr_admin + president |
| VACACIONES | F-05-03 + PO-05 §5.8 | 72h | supervisor + hr_admin + president |
| ACCION_AUMENTO_SALARIO | F-05-01 | 120h | supervisor + hr_admin + president |
| ACCION_DESPIDO | F-05-01 | 120h | supervisor + hr_admin + president |
| ACCION_LIQUIDACION | F-05-01 | 120h | supervisor + hr_admin + president |
| ACCION_HORAS_EXTRAS | F-05-01 | 120h | supervisor + hr_admin + president |
| ACCION_PERMISOS | F-05-01 | 120h | supervisor + hr_admin + president |
| ACCION_DESCUENTO | F-05-01 | 120h | supervisor + hr_admin + president |

### parallel sin president (5 tipos, SOP no incluye gerencia)

| Tipo | SOP | SLA | Chain |
|---|---|---|---|
| PERMISO (horas) | F-00-08 | 48h | supervisor + hr_admin |
| RECLAMO_PAGO | PO-05 §5.11 | 48h | supervisor + hr_admin |
| CAPACITACION | F-02-09 | 168h | supervisor + hr_admin |
| SOLICITUD_EPP | (sin SOP, B) | 72h | supervisor + hr_admin |
| REPORTE_INCIDENTE | (sin SOP, B) | 24h | supervisor + hr_admin |

### any_of_hr (5 tipos documentos)

| Tipo | SLA | Chain |
|---|---|---|
| CARTA_TRABAJO | 48h | any hr_admin |
| CERTIFICACION_LABORAL | 72h | any hr_admin |
| CONSTANCIA_NO_ADEUDO | 72h | any hr_admin |
| COPIA_CONTRATO | 48h | any hr_admin |
| COPIA_COLILLA | 48h | any hr_admin |

### direct_hr_admin (5 tipos)

| Tipo | SOP | SLA | Chain |
|---|---|---|---|
| ACTUALIZACION_DATOS | F-00-07 | 48h | any hr_admin |
| CAMBIO_CUENTA_BANCO | (sin SOP, B) | 48h | any hr_admin |
| CAMBIO_DEPENDIENTES | (sin SOP, B) | 72h | any hr_admin |
| REFERENCIA_LABORAL | F-00-06 | 120h | any hr_admin (RRHH inicia) |
| ENTREVISTA_SALIDA | F-00-05 | 72h | any hr_admin (RRHH inicia) |

### parent_only (1 tipo)

ACCION_PERSONAL (parent — sub-tipos llevan el chain real)

---

## Departamentos (`hr.org_units` — 14 canónicos)

Canonical: Administración, Cumplimiento, Equipo, Finanzas, Gerencia, Operaciones, Planillas, Proyectos, RRHH, Seguridad, Sistemas/IT, Calidad, Logística, Talleres.

---

## Cargos (`hr.positions` — 60 canónicos)

Distribución por departamento. Principales: Ayudante, Operario, Técnico, Maestro Obra, Capataz, Supervisor, Coordinador, Asistente, Oficial, Gerente, Vicepresidente, Presidente.

---

## Ubicaciones (`hr.locations` — 15, 12 activas)

Oficinas principales + proyectos activos. Personal de campo asignado a `location_id` que cambia según proyecto en curso.

---

## Relación con MovimientOS

- `auth.users` compartido (48 users actuales son MovimientOS)
- Roles MovimientOS (`public.*`): PM, admin, logística, campo — INDEPENDIENTES de roles HumanOS
- Misma persona puede tener auth.user con `allowed_apps = ["movimientOS", "humanOS"]`
- ZERO foreign keys de `public.*` a `hr.*` (verificado vía query)
- Cuando consolidación MDM (futuro): tabla `mdm.persons` canónica + `hr.user_app_roles` separando roles per app

---

## Vocabulary core

> Glosario canónico vivo: `../CONTEXT.md` (mantenido por grill-with-docs). Esta tabla es un quick-reference subset del dominio RRHH; las definiciones completas + términos a evitar viven en CONTEXT.

| Término | Significado |
|---|---|
| **solicitud** | requests.tickets row con form data + chain + state |
| **ticket** | sinónimo solicitud (interno) |
| **expediente** | conjunto data persona en hr.* + docs.* + files.* |
| **chain** | secuencia (o conjunto paralelo) de aprobadores configurada en `approval_chain_template` |
| **chain template** | configuración por tipo en `requests.types.approval_chain_template` JSONB |
| **chain instance** | aplicación concreta del template a un ticket en `requests.approvals` rows |
| **stamp** | sello aprobación con metadata (nombre + fecha + hora + IP) — R7 |
| **manual entry** | solicitud creada por hr_admin en nombre de empleado (papel-digital bridge) — R25 |
| **SCD-2** | Slowly Changing Dimension Type 2 — history preservada en `hr.employments` con `is_current` boolean |
| **invite code** | código 8 chars de un solo uso para sign-up — R14 |
| **app_role** | rol HumanOS contextual: employee | hr_admin | president | admin. NO incluye 'supervisor' |
| **supervisor contextual** | persona que aparece como `supervisor_id` de algún employment current, o seleccionada en `selected_supervisor_id` de ticket |
