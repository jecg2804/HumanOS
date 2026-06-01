# Eliminar app_role 'supervisor' (propiedad emergente, no rol fijo) (NUEVO)

> Origin: Chat-level ADR-0014 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted
**Date**: 2026-05-27

`hr.employments.app_role` CHECK constraint reducido a 4 valores: `employee`, `hr_admin`, `president`, `admin`. **Eliminado `'supervisor'`** como valor distinto.

### Razón

"Ser supervisor" es **propiedad emergente**, NO rol fijo:
- Persona X es supervisor de Y si `hr.employments.supervisor_id = X AND person_id = Y AND is_current`
- Persona X aprueba un ticket específico si fue seleccionada en `selected_supervisor_id` por el solicitante
- UI muestra tab "Por aprobar" automáticamente si hay rows en `requests.approvals.approver_id = X`, sin importar app_role

### Implicaciones

- 184 empleados activos son `employee` regular (algunos circunstancialmente tienen reportes directos)
- Helper function nueva `hr.has_direct_reports()` para mostrar tab "Mi Equipo" en perfil
- RLS policies migrar de `app_role = 'supervisor'` a `hr.is_supervisor_of()` o `hr.has_direct_reports()`

### Migration aplicada

016_fix_hr_team_app_roles_and_constraint: SCD-2 corrección equipo HR (4 → hr_admin, Rodrigo → president), CHECK constraint con 4 valores.
