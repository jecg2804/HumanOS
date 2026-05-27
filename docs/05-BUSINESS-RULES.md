# 05-BUSINESS-RULES.md — Reglas de negocio críticas (R1-R26)

**Última actualización**: sesión 2026-05-27 (R4 corregida $250 NO bloqueante + R11 modes finales + R16 status correctos + R22 nota raw_app_meta_data + R23 encoding + R24 modes JSONB + R25 manual entry sin attach column + **R26 SOP-driven chains**)

**Owner update**: Claude Chat. Estas reglas son CRÍTICAS — Code las debe seguir o sistema produce data incorrecta con consecuencias legales/regulatorias.

**Audiencia**: Claude Code primary. Referenciado desde `CLAUDE.md` raíz vía `@imports`.

---

## R1 — Schemas prohibidos

**CRITICAL. Hook `PreToolUse` debe bloquear cualquier intento.**

Code NUNCA modifica:
- `public.*` (44 tablas — MovimientOS production)
- `payroll.*` (9 tablas — sistema planillas)
- `humanos.*` (5 tablas — demo legacy v1)

Code SÍ modifica (DDL y DML):
- `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*`

Foundational (cuando integration real lo justifique):
- `mdm.*`, `etl.*`, `backup.*`

---

## R2 — RLS obligatorio en toda tabla nueva

Cada `CREATE TABLE` en schemas HumanOS DEBE incluir:

```sql
ALTER TABLE schema.tabla ENABLE ROW LEVEL SECURITY;
-- + al menos 1 policy SELECT
-- + policies INSERT/UPDATE/DELETE según ownership
```

Helper functions disponibles (NO redefinir):
- `hr.current_person_id() → uuid`
- `hr.current_app_role() → text` (employee | hr_admin | president | admin)
- `hr.is_hr_admin() → boolean`
- `hr.is_president_or_admin() → boolean`
- `hr.is_supervisor_of(person_id uuid) → boolean`
- `hr.has_direct_reports() → boolean`
- `requests.can_view_ticket(ticket_id uuid) → boolean`

---

## R3 — COMMENT ON TABLE/COLUMN obligatorio

Cada `CREATE TABLE` y `ALTER TABLE ADD COLUMN` DEBE seguirse de `COMMENT ON TABLE` y `COMMENT ON COLUMN` para columnas no obvias.

---

## R4 — Regla del préstamo $250 (corregida)

**Source**: `IC-RH-D-02 Condiciones especiales solicitud préstamo` + `IC-RH-PO-05 §5.5`.

**$250 es CAP operacional, NO threshold bloqueante**:

1. **$250 es monto máximo sugerido**, NO threshold de escalation
2. Montos superiores pueden ser evaluados por Gerencia General caso por caso
3. **TODO préstamo va al chain completo** (supervisor + hr_admin + president) per PO-05 §5.5, independiente del monto
4. Préstamos son para **necesidades**, no deudas
5. Descuentos bisemanales dependen de posición: Ayudante desde $25, otros desde $40+
6. Si liquidación: saldo se descuenta de pago final
7. Préstamo anterior pendiente: evalúa nivel endeudamiento
8. ICONSA **NO cobra intereses**

**Aplicación HumanOS**: `mode: parallel` con steps supervisor + hr_admin + president, visibility universal, TODOS notificados día 0. SLA 72h.

ChainResolver NO incluye lógica de threshold para PRESTAMO. Content educativo D-02 mostrado inline en `/solicitudes/nueva/PRESTAMO`.

---

## R5 — No self-approval

**CRITICAL. Constraint a nivel BD + validación en ApprovalEngine.**

Aprobador NO puede aprobar su propia solicitud:
- Si Samantha (hr_admin) hace una solicitud, otra hr_admin la procesa
- Si Rodrigo (president) hace una solicitud que requiere president, queda pendiente con flag manual o se omite step president
- Si supervisor hace una solicitud (es employee), su jefe (otro supervisor) aprueba

Constraint propuesto en `requests.approvals`:
```sql
CHECK (approver_id != (SELECT requester_id FROM requests.tickets WHERE id = ticket_id))
```

---

## R6 — Fallback supervisor NULL (paralelo siempre)

Cuando empleado tiene `selected_supervisor_id = NULL` o supervisor no responde dentro del SLA:

