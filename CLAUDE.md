# HumanOS — Plataforma de RRHH de ICONSA

App interna de RRHH para Ingeniería Continental S.A. (ICONSA), empresa de construcción pesada en Panamá (~200 empleados). Reemplaza Excel y procesos manuales. Comparte BD Supabase con MovimientOS (app de logística en producción).

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Base de datos | Supabase PostgreSQL (schema `humanos` + shared `public.people`) |
| Auth | Supabase Auth (compartido con MovimientOS) |
| Deploy | Vercel |

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check
```

## Directory Structure

```
src/
├── app/             # Next.js App Router pages
│   ├── (app)/       # Authenticated layout (sidebar/bottom tabs)
│   │   ├── inicio/
│   │   ├── directorio/
│   │   ├── perfil/
│   │   ├── solicitudes/
│   │   ├── ayuda/
│   │   └── admin/
│   └── login/
├── components/      # Reusable UI components
├── hooks/           # Custom hooks (useEmployee, useRequests, etc.)
├── lib/             # Supabase clients, utilities
│   ├── supabase/    # Client configs (public + humanos schemas)
│   └── utils/       # Helpers
└── types/           # TypeScript interfaces
```

## Database — 2 schemas

### Schema `public` (compartido, NO MODIFICAR)
- `people` — 182 empleados. Identidad base: name, code, email, cedula, hire_date, department, position, supervisor_id, auth_id, status
- `projects` — Proyectos de ICONSA

### Schema `humanos` (nuestro)
- `employee_profiles` — Datos HR extendidos. FK: person_id → people.id. 36 registros con data importada.
- `request_types` — 12 tipos de solicitud (vacaciones, permisos, acciones de personal, préstamos, etc.)
- `requests` — Solicitudes RRHH. form_data JSONB dinámico por tipo. Status: Borrador → Enviada → En Revisión → Aprobada/Rechazada → Completada
- `request_approvals` — Cadena de aprobaciones por solicitud
- `sequences` — Auto-numeración de solicitudes

### Supabase client usage
```typescript
// Para schema humanos
const humanos = createClient(url, key, { db: { schema: 'humanos' } })
// Para schema public (people, projects)  
const supabase = createClient(url, key)
// O per-query
const { data } = await supabase.schema('humanos').from('employee_profiles').select('*')
```

## Source of truth

| Recurso | Uso |
|---------|-----|
| Supabase MCP | Schema actual. Consultar antes de tocar BD. |
| humanos-mvp-spec.md | Reglas de negocio, formularios, flujos. |

## Coding Conventions

- TypeScript strict. No `any`.
- Functional components, Server Components by default. `'use client'` solo con interactividad.
- Tailwind para estilos. No CSS modules.
- Todos los IDs son UUID (`gen_random_uuid()`).
- Todas las tablas: `created_at` + `updated_at` con trigger.
- RLS habilitado en todas las tablas.
- Nombres de variables en **inglés**. UI y comentarios en **español**.
- Named exports, never default exports.

## Design Tokens

```
Navy:   #1B3A5C  (primary — headers, nav)
Gold:   #F5A623  (accent — ICONSA brand)
Blue:   #0A6EBD  (info, links, Enviada)
Green:  #1A7F5A  (success, Aprobada)
Orange: #B45309  (warning, En Revisión)
Red:    #C0392B  (error, Rechazada)
Gray:   #5A6272  (secondary text)
```

## 3 Roles del Sistema

| Rol | Quién | Acceso |
|-----|-------|--------|
| employee | Todos los empleados | Mi perfil, directorio, mis solicitudes, knowledge base |
| supervisor | Jefes de departamento | + Aprobar solicitudes de subordinados |
| hr_admin | Samantha, Rocío, Milagros, Jerelyn | + Ver todo, aprobar todo, editar perfiles, dashboard |

## Reglas Críticas

1. **NUNCA modificar `public.people` desde código.** Solo leer. Cambios de BD van por Claude Chat.
2. **UI 100% español.** Botones, labels, mensajes, placeholders.
3. **Mobile-first.** Empleados acceden desde celular.
4. **form_data es JSONB dinámico** — cada request_type tiene campos diferentes.
5. **Approval chain viene de request_types.approval_chain[]** — no hardcodear.
6. **Redirect después de enviar solicitud** → lista de mis solicitudes.
7. **Filtrar request_types por is_active = true** en la UI.
8. **Knowledge base muestra TODOS los tipos** con descripción, SOP reference, y quién aprueba.
