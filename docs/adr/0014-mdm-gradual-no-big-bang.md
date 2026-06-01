# MDM gradual (no big-bang): hr.people como source MVP

> Origin: Chat-level ADR-0005 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted (reafirmado post-rollback 2026-05-27)
**Date**: 2026-05-23

Person canonical eventual en `mdm.persons`. MVP usa `hr.people` como source HumanOS. Duplicación temporal hr.people ↔ public.people aceptada hasta otra app pida MDM.

Cuando aplique: `mdm.persons` + sync triggers + deprecar `public.people` y `hr.people` lentamente.

**Lección 2026-05-27**: intento prematuro de crear `core.identities` schema (migrations 029-031) fue rollbackeado en migration 032. Violaba este ADR al anticipar MDM antes de que otra app lo demandara. Reafirmación: MDM se hace cuando hay PULL (segunda app necesita identity unificada), no PUSH (Chat anticipando).
