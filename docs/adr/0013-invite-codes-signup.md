# Invite codes para sign-up (no self-signup abierto)

> Origin: Chat-level ADR-0004 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted
**Date**: 2026-05-22

Pattern: hr_admin genera `hr.invite_codes` row → empleado consume vía `/onboarding/[code]` wizard 10 pasos.

Triple validación: code + national_id + employee_code opcional.

Alternativa descartada: self-signup abierto (security risk).
