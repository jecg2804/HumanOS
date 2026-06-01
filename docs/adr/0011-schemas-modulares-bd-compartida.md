# Schemas modulares en BD compartida con MovimientOS

> Origin: Chat-level ADR-0002 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted
**Date**: 2026-05-21

HumanOS usa schemas `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*` en MISMA BD que MovimientOS (`public.*`) y planillas (`payroll.*`).

Razón: cost (single Supabase project), eventual data convergence MDM, FK integrity entre apps cuando aplique.

Risk: cross-schema RLS más complejo. Mitigación: helpers `hr.current_*()` + R1 hard rule no tocar prohibidos.

> El mecanismo concreto de access control sobre estos schemas se define en `0001-rls-driven-db-access.md` (RLS como mecanismo primario).
