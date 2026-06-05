-- 090_consent_enforcement.test.sql
-- pgTAP coverage for the SEC-CONSENT (R27 / Ley 81) consent-guard SQL shipped in migration 090:
--   hr.has_active_consent(person_id, scope)        -- shared live-consent predicate (last row wins)
--   hr.enforce_medical_consent() + trg_medical_consent_guard  -- L2 BEFORE INSERT/UPDATE on medical_info
--   hr.complete_onboarding_writes(...15 args)      -- L1 atomic RPC guard + consent writes (this is the
--                                                     primary enforcement path; it actually CALLs the RPC)
--   the 43-flag UPDATE + hr.v_pending_reconsent    -- flag-for-reconsent (never fabricate consent)
-- Design authority: ADR-0035 + spec docs/superpowers/specs/2026-06-05-sec-consent-ley81-design.md.
--
-- HOW TO RUN: `supabase test db` (pgTAP via the Supabase CLI; loads the pgtap extension and runs every
--   *.test.sql under supabase/tests/database/ inside a rolled-back transaction).
-- NOT YET WIRED into the vitest / `npm run verify` gate -- pgTAP runs separately for now (same as
--   089_people_sync_v2.test.sql). TF-FOUNDATION (backlog) will wire pgTAP into CI; until then run on
--   demand pre-merge.
--
-- Self-contained: seeds its own hr.people / hr.consent / hr.medical_info / hr.invite_codes / auth.users
-- fixtures, asserts, rolls back. The L1 RPC cases CALL hr.complete_onboarding_writes directly; they
-- depend on the IC-RH-M-01 / IC-RH-D-07 SOP current versions existing (migration 033) and skip
-- gracefully (RAISE NOTICE) if absent. All object refs schema-qualified (the fns under test are
-- SECURITY DEFINER + search_path='').

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT extensions.plan(25);

-- ---------------------------------------------------------------------------
-- Fixtures: deterministic person ids.
--   Person A: will receive a 'medical' consent -> medical write must SUCCEED.
--   Person B: NO consent -> medical write must RAISE (fail-closed).
--   Person C: medical row + no consent, seeded to exercise the flag + the view (a stand-in for "the 43").
-- ---------------------------------------------------------------------------
INSERT INTO hr.people (id, full_name, status, created_from)
VALUES
  ('cc000000-0000-0000-0000-000000000001', 'Consent Persona A', 'Activo', 'manual'),
  ('cc000000-0000-0000-0000-000000000002', 'Consent Persona B', 'Activo', 'manual'),
  ('cc000000-0000-0000-0000-000000000003', 'Consent Persona C', 'Activo', 'manual');

-- ===========================================================================
-- (1) hr.has_active_consent -- last-row-per-scope wins (append-only; revocation wins)
-- ===========================================================================

SELECT extensions.is(
  hr.has_active_consent('cc000000-0000-0000-0000-000000000001', 'medical'),
  false,
  'has_active_consent: false when no consent row exists for the scope'
);

INSERT INTO hr.consent (person_id, scope, legal_version, granted, consent_at)
VALUES ('cc000000-0000-0000-0000-000000000001', 'medical', 'ley81-onboarding-v1', true, now());

SELECT extensions.is(
  hr.has_active_consent('cc000000-0000-0000-0000-000000000001', 'medical'),
  true,
  'has_active_consent: true after a granted=true row'
);

SELECT extensions.is(
  hr.has_active_consent('cc000000-0000-0000-0000-000000000001', 'emergency_contact'),
  false,
  'has_active_consent: scope-specific (medical granted does not imply emergency_contact)'
);

-- revocation = newer granted=false row that wins.
INSERT INTO hr.consent (person_id, scope, legal_version, granted, consent_at)
VALUES ('cc000000-0000-0000-0000-000000000001', 'medical', 'ley81-onboarding-v1', false, now() + interval '1 minute');

