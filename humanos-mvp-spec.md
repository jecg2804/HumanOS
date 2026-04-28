# HumanOS MVP — Spec para Claude Code

## Qué es HumanOS

App interna de RRHH para ICONSA (empresa de construcción pesada en Panamá). Reemplaza Excel + papel + WhatsApp para los procesos de Samantha Kosmas (Gerente RRHH). Es una app productiva — Samantha y su equipo la van a usar después del MVP.

Reemplaza también a Humand (~$4/usuario/mes), una plataforma genérica que ICONSA pagó pero nunca configuró bien.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind
- Supabase (auth + Postgres + RLS + Storage) — branch `humanos-dev` (project_ref `woonbmfmconldxbeqdnr`)
- Resend para email (`noreply@rein-eisenwerk.com`)
- Vercel deploy
- Mobile-first (los empleados acceden desde celular)

## Los 5 pilares del MVP

1. **Knowledge Base / FAQ** — un empleado entra y entiende qué formulario usar para qué necesidad, quién aprueba, qué documento le pide RRHH. Se basa en los SOPs de ICONSA. Reemplaza el "voy a preguntarle a Rocío qué papel tengo que llenar."

2. **Formularios digitales** — los 12 tipos de solicitud, llenables desde el celular. Cada uno con campos específicos (form_data JSONB). Los datos del solicitante se autocompletan desde `humanos.people`.

3. **Flujos de aprobación** — cada formulario dispara una cadena de aprobaciones definida en `request_types.approval_chain`. Notificación por email al siguiente aprobador. Estados: Borrador → Enviada → En Revisión → Aprobada/Rechazada → Completada.

4. **Dashboard de Samantha (HR Admin)** — vista global: todas las solicitudes, KPIs (pendientes, esta semana, vencidas), atajos a las que requieren su decisión.

5. **Expediente del empleado** — vista única por empleado para HR: datos completos, historial de solicitudes, documentos. Para empleado: su propia versión simplificada de "Mi Perfil".

## Base de datos — ya creada

Branch `woonbmfmconldxbeqdnr`. Code tiene **DDL/DML completo** sobre `humanos.*`. Puede agregar tablas, columnas, índices, RLS — lo que necesite. Nunca toca `public`/`hr`/`payroll` ni producción.

### Tablas existentes
- `humanos.people` — 239 empleados (52 activos, 187 históricos). Una sola tabla con identidad + datos personales + laborales. Ver "Deuda técnica" en `CLAUDE.md`.
- `humanos.request_types` — 12 tipos seeded. Campos: `code`, `name`, `description`, `category` ('autoservicio_empleado'|'cambios_personal'|'reclutamiento'), `sop_reference`, `requires_approval`, `approval_chain` (JSONB array de roles), `icon`, `is_active`.
- `humanos.requests` — id, request_number (auto), type_id, requester_id, status, form_data (JSONB), date_submitted, date_resolved, attachments (JSONB).
- `humanos.request_approvals` — id, request_id, approver_id, approval_role, decision, decision_date, comments, step_order.
- `humanos.sequences` — para auto-numerar (formato `HUM-2026-0001`).

### Cliente Supabase
```typescript
import { createClient } from '@supabase/supabase-js'
const humanos = createClient(url, anonKey, { db: { schema: 'humanos' } })
const { data } = await humanos.from('people').select('*')
```

## Roles y autenticación

Login via Supabase Auth (email + password). El rol se determina al login:
- `KOSM01`, `OLM206`, `MAN943`, `MEN943` → `hr_admin`
- Tiene subordinados (otros con `supervisor_id = me.id`) → `supervisor`
- Default → `employee`

(En el MVP, si un empleado no tiene `auth_id`, HR puede crearle el account desde el admin.)

## Páginas del MVP

### Auth
- `/login` — email + password. Redirige a `/inicio` post-login.

