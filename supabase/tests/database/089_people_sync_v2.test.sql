-- 089_people_sync_v2.test.sql
-- pgTAP coverage for the people-sync v2 survivorship SQL (migration 089). The survivorship logic
-- lives in SQL (hr.apply_spectrum_classification + hr.sync_spectrum_people) -- NOT in any TS module
-- (the earlier mapping.ts was dead code and was removed post-review). This is the real coverage.
--
-- HOW TO RUN: `supabase test db` (pgTAP via the Supabase CLI; loads the pgtap extension and runs
--   every *.test.sql under supabase/tests/database/ inside a rolled-back transaction).
-- NOT YET WIRED into the vitest / `npm run verify` gate -- pgTAP runs separately for now;
--   TF-FOUNDATION (backlog) will wire pgTAP into CI. Until then, run it on demand pre-merge.
--
-- Design authority: ADR-0032 (field_authority) + ADR-0034 (people-sync design). FLAG-ONLY:
--   the sync never writes hr.people identity/status and never creates people.
--
-- Self-contained: seeds its own hr.people fixtures, runs assertions, and rolls everything back.
-- All object refs schema-qualified (the fns under test use SECURITY DEFINER + search_path='').

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT extensions.plan(20);

-- ---------------------------------------------------------------------------
-- Fixtures: deterministic person ids so assertions can target exact rows.
-- ---------------------------------------------------------------------------
-- Person A: active locally, will match by employee_code (case-insensitive) -> 'emp001' vs 'EMP001'.
-- Person B: active locally, Spectrum will report inactive (C) -> status_drift flag expected.
-- Person C: inactive locally, Spectrum will report active (A) -> status_drift flag (other direction).
INSERT INTO hr.people (id, employee_code, full_name, status, created_from)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'EMP001', 'Persona A', 'Activo',   'manual'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'EMP002', 'Persona B', 'Activo',   'manual'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'EMP003', 'Persona C', 'Inactivo', 'manual');

-- ===========================================================================
-- (1) hr.apply_spectrum_classification  -- SCD-2 upsert of the sidecar
-- ===========================================================================

-- 1a. insert-when-none: first classification for person A creates exactly one current row.
SELECT extensions.ok(
  hr.apply_spectrum_classification(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'DIRECT', 'Soldador', 'MAR', 'SANTRAICO', 'WC1', 'DIRECT', 'Calificado', 'batch-1'
  ) IS NOT NULL,
  'apply_spectrum_classification: insert-when-none returns a new id'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM hr.employment_classifications
     WHERE person_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND deleted_at IS NULL),
  1,
  'insert-when-none: exactly one row exists for the person'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM hr.employment_classifications
     WHERE person_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND is_current AND deleted_at IS NULL),
  1,
  'insert-when-none: exactly one CURRENT row'
);

SELECT extensions.is(
  (SELECT department_code FROM hr.employment_classifications
     WHERE person_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND is_current),
  'DIRECT',
  'insert-when-none: the inserted current row carries the Spectrum values'
);

-- 1b. no-op on same: re-applying identical values must NOT create a second row.
SELECT extensions.is(
  hr.apply_spectrum_classification(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'DIRECT', 'Soldador', 'MAR', 'SANTRAICO', 'WC1', 'DIRECT', 'Calificado', 'batch-2'
  ),
  (SELECT id FROM hr.employment_classifications
     WHERE person_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND is_current),
  'no-op on same: returns the SAME current id (no new version)'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM hr.employment_classifications
     WHERE person_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'no-op on same: still exactly one row total (no churn)'
);

-- 1c. close+insert on change: changing a field closes the old row and inserts a new current one.
SELECT extensions.ok(
  hr.apply_spectrum_classification(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'INDIRE', 'Soldador', 'MAR', 'SANTRAICO', 'WC1', 'DIRECT', 'Calificado', 'batch-3'
  ) IS NOT NULL,
  'close+insert on change: returns a new id when a field changes'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM hr.employment_classifications
     WHERE person_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  2,
  'close+insert on change: two rows total (one closed, one current)'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM hr.employment_classifications
     WHERE person_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND is_current AND deleted_at IS NULL),
  1,
  'one-current invariant: still exactly one CURRENT row after the SCD-2 transition'
);

SELECT extensions.is(
  (SELECT department_code FROM hr.employment_classifications
     WHERE person_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND is_current),
  'INDIRE',
  'close+insert on change: the current row carries the NEW value'
);

