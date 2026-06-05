-- 094_engines_vacaciones.test.sql
-- pgTAP coverage for Group 4 engines + VACACIONES end-to-end (migration 094, ADR-0037/0015/0020/0027).
-- Exercises the SECURITY DEFINER orchestration RPCs through the full happy path + edge cases by
-- impersonating each actor via request.jwt.claims (auth.uid() reads claim.sub), the same auth model the
-- app uses. Asserts: the kind column + CHECK; the re-seeded VACACIONES form_schema + chain; chain
-- instantiation (B1: 4 non-submit rows, correct kinds/assignees, NO submit/requester row); S1 sequential
-- ordering (out-of-order actuation RAISES: supervisor before RRHH-recibe, GG before Planilla-verifica);
-- processing never gates but ADVANCES the pointer (S2/S3: RRHH recibe + Planilla verifica); R5
-- no-self-approval; the status transitions; ledger reserve -> commit on final approval and
-- release-with-reversal-row on reject (N3); stamps on every step.
--
-- HOW TO RUN: `supabase test db` (pgTAP via the Supabase CLI; loads pgtap and runs each *.test.sql under
--   supabase/tests/database/ inside a rolled-back transaction). NOT YET WIRED into `npm run verify`
--   (same as 089/090/091); run on demand pre-merge until TF-FOUNDATION wires pgTAP into CI.
--
-- Self-contained: seeds its own auth.users + hr.people/employments + leave policy/assignment/balance +
-- a fresh VACACIONES type instance is NOT needed (the migration seeds it); asserts; rolls back. All
-- object refs schema-qualified (the fns under test are SECURITY DEFINER + search_path='').

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT extensions.plan(41);

-- ---------------------------------------------------------------------------
-- Helper: impersonate a person by setting the JWT sub to their auth id.
-- ---------------------------------------------------------------------------
-- (inlined via set_config in each phase below)

-- ---------------------------------------------------------------------------
-- Fixtures: deterministic ids. Requester R, Supervisor S, President P, HR admin H.
--   auth.users for each (auth.uid() resolves via people.auth_id = the sub).
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id) VALUES
  ('e9000000-0000-0000-0000-0000000000a1'),  -- R
  ('e9000000-0000-0000-0000-0000000000a2'),  -- S
  ('e9000000-0000-0000-0000-0000000000a3'),  -- P
  ('e9000000-0000-0000-0000-0000000000a4');  -- H

INSERT INTO hr.people (id, auth_id, full_name, national_id, status, created_from) VALUES
  ('e9000000-0000-0000-0000-000000000001', 'e9000000-0000-0000-0000-0000000000a1', 'Empleado Requester', '8-111-1111', 'Activo', 'manual'),
  ('e9000000-0000-0000-0000-000000000002', 'e9000000-0000-0000-0000-0000000000a2', 'Maria Supervisor',  '8-222-2222', 'Activo', 'manual'),
  ('e9000000-0000-0000-0000-000000000003', 'e9000000-0000-0000-0000-0000000000a3', 'Rodrigo President', '8-333-3333', 'Activo', 'manual'),
  ('e9000000-0000-0000-0000-000000000004', 'e9000000-0000-0000-0000-0000000000a4', 'Ana RRHH',          '8-444-4444', 'Activo', 'manual');

