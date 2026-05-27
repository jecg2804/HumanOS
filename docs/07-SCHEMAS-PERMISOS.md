# 07-SCHEMAS-PERMISOS.md — Schemas, RLS, permisos

**Última actualización**: 2026-05-27 (post-migrations 015-025, counts updated)

---

## Schemas state (post-migrations)

| Schema | Tablas | Writable HumanOS? |
|---|---|---|
| `public.*` | 44 | ❌ PROHIBIDO (R1) — MovimientOS prod |
| `payroll.*` | 9 | ❌ PROHIBIDO (R1) — sistema planillas |
| `humanos.*` | 5 | ❌ PROHIBIDO (R1) — demo legacy v1 |
| `hr.*` | 12 (incl invite_codes + user_settings nuevas) | ✅ |
| `requests.*` | 9 | ✅ |
| `docs.*` | 11 | ✅ |
| `workflows.*` | 4 | ✅ (v2 module) |
| `performance.*` | 7 | ✅ (v2 module) |
| `learning.*` | 8 | ✅ (v2 module) |
| `audit.*` | 1 | ✅ append-only |
| `notifications.*` | 1 | ✅ |
| `files.*` | 1 (`uploads` polimórfica) | ✅ |
| `auth.*` | (Supabase managed) | ⚠️ con cuidado (R22) |
| Futuro: `mdm.*`, `etl.*`, `backup.*` | - | ✅ cuando integration justifique |

**Total HumanOS v2: 54 tablas con ~94 RLS policies activas**.

---

## RLS strict (R2)

Toda tabla nueva en schemas HumanOS DEBE:

```sql
CREATE TABLE schema.tabla (...);

ALTER TABLE schema.tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name" ON schema.tabla
  FOR SELECT TO authenticated
  USING (<condition>);
-- + INSERT/UPDATE/DELETE policies según ownership
```

---

## Helper functions disponibles (NO redefinir)

| Function | Returns | Uso |
|---|---|---|
| `hr.current_person_id()` | uuid | person_id de auth.uid() actual |
| `hr.current_app_role()` | text | employee \| hr_admin \| president \| admin (nuevo migration 025) |
| `hr.is_hr_admin()` | boolean | true si app_role='hr_admin' |
| `hr.is_president_or_admin()` | boolean | true si app_role IN ('president','admin') |
| `hr.is_supervisor_of(person_id uuid)` | boolean | true si auth.uid() es supervisor_id de person_id |
| `hr.has_direct_reports()` | boolean | true si auth.uid() tiene al menos un employment.supervisor_id apuntando a la persona (nuevo migration 025) |
| `requests.can_view_ticket(ticket_id uuid)` | boolean | true si auth.uid() es requester, supervisor del requester, hr_admin, o president |

---

## CHECK constraints críticos

| Tabla | Columna | CHECK |
|---|---|---|
| `hr.employments` | `app_role` | `IN ('employee', 'hr_admin', 'president', 'admin')` — 4 valores (sin 'supervisor') |
| `hr.invite_codes` | `code` | `length(code) = 8` |
| `hr.invite_codes` | `invite_method` | `IN ('email', 'whatsapp', 'paper', 'in_person')` |
| `hr.user_settings` | `language` | `IN ('es', 'en')` |
| `files.uploads` | `category` | `IS NULL OR IN ('attachment','evidence','signed_document','avatar','profile_photo','certificate_scan','payslip_proof','original_paper_form','medical_document','contract_document','incident_photo','identification_document','other')` |
| `requests.tickets` | `status` | `IN ('Borrador','Enviada','En_Revision','Devuelta_Modificacion','Aprobada','Rechazada','Completada','Cancelada')` |

---

## SCD-2 pattern en `hr.employments` (R12)

```sql
-- Una sola is_current = TRUE por persona
CREATE UNIQUE INDEX one_current_employment_per_person 
ON hr.employments (person_id) WHERE is_current = TRUE;

-- Cambios críticos (position, supervisor, department, salary, app_role):
-- 1. Cerrar viejo
UPDATE hr.employments SET valid_to = CURRENT_DATE WHERE id = <id_actual>;

-- 2. Insertar nuevo (preserva history)
INSERT INTO hr.employments (person_id, ..., valid_from, created_from, notes)
VALUES (..., CURRENT_DATE, '<contexto_cambio>', '<razón_humana>');
```

`is_current` es generated column: `(valid_to IS NULL OR valid_to > CURRENT_DATE)`.

---

