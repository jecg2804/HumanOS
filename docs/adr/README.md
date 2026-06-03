# Architectural Decision Records — canonical ledger

This directory (`docs/adr/`) is the **single canonical ADR ledger** for HumanOS. One decision
per file, named `NNNN-kebab-title.md`, prose style (state the decision in the `#` title, then
context / alternatives rejected / risks).

**Read this index first** when looking up a decision.

## Active ADRs

| # | Decision | File |
|---|----------|------|
| 0001 | RLS as the primary DB access-control mechanism | `0001-rls-driven-db-access.md` |
| 0002 | Codegen snake_case types + Zod at boundaries | `0002-codegen-snake-case-types-zod-boundaries.md` |
| 0003 | Snapshot profile fields at submit time | `0003-snapshot-profile-fields-at-submit.md` |
| 0004 | Parallel modify/reset is non-terminal | `0004-parallel-modify-reset-non-terminal.md` |
| 0005 | Manual entry bypasses the approval chain (behavior) | `0005-manual-entry-bypass-chain.md` |
| 0006 | Service-role admin client onboarding exception | `0006-service-role-admin-client-onboarding-exception.md` |
| 0007 | Employment-type reference table | `0007-employment-type-reference-table.md` |
| 0008 | Notifications: in-app + email primary (MVP) | `0008-notifications-in-app-email-primary-mvp.md` |
| 0009 | First Usable Release scope + group re-sequence + honest count | `0009-scope-first-usable-release-and-group-sequence.md` |
| 0010 | Stack tecnológico (Next.js 16 + TS + Tailwind 4 + Supabase + Vercel) | `0010-stack-tecnologico.md` |
| 0011 | Schemas modulares en BD compartida con MovimientOS | `0011-schemas-modulares-bd-compartida.md` |
| 0012 | Auth multi-app via allowed_apps en auth.users | `0012-auth-multi-app-allowed-apps.md` |
| 0013 | Invite codes para sign-up (no self-signup) | `0013-invite-codes-signup.md` |
| 0014 | MDM gradual (no big-bang); hr.people como source MVP | `0014-mdm-gradual-no-big-bang.md` |
| 0015 | Engines genéricos (E1-E6) vs custom per feature | `0015-engines-genericos-vs-custom.md` |
| 0016 | Triple stack docs (histórico; superado por set único) | `0016-triple-stack-docs.md` |
| 0017 | Hooks ASCII + JSON strict + UTF-8 sin BOM | `0017-hooks-ascii-json-strict.md` |
| 0018 | Framework cherry-pick (Superpowers + mattpocock + ICONSA) | `0018-framework-cherry-pick.md` |
| 0019 | auth.users destructive ops protection (R22) | `0019-auth-users-destructive-protection.md` |
| 0020 | Approval chain template JSONB con modes finales (+ BL-2..7) | `0020-approval-chain-template-jsonb-modes.md` |
| 0021 | Manual entry F32 schema (files.uploads polimórfico) | `0021-manual-entry-schema-files-uploads.md` |
| 0022 | Admin viewer approval chains F39 (read-only MVP) | `0022-admin-viewer-approval-chains.md` |
| 0023 | Eliminar app_role 'supervisor' (propiedad emergente) | `0023-eliminate-app-role-supervisor.md` |
| 0024 | Sistema de docs: reference/ topical + STATUS único + work/_archive | `0024-doc-system-topical-living-docs.md` |
| 0025 | Vocabulario canónico de source_system (SoR `humanos_app` vs origen) | `0025-source-system-canonical-vocabulary.md` |
| 0026 | Modelo de trabajo: diseño atendido + ejecución de plan aprobado (retira overnight autónomo) | `0026-work-model-attended-design-plan-execution.md` |
| 0027 | Chain fidelity: firma=aprobación · RRHH=visibilidad no gate · app colapsa hand-offs de papel · PO maestro gana | `0027-chain-fidelity-signature-approval-rrhh-visibility.md` |

New ADRs continue from **0028**.

## History: the legacy `docs/08-ADRs.md` ledger (merged 2026-06-01)

Until 2026-06-01 two independently-numbered ADR ledgers coexisted: this directory (the
"Code-level" / implementation ledger, `0001..0009`) and `docs/08-ADRs.md` (the "Chat-level" /
strategy ledger, `ADR-0001..0014`). Because both used `0001..00NN` for *different* decisions,
a bare `ADR-00NN` reference was ambiguous (e.g. legacy `ADR-0002` "Schemas modulares" vs file
`0002` "Codegen types").

The audit item **D2-merge** collapsed both into this single monotonic sequence. The 14
Chat-level entries were migrated to new files `0010..0023` (each carries an `> Origin:
Chat-level ADR-00NN (08-ADRs.md), merged 2026-06-01.` note). Files `0001..0009` kept their
numbers; the ones the old cross-reference table linked received a `> Related:` cross-link to
the migrated strategy ADR. `docs/08-ADRs.md` and its cross-reference table were deleted.

**Numbering caveat (historical only):** if you encounter an old `ADR-00NN` reference in git
history, plans, or external notes from before 2026-06-01, it may belong to either of the two
former sequences. Use the `> Origin:` / `> Related:` notes in the files here to disambiguate.
Going forward there is exactly one sequence: this index.

### Legacy → canonical map

| Legacy `08-ADRs.md` | Topic | Canonical |
|---|---|---|
| ADR-0001 | Stack tecnológico | `0010` |
| ADR-0002 | Schemas modulares | `0011` (related to `0001`) |
| ADR-0003 | Auth multi-app allowed_apps | `0012` (implemented by `0006`) |
| ADR-0004 | Invite codes sign-up | `0013` |
| ADR-0005 | MDM gradual | `0014` |
| ADR-0006 | Engines genéricos | `0015` (instance: `0003`) |
| ADR-0007 | Triple stack docs | `0016` |
| ADR-0008 | Hooks ASCII + JSON | `0017` |
| ADR-0009 | Framework cherry-pick | `0018` |
| ADR-0010 | auth.users protection R22 | `0019` |
| ADR-0011 | Approval chain template | `0020` (related to `0004`) |
| ADR-0012 | Manual entry schema | `0021` (behavior in `0005`) |
| ADR-0013 | Admin viewer F39 | `0022` |
| ADR-0014 | Eliminate app_role supervisor | `0023` |