→ **hr_admin puede actuar solo desde día 0** (paralelo significa todos pueden actuar independiente)

NO se queda stuck por supervisor. hr_admin con la solicitud ve el ticket y puede:
- Aprobar/rechazar como hr_admin step
- Usar F38 imprimir PDF + entregar offline al supervisor + foto firmada vía F32

R6 obsoleta como "fallback" — es comportamiento normal del mode `parallel`.

---

## R7 — Sello de aprobación con metadata

`StampEngine` genera:

```
"Aprobado por [full_name], [fecha YYYY-MM-DD], [hora HH:MM:SS]"
```

Ejemplo: `"Aprobado por Samantha Kosmas, 2026-05-30, 14:23:45"`

Adicional `stamp_data` JSONB:

```json
{
  "signer_id": "uuid",
  "signer_name": "Samantha Kosmas",
  "signer_role": "hr_admin",
  "signed_at": "2026-05-30T14:23:45-05:00",
  "ip": "192.168.x.x",
  "user_agent": "..."
}
```

Para audit legal. NO firma digital legal en MVP (Documenso v1.1).

---

## R8 — F-05-01 dos pasos en RRHH

SOP `IC-RH-F-05-01` define dos pasos dentro de RRHH:

1. **Recibido por RRHH** — un hr_admin marca recibido
2. **Procesado por Asistente Planillas** — otro hr_admin marca procesado

`requests.tickets` trackea (columnas migration 019):
- `received_by uuid`, `received_at timestamptz`
- `processed_by uuid`, `processed_at timestamptz`

Solo aplica a ACCION_PERSONAL y sus 6 sub-tipos.

---

## R9 — Back-and-forth simple (3 opciones aprobador)

Aprobador tiene 3 opciones únicas:

1. **Aprobar** → continúa chain (o Completa)
2. **Rechazar con observaciones** (campo obligatorio) → estado Rechazada, fin
3. **Modificar valor con razón** → estado `Devuelta_Modificacion`, vuelve al solicitante

Solicitante en `Devuelta_Modificacion`:
- **Aceptar modificación** → vuelve a chain con valor ajustado
- **Rechazar modificación** → cancela solicitud

`requests.revisions` captura cada modificación.

---

## R10 — Concepto único de usuario

NO existen "tipos de cuenta" diferentes. Es contextual:

- Empleado X es `employee` cuando crea su propia solicitud
- Empleado X es "supervisor" (no app_role separado, contextual) cuando aprueba solicitud de uno de sus reportes
- Si X es seleccionado como supervisor en un ticket específico via `selected_supervisor_id`, aprueba ese ticket

UI `/solicitudes` tiene 2 pestañas:
- **"Mis solicitudes"** — donde usuario es `requester_id`
- **"Por aprobar"** — donde usuario aparece en `requests.approvals.approver_id` (contextual)

---

## R11 — Mapping tipos → mode (per SOP)

`requests.types.approval_chain_template` JSONB con estructura `{mode, visibility, steps[]}`.

### Modes finales (3 + parent_only)

| Mode | Comportamiento |
|---|---|
| `parallel` | Todos los stakeholders notificados día 0. Aprobada cuando TODOS los required = approved. Rechazada si ALGUNO = rejected |
| `direct_hr_admin` | Sin chain, directo a cualquier hr_admin |
| `any_of_hr` | Idéntico a direct (semantic distinct para documentos) |
| `parent_only` | Tipo parent sin chain real, sub-tipos llevan el chain |

### Resolvers

- `selected_supervisor_id` — usa `requests.tickets.selected_supervisor_id` (override del solicitante), fallback `hr.employments.supervisor_id`
- `any_hr_admin` — cualquier persona con `app_role = 'hr_admin'`
- `president_user` — persona con `app_role = 'president'` (hoy Rodrigo único)

### Mapping completo

