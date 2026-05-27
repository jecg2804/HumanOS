# HumanOS

App HR interna ICONSA (construccion Panama). Reemplaza Humand. Coexiste con MovimientOS en mismo Supabase project. Domain: digitalizar formularios papel RRHH ICONSA con engines genericos + 24 form variants seedeados en `requests.types`.

Vocabulario vivo. Mantener actualizado por Code durante grill-with-docs. Solo glosario — implementacion fuera de scope (eso vive en `docs/adr/`, `docs/superpowers/specs/`).

## Language

### Dominio ticket

**Solicitud**:
Una peticion del empleado al sistema RRHH (vacaciones, prestamo, accion personal, etc.). Una fila en `requests.tickets`.
_Avoid_: request, peticion (informal), expediente (es diferente)

**Ticket**:
Sinonimo de solicitud usado en codigo y conversacion interna. Misma fila en `requests.tickets`.
_Avoid_: case, issue

**Expediente**:
Conjunto completo de data de una persona: `hr.people` + `hr.employments` (history SCD-2) + `hr.contacts` + `hr.addresses` + `hr.medical_info` + `hr.personal_documents` + uploads. NO es ticket.
_Avoid_: profile (es subset visible en `/perfil`), file

**request_number**:
Identificador legible auto-generado formato `HUM-{YYYY}-{NNNN}` con reset anual. Generacion atomica via `requests.sequences`. R17.
_Avoid_: ticket_id (UUID interno), case_number

### Field source matrix

**Field source**:
Categoria de un campo en `form_schema`. Tres valores: `profile`, `user_input`, `computed`. Define como FormEngine resuelve el valor inicial y si es editable.

**source='profile'**:
Campo cuyo valor existe en BD (hr.people, hr.employments, hr.org_units, hr.positions, hr.locations). FormEngine lo prerrellena read-only. Snapshoteado en `tickets.form_data` al submit (ver ADR-0003).
_Avoid_: pre-filled (es how, no que), readonly (es UI hint, no source)

**source='user_input'**:
Campo nuevo que el solicitante provee en cada submission (motivo, fechas, montos). Editable.

**source='computed'**:
Campo derivado por sistema en tiempo de render (antiguedad, balance vacaciones, salario para tipos especificos). Read-only con badge "Calculado". Definido via `compute_fn` name reference.

### Approval chain

**Approval chain template**:
Configuracion declarativa de aprobacion por tipo. Vive en `requests.types.approval_chain_template` JSONB. Estructura `{mode, visibility, steps[]}`. R24.
_Avoid_: workflow (overloaded), approval flow

**Approval chain instance**:
Aplicacion concreta del template a un ticket especifico. Cada step se materializa como fila en `requests.approvals` al submit.
_Avoid_: workflow run

**Mode**:
Comportamiento del chain. Cuatro valores: `parallel`, `direct_hr_admin`, `any_of_hr`, `parent_only`. R11/R24.
_Avoid_: flow type, chain type

**Resolver**:
Funcion que mapea un step (con `role`) a una persona concreta. Tres valores: `selected_supervisor_id` (override solicitante + fallback hr.employments), `any_hr_admin`, `president_user`.
_Avoid_: assignment function

**Visibility universal**:
Todos los stakeholders del chain (incluso pending) ven el ticket desde dia 0. Aplica a todos los tipos no `parent_only`.
_Avoid_: notification day 0 (es consecuencia, no concepto)

**Step**:
Una posicion en el chain (step_order 0-indexed). Tiene role, resolver, sla_hours, required. Una fila por step en `requests.approvals`.

**Approver**:
Persona resuelta por el resolver para un step. Puede ser delegado via `delegated_to_id` (Workday-pattern).

**Decision** (a nivel approval row):
Estado de un step individual. Cinco valores: `Pendiente`, `Aprobada`, `Rechazada`, `Modificada`, `Devuelta_Info`.
_Avoid_: status (ese es a nivel ticket)

**Status** (a nivel ticket):
Estado de toda la solicitud. Ocho valores: `Borrador`, `Enviada`, `En_Revision`, `Devuelta_Modificacion`, `Aprobada`, `Rechazada`, `Completada`, `Cancelada`. R16.

**Reset non-terminal**:
Cuando una revision modificada se acepta por el requester en parallel mode, los steps con decision != Rechazada/Modificada (es decir Pendiente y Aprobada) se resetean a Pendiente. ADR-0004.

### Sello + audit

**Sello / Stamp**:
Texto formateado generado al aprobar: `"Aprobado por [full_name], [YYYY-MM-DD], [HH:MM:SS]"`. Persistido en `requests.approvals.stamp_text`. R7.
_Avoid_: signature (Documenso v1.1)

**stamp_data**:
JSONB con metadata legal del sello: `{signer_id, signer_name, signer_role, signed_at, ip, user_agent}`. R7.

**Snapshot (profile)**:
Captura de valores `source='profile'` en `tickets.form_data` al momento del submit. Audit-correct: aunque hr.people cambie despues, ticket viejo conserva valores originales. ADR-0003.

