# 12-SOR-MATRIX.md — System of Record matrix

**⚠️ Foundational ICONSA, no específico de HumanOS.** Migra a `iconsa-knowledge` wiki cuando se cree.

**Última actualización**: sesión 2026-05-25 (creación)

**Propósito**: Por cada entidad canónica + campo, declara **qué sistema es la autoridad** (System of Record) y qué sistemas son consumidores read-only. Sin esta matriz, conflict resolution durante ETL es ad-hoc — fuente de bugs operativos.

**Status**: PRELIMINAR. Se completará por integration a medida que cada API se conecte realmente.

**Realidad concreta de integrations (input James 2026-05-25)**:

- **Skydata GPS**: API REST live ✓ (credenciales en Vercel env). Primera integration a implementar.
- **Trimble Spectrum**: SDK disponible, cubre **master data only** (Employees, Equipment, Projects, Cost Codes, Vendors). **Transactional (POs, Invoices, GL) pendiente fase 2** — SDK actual NO lo expone.
- **PayDay**: **NO API REST**. Acceso vía **PayDay Data Warehouse** — data dump batch 1-2 veces/día fuera de horarios. ETL pattern es batch, no realtime.
- **Trimble B2W, ProjectSight**: sin SDK aún. Posponer.

Esta matriz refleja SOR según cómo cada sistema acceda (API live vs batch vs SDK master data only). Las filas marcadas `(fase 2)` son aspiracionales hasta que el sistema externo exponga el campo.

---

## Convenciones

- **SOR (System of Record)** — sistema autoritativo. Su valor gana en conflict.
- **Replica / Consumer** — sistema que tiene copia read-only del dato. NO edita.
- **Bidirectional** — sistemas que pueden escribir, pero con regla de resolución declarada (campo `strategy` en `mdm.field_resolution_rules`).
- **N/A** — sistema no maneja el campo.

Sistemas listados:

- `hr.people` / `hr.*` — HumanOS canonical (HR golden record)
- `public.people` / `public.*` — MovimientOS operational
- `payday` — PayDay nómina Panamá
- `b2w` — Trimble B2W (operations)
- `spectrum` — Trimble Spectrum (accounting/ERP)
- `projectsight` — Trimble ProjectSight (project management)
- `skydata` — Skydata GPS telematics
- `manual` — UI directo de app interna

---

## Entidad: **Person** (empleado, conductor, técnico)

**Status golden record**: **DEUDA TÉCNICA documentada** — hoy hay `public.people` (MovimientOS, 182 rows) + `hr.people` (HumanOS, 370 rows) como dos golden records de la misma entidad. Refactor a `mdm.people` postergado hasta Spectrum SDK integration (ver ADR sobre duplicación temporal Person en `docs/08-ADRs.md`).

Por ahora (Paso 11+ HumanOS MVP): Code trabaja con `hr.people` como golden record DE HUMANOS. Agrega `hr.people_external_ids` que ya prepara cross-reference futuro.