### App (todos los roles)
- `/inicio` — saludo, cards de acceso rápido, badge de pendientes para HR.
- `/directorio` — todos los empleados activos, búsqueda + filtros (depto, oficina, cargo). Solo datos básicos (nombre, cargo, departamento, foto, email, ext.).
- `/perfil` — Mi Perfil. Datos del empleado autenticado. Read-only para empleados (cambios via formulario "Actualización de Datos"). Editable para HR.
- `/perfil/[id]` — Perfil de otro empleado. Empleados ven versión limitada; HR ve todo + expediente.
- `/solicitudes` — Mis Solicitudes (lista). Filtro por estado. Muestra request_number, tipo, fecha, estado, tiempo en estado actual.
- `/solicitudes/nueva` — grilla de los 12 tipos para iniciar. Cada uno con icon, descripción, "quién aprueba", link al SOP.
- `/solicitudes/nueva/[type_code]` — render del form específico para ese tipo. Campos vienen de la definición del tipo (ver "Formularios" abajo).
- `/solicitudes/[id]` — detalle con timeline de aprobaciones, comentarios, documentos adjuntos, acciones disponibles (cancelar si Borrador, aprobar/rechazar si soy aprobador pendiente).
- `/ayuda` — Knowledge Base / FAQ. Lista los 12 tipos agrupados por categoría con: descripción, "qué necesitas para llenarlo", flujo de aprobación, link al SOP en `Docs/SOPs, Formularios y Documentos/`.

### Admin (solo `hr_admin`)
- `/admin` — Dashboard. KPIs: solicitudes pendientes de mi acción, solicitudes esta semana, vencidas (>5 días sin acción), por tipo. Tabla con todas las solicitudes filtrable.
- `/admin/empleados` — Tabla de empleados con búsqueda. Click → expediente.
- `/admin/empleados/[id]` — Expediente: perfil completo + historial de solicitudes + documentos.

## Formularios — los 12 tipos (P1 = mandatorios para MVP)

Code DEBE leer el PDF correspondiente en `Docs/SOPs, Formularios y Documentos/` antes de implementar cada form. Los campos exactos vienen del PDF. Lo que sigue es la lista priorizada y los aprobadores.

### P1 — Formularios obligatorios para el MVP funcional

| Code | Nombre | SOP / PDF | Aprobadores | Notas críticas |
|------|--------|-----------|-------------|----------------|
| `VACACIONES` | Solicitud de Vacaciones | `IC-RH-F-05-03 Solicitud de Vacaciones.pdf` | Supervisor → RRHH (Rocío) → Samantha | Validar fechas no traslapan otra solicitud aprobada del mismo empleado. |
| `ACCION_PERSONAL` | Acción de Personal | `IC-RH-F-05-01 Acciones de personal.pdf` + SOP `IC-RH-PO-05` | Supervisor → Samantha → Presidencia (Rodrigo) | Cubre cambios de salario, posición, traslado, terminación. Tipos seleccionables dentro del form. |
| `PRESTAMO` | Préstamo a Empleados | `IC-RH-F-05-02 Prestamo a Empleados.pdf` + `IC-RH-D-02 Condiciones especiales...` | Supervisor → Milagros (Planillas) → Samantha | **Validación dura: monto ≤ $250** (regla del IC-RH-D-02). |
| `ACTUALIZACION_DATOS` | Actualización de Datos Personales | `IC-RH-F-00-07 Actualización de Datos.pdf` | Rocío → Samantha | Form con secciones: contacto, dirección, contacto de emergencia, estado civil, dependientes, educación. Al aprobarse, HR aplica los cambios al perfil del empleado. |
| `RECLAMO_PAGO` | Reclamo sobre Pago | `IC-RH-F-05-05 Reclamo sobre pago.pdf` | Milagros → Samantha | Periodo, descripción del problema, monto esperado vs cobrado, evidencia (upload). |

### P2 — Si hay tiempo, sino quedan listados pero el form no genera flujo todavía

