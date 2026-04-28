# Rule: Supabase — Branch isolation

Code trabaja contra un branch dedicado de Supabase para HumanOS. **NO toca producción ni staging.**

## Permisos

| Recurso | Permiso de Code |
|---------|-----------------|
| Branch `humanos-dev` (project_ref `woonbmfmconldxbeqdnr`), schema `humanos.*` | **DDL + DML completo** vía Supabase MCP |
| Mismo branch, schemas `public`, `hr`, `payroll` | **PROHIBIDO** — no leer ni escribir |
| Producción (`bzeoszympkkicwlfdtcn`) | **PROHIBIDO** — no conectar |
| Staging (`vonwkciosksqspyljzfy`) | **PROHIBIDO** — no conectar |

## Flujo de cambios de BD

Code es libre de:
- Crear nuevas tablas en `humanos.*`
- Agregar columnas, índices, constraints
- Crear triggers, funciones, vistas
- Habilitar/ajustar políticas RLS
- Insertar/actualizar datos seed

**Cada cambio se documenta en `Docs/CHANGELOG.md`** con entrada `[bd]` (no `[bd-pending]` — Code SÍ tiene permiso). Formato:

```
### [bd] 2026-04-28
- Creada tabla humanos.attachments para adjuntos de solicitudes (FK request_id, file_url, mime_type, size_bytes).
- RLS habilitado: empleado ve solo sus propios attachments; hr_admin ve todos.
```

## Queries

- Verificar schema vía Supabase MCP **antes** de tocar código que interactúa con BD. NUNCA asumir estructura.
- Para `humanos.*`: usar `.schema('humanos').from('table')` o un client con `db.schema = 'humanos'`.
- Si el query falla con permission denied — verificar que estás en el branch correcto, no en producción.

## Por qué este aislamiento

MovimientOS está en producción con 17 usuarios diarios. El branch nos da libertad de iterar HumanOS rápido sin riesgo. Cuando HumanOS esté listo para promover, decidiremos si hacer merge al main project o mantenerlo separado.
