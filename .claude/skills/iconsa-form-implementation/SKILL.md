---
name: iconsa-form-implementation
description: Implement a new HumanOS form / request type end-to-end. Use whenever the prompt mentions formulario, form, solicitud, ticket, nuevo tipo, VACACIONES, PRESTAMO, ACCION_PERSONAL, ACTUALIZACION_DATOS, RECLAMO_PAGO, PERMISO, CONSTANCIA, CERTIFICACION, REPORTE_INCIDENTE, SOLICITUD_EPP, CAMBIO_CUENTA_BANCO, CAMBIO_DEPENDIENTES, COPIA_CONTRATO, COPIA_COLILLA, REFERENCIA_LABORAL, ENTREVISTA_SALIDA, CAPACITACION, form_schema, requests.types, requests.tickets, FormEngine, ApprovalEngine, ChainResolver, prerrellenar, prefill, F-05-01, F-05-02, F-05-03, F-05-04, F-05-05, F-00-05, F-00-06, F-00-07, F-00-08, F-02-09, or F-04-01.
---

# Form implementation pattern HumanOS

The differentiation between forms lives in `requests.types.form_schema` JSONB and `requests.types.approval_chain_template` JSONB — NOT in custom code per form.

## CORE MENTAL MODEL — Field source matrix

HumanOS digitaliza formularios papel ICONSA. **Cada campo del SOP papel cae en UNA de 3 categorías**:

| Source | Origen | Editable user | Render |
|---|---|---|---|
| `profile` | BD (hr.people, hr.employments, hr.org_units, etc.) | NO (read-only) | Prerrellenado, color muted, no input |
| `user_input` | Input nuevo del solicitante en cada submission | SÍ | Input estándar editable |
| `computed` | Derivado por sistema (antigüedad, balance vacaciones, etc.) | NO | Read-only con badge "Calculado" |

### Por qué importa

Si Code se descubre **pidiendo al usuario datos que ya están en BD** (nombre, cédula, departamento, cargo, supervisor), está implementando mal. La BD es source of truth. Prerrellenar es el default. El usuario solo da lo que es nuevo a esta solicitud.

### Mapping de campos comunes a `source`

**Siempre `source: 'profile'`** (verificar nombre exacto de columna vía Supabase MCP antes de usar):
- Nombre completo del solicitante
- Cédula / national ID
- Employee code
- Email corporativo
- Teléfono
- Foto perfil
- Cargo actual (via current employment → position)
- Departamento (via current employment → org_unit)
- Ubicación / proyecto (via current employment → location)
- Supervisor directo (via current employment.supervisor_id → person)
- Fecha contratación
- Tipo contrato

**Siempre `source: 'user_input'`**:
- Motivo / justificación / observaciones (cualquier textarea libre)
- Fechas específicas a la solicitud (desde/hasta vacaciones, fecha permiso, fecha incidente)
- Montos específicos (monto préstamo, cuota mensual deseada)
- Cantidades (días solicitados, horas extras propuestas)
- Selecciones (tipo de permiso, tipo de EPP, categoría incidente)
- Attachments / firmas

**Siempre `source: 'computed'`**:
- Antigüedad en años (derivado de hire_date)
- Días vacaciones disponibles (saldo - tomados)
- Salario actual (RESTRICTED — solo expone en forms donde aplique como PRESTAMO/AUMENTO, y con RLS check)
- Estado actual del ticket
- Approval chain preview (steps que se ejecutarán)

### form_schema JSONB con source explícito

```json
{
  "fields": [
    {"name": "full_name", "type": "text", "source": "profile", "path": "hr.people.full_name", "label": "Nombre completo"},
    {"name": "department", "type": "text", "source": "profile", "path": "hr.org_units.name", "label": "Departamento"},
    {"name": "antiguedad_anios", "type": "number", "source": "computed", "compute_fn": "years_since_hire_date", "label": "Antigüedad (años)"},
    {"name": "fecha_desde", "type": "date", "source": "user_input", "required": true, "label": "Vacaciones desde"},
    {"name": "fecha_hasta", "type": "date", "source": "user_input", "required": true, "label": "Vacaciones hasta"},
    {"name": "motivo", "type": "textarea", "source": "user_input", "required": false, "label": "Observaciones"}
  ]
}
```

FormEngine renderiza:
- Campos `profile`: muestra valor de BD, input disabled, opacidad reducida, label "(de tu perfil)"
- Campos `user_input`: input editable normal
- Campos `computed`: muestra valor calculado, input disabled, badge "Calculado"

## End-to-end checklist

### 1. Leer SOP primero (categoría A)

