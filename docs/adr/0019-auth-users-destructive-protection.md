# auth.users destructive ops protection (R22) — post-incident

> Origin: Chat-level ADR-0010 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted (post-incident)
**Date**: 2026-05-25

`auth.users` compartido entre apps. `DELETE FROM auth.users` sin WHERE filtro `allowed_apps` borró 47 users en incidente.

Enforcement: hook PreToolUse bloquea queries peligrosas + R22 documentada + snapshot pre-op obligatorio + SELECT preview con approval explícita.
