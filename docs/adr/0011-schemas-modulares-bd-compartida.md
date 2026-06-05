# Schemas modulares en BD compartida con MovimientOS

> Origin: Chat-level ADR-0002 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted
**Date**: 2026-05-21

HumanOS usa schemas `hr.*`, `requests.*`, `docs.*`, `workflows.*`, `audit.*`, `notifications.*`, `files.*`, `performance.*`, `learning.*` en MISMA BD que MovimientOS (`public.*`) y planillas (`payroll.*`).

Razón: cost (single Supabase project), eventual data convergence MDM, FK integrity entre apps cuando aplique.

Risk: cross-schema RLS más complejo. Mitigación: helpers `hr.current_*()` + R1 hard rule no tocar prohibidos.

> El mecanismo concreto de access control sobre estos schemas se define en `0001-rls-driven-db-access.md` (RLS como mecanismo primario).

## Update 2026-06-04 (Jaime) — solo `public.*` es prohibido; `payroll.*` es usable/nuestro

La regla de schemas prohibidos se **estrecha**: el único schema intocable es **`public.*`** (ahí vive MovimientOS; dueño: dev MovimientOS; eventual restructuración). `payroll.*` **sale de la lista de prohibidos**: lo creó un compañero para una herramienta PayDay↔ProjectSight, pero **ese compañero no usa Supabase** (agregó las tablas solo como contexto), así que es nuestro para usar/restructurar. `humanos.*` ya fue dropeado (2026-06-02, W3 SEC-LEGACY) — la prohibición contra recrearlo se mantiene, pero es moot.

**Pendiente (enforcer follow-up, Fase 0):** propagar este cambio a `reference/business-rules.md` R1, al hook `pre-tool-use.ps1` (hoy aún bloquea `payroll.*`), al `session-start.ps1` y a `PROJECT_CONSTITUTION.md`. Uso de `payroll.*`: ver ADR-0028 (master data de proyectos/códigos; subir a estándar foundation con RLS + policies + COMMENT antes de apoyarse en él). Futuro `core.*` para datos compartidos cross-app (ADR-0014 MDM) — post-MVP.

## Update 2026-06-04 (SP-0b / ADR-0032) — `core` + medallion de primera clase

El `core.*` "futuro" se concreta: **ADR-0032** establece la capa MDM `core` (rename del `mdm` vacío vía `ALTER DOMAIN`), `raw_spectrum` (bronze landing) y `meta`, con masters conformados desde Spectrum SDX (jobs/extras/phases/equipment/customers/wage_codes/pay_types/deductions/eq_cost_categories). `payroll.*` queda como legacy/fuente superseded por core (move físico diferido, views primero). Allowlist de enforcers += `core`/`raw_spectrum`/`meta`.
