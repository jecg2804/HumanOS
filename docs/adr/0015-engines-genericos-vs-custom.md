# Engines genéricos (E1-E6) vs custom logic per feature

> Origin: Chat-level ADR-0006 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted
**Date**: 2026-05-24

Construir engines E1-E6 una vez (FormEngine, ApprovalEngine, ChainResolver, StampEngine, PdfEngine, NotificationEngine) y reutilizar. NO custom logic per form variant.

`requests.types.form_schema` y `approval_chain_template` JSONB dirigen el behavior. Add new tipo = INSERT en `requests.types`, no code change.

> El snapshot pattern de FormEngine (capturar campos `source='profile'` al submit) se detalla en `0003-snapshot-profile-fields-at-submit.md`.
