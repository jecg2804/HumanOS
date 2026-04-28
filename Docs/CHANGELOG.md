# HumanOS — Changelog

## 2026-04-28 — Chat: Schema + Data Import

### Schema `humanos` creado [bd]
- `humanos.employee_profiles` — datos HR extendidos, FK a public.people
- `humanos.request_types` — 12 tipos de solicitud con SOP references
- `humanos.requests` — solicitudes con form_data JSONB
- `humanos.request_approvals` — cadena de aprobaciones
- `humanos.sequences` — auto-numeración
- RLS habilitado en todas las tablas
- GRANTs ejecutados para anon, authenticated, service_role

### Data import [bd]
- public.people enriquecida: 35 con cédula, 37 con hire_date (antes: 0)
- 36 employee_profiles creados del Excel de Samantha
- 12 request_types seeded con referencias a SOPs de ICONSA
