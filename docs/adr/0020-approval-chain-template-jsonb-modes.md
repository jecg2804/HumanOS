# Approval chain template JSONB con modes finales (REESCRITO)

> Origin: Chat-level ADR-0011 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted (revised 2026-05-27)
**Date**: 2026-05-26 inicial, 2026-05-27 final
**Supersedes**: versión inicial con `sequential` + threshold lógica

`requests.types.approval_chain_template` JSONB con estructura:

```json
{
  "mode": "parallel" | "direct_hr_admin" | "any_of_hr" | "parent_only",
  "visibility": "universal",
  "steps": [
    {
      "step_id": 1,
      "role": "supervisor" | "hr_admin" | "president",
      "resolver": "selected_supervisor_id" | "any_hr_admin" | "president_user",
      "sla_hours": 72,
      "required": true
    }
  ]
}
```

### Modes (3 + parent_only)

| Mode | Comportamiento |
|---|---|
| `parallel` | Todos stakeholders notificados día 0. Aprobada cuando TODOS required = approved. Rechazada si ALGUNO = rejected |
| `direct_hr_admin` | Sin chain, cualquier hr_admin actúa |
| `any_of_hr` | Idéntico a direct (semantic distinct para documentos) |
| `parent_only` | Tipo parent (ACCION_PERSONAL), sub-tipos llevan chain real |

### Decisiones clave incorporadas

1. **Eliminado mode `sequential`**: no aplica al pattern HumanOS donde RRHH siempre debe ver desde día 0
2. **$250 PRESTAMO NO bloqueante** — cap operacional. TODOS los préstamos van al chain completo paralelo
3. **President día 0** cuando aplica (no como step final) — paralelo total
4. **R26 SOP-driven**: chain refleja SOP papel. NO desviarse sin validar con Samantha
5. **`allow_supervisor_override = true`** en todos los tipos con step supervisor — solicitante elige supervisor real del ticket (no hardcoded de `hr.employments.supervisor_id`)
6. **Eliminado `'supervisor'` como app_role** — emerge contextualmente de `selected_supervisor_id` o `supervisor_id` en employments (ver `0023-eliminate-app-role-supervisor.md`)

### Resolvers

- `selected_supervisor_id` — usa `tickets.selected_supervisor_id` (override solicitante), fallback `hr.employments.supervisor_id`
- `any_hr_admin` — cualquier `app_role='hr_admin'`
- `president_user` — `app_role='president'` (Rodrigo único MVP)

### Decisión "Gerencia General" pending Samantha (v1.1)

Si Samantha confirma incluir Javier Ferrer (VP) u otros gerentes:
- Opción A: extender `resolver` a `gerencia_user_list` con array UUIDs paralelo
- Opción B: cambiar `app_role` de FER337 + otros gerentes a `'president'`
- Decisión post-MVP en F39-B v1.1 cuando Samantha tenga claridad uso real

### Decisiones humanas de approval-chain (BL-2..7)

Estado al 2026-06-01:

- **BL-2 (presidente self-approval) — DECIDIDO**: cuando el solicitante ES el presidente, se **omite el paso de aprobación del presidente** y se registra un **flag de auditoría** en `audit.log` (no existe autoridad superior al presidente sobre la cual encadenar). El chain no incluye un step de auto-aprobación del presidente.
- **BL-3 — PENDIENTE (James/Samantha)**: `form_schema` source definitivo en los 8 seeds de `requests.types`.
- **BL-4 — PENDIENTE (James/Samantha)**: `requests.next_ticket_number` + reset anual del `request_number`.
- **BL-5 — PENDIENTE (James/Samantha)**: enum `Devuelta_Info` huérfano — confirmar si se usa o se elimina.
- **BL-6 — PENDIENTE (James/Samantha)**: reglas de SLA + escalación cuando un step vence.
- **BL-7 — PENDIENTE (James/Samantha)**: reglas de delegación de aprobaciones.

BL-3..7 deben cerrarse antes de construir los forms president-gated / money (Group 6). Tracking en `../STATUS.md` (§Backlog).
