# 11-MDM-PRINCIPLES.md — Master Data Management foundational principles

**⚠️ Foundational ICONSA, no específico de HumanOS.** Al crearse el repo `iconsa-knowledge` (wiki empresarial), este doc migra allá. Mientras tanto vive aquí como referencia operativa para Code.

**Última actualización**: sesión 2026-05-25 (ADR de adopción MDM)

**Audiencia**: Claude Code, futuros devs ICONSA, cualquier integration de sistema externo.

---

## Contexto

La base de datos Supabase ICONSA (`bzeoszympkkicwlfdtcn`) **NO es una base de datos de aplicación**. Es el **Master Data Hub empresarial** de la compañía.

Sistemas de Record externos que sincronizan datos hacia/desde esta BD (presente y futuro):

- **PayDay** — sistema de nómina Panamá. **NO API**, acceso vía PayDay Data Warehouse (batch dump 1-2 veces/día fuera de horarios)
- **Trimble Spectrum** — accounting/ERP. **SDK disponible** cubre master data (Employees, Equipment, Projects, Cost Codes, Vendors). Transactional (POs, Invoices, GL) pendiente fase 2
- **Trimble B2W** — operations management. Sin SDK aún
- **Trimble ProjectSight** — project management. Sin SDK aún
- **Skydata** — GPS telematics. **API REST live** (credenciales ya en Vercel env)
- Futuros: ERP general, CRM, ticketing IT, otros

Apps internas que consumen y escriben (presente y futuro):

- **MovimientOS** — logística movilizaciones (producción, 17 daily users)
- **HumanOS** — RRHH self-service (en construcción)
- **Aspiración**: varios mini-apps siguiendo el patrón — digitalizar formularios + agregar valor con APIs/data (mantenimiento, despacho, inspecciones, compras, cotizaciones)

Sin disciplina MDM, los problemas inevitables a corto plazo:

- Una persona con datos contradictorios entre PayDay y `hr.people` — ¿cuál gana?
- Un equipo con `equipment_id` distinto en B2W, Spectrum y `public.equipment` — sin link no se cruza data
- ETL ad-hoc sin staging — un import malformado corrompe el golden record
- Analytics cross-system imposibles porque las entidades no se relacionan
- Auditoría incompleta — no se sabe quién/cuándo/qué sistema introdujo un dato

Este doc previene esos problemas.

---

## Estrategia: MDM gradual, no enterprise-grade desde día 1

ICONSA tiene **1 dev (Jaime)** haciendo full-stack + data engineering. Adopt MDM enterprise-grade hoy (Informatica, Reltio, tablas mdm.* completas, ETL framework completo) sería paralisis-by-analysis sin caso de uso real validando cada decisión.

**Estrategia adoptada**:

1. **Documentar principios desde día 1** (este doc) — sirve como spec/contract para todo trabajo subsiguiente
2. **Aplicar gradualmente** — empezar con guard rails operativos (`docs/05-BUSINESS-RULES.md` R22, hook `PreToolUse`) que previenen el peor daño
3. **Build canonical schemas a medida que cada integration real lo justifica** — Skydata primera, después Spectrum, después PayDay
4. **Aceptar deuda técnica documentada en lugar de over-engineering ahora** — ver ADRs en `docs/08-ADRs.md` con triggers explícitos para reabrir

**Deuda técnica reconocida al momento de escritura** (sesión 2026-05-25):

- **Person golden record duplicado** entre `public.people` (MovimientOS) y `hr.people` (HumanOS). Refactor a `mdm.people` postergado hasta Spectrum SDK integration. Ver ADR específico en `docs/08-ADRs.md`.
- **Equipment golden record** vive en `public.equipment` (MovimientOS only por ahora). Cuando Spectrum SDK master data llegue, esto migra a `mdm.equipment` o equivalente.
- **No existe schema `mdm.*` todavía** — se crea cuando primera integration external lo justifique
- **No existe schema `etl.*` todavía** — se crea con primera integration (Skydata GPS)

Este reconocimiento NO es excusa para hacer trabajo sloppy en HumanOS. HumanOS schema sí cumple MDM principles internamente:
- `hr.people` es golden record DE HUMANOS exclusivamente
- `hr.people_external_ids` table existe ya preparada para Spectrum/PayDay/B2W cross-reference
- `_source` column en `hr.people` con CHECK constraint
- `audit.changes` robusto con triggers
- COMMENT ON obligatorio en cada tabla
- RLS en cada tabla