SELECT extensions.is(
  hr.has_active_consent('cc000000-0000-0000-0000-000000000001', 'medical'),
  false,
  'has_active_consent: a newer granted=false (revocation) wins over the earlier grant'
);

-- re-grant (newest row) wins again -> Person A is consent-present for the trigger tests below.
INSERT INTO hr.consent (person_id, scope, legal_version, granted, consent_at)
VALUES ('cc000000-0000-0000-0000-000000000001', 'medical', 'ley81-onboarding-v1', true, now() + interval '2 minutes');

SELECT extensions.is(
  hr.has_active_consent('cc000000-0000-0000-0000-000000000001', 'medical'),
  true,
  'has_active_consent: a newer re-grant wins again (newest row decides)'
);

-- ===========================================================================
-- (2) L2 trigger trg_medical_consent_guard -- fail-closed on medical writes
-- ===========================================================================

-- consent-present -> INSERT OK (Person A has a vigente 'medical' grant).
SELECT extensions.lives_ok(
  $$ INSERT INTO hr.medical_info (person_id, blood_type, allergies)
     VALUES ('cc000000-0000-0000-0000-000000000001', 'O+', 'penicilina') $$,
  'L2 consent-present: medical INSERT succeeds when a vigente medical consent exists'
);

-- consent-absent -> INSERT RAISES (check_violation = SQLSTATE 23514). Person B has no consent.
SELECT extensions.throws_ok(
  $$ INSERT INTO hr.medical_info (person_id, blood_type)
     VALUES ('cc000000-0000-0000-0000-000000000002', 'A-') $$,
  '23514',
  NULL,
  'L2 consent-absent: medical INSERT RAISES (check_violation) without a vigente medical consent'
);

-- consent-absent path leaves NO medical_info row for Person B (the RAISE rolled it back).
SELECT extensions.is(
  (SELECT count(*)::int FROM hr.medical_info WHERE person_id = 'cc000000-0000-0000-0000-000000000002'),
  0,
  'L2 consent-absent: no medical_info row persists for the blocked person'
);

-- soft-delete (only deleted_at changes, no sensitive payload change) -> allowed without re-checking consent.
SELECT extensions.lives_ok(
  $$ UPDATE hr.medical_info SET deleted_at = now()
     WHERE person_id = 'cc000000-0000-0000-0000-000000000001' $$,
  'L2 soft-delete: UPDATE that touches only deleted_at passes without consent re-check'
);

-- metadata-only UPDATE (no sensitive column change) also passes.
SELECT extensions.lives_ok(
  $$ UPDATE hr.medical_info SET updated_at = now()
     WHERE person_id = 'cc000000-0000-0000-0000-000000000001' $$,
  'L2 metadata-only: UPDATE that changes no sensitive column passes without consent re-check'
);

-- ===========================================================================
-- (3) The 43 = flag-for-reconsent, NEVER fabricated consent.
--     Person C has medical info but no consent: emulate the migration-090 flag UPDATE, then assert the
--     person is flagged, the marker is stamped, the view lists them, AND no consent row was fabricated.
-- ===========================================================================

-- Seed a medical row for Person C bypassing the L2 trigger (a pre-existing legacy row, like the 43 that
-- predate the guard). The trigger is DISABLED only for this one seed so we can recreate the gap.
ALTER TABLE hr.medical_info DISABLE TRIGGER trg_medical_consent_guard;
INSERT INTO hr.medical_info (person_id, blood_type) VALUES ('cc000000-0000-0000-0000-000000000003', 'B+');
ALTER TABLE hr.medical_info ENABLE TRIGGER trg_medical_consent_guard;

-- the flag UPDATE (same predicate as migration 090 §4).
UPDATE hr.people p
SET needs_review = true,
    review_notes = CASE
                     WHEN COALESCE(NULLIF(p.review_notes, ''), '') = '' THEN
                       'SEC-CONSENT: re-consentimiento Ley 81 pendiente (datos medicos sin consentimiento) ' || now()::date
                     ELSE
                       p.review_notes || ' | SEC-CONSENT: re-consentimiento Ley 81 pendiente (datos medicos sin consentimiento) ' || now()::date
                   END