-- Employments: R reports to S; roles set app_role for current_app_role().
-- THREE live-schema constraints the original council seed violated (each caught by a live rolled-back
-- run 2026-06-05; the council's "green" pgTAP never actually ran past the seed -- test-theater):
--   (1) hr.employments.is_current is a GENERATED column (= valid_to IS NULL); inserting it errors 428C9.
--       Omit it (valid_to NULL -> is_current true).
--   (2) source_system is the core.source_system DOMAIN whose CHECK allows only
--       spectrum|humanos_app|payday|b2w|manual_entry -- 'humanos' violates it (23514). Omit it (the
--       column defaults to 'humanos_app').
--   (3) leave_policies.accrual_method CHECK allows only lump_sum|periodic|hourly|unlimited ('fixed' fails).
INSERT INTO hr.employments (person_id, app_role, supervisor_id, position_text, department_text, hire_date, valid_from, created_from) VALUES
  ('e9000000-0000-0000-0000-000000000001', 'employee',  'e9000000-0000-0000-0000-000000000002', 'Albanil',      'Construccion', '2020-01-01', '2020-01-01', 'manual'),
  ('e9000000-0000-0000-0000-000000000002', 'employee',  NULL,                                    'Supervisor',   'Construccion', '2018-01-01', '2018-01-01', 'manual'),
  ('e9000000-0000-0000-0000-000000000003', 'president', NULL,                                    'Gerente Gen.', 'Gerencia',     '2010-01-01', '2010-01-01', 'manual'),
  ('e9000000-0000-0000-0000-000000000004', 'hr_admin',  NULL,                                    'Asist. RRHH',  'RRHH',         '2019-01-01', '2019-01-01', 'manual');

-- Leave policy + assignment + balance for R: 30 accrued, 0 used, 0 pending -> available 30.
INSERT INTO hr.leave_policies (id, code, name, unit, accrual_method, allow_negative_balance, reset_negative_on_carryover, is_active)
VALUES ('e9000000-0000-0000-0000-0000000000b1', 'VAC-TEST', 'Vacaciones Test', 'days', 'lump_sum', false, false, true);

INSERT INTO hr.leave_assignments (id, person_id, policy_id, accrual_start_date, valid_from, is_active)
VALUES ('e9000000-0000-0000-0000-0000000000c1', 'e9000000-0000-0000-0000-000000000001', 'e9000000-0000-0000-0000-0000000000b1', '2020-01-01', '2020-01-01', true);

INSERT INTO hr.leave_balances (assignment_id, accrued, used, pending, available, as_of)
VALUES ('e9000000-0000-0000-0000-0000000000c1', 30, 0, 0, 30, now());

-- ===========================================================================
-- (1) Structural: kind column + CHECK + the re-seeded VACACIONES type.
-- ===========================================================================
SELECT extensions.has_column('requests', 'approvals', 'kind', 'approvals.kind column exists (ADR-0037)');

SELECT extensions.col_default_is('requests', 'approvals', 'kind', 'approval', 'approvals.kind defaults to approval (back-compat)');

SELECT extensions.is(
  (SELECT form_schema IS NOT NULL FROM requests.types WHERE code = 'VACACIONES'),
  true,
  'VACACIONES form_schema is seeded (no longer NULL)'
);

SELECT extensions.is(
  (SELECT approval_chain_template->>'mode' FROM requests.types WHERE code = 'VACACIONES'),
  'sequential',
  'VACACIONES chain mode is sequential (ADR-0037)'
);

SELECT extensions.is(
  (SELECT jsonb_array_length(approval_chain_template->'steps') FROM requests.types WHERE code = 'VACACIONES'),
  5,
  'VACACIONES chain has 5 steps (submit, RRHH, supervisor, Planilla, GG)'
);

SELECT extensions.is(
  (SELECT (approval_chain_template->'steps'->4->>'role') FROM requests.types WHERE code = 'VACACIONES'),
  'president',
  'VACACIONES last step is the president gate (GG signs LAST, PO-05)'
);

-- ===========================================================================
-- (2) Submit (as Requester R). next_sequence + reserve + instantiate_chain.
--     B1: the submit step does NOT produce an approvals row (approver_role='requester' would violate
--     approvals_approver_role_check); only the 4 non-submit steps materialize.
-- ===========================================================================
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a1"}', true);

SELECT id AS ticket_id FROM requests.submit_vacaciones(
  '{"nombre_empleado":"Empleado Requester","cedula":"8-111-1111","dias_solicitados":5,"tipo_pago":"completas","date_ranges":[{"del":"2026-06-08","al":"2026-06-12"}]}'::jsonb,
  5,
  'e9000000-0000-0000-0000-000000000002',  -- selected supervisor S
  false
) \gset

SELECT extensions.is(
  (SELECT status FROM requests.tickets WHERE id = :'ticket_id'),
  'En_Revision',
  'submit: ticket advances Enviada -> En_Revision after chain instantiation'
);

SELECT extensions.like(
  (SELECT ticket_number FROM requests.tickets WHERE id = :'ticket_id'),
  'HUM-%',
  'submit: ticket_number assigned via requests.next_sequence (HUM-YYYY-NNNN)'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM requests.approvals WHERE ticket_id = :'ticket_id'),
  4,
  'submit: 4 approvals rows instantiated (B1: no submit row)'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM requests.approvals WHERE ticket_id = :'ticket_id' AND kind = 'submit'),
  0,
  'submit: NO kind=submit approvals row (B1: firma=envio captured by tickets, not a row)'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM requests.approvals WHERE ticket_id = :'ticket_id' AND approver_role = 'requester'),
  0,
  'submit: NO approver_role=requester row (would violate approvals_approver_role_check)'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM requests.approvals WHERE ticket_id = :'ticket_id' AND kind = 'approval'),
  2,
  'submit: exactly 2 approval gates (supervisor + president)'
);