| Code | Nombre | SOP / PDF |
|------|--------|-----------|
| `PERMISO` | Solicitud de Permiso (horas / días) | `IC-RH-F-00-08 Solicitud de Permiso (HORAS).doc` |
| `CONSTANCIA_TRABAJO` | Carta de Trabajo | (no hay form, se genera) |
| `REFERENCIA_LABORAL` | Solicitud de Referencias Laborales | `IC-RH-F-00-06 Solicitud de Referencias Laborales.pdf` |
| `ENTREVISTA_SALIDA` | Entrevista de Salida | `IC-RH-F-00-05 Entrevista Salida.pdf` |
| `CAPACITACION` | Solicitud de Entrenamiento | `IC-RH-F-02-09 Solicitud y Evaluación de Entrenamiento por Supervisores.pdf` |
| `LIQUIDACION` | Liquidación | (proceso interno, sin form físico) |
| `HORAS_EXTRAS` | Reporte de Horas Extras | (Excel actualmente) |

### Patrón común para todos los formularios
1. Render dinámico desde la definición de campos (puede vivir en `request_types.form_schema` JSONB o en una tabla aparte).
2. Auto-fill: nombre, code, cédula, departamento, oficina vienen de `humanos.people` del solicitante.
3. Validaciones del form ANTES de submit (zod recomendado).
4. Al `Enviar`: INSERT en `requests` (status='Enviada'), crear filas en `request_approvals` según `approval_chain`, enviar email al primer aprobador.
5. Al aprobar/rechazar: UPDATE `request_approvals`, si era el último → UPDATE `requests.status`, email al solicitante.

## Email (Resend)

Variables ya en `.env.local`:
- `RESEND_API_KEY=...`
- Dominio: `rein-eisenwerk.com` (verificado, mismo de MovimientOS)
- Sender: `HumanOS <noreply@rein-eisenwerk.com>`

Templates a implementar (3 mínimos):
1. **Solicitud enviada → primer aprobador**: "Tienes una solicitud nueva por aprobar". Botón "Ver Solicitud".
2. **Aprobación parcial → siguiente aprobador**: igual al anterior.
3. **Decisión final → solicitante**: "Tu solicitud fue Aprobada/Rechazada". Botón "Ver Detalle".

Diseño: copiar el template de MovimientOS — header navy `#1B3A5C` con "ICONSA" gold + "HumanOS" white. Card blanca con título, badge de estado, key-value de IDs, botón navy. Footer "Este es un mensaje automático del sistema HumanOS de ICONSA. No responda a este correo."

## Out of scope para el MVP (P3)

- WhatsApp / Twilio
- PWA service worker / offline (responsivo sí, instalable no)
- Cualquier cálculo de Payday (ISR, días disponibles de vacaciones, liquidaciones)
- Generación de PDFs de cartas (si sale tiempo, solo Carta de Trabajo básica)
- Onboarding wizard de empleados nuevos
- Módulo de Eventos / Magazine que pidió Samantha (Module 2)

## Aceptación del MVP — checklist

- [ ] `/login` funcional con Supabase Auth
- [ ] `/inicio` carga, muestra cards y saludo
- [ ] `/directorio` lista 52 activos, búsqueda funciona
- [ ] `/perfil` muestra datos del empleado autenticado
- [ ] `/ayuda` muestra los 12 tipos con descripción + SOP reference
- [ ] `/solicitudes/nueva` muestra los 12 tipos
- [ ] Los **5 forms P1** crean `requests` correctamente con `form_data` válido
- [ ] El motor de aprobación crea `request_approvals` y los avanza
- [ ] `/solicitudes` muestra mis solicitudes con estado
- [ ] `/solicitudes/[id]` muestra detalle + timeline
- [ ] `/admin` muestra dashboard con KPIs reales
- [ ] HR puede aprobar/rechazar desde la UI y el estado avanza
- [ ] Resend manda los 3 emails (al menos uno, idealmente los 3)
- [ ] Deploy preview en Vercel funciona