Si el form tiene SOP papel ICONSA:
- Lee el PDF desde `docs/sops/formularios/<subcarpeta>/IC-RH-F-XX-XX.pdf` con Filesystem MCP (Read tool). **NO uses Google Drive MCP** — no está habilitado para este proyecto. Los SOPs ya están en el repo.
- Consulta `docs/sops/README.md` para encontrar el path exacto si dudas
- Lee el PDF, identifica TODOS los campos del form papel
- Mapea cada campo a `profile` | `user_input` | `computed`
- Identifica chain de firmas en SOP → valida contra `requests.types.approval_chain_template`
- Si hay discrepancia significativa: documenta ADR + consulta James (R26)

### 2. Verificar `requests.types` row existe

```sql
SELECT code, name, form_schema, approval_chain_template, sla_hours
FROM requests.types WHERE code = 'TIPO_CODE';
```

Si missing: insert via migration. Si exists pero `form_schema` no tiene `source` por campo: migration para añadirlo.

### 3. FormEngine renderer (built once, reused)

Form schema JSONB structure:
```json
{
  "fields": [
    {"name": "field_name", "type": "text|number|currency|date|datetime|select|multiselect|textarea|file_upload|signature_canvas|computed", "source": "profile|user_input|computed", "path": "<dot-notation BD path si source=profile>", "compute_fn": "<function name si source=computed>", "required": true, "label": "Label visible", "options": ["..."], "readonly": true}
  ]
}
```

Tipos soportados: text, textarea, number, currency, date, datetime, time, select, multiselect, radio, checkbox, file_upload, signature_canvas, computed.

Prefill logic en FormEngine:
- Si `source: 'profile'`: hacer query a BD usando `path`, llenar valor, disable input
- Si `source: 'computed'`: ejecutar `compute_fn` con context del usuario actual, llenar, disable
- Si `source: 'user_input'`: input vacío editable

### 4. ApprovalEngine wiring (built once, reused)

approval_chain_template JSONB:
```json
{
  "mode": "parallel | direct_hr_admin | any_of_hr | parent_only",
  "visibility": "universal",
  "steps": [
    {"step_id": 1, "role": "supervisor|hr_admin|president", "resolver": "selected_supervisor_id|any_hr_admin|president_user", "sla_hours": 72, "required": true}
  ]
}
```

Modes:
- `parallel`: notifica TODOS los stakeholders day 0. Aprobado cuando TODOS required = aprobado. Rechazado si CUALQUIERA = rechazado.
- `direct_hr_admin`: notifica todos hr_admin. Primera acción gana.
- `any_of_hr`: idéntico a direct (distinción semántica para documentos).
- `parent_only`: sin chain (ACCION_PERSONAL parent).

### 5. Routes per form

```
/solicitudes/nueva/[code]       - FormEngine renderiza form
/solicitudes/[id]               - Detail con timeline + acciones
/solicitudes/[id]/imprimir      - PdfEngine genera PDF formato SOP
/admin/solicitudes/manual-entry - Manual entry F32 (hr_admin crea en nombre del empleado)
```

### 6. Server actions

```
createTicket(typeCode, payload, selectedSupervisorId?) -> ticket_id
approveTicket(ticketId, stepId, comments?) -> ok
rejectTicket(ticketId, stepId, observations) -> ok
modifyTicket(ticketId, stepId, modifiedValue, reason) -> revision_id
acceptRevision(revisionId) -> ok | rejectRevision(revisionId)
cancelTicket(ticketId) -> ok (solo si owner + status Borrador|Enviada)
markReceived(ticketId)    -- solo para ACCION_PERSONAL, R8
markProcessed(ticketId)   -- solo para ACCION_PERSONAL, R8
```

### 7. Anti-self-approval (R5)

En ApprovalEngine:
```typescript
if (approverPersonId === ticket.requesterPersonId) {
  throw new Error('No puedes aprobar tu propia solicitud');
}
```

Validación en código, NO BD constraint.

### 8. Notifications

Después de state transition, queue `notifications.outbox` entries via NotificationEngine. Respetar `hr.user_settings.notification_*_enabled` per recipient. NUNCA bloquear acción si notification falla (R18 — fire and forget).

### 9. Tests E2E (Playwright)

Mandatorios per form:
- Happy path: submit → todos required approve → ticket Aprobada
- Reject path: submit → step rechaza → ticket Rechazada
- Modify path: submit → step modifica → Devuelta_Modificacion → requester acepta → vuelve a chain
- Cancel path: requester cancela en Borrador / Enviada
- Self-approval blocked: requester NO puede aprobar own ticket
- Manual entry: hr_admin crea en nombre + foto upload
- PDF generation match SOP visual (screenshot diff)
- RLS: requester ve own, hr_admin ve all, supervisor ve subordinates only
- **Prefill verification**: form abre y campos `profile` están llenos correctamente; user solo edita `user_input`

