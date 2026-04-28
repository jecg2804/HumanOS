# HumanOS — Plataforma de RRHH de ICONSA

App interna de RRHH para Ingeniería Continental S.A. (ICONSA), empresa de construcción pesada en Panamá (~239 empleados históricos, 52 activos). Reemplaza Excel y procesos manuales (papel, WhatsApp). El stakeholder principal es Samantha Kosmas (Gerente RRHH).

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind |
| Base de datos | Supabase PostgreSQL — branch aislado |
| Auth | Supabase Auth |
| Email | Resend (`noreply@rein-eisenwerk.com`) |
| Deploy | Vercel |
| Mobile | Mobile-first; PWA service worker fuera de scope para MVP |

## Commands

```bash
npm run dev          # Dev server (puerto 3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check
```

## Base de datos — Supabase branch aislado

**Branch**: `humanos-dev` — `project_ref: woonbmfmconldxbeqdnr`

Este branch es independiente. NO comparte data con producción (`bzeoszympkkicwlfdtcn`) ni staging (`vonwkciosksqspyljzfy`). Code tiene **DDL/DML completo** sobre el schema `humanos` de este branch — puede crear tablas, columnas, índices, triggers, RLS, lo que necesite.

### Schema actual

```
humanos.people           -- 239 empleados (52 activos / 187 históricos). Identidad + datos personales + datos laborales en una sola tabla. Ver "Deuda técnica" abajo.
humanos.request_types    -- 12 tipos de solicitud (VACACIONES, PERMISO, ACCION_PERSONAL, PRESTAMO, ACTUALIZACION_DATOS, RECLAMO_PAGO, etc.). Cada uno con sop_reference, approval_chain, requires_approval, category.
humanos.requests         -- Solicitudes. type_id → request_types, requester_id → people. form_data JSONB dinámico. Estados: Borrador → Enviada → En Revisión → Aprobada/Rechazada → Completada/Cancelada.
humanos.request_approvals -- Cadena de aprobaciones por solicitud. approver_id → people. decision: Pendiente/Aprobada/Rechazada/Solicita Info.
humanos.sequences        -- Auto-numeración (request_number tipo HUM-2026-0001).
```

### Cliente Supabase
```typescript
// Para schema humanos
const humanos = createClient(url, key, { db: { schema: 'humanos' } })
// O per-query
const { data } = await supabase.schema('humanos').from('people').select('*')
```

### Deuda técnica conocida — `humanos.people` mal normalizada
Hoy es una sola tabla con ~28 columnas mezclando identidad, datos personales y datos laborales. El diseño correcto sería split en:
- `people` (id, name, code, cedula, email, phone, status)
- `employment` (person_id, hire_date, office, department, job_title, job_status, supervisor_id, hiring_source, termination_date, termination_reason)
- `personal` (person_id, dob, gender, marital_status, num_kids, blood_type, education, nationality, address, city, country, emergency_contact)

**Decisión actual**: lo dejamos pasar para velocidad del MVP. Si durante la implementación es claramente bloqueante, Code puede normalizar (libre en branch). De lo contrario, queda como tarea post-MVP.

### Workflow de cambios de BD
- En el branch: Code aplica DDL/DML libremente vía Supabase MCP.
- Cada cambio de BD se documenta en `Docs/CHANGELOG.md` con entrada `[bd]` (no `[bd-pending]`, porque Code SÍ tiene permiso en este branch).
- Producción y schemas `public/hr/payroll` están BLOQUEADOS — no tocar.

## Source of truth

| Recurso | Uso |
|---------|-----|
| Supabase MCP | Schema actual del branch. Consultar antes de tocar BD. |
| `humanos-mvp-spec.md` | Reglas de negocio, formularios, flujos. |
| `Docs/SOPs, Formularios y Documentos/` | 39 PDFs oficiales: SOPs y formularios físicos de RRHH. Code DEBE leer los relevantes (ej. `IC-RH-F-05-03 Solicitud de Vacaciones.pdf`) cuando trabaje en cada formulario. |
| `Email_RRHH_app_request.pdf` | Requirements originales de Samantha. |
| `Organigram_ICONSA.pdf` | Estructura organizacional para approval chains. |

## Coding Conventions

- TypeScript strict. No `any`.
- Functional components, Server Components by default. `'use client'` solo con interactividad.
- Tailwind para estilos. No CSS modules.
- Todos los IDs son UUID (`gen_random_uuid()`).
- Todas las tablas: `created_at` + `updated_at` con trigger.
- RLS habilitado en todas las tablas.
- Nombres de variables en **inglés**. UI y comentarios en **español**.
- Named exports, never default exports.

## Design Tokens (idénticos a MovimientOS)

```
Navy:   #1B3A5C  (primary — headers, nav)
Gold:   #F5A623  (accent — ICONSA brand)
Blue:   #0A6EBD  (info, links, Enviada)
Green:  #1A7F5A  (success, Aprobada)
Orange: #B45309  (warning, En Revisión)
Red:    #C0392B  (error, Rechazada)
Gray:   #5A6272  (secondary text)
```

## Roles del Sistema

| Rol | Quién | Acceso |
|-----|-------|--------|
| `employee` | Todos los empleados | Mi perfil, directorio, mis solicitudes, knowledge base |
| `supervisor` | Jefes de departamento | + Aprobar solicitudes de subordinados |
| `hr_admin` | Samantha Kosmas, Rocío Olmedo, Milagros Manyoma, Jerelyn Mendoza | + Ver todo, aprobar todo, editar perfiles, dashboard, expediente completo |

Determinación del rol al login:
- Si `people.code` ∈ {`KOSM01`, `OLM206`, `MAN943`, `MEN943`} → `hr_admin`
- Si tiene subordinados (`SELECT 1 FROM people WHERE supervisor_id = me.id`) → `supervisor`
- Default → `employee`

## Reglas Críticas

1. **NO tocar producción.** Solo trabajar contra el branch `woonbmfmconldxbeqdnr`. NUNCA escribir contra `bzeoszympkkicwlfdtcn`.
2. **NO tocar schemas `public`/`hr`/`payroll`.** Solo `humanos.*` en el branch.
3. **UI 100% español.** Botones, labels, mensajes, placeholders, errores.
4. **Mobile-first.** Empleados acceden desde celular. Probar en viewport 375px.
5. **`form_data` es JSONB dinámico** — cada `request_type` tiene campos diferentes; renderizado del form viene de la definición del tipo.
6. **Approval chain viene de `request_types.approval_chain[]`** — no hardcodear.
7. **Filtrar `request_types.is_active = true`** en la UI.
8. **Knowledge base muestra TODOS los tipos** con descripción, sop_reference y aprobador.
9. **Leer el SOP antes de implementar el form.** Para Vacaciones leer `IC-RH-F-05-03 Solicitud de Vacaciones.pdf`. Para Préstamo leer `IC-RH-F-05-02 Prestamo a Empleados.pdf` Y `IC-RH-D-02 Condiciones especiales para la solicitud de prestamo de empleado.pdf` (regla del max $250). Etc.