WHERE EXISTS (SELECT 1 FROM hr.medical_info m WHERE m.person_id = p.id AND m.deleted_at IS NULL)
  AND NOT hr.has_active_consent(p.id, 'medical')
  AND COALESCE(p.review_notes, '') NOT LIKE '%SEC-CONSENT:%'
  AND p.id = 'cc000000-0000-0000-0000-000000000003';

SELECT extensions.is(
  (SELECT needs_review FROM hr.people WHERE id = 'cc000000-0000-0000-0000-000000000003'),
  true,
  'flag-for-reconsent: a person with medical data but no consent is flagged needs_review'
);

SELECT extensions.like(
  (SELECT review_notes FROM hr.people WHERE id = 'cc000000-0000-0000-0000-000000000003'),
  '%SEC-CONSENT:%',
  'flag-for-reconsent: the SEC-CONSENT marker is stamped in review_notes'
);

-- NEVER fabricate consent: the flagged person must still have ZERO consent rows.
SELECT extensions.is(
  (SELECT count(*)::int FROM hr.consent WHERE person_id = 'cc000000-0000-0000-0000-000000000003'),
  0,
  'flag-for-reconsent: NO consent row is fabricated for the flagged person (Ley 81 forbids it)'
);

-- the worklist view lists the flagged person (medical present + no vigente medical consent), no payload.
SELECT extensions.is(
  (SELECT count(*)::int FROM hr.v_pending_reconsent WHERE person_id = 'cc000000-0000-0000-0000-000000000003'),
  1,
  'v_pending_reconsent: the flagged person appears in the hr_admin worklist'
);

-- ===========================================================================
-- (4) L1 RPC guard -- hr.complete_onboarding_writes(...): the PRIMARY enforcement path.
--     These CALL the RPC for real (not test theater). The RPC looks up the IC-RH-M-01 / IC-RH-D-07
--     current SOP versions (migration 033); if those are absent we skip the 11 L1 assertions instead of
--     failing on an unrelated precondition. Skip toggled via a psql var (`supabase test db` runs the
--     file through psql, which honours \gset / \if).
--
--     Fixtures (all roll back): throwaway auth.users + hr.people + hr.invite_codes. hr.people.auth_id has
--     NO FK to auth.users, but hr.invite_codes.consumed_by_auth_id DOES -> the success path needs a real
--     auth.users row, so we seed one.
-- ===========================================================================

-- Throwaway auth.users (only id is NOT NULL without default). Rolls back with the txn.
INSERT INTO auth.users (id) VALUES ('dd000000-0000-0000-0000-0000000000a1');

-- L1 fixtures: three persons + their invites.
--   Person D: medical present + p_consent_medical=false -> RAISE, full rollback (auth_id stays NULL,
--             invite not consumed).
--   Person E: full consent (data_processing+emergency+medical) -> writes 3 consent rows + medical row.
--   Person F: pre-stamped SEC-CONSENT marker + legacy medical row -> running with medical consent
--             clears the marker.
INSERT INTO hr.people (id, full_name, status, created_from)
VALUES
  ('dd000000-0000-0000-0000-000000000004', 'L1 Persona D', 'Activo', 'manual'),
  ('dd000000-0000-0000-0000-000000000005', 'L1 Persona E', 'Activo', 'manual'),
  ('dd000000-0000-0000-0000-000000000006', 'L1 Persona F', 'Activo', 'manual');