SELECT extensions.is(
  (SELECT count(*)::int FROM requests.approvals WHERE ticket_id = :'ticket_id' AND kind = 'processing'),
  2,
  'submit: exactly 2 processing steps (RRHH recibe + Planilla verifica)'
);

-- the pointer is set to the first actionable (non-submit) step: RRHH-recibe processing (step 2).
SELECT extensions.is(
  (SELECT current_step FROM requests.tickets WHERE id = :'ticket_id'),
  2,
  'submit: pointer set to the first non-submit step (RRHH-recibe, step 2)'
);

-- reserve: available 30 -> 25, pending 0 -> 5.
SELECT extensions.is(
  (SELECT available FROM hr.leave_balances WHERE assignment_id = 'e9000000-0000-0000-0000-0000000000c1'),
  25::numeric,
  'submit: ledger reserve drops available 30 -> 25'
);
SELECT extensions.is(
  (SELECT pending FROM hr.leave_balances WHERE assignment_id = 'e9000000-0000-0000-0000-0000000000c1'),
  5::numeric,
  'submit: ledger reserve sets pending 0 -> 5'
);

-- S3: right after submit the next actionable step is RRHH-recibe (pooled hr_admin), so the recipient
-- resolver returns the hr_admin pool (Ana RRHH), NOT the supervisor. This is the premature-notify fix.
SELECT extensions.is(
  (SELECT count(*)::int FROM requests.ticket_pending_recipients(:'ticket_id')
     WHERE person_id = 'e9000000-0000-0000-0000-000000000004'),
  1,
  'S3: pending recipients after submit = RRHH pool (Ana RRHH), not the supervisor'
);
SELECT extensions.is(
  (SELECT count(*)::int FROM requests.ticket_pending_recipients(:'ticket_id')
     WHERE person_id = 'e9000000-0000-0000-0000-000000000002'),
  0,
  'S3: the supervisor is NOT notified at submit (RRHH-recibe is first)'
);

-- ===========================================================================
-- (3) S1 sequential ordering: the supervisor gate (step 3) CANNOT be approved before RRHH-recibe
--     (step 2 processing) is resolved. Out-of-order actuation RAISES check_violation.
-- ===========================================================================
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a2"}', true);
SELECT extensions.throws_ok(
  format($$ SELECT requests.act_on_approval(%L, 'Aprobada', NULL) $$, :'ticket_id'),
  '23514',
  NULL,
  'S1: supervisor approving step 3 before RRHH-recibe (step 2) RAISES paso fuera de orden'
);

-- ===========================================================================
-- (4) RRHH recibe (processing, as HR admin H). Non-gating: status stays En_Revision; pointer -> 3.
-- ===========================================================================
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a4"}', true);

SELECT requests.process_step(:'ticket_id', 'received');