Esto deja HumanOS **MDM-ready** sin forzar resolución de deuda Person ahora.

---

## Los 10 pilares

### 1. Golden Records

Para cada **entidad empresarial real** (Person, Equipment, Project, Vendor, Customer, Cost Code), existe **una sola fila canónica** en la BD. Esa fila es el "golden record" — la versión única, autoritativa, libre de contradicciones.

**Aplicación ICONSA**:

| Entidad real | Golden record (tabla canónica) | Schema |
|---|---|---|
| Person (empleado) | `hr.people` | hr |
| Equipment | `public.equipment` | public (MovimientOS) — migrable a `mdm.equipment` |
| Project / Obra | `public.projects` o `mdm.projects` (TBD) | public/mdm |
| Vendor | `public.vendors` o `mdm.vendors` (TBD) | public/mdm |
| Cost Code | `public.cost_codes` o `mdm.cost_codes` (TBD) | public/mdm |
| Driver / Conductor | `hr.people` con `app_role='campo'` y `license_*` poblado | hr |

**Anti-pattern prohibido**: duplicar entidad en múltiples tablas. Si Spectrum tiene su tabla "Employee" y MovimientOS tiene "people", **no son dos entidades** — son views distintas de la misma `Person` golden record.

### 2. Cross-Reference Identifiers (External IDs)

Cada entidad canónica tiene:

- **`id` (uuid)** — identificador interno, generado por la BD, inmutable, único universalmente
- **`{entity}_external_ids` (tabla relacionada)** — mapping de IDs por sistema externo

Esquema canónico:

```sql
CREATE TABLE hr.people_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES hr.people(id) ON DELETE CASCADE,
  system text NOT NULL CHECK (system IN ('payday', 'b2w', 'spectrum', 'projectsight', 'skydata', 'manual')),
  external_id text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system, external_id),
  UNIQUE (person_id, system)
);

COMMENT ON TABLE hr.people_external_ids IS
  'Cross-reference de IDs externos por persona. Permite ETL bidireccional con PayDay, Trimble B2W/Spectrum/ProjectSight, Skydata. Una persona NO puede tener dos IDs en el mismo sistema (UNIQUE person_id, system). Un external_id NO puede asociarse a dos personas (UNIQUE system, external_id).';
```

Patrón replicable para `equipment_external_ids`, `projects_external_ids`, etc.

### 3. System of Record (SOR) Matrix

**Para cada campo de cada entidad canónica, un solo sistema es la autoridad.**

Ejemplo `hr.people`:

| Campo | SOR | Consumers (read-only) |
|---|---|---|
| `cedula` | `hr.people` (manual onboarding) | PayDay, Spectrum |
| `name` | `hr.people` | PayDay, Spectrum, B2W |
| `email` | `hr.people` | todos |
| `salary` | PayDay | `hr.people` (replica para display, NO se edita aquí) |
| `position` | `hr.people` | PayDay (replica con código interno) |
| `hire_date` | PayDay | `hr.people` (replica) |
| `vacation_balance` | PayDay (calculado por PayDay) | `hr.people` (replica para self-service) |
| `current_assignment` | B2W | `hr.people.current_project_id` (replica) |

La matriz completa por entidad vive en `12-SOR-MATRIX.md`.

**Anti-pattern prohibido**: dos sistemas considerándose SOR del mismo campo. Sin SOR matrix, conflict resolution es ad-hoc y trae bugs operativos.

### 4. Bitemporal Audit Trail

Cada cambio a una tabla canónica genera entry en `audit.changes` con:

- **`recorded_at`** (transaction time) — cuándo se grabó el cambio en la BD
- **`valid_from` / `valid_to`** (valid time) — cuándo el dato es/fue verdadero en el mundo real
- **`changed_by`** — `auth.uid()` del usuario que hizo el cambio
- **`source_system`** — `'manual'`, `'payday'`, `'b2w'`, `'spectrum'`, `'projectsight'`, `'skydata'`, `'etl-batch'`
- **`entity_type` + `entity_id` + `field` + `old_value` + `new_value`**

Esto permite responder: "¿Qué valor tenía la salary de Hector Pino el 15 de marzo, según PayDay, y cuándo lo registramos?"

Esquema canónico:

