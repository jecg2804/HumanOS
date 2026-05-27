---
name: iconsa-business-rules
description: Apply the 26 critical business rules (R1-R26) of HumanOS / ICONSA before writing migrations, RLS policies, approval logic, ticket state transitions, auth.users operations, or anything touching the HumanOS database. Use whenever the prompt mentions approval, ticket, prestamo, vacaciones, accion personal, request_number, sello, supervisor, hr_admin, president, allowed_apps, auth.users, schema, RLS, policy, or any R1-R26 reference.
---

# ICONSA Business Rules enforcement

Read the rules from `docs/05-BUSINESS-RULES.md` before acting. This skill is a checklist + critical reminders. The full text lives in the doc.

## Critical rules (block immediately if violated)

**R1 - Schemas prohibited**: NEVER write to `public.*`, `payroll.*`, `humanos.*`. Hook `PreToolUse` blocks. If a write fails with "BLOCKED: Write to prohibited schema", check schema name. Allowed schemas: `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*`, `mdm.*`, `etl.*`, `backup.*`.

**R5 - No self-approval**: `approver_id != requester_id`. Enforced in ApprovalEngine code, NOT BD constraint. If implementing approval logic, validate this explicitly.

**R13 - Sensitive docs**: `hr.medical_info` and `hr.personal_documents` are RESTRICTED. SELECT only by owner + hr_admin. NEVER expose in directorio, supervisor views, or generic queries.

**R22 - auth.users destructive ops**: `DELETE` or mass `UPDATE` on `auth.users` REQUIRES filter by `raw_app_meta_data->'allowed_apps'` (SQL direct) or `app_metadata->'allowed_apps'` (JS / RLS). Snapshot to `backup.auth_users_YYYYMMDD` before. Hook blocks unfiltered destructive ops. Incident 2026-05-25 erased 47 users — do not repeat.

**R23 - Encoding**: All config files (.json, .ps1, .md, .ts, .tsx, .css) MUST be UTF-8 without BOM. Hooks `.ps1` MUST be ASCII pure (no em-dash, no accents, no smart quotes). Use `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))` in PowerShell 5.1.

**R26 - SOP-driven chains**: NEVER deviate from SOP-defined approval chains without consulting James. If SOP says "Gerencia General", add a `president` step. Excepciones documented in `docs/05-BUSINESS-RULES.md`.

## Important rules (check before acting)

**R4 - Préstamo $250**: $250 is operational cap, NOT escalation threshold. ALL loans go through full chain (supervisor + hr_admin + president). No threshold logic in ChainResolver.

**R6 - Fallback supervisor**: If `selected_supervisor_id IS NULL`, hr_admin acts alone (parallel mode is default). Not a fallback — it's normal behavior.

**R7 - Stamp format**: `"Aprobado por [full_name], [YYYY-MM-DD], [HH:MM:SS]"` + `stamp_data` JSONB with `{signer_id, signer_name, signer_role, signed_at, ip, user_agent}`.

**R8 - F-05-01 two steps RRHH**: For ACCION_PERSONAL tickets, populate `received_by/received_at` and `processed_by/processed_at` separately. These are post-approval RRHH workflow steps, not chain approvals.

**R9 - Back-and-forth**: Approver has 3 options: `Aprobar` / `Rechazar` (with observations) / `Modificar` (with reason). Modified value goes to `requests.revisions` with status `Pendiente_Aceptacion`. Requester accepts or rejects the modification.

**R10 - Single user concept**: No separate "supervisor account type". `app_role IN (employee, hr_admin, president, admin)` — no 'supervisor' value. Being supervisor is contextual via `hr.employments.supervisor_id` or `requests.tickets.selected_supervisor_id`.

**R11 - Type to mode mapping**: See `docs/05-BUSINESS-RULES.md` R11 table. 3 modes + parent_only: `parallel`, `direct_hr_admin`, `any_of_hr`, `parent_only`.

**R12 - SCD-2 employments**: `hr.employments` is SCD Type 2. Don't UPDATE position/supervisor/department/salary/app_role in place. Close old row (set `valid_to = CURRENT_DATE`) and insert new row.

**R14 - Auth via invite codes**: No public sign-up. hr_admin generates `hr.invite_codes` row, employee consumes via `/onboarding/[code]` wizard. Triple validation: code + national_id + employee_code.

**R15 - Language**: Spanish neutral Panama. NEVER voseo argentino ("vos", "tenes", "podes", imperative with acute accent "registra"). Use: tu, tienes, puedes, registra, verifica.

**R16 - Ticket status**: `Borrador` -> `Enviada` -> `En_Revision` -> (`Aprobada` | `Rechazada` | `Devuelta_Modificacion`) -> `Completada` | `Cancelada`. EXACTLY these 8 values in CHECK constraint.

**R17 - request_number**: Format `HUM-YYYY-NNNN`. Atomic generation via `requests.sequences` UPDATE-RETURNING.

**R18 - Notifications fire-and-forget**: NotificationEngine never blocks the user action. Failed notifications log to `notifications.outbox` with `status='failed'` but action succeeds.

**R24 - Approval JSONB structure**:
```json
{
  "mode": "parallel|direct_hr_admin|any_of_hr|parent_only",
  "visibility": "universal",
  "steps": [{"step_id":1, "role":"supervisor|hr_admin|president", "resolver":"selected_supervisor_id|any_hr_admin|president_user", "sla_hours":72, "required":true}]
}
```

**R25 - Manual entry F32**: hr_admin creates ticket on employee's behalf via `/admin/solicitudes/manual-entry`. Sets `manual_entry=true`, `created_by_hr_admin=<id>`. Original paper photo goes to `files.uploads` with `category='original_paper_form'`. NO new column for photo path.

## What to do

1. Read `docs/05-BUSINESS-RULES.md` for full text of the relevant R.
2. Before implementing: list which Rs apply.
3. Before submitting code: re-check each R for the touched code paths.
4. If unsure: ask James, do not guess.

## What NOT to do

- Do not hardcode threshold logic for PRESTAMO (R4).
- Do not add CHECK `approver_id != requester_id` to `requests.approvals` (R5 is in code).
- Do not modify `auth.users` without explicit `allowed_apps` filter (R22).
- Do not write `.ps1` files with non-ASCII characters (R23).
- Do not deviate from SOP chains without James approval (R26).
- Do not assume `'supervisor'` is a valid `app_role` value (R10 - it is not).
- Do not invent new approval modes outside `parallel|direct_hr_admin|any_of_hr|parent_only` (R24).
