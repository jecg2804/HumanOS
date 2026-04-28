# Module 1 — Sistema de Solicitudes

Este es el módulo central del MVP. Todo lo demás (knowledge base, dashboard, expediente) gira alrededor de los formularios y sus flujos.

## Alcance del módulo

5 formularios P1 + el motor genérico de aprobación. Los otros 7 tipos quedan listados en el knowledge base pero **no necesitan UI de creación funcional** para el MVP.

## Los 5 formularios P1

Para cada uno, **leer el PDF correspondiente en `Docs/SOPs, Formularios y Documentos/`** durante el brainstorming. Los campos exactos vienen del PDF, no de este spec.

### 1. Solicitud de Vacaciones (`VACACIONES`)
- **PDF**: `IC-RH-F-05-03 Solicitud de Vacaciones.pdf`
- **Aprobación**: Supervisor del solicitante → Rocío (RRHH) → Samantha
- **Validaciones**:
  - Fechas no traslapan con otra solicitud Aprobada del mismo empleado
  - Fecha desde < fecha hasta
  - Fecha desde >= hoy (no retroactivas)
- **Auto-fill**: nombre, code, departamento, cargo, fecha de ingreso, supervisor
- **Out of scope**: cálculo de días disponibles (Payday lo maneja)

### 2. Acción de Personal (`ACCION_PERSONAL`)
- **PDF**: `IC-RH-F-05-01 Acciones de personal.pdf`
- **SOP relacionado**: `IC-RH-PO-05 Acciones de Personal.pdf`
- **Aprobación**: Supervisor → Samantha → Presidencia (Rodrigo Eisenmann, code `EIS772`)
- **Sub-tipos** (el form pregunta cuál):
  - Cambio de salario
  - Cambio de posición / promoción
  - Traslado de oficina/proyecto
  - Cambio de contrato (tiempo definido → indefinido, etc.)
  - Terminación / liquidación
  - Amonestación (link a `IC-RH-F-05-04 Memo de Constancia de Amonestacion.pdf`)
- **Notas**: este es el form más complejo. Si suma esfuerzo, en el MVP puede tener solo 2-3 sub-tipos funcionales.

### 3. Préstamo a Empleados (`PRESTAMO`)
- **PDF**: `IC-RH-F-05-02 Prestamo a Empleados.pdf`
- **Reglas**: `IC-RH-D-02 Condiciones especiales para la solicitud de prestamo de empleado.pdf`
- **Aprobación**: Supervisor → Milagros (Planillas, `MAN943`) → Samantha
- **Validación dura**: `monto <= 250` (regla del IC-RH-D-02). UI debe bloquear submit y mensaje claro: "Por política, los préstamos no pueden exceder $250."
- **Campos típicos**: monto solicitado, motivo, plan de pago (cuántos descuentos de planilla), aceptación de descuento directo

### 4. Actualización de Datos Personales (`ACTUALIZACION_DATOS`)
- **PDF**: `IC-RH-F-00-07 Actualización de Datos.pdf`
- **Aprobación**: Rocío → Samantha
- **UX**: form pre-poblado con los datos actuales del empleado. El empleado edita los campos que quiere cambiar. Submit envía solo los cambios (diff).
- **Secciones esperadas** (verificar en PDF):
  - Contacto: phone, email personal
  - Dirección: address, city, country
  - Contacto de emergencia: name, phone
  - Estado civil + dependientes
  - Educación
- **Al aprobarse**: HR puede aplicar los cambios al perfil del empleado con un click ("Aplicar cambios al expediente"). Esto hace el UPDATE en `humanos.people`.

### 5. Reclamo sobre Pago (`RECLAMO_PAGO`)
- **PDF**: `IC-RH-F-05-05 Reclamo sobre pago.pdf`
- **Aprobación**: Milagros → Samantha
- **Campos típicos**: período de pago en disputa, monto cobrado, monto esperado por el empleado, descripción del problema, cálculo del empleado, evidencia (upload opcional).
- **Importante**: HumanOS NO calcula el pago correcto — solo registra el reclamo y lo enruta. El cálculo lo hace Milagros en Payday.

## Motor de aprobación (compartido)

Una sola pieza de lógica corre todos los flujos. Pseudocódigo:

```
on submit(request):
  insert humanos.requests (status='Enviada', form_data, ...)
  for step, role in request_type.approval_chain:
    insert humanos.request_approvals (request_id, approval_role=role, step_order=step, decision='Pendiente')
  notify(first_approver, 'nueva solicitud')

on decision(approval, decision, comments):
  update humanos.request_approvals SET decision, decision_date, comments
  if decision == 'Rechazada':
    update humanos.requests SET status='Rechazada'
    notify(requester, 'rechazada')
    return
  if last step:
    update humanos.requests SET status='Aprobada', date_resolved=now
    notify(requester, 'aprobada')
  else:
    next_approver = step_order + 1
    notify(next_approver, 'nueva solicitud')
```

## Resolución de "quién es el supervisor / quién es Samantha"

`approval_chain` está en JSONB. Pero NO es lista de IDs hardcoded — son **roles**. Algunos posibles:
- `'supervisor_directo'` → resolver a `requester.supervisor_id` (campo en `humanos.people`)
- `'rrhh_oficial'` → buscar people con `code = 'OLM206'` (Rocío)
- `'rrhh_planilla'` → buscar people con `code = 'MAN943'` (Milagros)
- `'rrhh_gerente'` → buscar people con `code = 'KOSM01'` (Samantha)
- `'presidencia'` → buscar people con `code = 'EIS772'` (Rodrigo)

Code define la función `resolveApprover(role, requester) → person_id` y la usa al crear los approvals.

## Knowledge base / `/ayuda`

Listar los 12 tipos agrupados por `category`:

- **Autoservicio del empleado**: VACACIONES, PERMISO, ACTUALIZACION_DATOS, CONSTANCIA_TRABAJO, HORAS_EXTRAS
- **Cambios laborales y financieros**: ACCION_PERSONAL, PRESTAMO, RECLAMO_PAGO, LIQUIDACION
- **Otros**: REFERENCIA_LABORAL, CAPACITACION, ENTREVISTA_SALIDA

Por cada tipo mostrar: icon, nombre, descripción corta, "qué necesitas para llenarlo", flujo de aprobación legible ("Tu jefe → Rocío → Samantha"), link al SOP en el repo (anchor `Docs/SOPs, Formularios y Documentos/...`).

## No-goals (Module 1)

- No implementar los 7 tipos P2 con form completo. Solo aparecen en el knowledge base.
- No PDF generation (carta de trabajo, etc.) — out of scope MVP.
- No calculations (días disponibles, montos correctos de pago, ISR) — Payday hace eso.