```sql
CREATE TABLE audit.changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,             -- 'hr.people', 'public.equipment', etc.
  entity_id uuid NOT NULL,
  field text NOT NULL,                   -- 'salary', 'position', 'cedula', etc.
  old_value jsonb,
  new_value jsonb,
  source_system text NOT NULL DEFAULT 'manual',
  changed_by uuid REFERENCES auth.users(id),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,                  -- NULL = vigente
  recorded_at timestamptz NOT NULL DEFAULT now(),
  context jsonb                          -- metadata adicional (etl_batch_id, etc.)
);

CREATE INDEX idx_audit_changes_entity ON audit.changes (entity_type, entity_id, recorded_at DESC);
CREATE INDEX idx_audit_changes_source ON audit.changes (source_system, recorded_at DESC);
```

Triggers automáticos en cada tabla canónica populan `audit.changes`. NO entries manuales.

### 5. Slowly Changing Dimensions (SCD)

Para campos de entidades que cambian con tiempo y donde el histórico importa:

- **SCD Type 1** (overwrite, no historia) — para campos cosméticos sin valor histórico (color preferencia, notification preferences)
- **SCD Type 2** (nueva fila por cada cambio) — para campos importantes con vigencia temporal (employment record, position, salary tier)
- **SCD Type 3** (columna `previous_value`) — uso raro
- **SCD Type 6** (combo 1+2+3) — para entidades críticas con auditing exhaustivo

**Aplicación ICONSA**: `hr.employments` ya es SCD Type 2 (cada empleo es una fila con `start_date`, `end_date`, `is_current`). Patrón a replicar para `equipment_assignments`, `position_history`, `salary_history` cuando sea relevante.

### 6. ETL Staging Pattern

Data inbound desde API externa **NUNCA escribe directo a tablas canónicas**. Pasa por staging:

```
External API → etl.{system}_{entity}_staging → validation → transform → merge → canonical table
```

Schema `etl.*` con convención:

```sql
CREATE TABLE etl.payday_employees_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,                -- agrupa rows del mismo import
  received_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL,            -- payload exacto recibido del API
  processed_at timestamptz,              -- NULL = pendiente
  error text,                            -- NULL = OK
  resulting_action text,                 -- 'inserted', 'updated', 'no_change', 'skipped'
  resulting_entity_id uuid               -- person_id resultante (si aplica)
);

CREATE INDEX idx_payday_staging_batch ON etl.payday_employees_staging (batch_id);
CREATE INDEX idx_payday_staging_pending ON etl.payday_employees_staging (processed_at) WHERE processed_at IS NULL;
```

**Beneficios del staging**:
- Si import malo se descubre después, audit completo del raw_payload
- Retry de imports fallidos sin perder data original
- Visibilidad operativa: cuántos rows pendientes, cuántos con error
- Idempotencia: re-corre el batch si algo falló sin duplicar inserts

### 7. Conflict Resolution Rules

Cuando dos sistemas reportan valores diferentes para el mismo campo, **la regla es declarativa, no ad-hoc**.

Tabla `mdm.field_resolution_rules`:

```sql
CREATE TABLE mdm.field_resolution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,                -- 'hr.people'
  field text NOT NULL,                       -- 'salary'
  strategy text NOT NULL,                    -- 'sor_wins', 'most_recent', 'manual_override', 'merge'
  sor_system text,                           -- 'payday' si strategy='sor_wins'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, field)
);

INSERT INTO mdm.field_resolution_rules (entity_type, field, strategy, sor_system, notes) VALUES
  ('hr.people', 'salary', 'sor_wins', 'payday', 'PayDay es SOR de nómina'),
  ('hr.people', 'phone', 'most_recent', NULL, 'Self-service del empleado tiene preferencia sobre PayDay'),
  ('hr.people', 'cedula', 'manual_override', NULL, 'Onboarding manual valida cedula contra DGI antes de aceptar'),
  ('public.equipment', 'serial_number', 'sor_wins', 'spectrum', 'Spectrum es SOR de inventario equipos');
```

ETL queries esta tabla antes de hacer merge: "¿Qué hago si hay conflict?"

### 8. Data Lineage (source column)

Cada tabla canónica tiene columna `_source text` que registra de qué sistema vino el dato actual:

```sql
ALTER TABLE hr.people ADD COLUMN _source text NOT NULL DEFAULT 'manual'
  CHECK (_source IN ('manual', 'payday', 'b2w', 'spectrum', 'projectsight', 'skydata', 'etl-batch'));

COMMENT ON COLUMN hr.people._source IS
  'Sistema que originó este registro. Valor manual para creación via UI HumanOS. Valor sistema para ETL inbound. Crítico para debugging y compliance.';
```