## Tablas nuevas migration 015-025

### `hr.invite_codes` (migration 015)

```sql
- id uuid PK
- code text UNIQUE NOT NULL CHECK(length=8)
- person_id uuid FK hr.people (cascade)
- generated_by uuid FK hr.people
- generated_at, expires_at, consumed_at timestamptz
- consumed_by_auth_id uuid FK auth.users
- invite_method text CHECK
- delivery_target, notes text
+ 2 indexes (person_id, code WHERE unconsumed)
+ RLS + 3 policies (select/insert/update solo hr_admin)
+ 5 COMMENTs
```

### `hr.user_settings` (migration 022)

```sql
- id uuid PK
- person_id uuid UNIQUE FK hr.people (cascade)
- notification_email_enabled, notification_in_app_enabled boolean DEFAULT true
- notification_whatsapp_enabled, notification_sms_enabled boolean DEFAULT false (v1.1)
- language text DEFAULT 'es' CHECK
- timezone text DEFAULT 'America/Panama'
- dashboard_layout, preferences jsonb
- two_factor_enabled boolean DEFAULT false
- created_at, updated_at timestamptz
+ RLS + 3 policies (own or hr_admin)
+ 370 rows backfilled
```

### `requests.tickets` columnas agregadas

Migration 019 (R8):
- `received_by uuid FK hr.people`
- `received_at timestamptz`
- `processed_by uuid FK hr.people`
- `processed_at timestamptz`

Migration 021 (R25):
- `manual_entry boolean NOT NULL DEFAULT false`
- `created_by_hr_admin uuid FK hr.people`
+ index partial WHERE manual_entry=true

### `files.uploads` (existente, constraint nuevo)

Migration 024: CHECK constraint en `category` con 13 valores válidos.

Estructura polimórfica:
- `entity_schema text` (ej: 'requests')
- `entity_table text` (ej: 'tickets')
- `entity_id uuid` (FK lógica al row específico)
- `category text` CHECK
- `path text` (storage)
- `mime_type, size_bytes` 
- `uploaded_by uuid FK hr.people`

---

## auth.users (R22 critical)

**Compartido entre apps**. NUNCA destructive ops sin filtro `allowed_apps`:

```sql
-- ❌ PROHIBIDO
DELETE FROM auth.users;

-- ✅ CORRECTO
DELETE FROM auth.users
WHERE raw_app_meta_data->'allowed_apps' @> '["humanOS"]'::jsonb
  AND NOT (raw_app_meta_data->'allowed_apps' @> '["movimientOS"]'::jsonb);
```

Encoding nota:
- **SQL directo** (Supabase SQL Editor, execute_sql, psql): `raw_app_meta_data`
- **RLS policies / Supabase JS / API**: `app_metadata`

Same data, distinto access pattern.

---

## Estado allowed_apps actual

- 48 auth.users totales
- 48 con `allowed_apps = ["movimientOS"]` (todos los actuales)
- 0 con `humanOS` (se incrementará al usar invite codes bootstrap)

---

## Convenciones RLS HumanOS

| Pattern | Cuándo usar |
|---|---|
| `USING (person_id = hr.current_person_id())` | Tabla con `person_id` dueño |
| `USING (hr.is_hr_admin())` | Tabla operacional de RRHH |
| `USING (person_id = hr.current_person_id() OR hr.is_hr_admin())` | Tabla con ownership + admin override |
| `USING (requests.can_view_ticket(ticket_id))` | Tabla relacionada a ticket (timeline, attachments) |
| `USING (hr.is_president_or_admin())` | Tabla configuración admin/president |

---

## Anti-patterns RLS

- ❌ Policy sin `TO authenticated` (default to all)
- ❌ Policy con `USING (true)` (sin filtro real)
- ❌ Policy sin WITH CHECK en INSERT/UPDATE
- ❌ Helper function sin `SECURITY DEFINER` + `SET search_path = ''`
- ❌ Helper function que llama `auth.uid()` directamente sin función intermediaria

---

## auth_id ↔ person_id vinculación

`hr.people.auth_id uuid FK auth.users(id)` — vinculación creada vía sign-up wizard.

Helper `hr.current_person_id()`:
```sql
SELECT id FROM hr.people WHERE auth_id = auth.uid() LIMIT 1;
```

Si `auth_id IS NULL` (persona en BD sin auth.user todavía): `hr.current_person_id()` retorna NULL → policies que dependen de `person_id` fallan → user no puede acceder a UI. Sign-up obligatorio.
