# Architectural Decision Records — canonical ledger

This directory (`docs/adr/`) is the **single canonical ADR ledger** for HumanOS going
forward. One decision per file, named `NNNN-kebab-title.md`, prose style (state the
decision in the `#` title, then context / alternatives rejected / risks).

**Read this index first** when looking up a decision.

## Active ADRs

| # | Decision | File |
|---|----------|------|
| 0001 | RLS as the primary DB access-control mechanism | `0001-rls-driven-db-access.md` |
| 0002 | Codegen snake_case types + Zod at boundaries | `0002-codegen-snake-case-types-zod-boundaries.md` |
| 0003 | Snapshot profile fields at submit time | `0003-snapshot-profile-fields-at-submit.md` |
| 0004 | Parallel modify/reset is non-terminal | `0004-parallel-modify-reset-non-terminal.md` |
| 0005 | Manual entry bypasses the approval chain | `0005-manual-entry-bypass-chain.md` |
| 0006 | Service-role admin client onboarding exception | `0006-service-role-admin-client-onboarding-exception.md` |
| 0007 | Employment-type reference table | `0007-employment-type-reference-table.md` |
| 0008 | Notifications: in-app + email primary (MVP) | `0008-notifications-in-app-email-primary-mvp.md` |
| 0009 | First Usable Release scope + group re-sequence + honest count | `0009-scope-first-usable-release-and-group-sequence.md` |

New ADRs continue from **0010**.

## Relationship to `docs/08-ADRs.md` (historical, being absorbed)

`docs/08-ADRs.md` is the **legacy "Chat-level" ledger** (ADR-0001..0014 in a single
prose file). Its decisions remain valid as a record, but it is **frozen** — no new
entries go there.

**Numbering caveat (the old collision):** `08-ADRs.md` numbered its entries `ADR-0001..0014`
using a *different* sequence than the files here. So `ADR-0002` in `08-ADRs.md` ("Schemas
modulares") is NOT the same decision as `0002` here ("Codegen types"). When a reference says
"ADR-00NN", disambiguate by location: a bare `ADR-00NN` usually means the `08-ADRs.md` entry;
a `docs/adr/00NN-*.md` path means a file here. The physical merge of the legacy prose into
per-file ADRs (renumbering into one sequence) is a deliberate future task; until then this
index is the source of truth for "which ledger is canonical" (answer: this one).

The mapping between the legacy entries and these files lives in the cross-reference table at
the bottom of `docs/08-ADRs.md`.