INSERT INTO hr.invite_codes (id, code, person_id, invite_method, delivery_target)
VALUES
  ('dd000000-0000-0000-0000-0000000000d4', 'L1INVTD4', 'dd000000-0000-0000-0000-000000000004', 'email', 'd@example.com'),
  ('dd000000-0000-0000-0000-0000000000e5', 'L1INVTE5', 'dd000000-0000-0000-0000-000000000005', 'email', 'e@example.com'),
  ('dd000000-0000-0000-0000-0000000000f6', 'L1INVTF6', 'dd000000-0000-0000-0000-000000000006', 'email', 'f@example.com');

-- Detect SOP availability -> :sops_ok ('t'/'f'). On 'f' we skip the 11 L1 assertions gracefully.
SELECT (
  EXISTS (SELECT 1 FROM docs.sops s JOIN docs.sop_versions sv ON sv.sop_id = s.id WHERE s.code = 'IC-RH-M-01' AND sv.is_current)
  AND
  EXISTS (SELECT 1 FROM docs.sops s JOIN docs.sop_versions sv ON sv.sop_id = s.id WHERE s.code = 'IC-RH-D-07' AND sv.is_current)
) AS sops_ok \gset

\if :sops_ok

-- (a) RAISE + rollback-total: medical present but p_consent_medical=false.
SELECT extensions.throws_ok(
  $$ SELECT hr.complete_onboarding_writes(
       'dd000000-0000-0000-0000-0000000000d4'::uuid,  -- invite
       'dd000000-0000-0000-0000-000000000004'::uuid,  -- person
       'dd000000-0000-0000-0000-0000000000a1'::uuid,  -- auth
       NULL,
       '{"contact_name":"Madre","phone":"+50760000000"}'::jsonb,
       '{"blood_type":"O+"}'::jsonb,                   -- medical present
       '{"province":"Panama"}'::jsonb,
       now(), now(), NULL, NULL,
       true, true, false, 'ley81-onboarding-v1'        -- p_consent_medical = FALSE
     ) $$,
  '23514',
  NULL,
  'L1 (a): medical present + p_consent_medical=false RAISES (check_violation)'
);

SELECT extensions.is(
  (SELECT auth_id FROM hr.people WHERE id = 'dd000000-0000-0000-0000-000000000004'),
  NULL,
  'L1 (a) rollback-total: hr.people.auth_id stays NULL (the people-link rolled back)'
);

SELECT extensions.is(
  (SELECT consumed_at FROM hr.invite_codes WHERE id = 'dd000000-0000-0000-0000-0000000000d4'),
  NULL,
  'L1 (a) rollback-total: the invite was NOT consumed'
);

-- (b) full consent: data_processing + emergency + medical = true (+ legal_version) -> writes the 3
--     consent rows + the medical_info row (and links the person / consumes the invite).
SELECT extensions.lives_ok(
  $$ SELECT hr.complete_onboarding_writes(
       'dd000000-0000-0000-0000-0000000000e5'::uuid,
       'dd000000-0000-0000-0000-000000000005'::uuid,
       'dd000000-0000-0000-0000-0000000000a1'::uuid,
       NULL,
       '{"contact_name":"Padre","phone":"+50761111111"}'::jsonb,
       '{"blood_type":"A+","allergies":"ninguna"}'::jsonb,
       '{"province":"Panama"}'::jsonb,
       now(), now(), '10.0.0.1', 'pgtap-ua',
       true, true, true, 'ley81-onboarding-v1'
     ) $$,
  'L1 (b) full consent: the RPC completes without error'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM hr.consent
     WHERE person_id = 'dd000000-0000-0000-0000-000000000005' AND granted = true
       AND scope IN ('data_processing','emergency_contact','medical')),
  3,
  'L1 (b): three granted consent rows written (data_processing + emergency_contact + medical)'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM hr.medical_info
     WHERE person_id = 'dd000000-0000-0000-0000-000000000005' AND deleted_at IS NULL),
  1,
  'L1 (b): the medical_info row is written (L2 trigger passed because consent was committed first)'
);