| Tipo | Mode | Steps |
|---|---|---|
| PRESTAMO | parallel | supervisor + hr_admin + president (SLA 72h) |
| VACACIONES | parallel | supervisor + hr_admin + president (SLA 72h) |
| ACCION_AUMENTO_SALARIO | parallel | supervisor + hr_admin + president (SLA 120h) |
| ACCION_DESPIDO | parallel | supervisor + hr_admin + president (SLA 120h) |
| ACCION_LIQUIDACION | parallel | supervisor + hr_admin + president (SLA 120h) |
| ACCION_HORAS_EXTRAS | parallel | supervisor + hr_admin + president (SLA 120h) |
| ACCION_PERMISOS | parallel | supervisor + hr_admin + president (SLA 120h) |
| ACCION_DESCUENTO | parallel | supervisor + hr_admin + president (SLA 120h) |
| PERMISO horas | parallel | supervisor + hr_admin (SLA 48h) |
| RECLAMO_PAGO | parallel | supervisor + hr_admin (SLA 48h per PO-05 §5.11) |
| CAPACITACION | parallel | supervisor + hr_admin (SLA 168h) |
| SOLICITUD_EPP | parallel | supervisor + hr_admin (SLA 72h) |
| REPORTE_INCIDENTE | parallel | supervisor + hr_admin (SLA 24h) |
| ACTUALIZACION_DATOS | direct_hr_admin | hr_admin (SLA 48h) |
| CAMBIO_CUENTA_BANCO | direct_hr_admin | hr_admin (SLA 48h) |
| CAMBIO_DEPENDIENTES | direct_hr_admin | hr_admin (SLA 72h) |
| REFERENCIA_LABORAL | direct_hr_admin (RRHH inicia) | hr_admin (SLA 120h) |
| ENTREVISTA_SALIDA | direct_hr_admin (RRHH inicia) | hr_admin (SLA 72h) |
| CARTA_TRABAJO | any_of_hr | hr_admin (SLA 48h) |
| CERTIFICACION_LABORAL | any_of_hr | hr_admin (SLA 72h) |
| CONSTANCIA_NO_ADEUDO | any_of_hr | hr_admin (SLA 72h) |
| COPIA_CONTRATO | any_of_hr | hr_admin (SLA 48h) |
| COPIA_COLILLA | any_of_hr | hr_admin (SLA 48h) |
| ACCION_PERSONAL | parent_only | - |

`allow_supervisor_override = true` en todos los tipos con step supervisor.

---

## R12 — SCD-2 en employments

`hr.employments` es Slowly Changing Dimension Type 2:

- Una sola `is_current = TRUE` por persona (constraint + generated column)
- Cambios de puesto, supervisor, departamento, salary, **app_role** → cerrar viejo (`valid_to = CURRENT_DATE`) + crear nuevo row
- NO UPDATE in-place de columnas críticas

Constraint:
```sql
CREATE UNIQUE INDEX one_current_employment_per_person 
ON hr.employments (person_id) WHERE is_current = TRUE;
```

---

## R13 — Documentos sensibles RLS estricta

`hr.medical_info` y `hr.personal_documents` son SENSITIVE máxima:

- SELECT: SOLO empleado dueño + hr_admin
- INSERT/UPDATE: SOLO empleado dueño + hr_admin
- DELETE: SOLO hr_admin

NO visible para supervisores. NO visible para directorio.

---

## R14 — Auth strategy via invite codes

- `hr.invite_codes` tabla (creada migration 015)
- `hr.people.auth_id` NULL inicialmente
- hr_admin genera invite vía `/admin/empleados/[id]/invitar` (o auto al crear empleado nuevo)
- Empleado completa `/onboarding/[invite_code]` wizard 10 steps
- Triple validación: invite_code + national_id + employee_code (opcional)
- Al completar: crea auth.user (email O phone) + vincula `hr.people.auth_id` + marca invite consumed + popula `raw_app_meta_data.allowed_apps`
- **Multi-app detection**: si existe auth.user con `national_id` match Y `allowed_apps` contiene otra app → append `humanOS` al array
- Bootstrap: 6 invite codes generados (Samantha, Rocío, Milagros, Jerelyn, Rodrigo, Javier Ferrer VP)

---

## R15 — Lenguaje del sistema

Todo UI en **español neutro Panamá**:
- Botones, labels, placeholders, mensajes, notificaciones, emails
- NUNCA voseo argentino ("vos", "tenés", "podés", "querés", imperativos con tilde aguda)
- Usar: tú, tienes, puedes, quieres, registra, manda, ejecuta, verifica

**Código**: nombres variables/funciones en inglés. Comentarios técnicos inglés. Business logic comments español OK si refleja SOP.

---

## R16 — Estados ticket

`requests.tickets.status` CHECK constraint con valores:

