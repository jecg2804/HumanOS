# Manual entry F32 sin column nueva: files.uploads polimórfico (AJUSTADO)

> Origin: Chat-level ADR-0012 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted (revised 2026-05-27)
**Date**: 2026-05-26 inicial, 2026-05-27 final

hr_admin crea solicitud en nombre de empleado vía `/admin/solicitudes/manual-entry`.

**Schema**:
- `requests.tickets.manual_entry boolean NOT NULL DEFAULT false`
- `requests.tickets.created_by_hr_admin uuid REFERENCES hr.people(id)`

**Foto del original**: usa `files.uploads` polimórfico con `category='original_paper_form'`. NO se crea columna `original_paper_attachment_id` (eliminada del diseño inicial). Pattern consistente con todo otro upload del sistema.

**Razón cambio**: una columna específica sería single-purpose. `files.uploads` ya es polimórfico (`entity_schema + entity_table + entity_id`) y soporta múltiples adjuntos por ticket. Constraint `files.uploads.category` CHECK con 13 valores válidos enforced (migration 024).

**Audit completo**: `audit.log` registra `actor_id=hr_admin`, `record_id=ticket_id`, `metadata={manual_entry: true, original_paper_uploads: [<files.uploads.id>]}`.

**Razón business**: realidad operacional ICONSA = personal campo sin app + supervisores acostumbrados papel + transición papel-digital gradual.

> El comportamiento de runtime (el ticket nace `Aprobada`, ApprovalEngine no inserta filas en `requests.approvals`) se detalla en `0005-manual-entry-bypass-chain.md`. Este ADR cubre la decisión de **schema** (qué columnas / dónde vive la foto); 0005 cubre la decisión de **comportamiento**.
