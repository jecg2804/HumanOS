# DB-VISION — Schema Design for the Full HR-App Vision

**Status: PROPOSED — pending James ratification. Design proposal, NOT migrations to apply.**
Date: 2026-05-29 · Project `bzeoszympkkicwlfdtcn` (HumanOS) · PG 17.6 · Scope: HR app complementing PayDay (NO payroll, NO company-wide DB hosting).

## 0. TL;DR

HumanOS is ~70% foundation-ready: UUID PKs everywhere, `created_at`/`updated_at` on nearly every mutable table, the `hr.person_sources` golden-record-LINK pattern (453 rows, **live** — this is the real "external_ids" table; docs that say `people_external_ids` "doesn't exist" are right about the *name* only), soft-delete proven on `files.uploads`. This proposal is mostly standardization + filling gaps, not invention.

Three decisions to ratify:
1. **Foundations now** — `deleted_at` (soft-delete, single column) + trigger-maintained `updated_at` + inline `source_system`. Highest-value/least-reversible: **lock in "no hard deletes" on domain tables.**
2. **Leave accrual LEDGER** (deepest new design) resolves the VACACIONES "días disponibles" gap (no backing data today): `hr.leave_policies` + `hr.leave_assignments` + `hr.leave_ledger` (append-only) + `hr.leave_balances` (projection). **Foundational — must land BEFORE Group 4 engines.**
3. **`performance.*` + `learning.*` are already empty scaffolding** — refine existing tables, ship WITH their feature groups (later), not now.

OUT: no payroll tables, no hosting of other apps' golden records. PayDay/B2W/ProjectSight/Spectrum linkage = `external_ids` crosswalk rows only (HumanOS holds the link, never the foreign data).

## 1. Foundations to retrofit now

### 1.1 Already present (do NOT churn)
- UUID PKs on all tables (`gen_random_uuid()`) — client-generatable offline already.
- `created_at`/`updated_at` on mutable tables; correctly omitted on append-only logs.
- Golden-record LINK: `hr.person_sources` (453 rows): person_id + source_system + external_id + external_data jsonb + last_synced_at. **This IS the model — generalize, don't replace.**
- Soft-delete: `files.uploads` only. SCD-2: `hr.employments` (true SCD-2), `hr.addresses` (valid_from/to). Versioning: `*_versions` + `is_current` pattern in docs/workflows/learning/performance.

### 1.2 `updated_at` → trigger-maintained
Single `BEFORE UPDATE` trigger via `extensions.moddatetime('updated_at')` on every mutable domain table (authoritative server-side = LWW comparator for future offline sync). R5: check `pg_proc` for an existing helper first.

