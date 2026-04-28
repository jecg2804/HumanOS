# HumanOS Changelog

Formato: cada sesión agrega una entrada con fecha. Para cambios de BD usar `[bd]` (Code aplica directo en branch).

---

## 2026-04-28 — Branch + schema inicial

### [bd] Branch Supabase aislado
- Creado branch `humanos-dev` en Supabase, project_ref `woonbmfmconldxbeqdnr`.
- Costo: $0.01344/hr.
- Aislamiento: NO comparte data con producción (`bzeoszympkkicwlfdtcn`) ni staging.

### [bd] Schema `humanos` creado desde cero en el branch
- `humanos.people` — tabla consolidada con identidad + datos personales + laborales (28 columnas). 239 empleados migrados desde `ICONSA EmployeeDatabase version datos.xlsx` (sheet "Database"): 52 activos, 187 históricos. Emails limpiados de prefijo `mailto:` residual del Excel. Duplicados por re-contratación disambiguados con sufijo numérico (Hector Pino 2, Marisa Pozza 2, Stefani Madrid 2, Jorge Torres 2, Argelia Ugarte 2, Andrés Solís 2). RLS habilitado, audit columns (`created_at`, `updated_at`, trigger).
  - **Deuda técnica documentada** en `CLAUDE.md`: tabla mal normalizada (1 tabla con 28 cols mezclando 3 dominios). Aceptado para velocidad del MVP. Code puede normalizar si bloquea.
- `humanos.request_types` — 12 tipos de solicitud seeded con sop_reference, approval_chain, category, icon. Tipos: VACACIONES, PERMISO, ACTUALIZACION_DATOS, CONSTANCIA_TRABAJO, HORAS_EXTRAS, PRESTAMO, ACCION_PERSONAL, RECLAMO_PAGO, LIQUIDACION, REFERENCIA_LABORAL, CAPACITACION, ENTREVISTA_SALIDA.
- `humanos.requests` — solicitudes. FKs a request_types y people. form_data JSONB. Estados: Borrador → Enviada → En Revisión → Aprobada/Rechazada → Completada/Cancelada.
- `humanos.request_approvals` — cadena de aprobaciones por solicitud. FK approver_id → people. decision: Pendiente/Aprobada/Rechazada/Solicita Info.
- `humanos.sequences` — auto-numeración (formato HUM-YYYY-NNNN).

### Repo
- 39 SOPs y formularios de RRHH agregados a `Docs/SOPs, Formularios y Documentos/` (PDFs originales de ICONSA). Code los consulta directamente cuando trabaja en cada formulario.
- `CLAUDE.md`, `humanos-mvp-spec.md`, `.claude/rules/supabase-branch.md`, `Docs/CHANGELOG.md` actualizados para reflejar arquitectura branch + DDL/DML libre en `humanos.*`.
- `.claude/rules/supabase-readonly.md` REMOVIDO (reemplazado por `supabase-branch.md`).
- `Docs/feature-specs/MODULE-1-SOLICITUDES.md` creado — guía priorizada de los 5 forms P1.