| Campo | SOR | Replicas / Consumers | Strategy | Sync method | Notas |
|---|---|---|---|---|---|
| `cedula` | manual (onboarding) | PayDay (replica), Spectrum (replica) | `manual_override` | — | Validar contra DGI Panamá en onboarding |
| `name` | manual (onboarding) | todos | `most_recent` | — | Auto-update si cambia legal |
| `email` | manual (Google Workspace ICONSA) | todos | `sor_wins` | — | `@iconsanet.com` controlado por TI. Futuro Workspace SSO source |
| `phone` | manual (self-service HumanOS) | PayDay (replica) | `most_recent` | — | Self-service tiene preferencia |
| `address` | manual (self-service HumanOS) | PayDay (replica) | `most_recent` | — | Self-service tiene preferencia |
| `emergency_contact_*` | manual (self-service HumanOS) | — | `sor_wins` | — | Solo HumanOS lo maneja |
| `salary` | PayDay | `hr.people` (replica display) | `sor_wins` | **Batch dump 2x/día** | PayDay Data Warehouse, no realtime |
| `position` | manual (ACCION_PERSONAL ticket) | PayDay (replica), Spectrum (replica via SDK) | `manual_override` | — | Cambios vía workflow HumanOS |
| `department` | manual (onboarding) | todos | `manual_override` | — | Cambios vía ACCION_PERSONAL |
| `app_role` | manual (admin assignment) | apps consumen | `sor_wins` | — | RBAC interno apps |
| `hire_date` | PayDay | `hr.people` (replica) | `sor_wins` | **Batch dump 2x/día** | PayDay SOR formal |
| `termination_date` | PayDay | `hr.people` (replica) | `sor_wins` | **Batch dump 2x/día** | PayDay SOR formal |
| `employment_status` | PayDay | `hr.people.status` | `sor_wins` | **Batch dump 2x/día** | Tolerancia stale: hasta 12h |
| `vacation_balance` | PayDay (calculado) | `hr.people` (replica display) | `sor_wins` | **Batch dump 2x/día** | PayDay calcula días acumulados |
| `current_project_assignment` | B2W (fase 2) | `hr.people.current_project_id` | `sor_wins` | API live (futuro) | B2W asigna personal a obras |
| `cost_center` | Spectrum | `hr.people.cost_center_id` | `sor_wins` | **SDK master data daily** | Spectrum Employee SDK |
| `cedula_contable` | Spectrum | `hr.people.spectrum_employee_id` | `sor_wins` | **SDK master data daily** | ID Employee en Spectrum |
| `license_type` | manual (HumanOS) | — | `sor_wins` | — | Solo HumanOS (conductores) |
| `license_expiry` | manual (HumanOS) | — | `sor_wins` | — | Self-service o admin update |
| `medical_info` | manual (HumanOS sensible) | — | `sor_wins` | — | Solo `hr.medical_info`, NUNCA exportado |
| `notification_preferences` | manual (self-service HumanOS) | — | `sor_wins` | — | HumanOS only |

External IDs preservados en `hr.people_external_ids`:

- `system='payday'` → ID empleado en PayDay Data Warehouse
- `system='b2w'` → User ID en B2W (fase 2)
- `system='spectrum'` → Employee ID en Spectrum (vía SDK master data fase 1)
- `system='projectsight'` → User ID en ProjectSight (fase 2)
- `system='skydata'` → Driver ID en Skydata (solo conductores)
- `system='movimientos'` → `public.people.id` (provisional hasta resolución Person duplication ADR)

**Conflict resolution prioridad cuando PayDay batch vs HumanOS manual difieren**:
- Campos PayDay-SOR (salary, hire_date, vacation_balance, employment_status, termination_date): **PayDay siempre gana** después de cada batch. Si HumanOS muestra valor diferente entre batches, indica stale data — refresh esperar próximo dump.
- Campos manual-SOR con replica en PayDay (phone, address): HumanOS gana — PayDay puede tener data desactualizada de RRHH histórico.

---

## Entidad: **Equipment** (maquinaria, vehículo, herramienta)

Golden record: TBD. Hoy: `public.equipment` (MovimientOS). Posible migración futura a `mdm.equipment`.

| Campo | SOR | Replicas | Strategy | Notas |
|---|---|---|---|---|
| `serial_number` | Spectrum | `public.equipment`, B2W | `sor_wins` | Inventario contable es SOR |
| `make` / `model` / `year` | Spectrum | todos | `sor_wins` | |
| `purchase_date` / `purchase_cost` | Spectrum | — | `sor_wins` | Accounting |
| `depreciation_*` | Spectrum | — | `sor_wins` | Accounting |
| `current_location` | Skydata (GPS) | MovimientOS, B2W | `sor_wins` | Realtime GPS |
| `assigned_operator` | MovimientOS o B2W (TBD) | — | TBD | Reglas de asignación a definir |
| `mobilization_status` | MovimientOS | — | `sor_wins` | App interna |
| `maintenance_schedule` | TBD | — | TBD | Posible Fleetio futuro |
| `tariff_rate` | manual (IC-EQ-PO-02) | Spectrum (replica) | `manual_override` | Calculado por formula F-02-03 |