SELECT extensions.is(
  (SELECT valid_to FROM hr.employment_classifications
     WHERE person_id = 'aaaaaaaa-0000-0000-0000-000000000001' AND NOT is_current),
  CURRENT_DATE,
  'close+insert on change: the closed row has valid_to = CURRENT_DATE'
);

-- one-current invariant (hard): the partial UNIQUE index forbids a 2nd current row.
SELECT extensions.throws_ok(
  $$ INSERT INTO hr.employment_classifications (person_id, department_code, is_current)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'X', true) $$,
  '23505',
  NULL,
  'one-current invariant: a second current row violates the partial UNIQUE index'
);

-- ===========================================================================
-- (2) hr.sync_spectrum_people  -- survivorship txn: crosswalk + enrich + FLAG
-- ===========================================================================

-- 2a. Z-sentinel skip: ZRIO9999 / ZEIS99999 are skipped & counted, never flagged/created.
--     Real Z* actives (ZAL576) are NOT sentinels (but unmatched-active -> flag, asserted in 2b).
SELECT extensions.is(
  (hr.sync_spectrum_people(
     '[{"Employee_Code":"ZRIO9999","Employment_Status":"S","Employee_Name":"Sentinel Uno"},
       {"Employee_Code":"ZEIS99999","Employment_Status":"S","Employee_Name":"Sentinel Dos"}]'::jsonb,
     'batch-z'
   ) ->> 'skipped')::int,
  2,
  'Z-sentinel skip: both ZRIO9999 + ZEIS99999 counted as skipped'
);

SELECT extensions.is(
  (hr.sync_spectrum_people(
     '[{"Employee_Code":"ZRIO9999","Employment_Status":"S"}]'::jsonb, 'batch-z2'
   ) ->> 'flagged')::int,
  0,
  'Z-sentinel skip: sentinels are NOT flagged'
);

-- 2b. FLAG-not-create for unmatched active: an active code with no local person is flagged
--     (new_active_unmatched) and NO hr.people row is created.
SELECT extensions.is(
  (hr.sync_spectrum_people(
     '[{"Employee_Code":"NOPE999","Employment_Status":"A","Employee_Name":"Fantasma"}]'::jsonb,
     'batch-unmatched'
   ) ->> 'flagged')::int,
  1,
  'FLAG-not-create: unmatched ACTIVE code produces one flag'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM hr.people WHERE upper(employee_code) = 'NOPE999'),
  0,
  'FLAG-not-create: never creates hr.people for an unmatched active'
);

-- inactive unmatched is NOT flagged (only active unmatched is reconciliation-worthy).
SELECT extensions.is(
  (hr.sync_spectrum_people(
     '[{"Employee_Code":"GONE111","Employment_Status":"C","Employee_Name":"Inactivo Fantasma"}]'::jsonb,
     'batch-unmatched-inactive'
   ) ->> 'flagged')::int,
  0,
  'unmatched INACTIVE is not flagged (only active unmatched matters)'
);

-- 2c. status_drift flag: matched person whose mapped Spectrum status differs from local status.
--     Person B is local Activo; Spectrum says C -> Inactivo -> drift. Match is case-insensitive
--     (Spectrum 'emp002' lower vs local 'EMP002').
SELECT extensions.is(
  (hr.sync_spectrum_people(
     '[{"Employee_Code":"emp002","Employment_Status":"C","Employee_Name":"Persona B",
        "Department_Code":"DIRECT","Occupation":"Albanil"}]'::jsonb,
     'batch-drift'
   ) ->> 'flagged')::int,
  1,
  'status_drift: local Activo vs Spectrum C (Inactivo) raises one flag'
);

-- 2d. FLAG-ONLY: the drift sync above must NOT have changed hr.people.status.
SELECT extensions.is(
  (SELECT status FROM hr.people WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  'Activo',
  'FLAG-ONLY: never writes hr.people.status (Persona B stays Activo despite drift)'
);

-- 2e. matched person enriches the classification sidecar (crosswalk + SCD-2), not hr.people.
SELECT extensions.is(
  (SELECT count(*)::int FROM hr.person_sources
     WHERE source_system = 'spectrum' AND external_id = 'EMP002'),
  1,
  'matched person: a spectrum crosswalk row is upserted in hr.person_sources'
);

SELECT * FROM extensions.finish();

ROLLBACK;