### Roles + visibilidad

**App role**:
Rol HumanOS asignado en `hr.employments.app_role`. Cuatro valores: `employee`, `hr_admin`, `president`, `admin`. SIN `supervisor`. R10.

**Supervisor (contextual)**:
Persona que aparece como `supervisor_id` en algun `hr.employments.is_current=true`. NO es app_role. Emerge contextualmente. Helper `hr.has_direct_reports()` y `hr.is_supervisor_of()`.

**selected_supervisor_id**:
Override del solicitante en `requests.tickets.selected_supervisor_id`. Permite elegir supervisor distinto al de su employment (ej: jefe de proyecto vs jefe jerarquico). Activable cuando `requests.types.allow_supervisor_override=true`.

**Gerencia General**:
Termino del SOP papel ICONSA. En MVP mapea a `president_user` resolver = Rodrigo Eisenmann (unico `app_role='president'`). Validacion post-MVP con Samantha si VP/otros gerentes deben incluirse (deferred v1.1 segun ADR-0011 docs/08).
_Avoid_: usar "Presidente" cuando el SOP dice "Gerencia General" — son potencialmente diferentes.

### Empleo + contrato

**Employment type / Tipo de contrato**:
Clasificacion del vinculo laboral segun SOP IC-RH-D-05. Domino cerrado de 4 valores en `hr.employment_types`: `tiempo_indefinido`, `tiempo_definido`, `obra_determinada`, `servicios_profesionales`. FK desde `hr.employments.employment_type_id`. Define metadata operacional (vacaciones, decimo tercer mes, prima de antiguedad, descuentos SS/SE/ISR, cuota sindical, indemnizacion) que F-05-01 / F-05-02 / F-05-03 consumen para logica condicional. NO usar `*_text` fallback — dominio cerrado por SOP.
_Avoid_: "tipo de empleo" (overloaded), "categoria" (overloaded), enum literal (es tabla de referencia con metadata).

**Catalog fallback (`*_text`)**:
Patron en `hr.employments` para `position`, `department`, `office`: cada uno tiene `_id` FK al catalogo + columna `_text` libre. Si hr_admin no encuentra el valor en el catalogo, ingresa string en `_text` y deja `_id=NULL`. UI muestra link explicito "No veo el mio" que cambia el input. Eventualmente reconciliacion humana mapea `_text` a `_id`. NO aplica a `employment_type_id` (dominio cerrado SOP).
_Avoid_: tratar `_text` como source of truth — es deuda tecnica deliberada para no bloquear F4.

### Engines

**Engine**:
Modulo generico reutilizado por TODOS los form variants. Seis engines: FormEngine, ApprovalEngine, ChainResolver, StampEngine, PdfEngine, NotificationEngine. Viven en `src/lib/engines/{name}/index.ts`.
_Avoid_: service (overloaded), helper (esos son SQL functions BD)

**FormEngine**:
Renderer dinamico desde `requests.types.form_schema` JSONB. Resuelve `source` per field (profile/user_input/computed). Captura snapshot al submit.

**ApprovalEngine**:
State machine de los 8 status R16. Soporta los 4 modes R24. Aplica reset non-terminal en revisiones aceptadas.

**ChainResolver**:
Resuelve cada step a una persona concreta segun resolver: `selected_supervisor_id` + fallback, `any_hr_admin`, `president_user`. RRHH siempre incluido desde dia 0 en modes no `parent_only`.

**StampEngine**:
Genera `stamp_text` + `stamp_data` JSONB al actuate de un approval. R7.

**PdfEngine**:
Genera PDF del ticket. Cat A usa template pixel-perfect del SOP papel. Cat B usa template ICONSA-branded generico.

**NotificationEngine**:
Queue notifications a `notifications.outbox` + `requests.notifications`. Fire-and-forget (R18) — nunca bloquea accion de usuario. Respeta `hr.user_settings.notification_*_enabled`.

### Onboarding + auth

**Invite code**:
Codigo 8 chars de un solo uso para sign-up. Vive en `hr.invite_codes`. Triple validacion al consumir: invite_code + national_id + employee_code (opcional). R14.

**Allowed apps**:
Array JSON en `auth.users.raw_app_meta_data.allowed_apps` declarando que apps puede acceder el user. Ej: `["movimientOS","humanOS"]`. R22.

**Multi-app detection**:
Al consumir invite code, sign-up wizard busca auth.user con `email` O `phone` match (el `delivery_target` captado por hr_admin en F4). Si existe Y allowed_apps no contiene `humanOS`, append via `auth.admin.updateUserById` con spread merge de `raw_app_meta_data`; sino crea nuevo auth.user via `auth.admin.createUser` con allowed_apps=[`humanOS`]. ADR-0006 Code-level documenta el algoritmo y por qué NO usar `national_id` (campo no existe en raw_app_meta_data) ni `public.people` cross-schema (viola ADR-0005).
_Avoid_: "national_id match" (pseudo-plan ADR-0003 Chat-level nunca implementado).

### Manual entry F32

