# Auth multi-app via allowed_apps en auth.users

> Origin: Chat-level ADR-0003 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted (refinado 2026-05-27)
**Date**: 2026-05-22

`auth.users.raw_app_meta_data.allowed_apps` JSONB array (e.g. `["movimientOS", "humanOS"]`) determina qué apps puede usar el user.

Misma persona = mismo auth.user. NO duplicar users per app.

**Refinamiento 2026-05-27**: sign-up HumanOS detecta `auth.users` con `email` O `phone` match (NO `national_id` que NO existe en `raw_app_meta_data` — verificado vacío en BD). Si existe Y `allowed_apps` no contiene 'humanOS' → append via `auth.admin.updateUserById` con spread merge. Sino crea nuevo auth.user via `auth.admin.createUser`. Ver `0006-service-role-admin-client-onboarding-exception.md` para el algoritmo detallado, incluyendo capture-then-restore pattern para rollback gap si RPC falla post-merge.
