# MDM gradual (no big-bang): hr.people como source MVP

> Origin: Chat-level ADR-0005 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted (reafirmado post-rollback 2026-05-27)
**Date**: 2026-05-23

Person canonical eventual en `mdm.persons`. MVP usa `hr.people` como source HumanOS. Duplicación temporal hr.people ↔ public.people aceptada hasta otra app pida MDM.

Cuando aplique: `mdm.persons` + sync triggers + deprecar `public.people` y `hr.people` lentamente.

**Lección 2026-05-27**: intento prematuro de crear `core.identities` schema (migrations 029-031) fue rollbackeado en migration 032. Violaba este ADR al anticipar MDM antes de que otra app lo demandara. Reafirmación: MDM se hace cuando hay PULL (segunda app necesita identity unificada), no PUSH (Chat anticipando).

## Update 2026-06-04 (SP-0b / ADR-0032) — el master layer se llama `core`; hay PULL para no-people; people sigue diferido

El "person canonical eventual" ahora vive en **`core`** (no `mdm` — ese nombre confundía la disciplina con el schema; ver ADR-0032). **ADR-0032 NO repite el error de 029-031:** construye masters **NO-people** (equipment/jobs/phases/...) donde el **PULL ya existe** (MovimientOS los duplica HOY + Spectrum SDX live), y **mantiene people deferido** — `hr.people` sigue golden record física, `core.persons` arranca como **VIEW** (cross-app sin repoint de 75 FKs). El repoint físico de people se difiere hasta que haya PULL que lo justifique. Consistente con esta lección, no en contra.
