# Triple stack docs: Project Files / repo docs / wiki cross-app

> Origin: Chat-level ADR-0007 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted
**Date**: 2026-05-25

Project Files (Chat) / `docs/` repo (Code) / wiki cross-app (futuro).

Razón: separación de concerns por audiencia. Project Files contienen strategy + history. Repo docs son operativos. Wiki será compartido cross-app.

> Nota de revisión (audit D1, 2026-06-01): el split por audiencia "docs para Chat vs Code" está siendo eliminado en la restructura de docs (un solo set canónico). Este ADR queda como registro histórico de la decisión original; la dirección going-forward es un set único, no triple stack por audiencia.