## Patrón por categoría

### Categoría A (10 + 6 sub-types con SOP papel)

| Tipo | Mode | Profile fields | User input fields | Computed |
|---|---|---|---|---|
| F-05-01 ACCION_PERSONAL parent + 6 sub-types | parallel sup+hr+pres | identidad, cargo, supervisor | depende sub-type | antigüedad |
| F-05-02 PRESTAMO | parallel sup+hr+pres (R4: $250 cap operacional, NO bloqueante) | identidad, cargo, salario, antigüedad | monto, cuota_propuesta, plazo, motivo | salario, antigüedad |
| F-05-03 VACACIONES | parallel sup+hr+pres | identidad, fecha contratación, supervisor | fecha_desde, fecha_hasta, motivo opcional | dias_disponibles, antigüedad |
| F-05-04 (varios sub-types) | depende | identidad, cargo | depende | depende |
| F-05-05 RECLAMO_PAGO | parallel sup+hr (SLA 48h PO-05 §5.11) | identidad, cargo | periodo, monto_reclamado, descripcion | - |
| F-00-07 ACTUALIZACION_DATOS | direct_hr_admin (SLA 48h) | identidad actual | campos a actualizar | - |
| F-00-08 PERMISO | parallel sup+hr | identidad, supervisor | fecha, horas, motivo | - |
| F-00-06 REFERENCIA_LABORAL | direct_hr_admin (RRHH inicia, workflow inverso) | identidad ex-empleado | datos solicitante externo | - |
| F-00-05 ENTREVISTA_SALIDA | direct_hr_admin (RRHH inicia) | identidad saliente | preguntas predefinidas + respuestas | - |
| F-02-09 CAPACITACION | parallel sup+hr | identidad, cargo, departamento | curso, justificacion, costo | - |
| CONSTANCIA_TRABAJO (most requested) | any_of_hr | identidad, fecha contratación, cargo | destinatario | antigüedad |

### Categoría B (8 nuevos basados en industry leaders)

| Tipo | Mode | Profile fields | User input fields |
|---|---|---|---|
| CERTIFICACION_LABORAL | any_of_hr | identidad, cargo, antigüedad | dirigido a |
| CONSTANCIA_NO_ADEUDO | any_of_hr | identidad | propósito |
| COPIA_CONTRATO | any_of_hr | identidad | - |
| COPIA_COLILLA | any_of_hr | identidad | periodo (fecha) |
| CAMBIO_CUENTA_BANCO | direct_hr_admin | identidad, banco actual | banco nuevo, num cuenta nuevo, foto cheque |
| CAMBIO_DEPENDIENTES | direct_hr_admin | identidad, dependientes actuales | tipo cambio (agregar/quitar/modificar), datos dependiente |
| SOLICITUD_EPP | parallel sup+hr (crítico construcción) | identidad, cargo | tipo epp, talla, urgencia |
| REPORTE_INCIDENTE | parallel sup+hr (SLA 24h crítico) | identidad, cargo, ubicación, supervisor | fecha incidente, descripcion, severidad, fotos, testigos |

### F-04-01 NO es ticket

`IC-RH-F-04-01 Informacion de Emergencia` NO es un ticket. Integra al perfil:
- `hr.medical_info`: blood_type, allergies, medications, css_number, aseguradora
- `hr.contacts` con `contact_type='emergency'`

Capturado en onboarding wizard, editable desde `/perfil`.

## What NOT to do

- Do not write custom logic per form type. Use FormEngine + ApprovalEngine + ChainResolver.
- Do not hardcode chain steps in code. They are in `requests.types.approval_chain_template`.
- **Do not ask user for data that exists in BD**. Use `source: 'profile'` and prefill. Si te descubres añadiendo un input para `full_name` o `department`, hiciste mal.
- Do not skip Playwright E2E tests per form — happy path + reject + modify + prefill verification mínimo.
- Do not assume SOP papel matches seeded `form_schema` — verificar contra PDF, documentar ADR si discrepancia.
- Do not add `original_paper_attachment_id` column for F32 — use `files.uploads` with `category='original_paper_form'` (R25).
- Do not implement self-approval BD constraint — código (R5).
- Do not bypass `selected_supervisor_id` resolver — el requester elige supervisor al submit.
- Do not expose salary in forms where R13 doesn't apply — only PRESTAMO, AUMENTO use it, with RLS check.
