# HumanOS MVP — Spec para Claude Code

## Qué es HumanOS

App interna de RRHH para ICONSA (empresa de construcción pesada en Panamá, ~200 empleados). Reemplaza un Excel y procesos manuales de la gerente de RRHH Samantha Kosmas. Usa la misma base de datos Supabase que MovimientOS (app hermana de logística ya en producción).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (auth + PostgreSQL + RLS + Storage)
- Schema: `humanos` (separado de `public` que usa MovimientOS)
- La tabla `public.people` es compartida — es la identidad base de cada empleado
- Deploy: Vercel
- PWA (mobile-first — los empleados acceden desde el celular)

## Base de datos — ya creada

### Tablas compartidas (schema public, NO MODIFICAR)
- `public.people` — 182 empleados. Campos: id, name, code, email, phone, department, position, cedula, hire_date, supervisor_id, status, app_role, auth_id
- `public.projects` — Proyectos de ICONSA

### Tablas de HumanOS (schema humanos)
- `humanos.employee_profiles` — 36 registros. Datos HR extendidos: job_status, job_title, office, date_of_birth, gender, nationality, marital_status, num_dependents, education, blood_type, address, city, cell_phone, css_number, photo_url. FK: person_id → public.people.id
- `humanos.request_types` — 12 tipos de solicitud con code, name, description, sop_reference, requires_approval, approval_chain[], category, icon
- `humanos.requests` — Solicitudes. FK: type_id → request_types.id, requester_id → public.people.id. Campos: status ('Borrador','Enviada','En Revisión','Aprobada','Rechazada','Completada'), form_data (JSONB), date_submitted, date_resolved, attachments
- `humanos.request_approvals` — Cadena de aprobaciones. FK: request_id → requests.id, approver_id → public.people.id. Campos: approval_role, decision, decision_date, comments, step_order
- `humanos.sequences` — Para generar request_number auto

### IMPORTANTE — Supabase client config
Para queries al schema `humanos`, usar:
```typescript
// Opción 1: Client con schema
const humanosClient = createClient(url, key, { db: { schema: 'humanos' } })

// Opción 2: Sin crear otro client, usar .schema()
const { data } = await supabase.schema('humanos').from('employee_profiles').select('*')
```

Para queries a `public.people`, usar el client normal sin `.schema()`.

## Usuarios y Roles

### Empleado (todos)
- Ve su propio perfil con toda su información
- Puede crear solicitudes (vacaciones, permisos, actualización de datos, etc.)
- Ve el estado de sus solicitudes
- Ve el directorio de empleados (solo datos básicos, no sensibles como salario)
- Ve la base de conocimiento (qué formulario usar para qué)

### HR Admin (Samantha Kosmas, Rocío Olmedo, Milagros Manyoma, Jerelyn Mendoza)
- Todo lo del empleado PLUS:
- Ve TODOS los perfiles completos
- Ve TODAS las solicitudes de todos los empleados
- Aprueba/rechaza solicitudes
- Edita perfiles de empleados
- Ve dashboard con métricas

### Supervisor (jefes de departamento)
- Todo lo del empleado PLUS:
- Aprueba solicitudes de sus subordinados directos
- Ve perfiles de sus subordinados

## Autenticación

Usar Supabase Auth (mismo sistema que MovimientOS). Los empleados que ya tienen auth_id pueden acceder. Para el MVP, el login es por email + password. La función `get_my_app_role()` existe pero es de MovimientOS. Para HumanOS, determinar el rol así:
- Si el person.id está en la lista de HR admins → hr_admin
- Si el person tiene subordinados (other people.supervisor_id = person.id) → supervisor
- Default → employee

## Páginas del MVP