-- (c) identical re-run -> no duplicate consent rows (append-only + NOT EXISTS idempotency).
SELECT extensions.lives_ok(
  $$ SELECT hr.complete_onboarding_writes(
       'dd000000-0000-0000-0000-0000000000e5'::uuid,
       'dd000000-0000-0000-0000-000000000005'::uuid,
       'dd000000-0000-0000-0000-0000000000a1'::uuid,
       NULL,
       '{"contact_name":"Padre","phone":"+50761111111"}'::jsonb,
       '{"blood_type":"A+","allergies":"ninguna"}'::jsonb,
       '{"province":"Panama"}'::jsonb,
       now(), now(), '10.0.0.1', 'pgtap-ua',
       true, true, true, 'ley81-onboarding-v1'
     ) $$,
  'L1 (c) re-run: an identical second call completes without error (idempotent)'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM hr.consent
     WHERE person_id = 'dd000000-0000-0000-0000-000000000005' AND granted = true
       AND scope IN ('data_processing','emergency_contact','medical')),
  3,
  'L1 (c): still exactly 3 consent rows after re-run (NOT EXISTS prevents duplicates)'
);

-- (d) medical present + empty legal_version -> RAISE (the version pins the consented text; '' is
--     unauditable).
SELECT extensions.throws_ok(
  $$ SELECT hr.complete_onboarding_writes(
       'dd000000-0000-0000-0000-0000000000d4'::uuid,
       'dd000000-0000-0000-0000-000000000004'::uuid,
       'dd000000-0000-0000-0000-0000000000a1'::uuid,
       NULL,
       NULL,
       '{"blood_type":"B-"}'::jsonb,                    -- medical present
       NULL,
       now(), now(), NULL, NULL,
       true, true, true, ''                             -- empty legal_version
     ) $$,
  '23514',
  NULL,
  'L1 (d): medical present + empty p_consent_legal_version RAISES (check_violation)'
);

-- (e) flag-clear: Person F has a pre-stamped SEC-CONSENT marker + a legacy medical row (seeded with the
--     L2 trigger disabled, like the 43). Running the RPC with medical consent must clear the marker.
ALTER TABLE hr.medical_info DISABLE TRIGGER trg_medical_consent_guard;
INSERT INTO hr.medical_info (person_id, blood_type)
VALUES ('dd000000-0000-0000-0000-000000000006', 'AB+');
ALTER TABLE hr.medical_info ENABLE TRIGGER trg_medical_consent_guard;

UPDATE hr.people
SET needs_review = true,
    review_notes = 'SEC-CONSENT: re-consentimiento Ley 81 pendiente (datos medicos sin consentimiento)'
WHERE id = 'dd000000-0000-0000-0000-000000000006';

SELECT extensions.lives_ok(
  $$ SELECT hr.complete_onboarding_writes(
       'dd000000-0000-0000-0000-0000000000f6'::uuid,
       'dd000000-0000-0000-0000-000000000006'::uuid,
       'dd000000-0000-0000-0000-0000000000a1'::uuid,
       NULL,
       NULL,
       '{"blood_type":"AB+"}'::jsonb,                   -- medical present -> triggers the flag-clear block
       NULL,
       now(), now(), NULL, NULL,
       true, false, true, 'ley81-onboarding-v1'
     ) $$,
  'L1 (e) flag-clear: the RPC completes with a vigente medical consent'
);

SELECT extensions.unlike(
  (SELECT COALESCE(review_notes, '') FROM hr.people WHERE id = 'dd000000-0000-0000-0000-000000000006'),
  '%SEC-CONSENT:%',
  'L1 (e) flag-clear: the SEC-CONSENT marker is removed after consent is recorded'
);

\else
SELECT extensions.skip(
  'IC-RH-M-01 / IC-RH-D-07 SOP current version missing (apply migration 033); L1 RPC cases skipped',
  11
);
\endif

SELECT * FROM extensions.finish();

ROLLBACK;