**Manual entry**:
Ticket creado por hr_admin en nombre de empleado via `/admin/solicitudes/manual-entry`. Para personal campo sin app, supervisores acostumbrados papel, transicion papel-digital. R25.

**Bypass chain**:
Comportamiento de manual entry: ticket nace en status `Aprobada` directamente, sin generar approval rows. ADR-0005. Audit log captura via `audit.log.metadata={manual_entry: true, original_paper_upload_id}`. Trust hr_admin — no validacion de firmas en foto papel.

### SCD-2 + history

**SCD-2**:
Slowly Changing Dimension Type 2. Pattern en `hr.employments`: cambios criticos (position, supervisor, department, salary, app_role) cierran viejo (`valid_to = CURRENT_DATE`) e insertan nuevo row. Constraint UNIQUE INDEX `one_current_employment_per_person WHERE is_current=true`. R12.

### Flagged ambiguities

**"Gerencia General" del SOP**:
Termino del documento papel ICONSA. NO esta claramente definido si refiere solo al Presidente (Rodrigo) o incluye VP (Javier Ferrer) y/o otros gerentes (Finanzas, Proyectos, Equipo, Calidad). MVP asume solo Rodrigo. Resolucion post-MVP con Samantha.

**`requests.approvals.approver_role = 'specific_person'`**:
CHECK constraint en BD incluye este valor pero NO esta en los 3 resolvers documentados (R11). Probable future-proofing o vestigial. Si aparece en codigo, validar con James si es para v1.1 (delegacion explicita pre-asignada) o eliminar.

**`requests.tickets.current_step` + `current_assignee_id` en parallel mode**:
Schema asume modelo sequential (current_step avanza 0,1,2...). En `parallel` mode todos los steps son simultaneos. Convencion adoptada: `current_step=0` + `current_assignee_id=NULL` mientras parallel pending. Approvers actuan via su fila en `requests.approvals` no via update directo al ticket. Documentar en ApprovalEngine spec.

## Example dialogue

**Samantha**: Necesito ver todos los tickets de PRESTAMO que esten esperando mi aprobacion.

**Code**: PRESTAMO usa mode `parallel` con 3 steps: supervisor + hr_admin + president (R11). Como Samantha tiene app_role `hr_admin`, le aparece en la pestania "Por aprobar" todo ticket de PRESTAMO con su decision step = `Pendiente`. La consulta hace JOIN entre `requests.tickets` y `requests.approvals` filtrando por `requests.approvals.approver_id = hr.current_person_id() AND decision = 'Pendiente'`.

**Samantha**: Y si Rocio aprobo antes que yo, el ticket me sigue apareciendo?

**Code**: Si. En parallel mode cada step es independiente. El step del supervisor puede estar approved sin que el hr_admin step se complete. Rocio aprobo SU step (porque ella tambien es hr_admin con `direct_hr_admin` mode no PRESTAMO... espera, PRESTAMO es `parallel` no `direct_hr_admin`). Correccion: el mode `parallel` requiere que TODOS los steps required = Aprobada. El step hr_admin tiene un solo approver_id resuelto al submit (cualquiera del equipo HR queda candidato hasta que alguien tome el ticket). Si Rocio toma el ticket hr_admin, su decision cuenta. Pero el step supervisor sigue independiente. Y president debe actuar tambien.

**Samantha**: Entonces si Rocio rechazo, el ticket esta Rechazado?

**Code**: Si. Per R24 / ADR-0004: en parallel mode, ALGUNO step = Rechazada → ticket status = `Rechazada`. Los otros steps quedan en `Pendiente` final (no se ejecutan). Audit preservado: las decisiones tomadas hasta ese momento estan en `requests.approvals` con sus timestamps.

**Samantha**: Y si Rocio quiere proponer una modificacion en lugar de aprobar?

**Code**: Modify es la tercera opcion (R9). Rocio elige "Modificar valor con razon", FormEngine recoge campos modificados + razon, ApprovalEngine inserta fila en `requests.revisions` con `status='Pendiente_Aceptacion'`, ticket cambia a `Devuelta_Modificacion`, los otros steps pausan. Empleado en su pestania "Mis solicitudes" ve la propuesta y elige aceptar o rechazar. Si acepta, el reset non-terminal aplica: TODOS los steps no terminales (incluso los que estaban Aprobada) vuelven a `Pendiente` (ADR-0004), tickets.status pasa a `Enviada` o `En_Revision`, y el chain re-corre desde cero sobre el valor modificado.

**Samantha**: Eso es muy estricto. Si supervisor ya aprobo, no quiero molestarlo otra vez.

**Code**: Decision discutida en cross-cutting grill (ADR-0004). Eleccion fue audit-correct sobre conveniencia: el stamp del supervisor dice "Aprobo $500", el ticket final es $300. Si no resetamos, audit es inconsistente. Si la modificacion es trivial (ej: motivo aclarado) no deberia disparar reset — pero MVP no distingue trivial vs sustantivo. Refinamiento humano post-overnight puede agregar checkbox "modificacion menor: no resetar otros steps".
