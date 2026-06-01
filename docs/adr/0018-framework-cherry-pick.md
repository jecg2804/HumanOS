# Framework cherry-pick (no monolítico): Superpowers + mattpocock + ICONSA

> Origin: Chat-level ADR-0009 (08-ADRs.md), merged 2026-06-01.
> Nota de desambiguación: esta entrada NO es la misma que `0009-scope-first-usable-release-and-group-sequence.md` (Code-level), pese a compartir el número 0009 en los ledgers viejos. La colisión histórica `ADR-0009` queda resuelta por este merge.

**Status**: Accepted
**Date**: 2026-05-26

Cherry-pick: Superpowers (workflow harness) + mattpocock (grill-with-docs, handoff, diagnose, git-guardrails) + ICONSA custom skills + custom hooks.

Razón: cada plugin tiene fortalezas. Monolítico = adoptar limitaciones.

Risk: combinaciones inesperadas. Mitigación: smoke tests bedrock + isolation per skill.