| Estado | Significado |
|---|---|
| `Borrador` | Solicitante guardando, no enviado |
| `Enviada` | Submitted, primera notificación a stakeholders |
| `En_Revision` | Algún step approved/pending, otros pending |
| `Devuelta_Modificacion` | Aprobador modificó valor, espera aceptación solicitante |
| `Aprobada` | Todos los steps required = approved |
| `Rechazada` | Algún step rechazó con observaciones |
| `Completada` | Aprobada Y procesada (caso ACCION_PERSONAL con dos pasos RRHH) |
| `Cancelada` | Solicitante canceló |

---

## R17 — Formato request_number

`HUM-{YYYY}-{NNNN}` con reset anual. Generación atómica vía `requests.sequences`:

```sql
UPDATE requests.sequences 
SET current_value = current_value + 1 
WHERE seq_type = 'ticket_number'
RETURNING current_value;
```

Tabla `requests.sequences` ya existe.

---

## R18 — Notifications fire-and-forget

`NotificationEngine` NUNCA bloquea la acción del usuario. Si falla email/in-app, logea en `notifications.outbox` con `status='failed'` pero la acción procede.

Worker async lee `notifications.outbox WHERE status='pending'` y despacha. Retries con backoff exponencial (max_attempts default 3).

Usuario configura preferencia en `/settings` (F33, tabla `hr.user_settings`): email + in_app default. WhatsApp + SMS v1.1.

---

## R19 — F-04-01 integrada a perfil (NO ticket)

`IC-RH-F-04-01 Información de Emergencia del Empleado` NO es ticket. Es data del expediente:
- `hr.medical_info`: blood_type, allergies, medications, css_number, aseguradora
- `hr.contacts` con `contact_type='emergency'`: contact_name, relationship, phone

Llenado en onboarding wizard Pasos 6-7. Editable después desde `/perfil`.

---

## R20 — Forms categoría D (NO HumanOS)

NO se implementan:

| Form | Razón |
|---|---|
| F-00-01 Alcoholímetro | SSOA / Seguridad |
| F-00-02 Matriz PNC | Calidad |
| F-00-03 Matriz NC | Calidad |
| F-00-04 Entrega Combustible | Logística (MovimientOS) |

---

## R21 — Forms categoría C (otro schema, no requests)

Son HumanOS pero NO tickets. Otros schemas:

| Form | Schema destino | Estado |
|---|---|---|
| F-03-03, F-03-04 Evaluaciones | `performance.reviews` | v2 |
| F-02-04 Lista Asistencia | `learning.attendance` | v2 |
| F-02-05 Eval post-entrenamiento | `learning.assessments` | v2 |
| F-02-07 Firma Inducción | `docs.acknowledgments` durante onboarding | MVP parcial |
| F-05-04 Memo Amonestación | `hr.disciplinary_actions` (a crear) | v2 |

---

## R22 — Operaciones destructivas sobre `auth.users`

**CRITICAL. Hook `PreToolUse` bloquea violaciones.**

`auth.users` es **compartido entre todas las apps ICONSA**. Una operación destructiva mal filtrada afecta TODAS las apps.

### Prohibido

- ❌ `DELETE FROM auth.users` sin WHERE con filtro explícito
- ❌ `DELETE FROM auth.users WHERE 1=1`
- ❌ `UPDATE auth.users SET ...` sin WHERE específico
- ❌ `TRUNCATE auth.users`
- ❌ `DROP TABLE auth.users`

### Obligatorio para destructive ops

1. **Filtro explícito** por `raw_app_meta_data->'allowed_apps'` (SQL directo) o `app_metadata->'allowed_apps'` (Supabase JS / RLS context). Ejemplo válido SQL:
   ```sql
   DELETE FROM auth.users
   WHERE raw_app_meta_data->'allowed_apps' @> '["humanOS"]'::jsonb
     AND NOT (raw_app_meta_data->'allowed_apps' @> '["movimientOS"]'::jsonb);
   ```

   **Nota encoding metadata**:
   - En **SQL directo** (psql, Supabase SQL Editor, execute_sql): usar `raw_app_meta_data`
   - En **RLS policies / Supabase JS / API**: expuesto como `app_metadata`
   - Ambos refieren a la misma data, distinto access pattern