External IDs en `equipment_external_ids`:

- `system='spectrum'` → Asset ID Spectrum
- `system='b2w'` → Equipment ID B2W
- `system='skydata'` → Asset ID Skydata
- `system='movimientos'` → equipment.id (provisional, UUID interno)

---

## Entidad: **Project / Obra**

Golden record: TBD. Hoy: `public.projects` (MovimientOS).

| Campo | SOR | Replicas | Strategy | Notas |
|---|---|---|---|---|
| `project_code` | Spectrum | todos | `sor_wins` | Código contable estándar ICONSA |
| `project_name` | Spectrum | todos | `sor_wins` | |
| `client` | Spectrum | — | `sor_wins` | |
| `location` | manual (onboarding obra) | — | `sor_wins` | |
| `start_date` / `end_date` | Spectrum | ProjectSight | `sor_wins` | Contractual |
| `budget` | Spectrum | — | `sor_wins` | Accounting |
| `assigned_pm` | manual (admin) | ProjectSight (replica) | `manual_override` | hr.people referenciado |
| `status` | ProjectSight | Spectrum (replica), MovimientOS | `sor_wins` | PM tool es SOR de estado operacional |
| `current_phase` | ProjectSight | — | `sor_wins` | |

External IDs en `projects_external_ids`:

- `system='spectrum'` → Job Number Spectrum
- `system='projectsight'` → Project ID ProjectSight
- `system='b2w'` → Job Code B2W

---

## Entidad: **Vendor / Supplier**

Golden record: TBD. Posiblemente `mdm.vendors` futuro.

Status: **placeholder**. Detalle por completar cuando integration Spectrum sea concreta.

---

## Entidad: **Cost Code / Concepto de Costo**

Golden record: Spectrum probablemente.

Status: **placeholder**. Detalle por completar.

---

## Reglas operacionales

1. **Cuando ETL inbound recibe data**, antes de UPDATE/INSERT a tabla canónica:
   - Query `mdm.field_resolution_rules` para campo en cuestión
   - Si `strategy='sor_wins'` y `source_system != sor_system`, **DESCARTAR** el cambio (log a `audit.changes` con `resulting_action='skipped_non_sor'`)
   - Si `strategy='most_recent'`, comparar timestamps y aplicar el más nuevo
   - Si `strategy='manual_override'`, **NEVER** sobrescribir desde ETL — requiere acción manual

2. **Cuando nuevo sistema externo se integra**:
   - Agregar a esta matriz columnas/notas relevantes
   - Agregar a CHECK constraint de `{entity}_external_ids.system`
   - Agregar a CHECK constraint de `_source` en tablas canónicas
   - Documentar en `13-INTEGRATIONS-INDEX.md`

3. **Cuando se agrega nueva entidad canónica**:
   - Sección nueva en este doc
   - Campos listados con SOR explícito por cada uno
   - Tabla external_ids creada
   - ADR en `docs/adr/`

---

## Cuándo este doc se completa al 100%

Por integration. Hoy es preliminar — refleja conocimiento documentable sin acceso a APIs reales. A medida que cada integration arranque:

- **Skydata GPS** (ya tienen API) → completar campos GPS de Equipment + cross-ref Driver
- **PayDay** → completar campos salary, hire_date, vacation_balance de Person
- **Spectrum** → completar Equipment, Project, Cost Code, Vendor
- **B2W** → completar Equipment assignment, Project assignment
- **ProjectSight** → completar Project status, phases

Cada integration disparará update de este doc + ADR documentando decisiones específicas (rate limits, auth, sync frequency).