### 1.3 Soft-delete `deleted_at timestamptz NULL` (HIGHEST-VALUE DECISION)
- Single-column form on new tables (NOT the dual `deleted_at`+`is_deleted` of `files.uploads` — redundant boolean drifts). Don't churn `files.uploads`.
- Partial index `WHERE deleted_at IS NULL`. Bake `AND deleted_at IS NULL` into RLS + FormEngine data layer from day one.
- **Lock in NOW: no hard deletes on any HumanOS domain table** (hard delete = audit trail gone + offline client can't reconcile). `auth.users` remains the R2-exception.

### 1.4 MDM-link provenance
- (A) Inline `source_system text NOT NULL DEFAULT 'humanos'` on new domain tables (`humanos|payday|b2w|manual_entry`) — answers "who owns this row" without a join; standardizes existing ad-hoc columns.
- (B) Per-entity `{entity}_external_ids` crosswalks — create **only when a real integration lands** (copy `hr.person_sources` template; load-bearing `UNIQUE (source_system, external_id)`; `external_data jsonb` = cached snapshot/debug only, NEVER source of truth). Future non-person crosswalks (positions/org_units/employments→PayDay) go under the empty **`mdm.*`** schema.

### 1.5 Time-ordered PKs for new append-heavy tables
PG 17.6 has no native `uuidv7()` (PG18). Don't migrate existing UUIDv4 PKs. For NEW high-volume append tables (leave ledger, event logs) default the `uuid` PK to a pure-SQL `uuidv7()` — swap to built-in on PG18 with zero data migration. Avoids re-keying a hot ledger later.

### 1.6 DEFER (cheap additive later)
- `row_version bigint` conflict column — add when a real concurrent-edit conflict appears (LWW + delete-wins covers ~95%).
- Logical replication publication — at sync-engine adoption; MUST be per-table (shared DB; never publish MovimientOS/`auth.users`).
- Pre-built integration crosswalks — copy `hr.person_sources` when the integration is built.

## 2. Per-module schema (IN-scope). All R1-compliant + R3 checklist + §1 foundation cols.

### 2.1 TIME-OFF + ACCRUAL LEDGER — `hr.*` (deepest; resolves VACACIONES gap)
Separate *policy* (rules) from *ledger* (append-only facts). Balance = projection of the ledger, never a hand-edited number. An approved VACACIONES `requests.tickets` row writes a `usage` row into the ledger. No new schema — `hr` is correct.
- **`hr.leave_policies`** (catalog/SOR): code, name, unit(days|hours), accrual_method(lump_sum|periodic|hourly|unlimited), accrual_frequency, accrual_rate, max_balance_cap, carryover_limit, carryover_expiry_months, allow_negative_balance, proration_rule, `employment_type_id → hr.employment_types` (Panama vacaciones differ by contract type). RLS: SELECT all auth; write hr_admin.
- **`hr.leave_assignments`** (policy↔employee): person_id, policy_id, accrual_start_date (≥ hire), valid_from/to. RLS: own/report/admin.
- **`hr.leave_ledger`** (append-only — THE gap): `id uuid PK DEFAULT uuidv7()`, assignment_id, kind(accrual|grant|usage|carryover_in|carryover_expiry|adjustment|payout|reversal), amount(signed), **balance_after** (running balance per row → point-in-time reconstruction), **event_date** (business date, SEPARATE from created_at), source_ticket_id → requests.tickets, reversal_of_id (corrections = compensating rows, never edits). NO updated_at/deleted_at (append-only). Writes via SECURITY DEFINER RPC (FOR UPDATE on balance, validate cap/negative, compute balance_after, atomic insert). UPDATE/DELETE denied for all.
- **`hr.leave_balances`** (projection): assignment_id UNIQUE, accrued, used, pending, **available** (= accrued − used − pending = "días disponibles"), as_of. Written only by the ledger RPC.
- VACACIONES form's "días disponibles" computed field reads `hr.leave_balances.available` — closes the gap within the existing FormEngine `source:'computed'` contract.

### 2.2 PERFORMANCE — `performance.*` (7 empty tables; refine, ship LATER with Group 5/6)
Refine existing scaffolding (cycles, reviews, review_templates, calibrations, feedback, goals, goal_updates), don't invent. cycles 1—N reviews; reviews N—M goals; feedback/goal_updates are continuous streams. Retrofit deleted_at + source_system + uuidv7 (feedback/goal_updates) when activated. RLS: subject/reviewer/supervisor/hr_admin tiers; calibration = managers+. COMMENT every column when seeded.

### 2.3 LEARNING — `learning.*` (8 empty tables; refine, ship LATER)
courses/course_modules/enrollments/assessments/attendance/certifications/certification_assignments/training_records. **Highest-value ICONSA angle: `certification_assignments.expires_at`** → construction-safety cert-expiry alerts (trabajo en altura). Seed `learning.certifications` catalog when activated. SCORM/xAPI → external LRS, assessments store only summary. RLS: learner own / supervisor reports / hr_admin.

### 2.4 DOCS + E-SIGN — `docs.*`+`files.*` (scaffolding exists; e-sign wiring LATER)
`docs.signature_requests` ALREADY has `external_id`+`external_url`+`provider` — Documenso link pattern in place. Documenso = SOR for the signed PDF; HumanOS holds metadata+link only. status maps DRAFT→PENDING→COMPLETED; recipient role(SIGNER|APPROVER|VIEWER|CC) + signing_order aligns with existing SOP approval chains. **R13: enforce RLS (owner+hr_admin) regardless of Documenso visibility** for medical/personal docs. Signed PDFs via `files.uploads` (checksum, retention/legal-hold present).

## 3. Sequencing

### 3.1 FOUNDATIONAL — BEFORE Group 4 engines
1. Foundation conventions (§1.2–1.4): trigger-updated_at; deleted_at single-col + partial index + "no hard deletes"; inline source_system on new tables. **Bake `AND deleted_at IS NULL` into the data layer/RLS before Group 4 writes its first ticket.**
2. **Leave ledger (§2.1): policies+assignments+ledger+balances + write-RPC.** Deepest item; unblocks VACACIONES "días disponibles"; must exist before VACACIONES goes live. Includes uuidv7 PK default.
3. `uuidv7()` default convention ratified for any new append-heavy table in Group 4.

### 3.2 LATER — with its feature group
performance.* / learning.* (refine+seed+RLS+COMMENT when group activates); e-sign recipient detail (incremental, columns exist); `mdm.*` crosswalks (per integration); row_version + replication (at offline-sync adoption).

### 3.3 Rationale
Leave ledger + foundation columns are expensive-to-retrofit (lost audit trail; re-keying a populated ledger; backfilling deleted_at predicates) AND on Group 4's critical path. performance/learning/e-sign are additive when built — seeding empty scaffolding now is speculative.

## 4. Explicitly OUT
1. NO payroll tables (R1; PayDay owns planilla; salary visibility via RLS-gated columns, not a new schema).
2. NO hosting other apps' golden records / cross-app warehouse. `external_data jsonb` = cached snapshot only, never SOR. Reconciliation = future data-eng layer (`etl.*`/`mdm.*`), not HumanOS app tables.
3. NO offline-sync engine/CRDTs/version-vectors now. LWW-on-updated_at + delete-wins is the ratified conflict model.

**PayDay linkage:** inline `source_system` (which system is SOR) + `{entity}_external_ids` crosswalk rows (`UNIQUE (source_system, external_id)`). HumanOS stores the link; the foreign system stores the data. Person linkage already works via `hr.person_sources` (453 rows). E-sign via `docs.signature_requests.external_id`.

## 5. Compliance checklist (every table)
R1 (allowed schemas only) · R3 (RLS + ≥1 policy + COMMENT on table/columns + crosswalk if cross-app-linkable) · iconsa-rls-validation post-creation · R5 (reuse helpers; check pg_proc before new functions incl. moddatetime trigger + leave-ledger RPC) · R2 (none touch auth.users) · R13 (medical/personal + signed-doc RLS owner+hr_admin regardless of provider visibility) · R23 (migrations UTF-8 no BOM).

---
On ratification, §3.1 becomes the first migration batch, sequenced ahead of Group 4, each gated by `npm run verify` + `iconsa-supabase-migration` + `iconsa-rls-validation`. Live DB is the source of truth (`src/lib/supabase/database.types.ts` reflects it).