2. **Snapshot pre-op obligatorio**:
   ```sql
   CREATE TABLE backup.auth_users_YYYYMMDD_HHMM AS
   SELECT * FROM auth.users WHERE <mismo_filter>;
   ```

3. **SELECT preview**: Chat ejecuta SELECT que muestra lista exacta ANTES del DELETE/UPDATE. Aprobación explícita después de ver la lista.

### Aplicable también a

- `public.people`, `hr.people` (golden records compartidos)
- Cualquier tabla canónica MDM

### Enforcement

`.claude/hooks/pre-tool-use.ps1` bloquea automáticamente patterns peligrosos.

---

## R23 — Encoding ASCII/BOM (lección 2026-05-25)

**CRITICAL. Hook `PostToolUse` valida.**

Toda config file (`.json`, `.md`, `.css`, `.ts`, `.tsx`, `.js`, `.ps1`) es **UTF-8 SIN BOM**.

Hooks `.ps1` son **ASCII puro** (sin em-dashes, sin acentos, sin smart quotes).

Method correcto PowerShell 5.1:
```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
```

`settings.json` strict-schema: solo fields documentados por Anthropic. NO custom fields.

---

## R24 — Approval modes en `requests.types.approval_chain_template` JSONB

Estructura definitiva:

```json
{
  "mode": "parallel" | "direct_hr_admin" | "any_of_hr" | "parent_only",
  "visibility": "universal",
  "steps": [
    {
      "step_id": 1,
      "role": "supervisor" | "hr_admin" | "president",
      "resolver": "selected_supervisor_id" | "any_hr_admin" | "president_user",
      "sla_hours": 72,
      "required": true
    }
  ]
}
```

### Lógica ApprovalEngine

```
Estado por step en approval_state JSONB:
  {step_id, role, approver_id (resuelto), status, decided_at, comments, stamp_data}

Ticket.status transitions:
  - mode 'parallel': Aprobada cuando TODOS steps required = approved
  - mode 'direct_hr_admin' o 'any_of_hr': Aprobada cuando 1 hr_admin actúa
  - Si CUALQUIERA = rejected → Ticket = 'Rechazada' inmediato
  - Si CUALQUIERA = modified → Ticket = 'Devuelta_Modificacion' (R9)
  - Si NINGUNO terminal y al menos uno approved → 'En_Revision' (progress bar muestra %)
```

ApprovalEngine implementa los 3 modes + parent_only. Tests específicos por mode obligatorios.

---

## R25 — Manual entry para formularios papel

**Source**: ADR-0012, F32 feature, R26 SOP-driven.

### Regla

hr_admin puede crear solicitud en nombre de empleado vía `/admin/solicitudes/manual-entry` para casos:
- Personal campo sin app/conectividad
- Supervisores acostumbrados al papel
- Formularios firmados físicos que llegan vía valija/WhatsApp
- Migration period papel-digital

### Schema

`requests.tickets` columnas (migration 021):
- `manual_entry boolean NOT NULL DEFAULT false`
- `created_by_hr_admin uuid REFERENCES hr.people(id)`

**NO se agrega columna `original_paper_attachment_id`**. Se usa `files.uploads` polimórfico:
```
INSERT INTO files.uploads (
  entity_schema='requests',
  entity_table='tickets',
  entity_id=<ticket_id>,
  category='original_paper_form',  -- enforced via CHECK migration 024
  ...
);
```

### Flow

1. hr_admin selecciona empleado solicitante (search por cédula/nombre/code)
2. Selecciona tipo de solicitud
3. Llena form digital (FormEngine renderiza)
4. **Adjunta foto del original** (recomendado, no obligatorio)
5. Selecciona "supervisor que firmó" del dropdown
6. Submit → ticket con `manual_entry=true` + `created_by_hr_admin=<hr_admin_id>`
7. Workflow: approval steps marcados pre-aprobados con timestamp del form original. Stamp data refleja "firmado en papel"
8. Empleado notificado del ticket creado en su nombre
9. Empleado puede confirmar/disputar desde `/perfil`

### Audit

Toda manual entry registra en `audit.log`:
- `actor_id` = hr_admin creador
- `record_id` = ticket_id
- `action = 'insert'`
- `metadata = {manual_entry: true, original_paper_attachment_id: <files.uploads.id>}`

### Constraint