SELECT extensions.is(
  (SELECT status FROM requests.tickets WHERE id = :'ticket_id'),
  'En_Revision',
  'RRHH recibe (processing): does NOT change status (R8 non-gating)'
);
SELECT extensions.is(
  (SELECT received_by FROM requests.tickets WHERE id = :'ticket_id'),
  'e9000000-0000-0000-0000-000000000004'::uuid,
  'RRHH recibe: received_by stamped (R8)'
);
SELECT extensions.is(
  (SELECT current_step FROM requests.tickets WHERE id = :'ticket_id'),
  3,
  'RRHH recibe: pointer advances to the supervisor gate (step 3) -- S2/S3 fix'
);
SELECT extensions.like(
  (SELECT stamp_text FROM requests.approvals WHERE ticket_id = :'ticket_id' AND step_order = 2),
  'Recibido por Ana RRHH (RRHH),%',
  'RRHH recibe: processing stamp written on the step-2 row (R7)'
);

-- ===========================================================================
-- (5) R5: the requester cannot approve their own ticket. Now that step 2 is resolved, the ordering
--     check passes and R5 (no-self-approval) is the genuine blocker.
-- ===========================================================================
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a1"}', true);
SELECT extensions.throws_ok(
  format($$ SELECT requests.act_on_approval(%L, 'Aprobada', NULL) $$, :'ticket_id'),
  '23514',
  NULL,
  'R5: the requester actuating the supervisor gate RAISES (no-self-approval)'
);

-- ===========================================================================
-- (6) Supervisor approves (gate, as S). Advances toward the GG gate; stays En_Revision.
-- ===========================================================================
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a2"}', true);

SELECT requests.act_on_approval(:'ticket_id', 'Aprobada', 'autorizado');

SELECT extensions.is(
  (SELECT status FROM requests.tickets WHERE id = :'ticket_id'),
  'En_Revision',
  'supervisor approve: ticket stays En_Revision (GG gate still pending)'
);
SELECT extensions.is(
  (SELECT decision FROM requests.approvals WHERE ticket_id = :'ticket_id' AND step_order = 3),
  'Aprobada',
  'supervisor approve: the supervisor gate is Aprobada'
);
SELECT extensions.like(
  (SELECT stamp_text FROM requests.approvals WHERE ticket_id = :'ticket_id' AND step_order = 3),
  'Aprobado por Maria Supervisor (supervisor),%',
  'supervisor approve: approval stamp written (R7)'
);
SELECT extensions.is(
  (SELECT current_step FROM requests.tickets WHERE id = :'ticket_id'),
  5,
  'supervisor approve: pointer advances over processing step 4 to the GG gate (step 5)'
);

-- ===========================================================================
-- (7) S1 sequential ordering: the GG gate (step 5) CANNOT be approved before Planilla-verifica
--     (step 4 processing) is resolved. Out-of-order actuation RAISES.
-- ===========================================================================
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a3"}', true);
SELECT extensions.throws_ok(
  format($$ SELECT requests.act_on_approval(%L, 'Aprobada', NULL) $$, :'ticket_id'),
  '23514',
  NULL,
  'S1: GG approving step 5 before Planilla-verifica (step 4) RAISES paso fuera de orden'
);

-- ===========================================================================
-- (8) Planilla verifica (processing, as HR admin H). Still non-gating.
-- ===========================================================================
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a4"}', true);

SELECT requests.process_step(:'ticket_id', 'processed');

SELECT extensions.is(
  (SELECT processed_by FROM requests.tickets WHERE id = :'ticket_id'),
  'e9000000-0000-0000-0000-000000000004'::uuid,
  'Planilla verifica: processed_by stamped (R8)'
);
SELECT extensions.like(
  (SELECT stamp_text FROM requests.approvals WHERE ticket_id = :'ticket_id' AND step_order = 4),
  'Verificado por Ana RRHH (Planilla),%',
  'Planilla verifica: processing stamp written on step-4 row'
);

