# Admin viewer approval chains F39: read-only en MVP (NUEVO)

> Origin: Chat-level ADR-0013 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted
**Date**: 2026-05-27

**Decisión**: Implementar admin viewer Nivel A read-only en MVP. Edit JSON raw (B) + Visual editor (C) diferidos a v1.1/v2.

### Niveles

| Nivel | Esfuerzo | Entrega | Versión |
|---|---|---|---|
| **A. Read-only viewer** | Trivial | `/admin/tipos/[code]` muestra cada tipo con: form_schema preview (campos), approval_chain visual (steps con role+SLA), SOP referencia link | **MVP F39** |
| B. Edit JSON raw | Bajo | + Botón "Editar JSON" con textarea + validación server-side. Para hr_admin avanzado | v1.1 |
| C. Visual editor | Alta | Drag-drop steps, dropdowns resolver, sliders SLA, condicionales visuales | v2 |

### Justificación

- Samantha necesita visibilidad de qué está configurado (Nivel A da 80% del valor)
- Pattern industria: BambooHR/Workday tienen workflow designer pero es feature de años
- En MVP, James edita JSONB directo cuando Samantha pide cambios
- Cuando Samantha tenga feedback real de uso, decidimos Nivel B (cuál UX prefiere ella editar)

### Alternativa descartada

Implementar Nivel C en MVP. Sobre-engineering. Samantha primero necesita USAR el sistema antes de tener opinión informada de qué editor visual quiere.
