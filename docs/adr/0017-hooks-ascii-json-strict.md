# Hooks ASCII + JSON strict + UTF-8 sin BOM (lección 2026-05-25)

> Origin: Chat-level ADR-0008 (08-ADRs.md), merged 2026-06-01.

**Status**: Accepted (post-incident)
**Date**: 2026-05-25

`.claude/settings.json` strict-schema sin BOM. Hooks `.ps1` ASCII puro. UTF-8 sin BOM en todo config.

Razón: incidente donde BOM + non-ASCII rompió harness Claude Code. Recovery completa documentada.

Enforcement: hook PostToolUse + audit script + R23.