-- ===========================================================================
-- (9) GG approves (final gate, as President P). Ticket -> Aprobada; ledger commit.
-- ===========================================================================
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a3"}', true);

SELECT requests.act_on_approval(:'ticket_id', 'Aprobada', 'autorizado GG');

SELECT extensions.is(
  (SELECT status FROM requests.tickets WHERE id = :'ticket_id'),
  'Aprobada',
  'GG approve (final gate): ticket -> Aprobada (all approval gates signed)'
);
SELECT extensions.is(
  (SELECT used FROM hr.leave_balances WHERE assignment_id = 'e9000000-0000-0000-0000-0000000000c1'),
  5::numeric,
  'GG approve: ledger commit moves pending -> used (used 0 -> 5)'
);
SELECT extensions.is(
  (SELECT pending FROM hr.leave_balances WHERE assignment_id = 'e9000000-0000-0000-0000-0000000000c1'),
  0::numeric,
  'GG approve: pending cleared (5 -> 0) on commit'
);
SELECT extensions.is(
  (SELECT available FROM hr.leave_balances WHERE assignment_id = 'e9000000-0000-0000-0000-0000000000c1'),
  25::numeric,
  'GG approve: available stays 25 (reserve already deducted; commit only flips bucket)'
);
SELECT extensions.is(
  (SELECT count(*)::int FROM hr.leave_ledger WHERE source_ticket_id = :'ticket_id' AND kind = 'usage'),
  1,
  'GG approve: a usage ledger row is booked for the ticket'
);

-- ===========================================================================
-- (10) Reject path (a SECOND ticket): RRHH recibe, then supervisor rejects -> Rechazada +
--      reservation released + a 'reversal' ledger row posted (N3 audit / spec sec 6.3).
-- ===========================================================================
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a1"}', true);

SELECT id AS ticket2 FROM requests.submit_vacaciones(
  '{"nombre_empleado":"Empleado Requester","cedula":"8-111-1111","dias_solicitados":3,"tipo_pago":"completas","date_ranges":[{"del":"2026-07-06","al":"2026-07-08"}]}'::jsonb,
  3, 'e9000000-0000-0000-0000-000000000002', false
) \gset

-- after reserve: available 25 -> 22, pending 0 -> 3.
SELECT extensions.is(
  (SELECT available FROM hr.leave_balances WHERE assignment_id = 'e9000000-0000-0000-0000-0000000000c1'),
  22::numeric,
  'reject path: second submit reserves 3 (available 25 -> 22)'
);

-- RRHH must receive (step 2) before the supervisor gate (step 3) can be actuated (S1 ordering).
SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a4"}', true);
SELECT requests.process_step(:'ticket2', 'received');

SELECT set_config('request.jwt.claims', '{"sub":"e9000000-0000-0000-0000-0000000000a2"}', true);
SELECT requests.act_on_approval(:'ticket2', 'Rechazada', 'no procede');

SELECT extensions.is(
  (SELECT status FROM requests.tickets WHERE id = :'ticket2'),
  'Rechazada',
  'reject: supervisor rejection -> ticket Rechazada (terminal)'
);
SELECT extensions.is(
  (SELECT available FROM hr.leave_balances WHERE assignment_id = 'e9000000-0000-0000-0000-0000000000c1'),
  25::numeric,
  'reject: reservation released -> available restored 22 -> 25'
);
-- N3: the release posts a 'reversal' ledger row for the released amount (3), not silently.
SELECT extensions.is(
  (SELECT count(*)::int FROM hr.leave_ledger WHERE source_ticket_id = :'ticket2' AND kind = 'reversal'),
  1,
  'reject: a reversal ledger row is posted for the released reservation (N3 audit)'
);
SELECT extensions.is(
  (SELECT amount FROM hr.leave_ledger WHERE source_ticket_id = :'ticket2' AND kind = 'reversal'),
  3::numeric,
  'reject: the reversal ledger row records the actual released amount (3)'
);

SELECT * FROM extensions.finish();

ROLLBACK;