Solo `hr_admin` o `admin` pueden crear manual-entry. Enforced via RLS policy en `requests.tickets`.

---

## R26 — SOP-driven approval chains (NUEVA esta sesión)

**Source**: Decisión James 2026-05-27.

### Regla

El SOP papel define quiénes deben aprobar. Si el SOP dice "Gerencia General" → agregar step `president` en mode `parallel`. **NO desviarse del SOP sin validar con Samantha**.

### Pattern

| SOP papel chain dice... | HumanOS implementa |
|---|---|
| "Supervisor + RRHH" | `parallel: [supervisor, hr_admin]` |
| "Supervisor + RRHH + Gerencia General" | `parallel: [supervisor, hr_admin, president]` |
| "RRHH inicia" (workflow inverso) | `direct_hr_admin` |
| "RRHH gestiona solo" | `direct_hr_admin` o `any_of_hr` |
| Sin SOP papel formal (categoría B) | Diseñar basado en líderes mercado + ICONSA context |

### Aclaración "Gerencia General"

"Gerencia General" en SOP NO necesariamente significa Rodrigo (Presidente). Podría incluir:
- Rodrigo Eisenmann (Presidente, EIS772)
- Octavio Javier Ferrer (Vice Presidente, FER337)
- Otros gerentes (Gerente Finanzas, Gerente Proyectos, etc.)

**MVP**: `president_user` resolver retorna solo Rodrigo (único con `app_role='president'`).

**Si Samantha valida después** que VP u otros gerentes también deben aprobar:
- Opción A: extender resolver a `gerencia_user_list` con array UUIDs paralelo
- Opción B: actualizar `app_role` de otros gerentes a 'president' (semantic stretch)
- Decisión post-MVP con Samantha

### Excepciones documentadas

Tipos cuyo SOP NO menciona "Gerencia General" mantienen chain corto:
- PERMISO (F-00-08): supervisor + hr_admin
- RECLAMO_PAGO (PO-05 §5.11): supervisor + hr_admin, SLA 48h
- CAPACITACION (F-02-09): supervisor + hr_admin (sin PO formal)
- SOLICITUD_EPP, REPORTE_INCIDENTE: categoría B (sin SOP papel), diseñados como supervisor + hr_admin

### Enforcement

Cuando Code o Chat propone modificar `approval_chain_template`:
1. Consultar SOP relevante en `docs/sops/*.md`
2. Si propone desviarse: documentar razón en ADR + pedir approval James
3. Si SOP no es claro: dejar configurable y pedir validación a Samantha post-MVP via F39 admin viewer

### F39 admin viewer

`/admin/tipos/[code]` muestra chain configurado para que Samantha vea y valide. Edit JSON raw (F39-B) en v1.1 cuando Samantha tenga claridad qué quiere ajustar.

---

## Resumen rules table

| R# | Tema | Critical? |
|---|---|---|
| R1 | Schemas prohibidos | ✅ Critical |
| R2 | RLS obligatorio | ✅ Critical |
| R3 | COMMENT obligatorio | Important |
| R4 | Préstamo $250 NO bloqueante | Important |
| R5 | No self-approval | ✅ Critical |
| R6 | Fallback supervisor → hr_admin (paralelo) | Important |
| R7 | Sello aprobación + stamp_data | Important |
| R8 | F-05-01 dos pasos RRHH | Important |
| R9 | Back-and-forth 3 opciones | Important |
| R10 | Usuario único contextual | Important |
| R11 | Mapping tipos→mode | ✅ Critical |
| R12 | SCD-2 employments | ✅ Critical |
| R13 | Sensitive docs RLS | ✅ Critical |
| R14 | Invite codes auth | Important |
| R15 | Español neutro Panamá | Important |
| R16 | Estados ticket | Important |
| R17 | request_number format | Minor |
| R18 | Notifications fire-and-forget | Important |
| R19 | F-04-01 integrada perfil | Important |
| R20 | Forms NO HumanOS | Important |
| R21 | Forms otro schema | Important |
| R22 | auth.users destructive ops | ✅ CRITICAL |
| R23 | Encoding UTF-8 sin BOM | ✅ CRITICAL |
| R24 | Approval modes JSONB | ✅ Critical |
| R25 | Manual entry F32 | Important |
| R26 | SOP-driven chains | ✅ Critical |