### 1. Login (/login)
- Email + password vía Supabase Auth
- Después de login, redirigir a /inicio
- UI limpia, logo ICONSA, colores corporativos (amarillo #F5A623, azul oscuro #1B3A5C)

### 2. Inicio (/inicio) — Landing page post-login
- Saludo personalizado: "Hola, [nombre]"
- Cards rápidas:
  - "Mi Perfil" → /perfil
  - "Nueva Solicitud" → /solicitudes/nueva
  - "Mis Solicitudes" → /solicitudes
  - "Directorio" → /directorio
- Si es HR admin: card adicional "Dashboard RRHH" → /admin
- Si tiene solicitudes pendientes de aprobar: badge con count

### 3. Mi Perfil (/perfil)
- Muestra TODA la información del empleado logueado
- Datos de public.people: nombre, código, departamento, cargo, email, teléfono, cédula, fecha de contratación
- Datos de humanos.employee_profiles: cargo detallado, educación, fecha de nacimiento, nacionalidad, estado civil, dependientes, tipo de sangre, dirección, seguro social
- Sección "Mis Solicitudes Recientes" con las últimas 5
- Botón "Actualizar Datos" que abre el formulario de ACTUALIZACION_DATOS

### 4. Directorio de Empleados (/directorio)
- Lista de TODOS los empleados activos
- Búsqueda por nombre
- Filtros: departamento, cargo, proyecto/oficina
- Card de cada empleado: foto (placeholder si no hay), nombre, cargo, departamento, email, teléfono
- Click → perfil público (sin datos sensibles como salario, cédula)

### 5. Nueva Solicitud (/solicitudes/nueva)
- Grid de tipos de solicitud (de humanos.request_types)
- Agrupados por categoría: permisos, datos, documentos, compensación, acciones, desarrollo
- Cada tipo muestra: icon, nombre, descripción corta
- Click → formulario específico del tipo
- Los formularios son dinámicos — pero para el MVP, implementar al menos:

#### 5a. Solicitud de Vacaciones (ICRHF0503)
Campos del formulario real de ICONSA:
- Nombre del empleado (auto-filled del perfil)
- No. Cédula (auto-filled)
- Tipo de pago: radio buttons → "Completas" | "Adelanto sobre acumulado" | "Descuento de días solicitados"
- Tiempo solicitado: radio → "Completas" | "Parciales"
- Desglose de períodos (hasta 3): Fecha inicio (Del) + Fecha fin (Al) para cada período
- Días calculados automáticamente de cada período
- Observaciones (textarea)
- Mostrar: días disponibles según antigüedad (Panama: 1 día por cada 11 trabajados, se calcula de hire_date)
- Flujo de aprobación según SOP ICRHPO05 sección 5.8-5.9: Empleado envía → Planilla verifica acumulados → Gerente de Proyecto aprueba/rechaza → Gerente General autoriza → RRHH distribuye resumen

#### 5b. Actualización de Datos (ICRHF0007)
Campos del formulario real:
- Nombre completo (auto-filled, read-only)
- Cédula (auto-filled, read-only)
- Dirección: Calle/Barriada + Apartamento/Casa No.
- Teléfono de casa
- Celular personal
- Estado civil: radio → Soltero(a) | Casado(a) | Unido(a)
- Nombre de esposo(a)/compañero(a)
- Teléfono/celular del esposo(a)
- Dependientes: lista editable (nombre + parentesco)
- NO requiere aprobación formal — va directo a HR para procesar (solo lectura/aceptación)

#### 5c. Acción de Personal (ICRHF0501)
Formulario multi-propósito. Campos reales:
- Nombre (auto-filled)
- Cédula (auto-filled)
- Departamento/Proyecto (auto-filled, editable)
- Tipo de acción: checkboxes (seleccionar uno o más):
  - Aumento de Salario
  - Autorización de Horas Extras
  - Permisos
  - Descuento
  - Despido
  - Orden de Liquidación
- Si "Orden de Liquidación": campo adicional "nombre del empleado y último día de labores"
- Observaciones (textarea obligatorio — explicar la acción)
- Flujo según SOP ICRHPO05 sección 5.1: Empleado o Supervisor llena → Supervisor inmediato aprueba → Gerente General aprueba → RRHH recibe → Planillas procesa

#### 5d. Solicitud de Préstamo (ICRHF0502)
Campos reales:
- Nombre del empleado (auto-filled)
- No. Cédula (auto-filled)
- Monto solicitado (numérico, máx $250 por defecto, más requiere aprobación Gerencia)
- Descuento propuesto por bisemana
- Motivo de la solicitud (textarea obligatorio — debe ser necesidad, no deuda)
- Flujo según SOP ICRHPO05 sección 5.4-5.7: Empleado → Supervisor (mérito + tiempo restante de empleo) → RRHH (evalúa beneficio social, verifica no otras deudas) → Gerencia General autoriza pago

### 6. Mis Solicitudes (/solicitudes)
- Lista de solicitudes del empleado logueado
- Filtros: tipo, estado
- Cada solicitud muestra: número, tipo, fecha, estado (badge con color)
- Click → detalle con timeline de aprobaciones

### 7. Base de Conocimiento (/ayuda)
- Lista de todos los tipos de solicitud con:
  - Nombre
  - Descripción detallada
  - Para qué sirve
  - Qué necesitas para solicitarlo
  - Referencia al SOP (ICRHF0503, etc.)
  - Quién aprueba
- Búsqueda
- FAQ basado en los SOPs reales de ICONSA:
  - "¿Cómo solicito vacaciones?" → Llenar ICRHF0503. Staff de proyectos: proporcional según asignaciones. Permanentes: programar fecha anual.
  - "¿Cómo actualizo mis datos?" → Llenar ICRHF0007 cuando cambien datos personales.
  - "¿Cómo pido un préstamo?" → Llenar ICRHF0502. Máximo $250. Solo para necesidades (no deudas). Descuento bisemanal.
  - "¿Cómo solicito horas extras?" → Usar Acción de Personal ICRHF0501, marcar "Autorización de Horas Extras".
  - "¿Qué tipos de contrato hay?" → Definido, Indefinido, Por Obra, Servicios Profesionales (ver ICRHD05 para prestaciones de cada uno).
  - "¿Cómo se calcula el ISR?" → Ver ICRHD04 folleto informativo. Depende de ingreso anual estimado.
  - "¿Cuáles son las normas del comedor?" → Ver ICRHD06 (30 min, horario designado, mantener limpieza).
  - "¿Qué pasa si me amonestan?" → Verbal → Escrita → Suspensión → Despido. Formulario ICRHF0504.
  - "¿Qué documentos necesito al entrar?" → Cédula, CSS, licencia (si aplica), certificaciones. Ver ICRHF0109.
  - "¿Cómo organizo mi expediente?" → Ver ICRHIT01. Lado izquierdo: documentos legales. Lado derecho: acciones, certificaciones, préstamos.
- Categorías: Permisos y Vacaciones, Compensación, Datos Personales, Documentos, Capacitación, Vida en ICONSA

### 8. Dashboard RRHH (/admin) — Solo HR admins
- KPIs: total empleados activos, solicitudes pendientes, solicitudes esta semana
- Lista de solicitudes pendientes de aprobación
- Acceso rápido a directorio con edición
- Tabla de empleados con filtros avanzados

### 9. Aprobación de Solicitudes (/admin/solicitudes/[id])
- Detalle completo de la solicitud
- Información del solicitante
- Botones: Aprobar / Rechazar / Solicitar más información
- Campo de comentarios

## Navegación

- Sidebar en desktop, bottom tabs en mobile (PWA)
- Items: Inicio, Directorio, Solicitudes, Ayuda, Mi Perfil
- HR admins ven tab adicional: Admin

## UI/UX

- Mobile-first (los empleados de campo usan celular)
- Colores ICONSA: amarillo #F5A623, azul oscuro #1B3A5C, gris claro #F5F5F5
- Tipografía: Inter o similar sans-serif
- Todo el texto UI en español
- Badges de estado con colores: Borrador (gris), Enviada (azul), En Revisión (amarillo), Aprobada (verde), Rechazada (rojo)
- Loading states y empty states en todas las páginas
- Toast notifications para acciones exitosas/errores

## Lo que NO incluir en MVP
- Sistema de notificaciones por email/WhatsApp (futuro)
- Upload de fotos (futuro)
- Chat entre usuarios (futuro)
- Revista/eventos/cumpleaños (futuro)
- Cálculo de liquidaciones (requiere validación de abogado)
- Cálculo de ISR (requiere validación de abogado)
- Evaluaciones de desempeño (módulo futuro)
- Capacitaciones (módulo futuro)
- Encuestas (módulo futuro)

## Setup de Claude Code — replicar de MovimientOS

El repo hermano (MovimientOS) usa esta estructura probada. Replicar:

### CLAUDE.md (~100-130 líneas)
- Tech stack, directory structure, key commands (dev, build, lint, test)
- Reference docs table pointing to feature specs
- Coding conventions (TypeScript strict, functional components, Server Components by default, Tailwind)
- Design tokens (mismos colores ICONSA: Navy #1B3A5C, Gold #F0A500 aka #F5A623)
- Roles del sistema (employee, supervisor, hr_admin)
- Reglas críticas (max 15, en español)
- Source of truth: Supabase MCP para schema, feature spec para reglas de negocio

### .claude/rules/ — copiar de MovimientOS y adaptar:
- `supabase-readonly.md` — nunca escribir a BD desde Code
- `commit-after-step.md` — commit después de cada step completado
- `git-workflow.md` — branches, commit format (feat:, fix:, docs:)
- `plan-lifecycle.md` — cómo manejar planes de Superpowers
- `spec-lifecycle.md` — cómo manejar specs
- `tool-usage.md` — modelo 3 actores, cuándo usar qué herramienta

### .claude/skills/ — empezar vacío, crear a medida que surjan patrones:
- NO copiar skills de MovimientOS (crud-page, events-page, etc.) — son específicos de logística
- Crear skills después cuando identifiquemos patrones repetibles en HumanOS

### .claude/commands/
- `deploy-check.md` — copiar de MovimientOS
- `fix-bug.md` — copiar de MovimientOS

### Superpowers — fork pcvelz/superpowers
```bash
/plugin marketplace add pcvelz/superpowers-marketplace  
/plugin install superpowers@superpowers-marketplace
```
Plan Mode nativo DESACTIVADO. Todo flow de planificación pasa por Superpowers.

### Docs/
```
Docs/
├── TRAIL.md           — posición actual en árbol de tareas
├── CHANGELOG.md       — log de sesiones + [bd-pending]/[bd] para SQL
├── BACKLOG.md         — pendientes
├── superpowers/
│   ├── specs/         — specs de brainstorming
│   └── plans/         — planes de ejecución
└── feature-specs/     — specs modulares por módulo (200-400 líneas)
    ├── directorio.md
    ├── solicitudes.md
    └── knowledge-base.md
```