Combinado con `audit.changes.source_system`, da lineage completo.

### 9. Schema Governance

**Naming conventions** (enforced por hooks y skill `iconsa-mdm-integrity-check`):

- Schemas: lowercase singular para módulos (`hr`, `requests`, `audit`, `mdm`, `etl`). NO plurales (`hrs`).
- Tablas: lowercase plural snake_case (`hr.people`, `requests.tickets`, `etl.payday_employees_staging`)
- Columnas: lowercase snake_case
- Foreign keys: `<referenced_table_singular>_id` (`person_id`, `equipment_id`)
- Booleans: prefijo `is_` o `has_` (`is_active`, `has_license`)
- Timestamps: sufijo `_at` (`created_at`, `processed_at`)
- Dates: sufijo `_date` (`hire_date`, `license_expiry`)
- JSONB: sufijo `_data` o nombre descriptivo (`raw_payload`, `notification_preferences`)
- Indexes: `idx_<table>_<columns>` (`idx_audit_changes_entity`)
- Constraints: `<table>_<col>_<type>` (`people_email_check`, `tickets_status_check`)

**Constraint patterns obligatorios**:

- Toda FK con `ON DELETE` explícito (`CASCADE`, `RESTRICT`, `SET NULL`) — no implicit
- Toda `text` con CHECK o longitud razonable
- Toda `timestamptz` (no `timestamp` raw — issues de timezone)
- Toda PK uuid `DEFAULT gen_random_uuid()`

**COMMENT obligatorio**:

- Toda tabla nueva: `COMMENT ON TABLE` explicando propósito y SOR
- Toda columna no obvia: `COMMENT ON COLUMN` (qué es, units, source)
- Sin esto, Supabase Dashboard queda inutilizable

### 10. Multi-App RLS Isolation

Ver ADR sobre Opción B (`docs/08-ADRs.md`). Resumen:

- Una sola `auth.users`, compartida
- `auth.users.app_metadata.allowed_apps text[]` declara apps accesibles por user
- Middleware de cada app verifica `allowed_apps` antes de permitir login
- RLS policies en tablas pueden referenciar `auth.jwt()->'app_metadata'->'allowed_apps'`
- Destructive ops en `auth.users` REQUIEREN filter por `allowed_apps` (R22 en `05-BUSINESS-RULES.md`)

---

## Reglas operativas inviolables

1. **Toda integration de sistema externo nuevo requiere**:
   - ADR en `docs/adr/` documentando decisión
   - Entry en `13-INTEGRATIONS-INDEX.md`
   - Actualización de `12-SOR-MATRIX.md` con campos owned por ese sistema
   - Schema `etl.{system}_*` con staging tables
   - Tabla `{entity}_external_ids` actualizada con nuevo `system` value en CHECK constraint

2. **Toda tabla canónica nueva requiere**:
   - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - `created_at timestamptz NOT NULL DEFAULT now()`
   - `updated_at timestamptz` con trigger `touch_updated_at`
   - `_source text NOT NULL DEFAULT 'manual'` con CHECK
   - RLS habilitada + al menos 1 policy
   - COMMENT ON TABLE + COMMENT ON COLUMN
   - Si entidad cross-app: external_ids table relacionada
   - Triggers que populen `audit.changes` para cada UPDATE/DELETE

3. **Toda destructive op (DELETE, masive UPDATE) requiere**:
   - Snapshot en `backup.*` schema antes
   - Filter explícito (no `WHERE 1=1`)
   - SELECT preview de rows afectadas presentado al humano antes de ejecutar
   - Aprobación explícita post-preview

4. **Toda inbound API data requiere**:
   - Staging table primero
   - Validation antes de merge
   - Batch_id para tracking
   - Idempotencia (re-corre sin duplicar)

---

## Cuándo este doc se actualiza

- Nuevos pilares descubiertos (no inventarlos sin razón — adoptar de estándar industrial)
- Nueva entidad canónica agregada (update tabla de Pilar 1)
- Nuevo sistema externo integrado (update Pilar 2 + 3, agregar a `13-INTEGRATIONS-INDEX.md`)
- Lección operativa documentable

## Cuándo migrar a `iconsa-knowledge` wiki

Cuando el repo `iconsa-knowledge` (mencionado en project instructions) sea creado. Este doc es **foundational ICONSA**, no específico de HumanOS. Su lugar natural es la wiki empresarial donde dev de cualquier app interno lo consulta.

Mientras tanto vive en `human-os/docs/` como referencia operativa.
