-- 094_approvals_kind_vacaciones_engines
-- Group 4 engines + VACACIONES end-to-end backend (ADR-0037 / ADR-0015 / ADR-0020 / ADR-0027).
-- ADDITIVE build slice. Touches ONLY requests.* + hr.* (R1). NO public.*, NO humanos.*, NO auth.users.
-- All new functions are SECURITY DEFINER with search_path='' (repo style, CLAUDE.md R5/R10 + mig 071/091).
--
-- WHAT THIS MIGRATION ADDS:
--   (1) requests.approvals.kind  -- text NOT NULL DEFAULT 'approval' CHECK (submit|approval|processing).
--       Back-compat default keeps the 0 existing rows / future inserts valid (ADR-0037 decision 1).
--       The ApprovalEngine gates ONLY on kind='approval'; 'processing' is R8 reception/post-approval
--       (never blocks, never takes employee input); 'submit' is the requester's own row.
--   (2) Re-seed of the VACACIONES requests.types row:
--         - form_schema (field-source matrix: profile | user_input | computed; saldo = computed).
--         - approval_chain_template -> mode 'sequential', kind+step_order per step, Planilla step added
--           (RRHH recibe -> Supervisor aprueba -> Planilla verifica acumulados -> GG/president aprueba LAST).
--       Resolved by code='VACACIONES' (no hardcoded UUID). INSERT if absent, else UPDATE (idempotent).
--   (3) hr.get_leave_balance(p_person_id) -- thin READ helper over hr.leave_balances.available via the
--       person's active leave_assignment. Reuses (does NOT recreate) hr.post_leave_ledger_entry for writes.
--   (4) Orchestration RPCs in requests.* that the TS engines call (cross-RLS writes are SECURITY DEFINER,
--       authorization re-checked INSIDE each function so least-privilege is preserved):
--         - requests.instantiate_chain(p_ticket_id)           -- ChainResolver: materializes approvals rows.
--         - requests.submit_vacaciones(...)                   -- FormEngine snapshot + ledger pending + chain.
--         - requests.act_on_approval(p_ticket_id, decision, comments)  -- gate actuation (kind='approval').
--         - requests.process_step(p_ticket_id, p_step_kind)   -- processing actuation (kind='processing').
--
-- DB-1 (audit-trigger) DECISION (STATUS §7, coupled to ApprovalEngine): we do NOT add a generic row-level
--   audit TRIGGER on requests.approvals in this slice. Rationale: the orchestration RPCs write explicit,
--   semantically-rich rows to audit.log via DIRECT INSERT IN THE SAME TRANSACTION as the mutation (audit
--   integrity > availability, ADR-0037 + spec §3.6). CONVENTION (mig 076/089): audit.log.action is a
--   fixed enum (insert|update|delete|restore|custom|login|logout|export|view_sensitive), so the semantic
--   business event goes in action='custom' + reason='<event>' + metadata.semantic_action='<event>'
--   ('ticket_submitted'/'approval_actuated'/'step_processed'/'manual_entry_bypass'/
--   'president_gate_omitted_self'). NOTE: we write audit.log (the mutation/change log), NOT
--   audit.access_log -- the latter is the Ley 81 DATA-ACCESS log (view|search|export|login); both its
--   event_type CHECK and audit.log's action CHECK reject the raw business-event names (both raise 23514;
--   verified live 2026-06-05). A blanket AFTER trigger would duplicate these with less context. (Audit +
--   ledger are NOT fire-and-forget; only notifications are.)
--
-- FLAG (latent, NOT blocking the worked example -- for the attended T5/T6 leave-accrual slice):
--   Two ledger-accounting strategies coexist on hr.leave_*. requests.apply_leave_effect (this file)
--   COLUMN-maintains used/pending/available and posts a 'usage'(-) row on commit and a 'reversal'(+)
--   row on release (N3 audit). hr.post_leave_ledger_entry (pre-existing, hr_admin-only) instead
--   RE-DERIVES accrued=sum(amount>0) / used=-sum(amount<0) from the WHOLE ledger by sign. If
--   post_leave_ledger_entry is ever run on an assignment that already has apply_leave_effect rows
--   (e.g. future accrual seeding via the helper, or a manual_entry on the same assignment), the
--   release 'reversal'(+) rows are mis-counted as accrued. It does NOT affect the VACACIONES worked
--   example (reserve/commit/release stay inside apply_leave_effect's column-maintained world; accrual
--   is seeded directly today). The real fix is to make `pending` ledger-derived too -- deferred to the
--   attended T5/T6 work (accrual is config, not engine scope; spec §6 A1). Verified live, rolled back.
--
-- RENUMBER: filename ts moved 20260605081100 -> 20260605120000 so it orders AFTER the applied 092
--   (20260605110113). Ordinal moved 093 -> 094: ordinal 093 is already burned in docs/CHANGELOG.md
--   (the deferred+deleted '093_invite_single_use_expiry_enforcement'); reusing it would make the
--   migration ledger ambiguous, so this is 094. Applied via MCP with name
--   '094_approvals_kind_vacaciones_engines'.
--
-- NOT APPLIED BY THIS AGENT: the main loop applies migrations. This file is authored only.

-- =========================================================================
-- (1) requests.approvals.kind -- runtime gate/processing/submit discriminator (ADR-0037 decision 1).
-- =========================================================================
ALTER TABLE requests.approvals
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'approval';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'requests.approvals'::regclass
      AND conname = 'approvals_kind_check'
  ) THEN
    ALTER TABLE requests.approvals
      ADD CONSTRAINT approvals_kind_check
      CHECK (kind IN ('submit', 'approval', 'processing'));
  END IF;
END $$;

COMMENT ON COLUMN requests.approvals.kind IS
  'ADR-0037: discriminador de runtime del step. submit = fila del solicitante (firma=envio, ADR-0027); approval = gate real (bloquea hasta decidir; R5 no-self-approval, R9 back-and-forth); processing = recepcion/post-aprobacion R8 (RRHH-recibe, Planilla-verifica; nunca bloquea, nunca recibe input del empleado, render read-only/admin). El ApprovalEngine gatea SOLO en kind=approval. DEFAULT approval por back-compat. Generaliza R8 (received_by/processed_by) mas alla de ACCION_PERSONAL.';

-- =========================================================================
-- (2) hr.get_leave_balance -- READ helper (FormEngine compute_fn 'leave_balance'). Spec §6.
--     Reuses hr.post_leave_ledger_entry (already exists) for WRITES; this is the read counterpart.
-- =========================================================================
CREATE OR REPLACE FUNCTION hr.get_leave_balance(p_person_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- AUTHZ (least-privilege inside the definer): a caller may only read their OWN balance, unless they
  -- are hr_admin. Leave balance is mildly sensitive personal data (R13/Ley81-adjacent); without this
  -- guard any authenticated user could pass an arbitrary p_person_id and read another person's balance
  -- (the SECURITY DEFINER bypasses hr.leave_balances RLS). Unauthorized reads return NULL (no oracle),
  -- which the FormEngine treats as "no balance" -- the only legitimate caller passes its own id.
  SELECT b.available
  FROM hr.leave_assignments a
  JOIN hr.leave_balances b ON b.assignment_id = a.id
  WHERE a.person_id = p_person_id
    AND (p_person_id = hr.current_person_id() OR hr.is_hr_admin())
    AND a.is_active = true
    AND a.deleted_at IS NULL
    AND a.valid_from <= CURRENT_DATE
    AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
  ORDER BY a.valid_from DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION hr.get_leave_balance(uuid) IS
  'READ helper (ADR-0015 / spec §6): saldo de vacaciones disponible (hr.leave_balances.available) de la persona via su leave_assignment activo (person -> assignment -> balance). AUTHZ: solo el propio saldo (p_person_id = hr.current_person_id()) o hr_admin; otra persona -> NULL (sin oraculo, R13/Ley81). Devuelve NULL si no hay assignment activo. SECURITY DEFINER search_path='''' (lee hr.* HR-owned; NUNCA payroll.*, R1). El write helper hr.post_leave_ledger_entry ya existe -- este es solo el lado de lectura. compute_fn ''leave_balance'' del FormEngine lo invoca.';

REVOKE EXECUTE ON FUNCTION hr.get_leave_balance(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION hr.get_leave_balance(uuid) TO authenticated, service_role;

-- =========================================================================
-- (3) Active leave assignment resolver (internal; used by submit + ledger effects). Avoids
--     duplicating the person->assignment route in three RPCs.
-- =========================================================================
CREATE OR REPLACE FUNCTION requests.active_leave_assignment(p_person_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id
  FROM hr.leave_assignments a
  WHERE a.person_id = p_person_id
    AND a.is_active = true
    AND a.deleted_at IS NULL
    AND a.valid_from <= CURRENT_DATE
    AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
  ORDER BY a.valid_from DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION requests.active_leave_assignment(uuid) IS
  'Resuelve el leave_assignment activo de una persona (person -> assignment). Internal: usado por requests.submit_vacaciones y act_on_approval para postear hr.post_leave_ledger_entry. SECURITY DEFINER search_path='''' .';

-- service_role-only internal helper. NOTE: the requests/hr schemas have ALTER DEFAULT PRIVILEGES that
-- auto-GRANT EXECUTE to `authenticated` on every new function, so REVOKE FROM PUBLIC alone is NOT enough
-- (mig 044/077 lesson) -- we must also REVOKE FROM authenticated. Called only by the definer RPCs
-- (postgres-owned, which retain EXECUTE as owner).
REVOKE EXECUTE ON FUNCTION requests.active_leave_assignment(uuid) FROM PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION requests.active_leave_assignment(uuid) TO service_role;

-- =========================================================================
-- (3b) requests.apply_leave_effect -- internal ledger-effect for the vacaciones reservation lifecycle.
--   Reconciles the spec §6 pending->used->reversal lifecycle with the EXISTING helper's contract:
--   hr.post_leave_ledger_entry is hr_admin-only (invoker-bound) and models accrued(+)/used(-) by SIGN
--   while leaving `pending` externally managed. The submit actor (employee) and the commit actor
--   (president) are NOT hr_admin, so they cannot call that helper. This definer function applies the
--   effect with the SAME available formula the helper uses (available = accrued - used - pending):
--     - 'reserve' : pending += dias            (at submit; available drops, accrued/used untouched)
--     - 'release' : pending -= dias + a 'reversal' ledger row for the released delta (at reject/cancel;
--                   available restored AND the reversal is audited -- N3, spec sec 6.3)
--     - 'commit'  : pending -= dias, used += dias via a 'usage' ledger row (at final GG approval)
--   It is reachable ONLY through the orchestration RPCs (service_role/authenticated execute; each
--   caller re-checks authorization), so it deliberately does NOT re-gate on hr_admin. Documented
--   exception to "reuse the helper" (R5/CLAUDE.md rule 5): the helper's hr_admin gate is incompatible
--   with employee-submit + president-commit; the manual_entry path still uses the helper directly.
-- =========================================================================
CREATE OR REPLACE FUNCTION requests.apply_leave_effect(
  p_assignment_id uuid,
  p_effect        text,   -- 'reserve' | 'release' | 'commit'
  p_dias          numeric,
  p_ticket_id     uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_policy   hr.leave_policies%ROWTYPE;
  v_accrued  numeric;
  v_used     numeric;
  v_pending  numeric;
  v_new_pending numeric;
  v_released numeric;
  v_new_avail numeric;
  v_orig_id  uuid;
BEGIN
  IF p_effect NOT IN ('reserve', 'release', 'commit') THEN
    RAISE EXCEPTION 'effect invalido: % (reserve|release|commit)', p_effect USING ERRCODE = '22023';
  END IF;
  IF p_dias IS NULL OR p_dias <= 0 THEN
    RAISE EXCEPTION 'dias debe ser > 0 (recibido %)', p_dias USING ERRCODE = '22023';
  END IF;

  SELECT p.* INTO v_policy
  FROM hr.leave_assignments a JOIN hr.leave_policies p ON p.id = a.policy_id
  WHERE a.id = p_assignment_id AND a.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'leave assignment % no existe o inactivo', p_assignment_id USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO hr.leave_balances (assignment_id) VALUES (p_assignment_id)
    ON CONFLICT (assignment_id) DO NOTHING;
  SELECT accrued, used, pending INTO v_accrued, v_used, v_pending
  FROM hr.leave_balances WHERE assignment_id = p_assignment_id FOR UPDATE;

  IF p_effect = 'reserve' THEN
    v_new_pending := COALESCE(v_pending, 0) + p_dias;
    IF NOT v_policy.allow_negative_balance
       AND (COALESCE(v_accrued,0) - COALESCE(v_used,0) - v_new_pending) < 0 THEN
      RAISE EXCEPTION 'saldo insuficiente: reservar % excede disponible (policy %)', p_dias, v_policy.code
        USING ERRCODE = '23514';
    END IF;
    UPDATE hr.leave_balances
       SET pending = v_new_pending,
           available = COALESCE(v_accrued,0) - COALESCE(v_used,0) - v_new_pending,
           as_of = now(), updated_at = now()
     WHERE assignment_id = p_assignment_id;

  ELSIF p_effect = 'release' THEN
    -- Release the reservation (reject/cancel). Keep the >=0 floor on pending, but post a 'reversal'
    -- ledger row for the ACTUAL released delta (oldpending - newpending), NOT silently (N3 audit /
    -- spec sec 6.3: every reversal must be audited). reversal_of_id references the original usage
    -- ledger row for this ticket if one was committed (rare: reject after commit); else NULL (the
    -- common case -- a pure reservation never wrote a ledger row, so there is nothing to point at).
    v_new_pending := GREATEST(COALESCE(v_pending, 0) - p_dias, 0);
    v_released    := COALESCE(v_pending, 0) - v_new_pending;  -- actual delta released (>= 0)
    v_new_avail   := COALESCE(v_accrued,0) - COALESCE(v_used,0) - v_new_pending;

    SELECT l.id INTO v_orig_id
    FROM hr.leave_ledger l
    WHERE l.assignment_id = p_assignment_id
      AND l.source_ticket_id = p_ticket_id
      AND l.kind = 'usage'
    ORDER BY l.created_at DESC
    LIMIT 1;

    INSERT INTO hr.leave_ledger
      (assignment_id, kind, amount, balance_after, event_date, source_ticket_id, reversal_of_id, note, created_by)
    VALUES
      (p_assignment_id, 'reversal', v_released, v_new_avail,
       CURRENT_DATE, p_ticket_id, v_orig_id,
       'release de reserva de vacaciones (reject/cancel)', hr.current_person_id());

    UPDATE hr.leave_balances
       SET pending = v_new_pending,
           available = v_new_avail,
           as_of = now(), updated_at = now()
     WHERE assignment_id = p_assignment_id;

  ELSE  -- commit: release the reservation and book a real 'usage' ledger row (kind CHECK: usage).
    v_new_pending := GREATEST(COALESCE(v_pending, 0) - p_dias, 0);
    INSERT INTO hr.leave_ledger
      (assignment_id, kind, amount, balance_after, event_date, source_ticket_id, note, created_by)
    VALUES
      (p_assignment_id, 'usage', -p_dias,
       COALESCE(v_accrued,0) - (COALESCE(v_used,0) + p_dias) - v_new_pending,
       CURRENT_DATE, p_ticket_id, 'commit en aprobacion final (GG)', hr.current_person_id());
    UPDATE hr.leave_balances
       SET used = COALESCE(v_used,0) + p_dias,
           pending = v_new_pending,
           available = COALESCE(v_accrued,0) - (COALESCE(v_used,0) + p_dias) - v_new_pending,
           as_of = now(), updated_at = now()
     WHERE assignment_id = p_assignment_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION requests.apply_leave_effect(uuid, text, numeric, uuid) IS
  'Ledger-effect interno del lifecycle de reserva de vacaciones (spec §6) reconciliado con el contrato real de hr.post_leave_ledger_entry (hr_admin-only + accrued/used por signo + pending externo). reserve: pending+=dias (sin fila de ledger; solo bump del pending); release: pending-=dias (floor >=0) + fila ledger kind=reversal por el delta real liberado, reversal_of_id -> fila usage del mismo ticket si existia, sino NULL (N3 audit / spec sec 6.3: toda reversion auditada); commit: pending-=dias + fila usage (-dias). Misma formula available = accrued - used - pending que el helper. Alcanzable SOLO por las RPC de orquestacion (cada una re-chequea authz), por eso no re-gatea hr_admin -- el path employee-submit y president-commit no son hr_admin. SECURITY DEFINER search_path='''' .';

-- service_role-only: apply_leave_effect MUTATES leave balances + posts ledger rows. It must NOT be
-- callable by `authenticated` directly (an employee could reserve/release/commit arbitrary amounts,
-- bypassing the ticket flow). REVOKE FROM authenticated too (the schema default-privileges auto-grant it;
-- mig 044/077). Reached only via the orchestration RPCs (postgres-owned definers re-checking authz).
REVOKE EXECUTE ON FUNCTION requests.apply_leave_effect(uuid, text, numeric, uuid) FROM PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION requests.apply_leave_effect(uuid, text, numeric, uuid) TO service_role;

-- =========================================================================
-- (4) requests.instantiate_chain -- ChainResolver runtime (ADR-0020 / ADR-0027 / ADR-0037).
--     Reads requests.types.approval_chain_template, resolves each step's `resolver` to a concrete
--     person, and INSERTs one requests.approvals row per NON-submit step (approval | processing) with
--     its kind + step_order. The submit step does NOT get a row (firma=envio captured by
--     tickets.submitted_at + requester_id; approver_role='requester' would violate the CHECK -- B1).
--     SECURITY DEFINER: must insert OTHER people's approval rows (RLS approvals_ins only allows self
--     or hr_admin). Authorization: caller must be the requester or hr_admin (re-checked here).
--     R5/BL-2 guards: requester==supervisor rejected; president==requester -> president gate omitted
--     + audit flag (no higher authority).
-- =========================================================================
CREATE OR REPLACE FUNCTION requests.instantiate_chain(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket        requests.tickets%ROWTYPE;
  v_template      jsonb;
  v_step          jsonb;
  v_caller        uuid := hr.current_person_id();
  v_is_hr         boolean := hr.is_hr_admin();
  v_resolver      text;
  v_kind          text;
  v_role          text;
  v_step_order    int;
  v_required      boolean;
  v_sla           int;
  v_person        uuid;
  v_first_gate    int := NULL;
  v_first_person  uuid := NULL;
BEGIN
  SELECT * INTO v_ticket FROM requests.tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket % no existe', p_ticket_id USING ERRCODE = 'P0002';
  END IF;

  -- Authorization (least-privilege inside the definer): requester or hr_admin only.
  IF NOT (v_caller = v_ticket.requester_id OR v_is_hr) THEN
    RAISE EXCEPTION 'no autorizado para instanciar la cadena del ticket %', p_ticket_id
      USING ERRCODE = '42501';
  END IF;

  -- Idempotency: do not double-instantiate.
  IF EXISTS (SELECT 1 FROM requests.approvals WHERE ticket_id = p_ticket_id) THEN
    RAISE EXCEPTION 'la cadena del ticket % ya fue instanciada', p_ticket_id
      USING ERRCODE = '23505';
  END IF;

  SELECT t.approval_chain_template INTO v_template
  FROM requests.types t WHERE t.id = v_ticket.type_id;
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'el tipo del ticket % no tiene approval_chain_template', p_ticket_id
      USING ERRCODE = '22004';
  END IF;

  FOR v_step IN SELECT * FROM jsonb_array_elements(v_template->'steps')
  LOOP
    v_kind       := v_step->>'kind';
    v_role       := v_step->>'role';
    v_resolver   := v_step->>'resolver';
    v_required   := COALESCE((v_step->>'required')::boolean, true);
    v_step_order := COALESCE((v_step->>'step_order')::int, (v_step->>'step_id')::int);
    v_sla        := NULLIF(v_step->>'sla_hours', '')::int;

    -- The submit step is the requester's own action (firma=envio, ADR-0027): NOT a gate and NOT a
    -- processing row. It is already captured by requests.tickets.submitted_at + requester_id, so we
    -- do NOT insert a requests.approvals row for it. Inserting one would set approver_role='requester'
    -- which violates approvals_approver_role_check (allows only supervisor|hr_admin|president|
    -- specific_person). We deliberately do NOT widen that CHECK (B1 fix).
    IF v_kind = 'submit' THEN
      CONTINUE;
    ELSIF v_resolver = 'selected_supervisor_id' THEN
      -- selected override, NULL fallback to current employment.supervisor_id (ADR-0020).
      v_person := v_ticket.selected_supervisor_id;
      IF v_person IS NULL THEN
        SELECT e.supervisor_id INTO v_person
        FROM hr.employments e
        WHERE e.person_id = v_ticket.requester_id
          AND e.is_current = true
          AND e.deleted_at IS NULL
        ORDER BY e.valid_from DESC
        LIMIT 1;
      END IF;
      -- R5/R6: a requester cannot be their own supervisor-approver.
      IF v_person = v_ticket.requester_id THEN
        RAISE EXCEPTION 'R5/R6: el solicitante no puede ser su propio supervisor (ticket %)', p_ticket_id
          USING ERRCODE = '23514';
      END IF;
    ELSIF v_resolver = 'any_hr_admin' THEN
      -- Pooled: claimed by the first hr_admin to act. Assignee left NULL (pool semantics).
      v_person := NULL;
    ELSIF v_resolver = 'president_user' THEN
      SELECT e.person_id INTO v_person
      FROM hr.employments e
      WHERE e.app_role = 'president'
        AND e.is_current = true
        AND e.deleted_at IS NULL
      ORDER BY e.valid_from DESC
      LIMIT 1;
      -- BL-2: requester IS the president -> omit the president gate + audit flag (no higher authority).
      IF v_person IS NOT NULL AND v_person = v_ticket.requester_id THEN
        INSERT INTO audit.log (actor_id, action, schema_name, table_name, record_id, reason, metadata)
        VALUES (v_caller, 'custom', 'requests', 'approvals', p_ticket_id, 'president_gate_omitted_self',
                jsonb_build_object('semantic_action', 'president_gate_omitted_self',
                                   'note', 'BL-2: requester es el president; sin autoridad superior',
                                   'step_order', v_step_order));
        CONTINUE;  -- skip inserting this gate
      END IF;
    ELSE
      v_person := NULL;  -- specific_person / self handled upstream; unknown resolver -> unassigned
    END IF;

    -- Only non-submit steps (approval | processing) become approvals rows; submit was CONTINUE'd above.
    INSERT INTO requests.approvals
      (ticket_id, step_order, approver_role, approver_id, kind, decision)
    VALUES
      (p_ticket_id, v_step_order, v_role, v_person, v_kind, 'Pendiente');

    -- Track the first actionable (non-submit) step to set the ticket's current pointer (sequential).
    IF v_first_gate IS NULL THEN
      v_first_gate   := v_step_order;
      v_first_person := v_person;
    END IF;
  END LOOP;

  -- Sequential: point the ticket at the first actionable step. Parallel modes leave current_step=0.
  IF (v_template->>'mode') = 'sequential' AND v_first_gate IS NOT NULL THEN
    UPDATE requests.tickets
       SET current_step = v_first_gate,
           current_assignee_id = v_first_person,
           status = 'En_Revision',
           updated_at = now()
     WHERE id = p_ticket_id;
  ELSE
    UPDATE requests.tickets
       SET status = 'En_Revision', updated_at = now()
     WHERE id = p_ticket_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION requests.instantiate_chain(uuid) IS
  'ChainResolver runtime (ADR-0020/0027/0037): lee requests.types.approval_chain_template, resuelve cada step (selected_supervisor_id + fallback employments.supervisor_id; any_hr_admin -> pool NULL; president_user) e inserta una fila requests.approvals por step NO-submit (approval | processing) con su kind + step_order. El step kind=submit NO genera fila (firma=envio ya capturada por tickets.submitted_at + requester_id; ademas approver_role=requester violaria approvals_approver_role_check; B1 fix, NO se ensancha el CHECK). SECURITY DEFINER (debe insertar filas de aprobacion de OTRAS personas). Autorizacion re-chequeada adentro: solo requester o hr_admin. R5/R6: rechaza requester==supervisor. BL-2: si requester==president, omite el gate del president + flag de auditoria. Idempotente-guard: falla si ya hay filas. En mode sequential apunta el ticket al primer step accionable (primer non-submit).';

REVOKE EXECUTE ON FUNCTION requests.instantiate_chain(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION requests.instantiate_chain(uuid) TO authenticated, service_role;

-- =========================================================================
-- (5) requests.submit_vacaciones -- FormEngine snapshot at submit + sequence + ledger pending + chain.
--     ADR-0003 (snapshot), ADR-0005 (manual-entry bypass), ADR-0037. SECURITY DEFINER: writes the
--     ticket on behalf of the requester (RLS tickets_insert allows self/hr_admin) + posts ledger
--     (post_leave_ledger_entry is definer) + instantiates chain. The CALLER (TS server action) builds
--     the snapshot form_data (profile+computed+user_input) and the TS FormEngine validates user_input
--     BEFORE calling this; this RPC trusts the validated snapshot and enforces only the DB invariants
--     (sequence, ledger, chain). p_dias is the validated working-days total (negative ledger amount).
-- =========================================================================
CREATE OR REPLACE FUNCTION requests.submit_vacaciones(
  p_form_data            jsonb,
  p_dias                 numeric,
  p_selected_supervisor  uuid DEFAULT NULL,
  p_manual_entry         boolean DEFAULT false
)
RETURNS requests.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requester  uuid := hr.current_person_id();
  v_type_id    uuid;
  v_number     text;
  v_ticket     requests.tickets%ROWTYPE;
  v_assignment uuid;
  v_is_hr      boolean := hr.is_hr_admin();
BEGIN
  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'no autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_manual_entry AND NOT v_is_hr THEN
    RAISE EXCEPTION 'manual_entry requiere hr_admin (ADR-0005)' USING ERRCODE = '42501';
  END IF;
  IF p_dias IS NULL OR p_dias <= 0 THEN
    RAISE EXCEPTION 'dias solicitados debe ser > 0 (recibido %)', p_dias USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_type_id FROM requests.types WHERE code = 'VACACIONES';
  IF v_type_id IS NULL THEN
    RAISE EXCEPTION 'tipo VACACIONES no existe' USING ERRCODE = 'P0002';
  END IF;

  v_number := requests.next_sequence('ticket_number');

  INSERT INTO requests.tickets
    (ticket_number, type_id, requester_id, status, form_data,
     selected_supervisor_id, manual_entry, created_by_hr_admin, submitted_at)
  VALUES
    (v_number, v_type_id, v_requester,
     CASE WHEN p_manual_entry THEN 'Aprobada' ELSE 'Enviada' END,
     p_form_data, p_selected_supervisor, p_manual_entry,
     CASE WHEN p_manual_entry THEN v_requester ELSE NULL END,
     now())
  RETURNING * INTO v_ticket;

  -- Ledger lifecycle (spec §6, reconciled to the EXISTING helper's actual contract):
  --   hr.post_leave_ledger_entry requires hr_admin (invoker-bound) and models accrued(+)/used(-) by
  --   SIGN while leaving the `pending` column externally managed. A regular employee at submit is NOT
  --   hr_admin, so we CANNOT post `used` here. Instead we RESERVE via requests.apply_leave_effect
  --   ('reserve'), which bumps the `pending` column (available = accrued - used - pending) without
  --   touching accrued/used. The `used` COMMIT lands at final approval (GG), and reservation is
  --   released on reject/cancel -- see requests.act_on_approval. Manual entry (hr_admin) consumes the
  --   balance directly via the EXISTING helper (R5: reuse where the hr_admin contract holds).
  v_assignment := requests.active_leave_assignment(v_requester);
  IF v_assignment IS NOT NULL THEN
    IF p_manual_entry THEN
      -- kind CHECK allows 'usage' (not 'used'). Helper recomputes used=-sum(amount<0) by sign.
      PERFORM hr.post_leave_ledger_entry(
        v_assignment, 'usage', -p_dias, CURRENT_DATE, v_ticket.id,
        'manual_entry: vacaciones papel ya consumidas (ADR-0005)');
    ELSE
      PERFORM requests.apply_leave_effect(v_assignment, 'reserve', p_dias, v_ticket.id);
    END IF;
  END IF;

  IF p_manual_entry THEN
    -- ADR-0005 bypass: no approval rows, ticket born Aprobada, audit flag.
    INSERT INTO audit.log (actor_id, action, schema_name, table_name, record_id, reason, metadata)
    VALUES (v_requester, 'custom', 'requests', 'tickets', v_ticket.id, 'manual_entry_bypass',
            jsonb_build_object('semantic_action', 'manual_entry_bypass',
                               'manual_entry', true, 'dias', p_dias, 'ticket_number', v_number));
  ELSE
    PERFORM requests.instantiate_chain(v_ticket.id);
    INSERT INTO audit.log (actor_id, action, schema_name, table_name, record_id, reason, metadata)
    VALUES (v_requester, 'custom', 'requests', 'tickets', v_ticket.id, 'ticket_submitted',
            jsonb_build_object('semantic_action', 'ticket_submitted',
                               'type', 'VACACIONES', 'dias', p_dias, 'ticket_number', v_number));
    -- re-read: instantiate_chain advanced status/current_step.
    SELECT * INTO v_ticket FROM requests.tickets WHERE id = v_ticket.id;
  END IF;

  RETURN v_ticket;
END;
$$;

COMMENT ON FUNCTION requests.submit_vacaciones(jsonb, numeric, uuid, boolean) IS
  'FormEngine submit de VACACIONES (ADR-0003/0005/0037): asigna ticket_number (requests.next_sequence), persiste el snapshot form_data (que el TS FormEngine ya construyo+valido), RESERVA -dias (pending) via requests.apply_leave_effect(reserve), e instancia la cadena. manual_entry (ADR-0005, hr_admin-only): 0 filas de aprobacion, nace Aprobada, ledger used directo via hr.post_leave_ledger_entry (reusa el helper donde el contrato hr_admin aplica) + audit flag. SECURITY DEFINER search_path='''' .';

REVOKE EXECUTE ON FUNCTION requests.submit_vacaciones(jsonb, numeric, uuid, boolean) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION requests.submit_vacaciones(jsonb, numeric, uuid, boolean) TO authenticated, service_role;

-- =========================================================================
-- (6) requests.act_on_approval -- ApprovalEngine gate actuation (kind='approval' only).
--     R5 no-self-approval, R7 stamp, R9 (Aprobada|Rechazada|Modificada), R16 transitions, ADR-0037
--     sequential advance over processing steps. SECURITY DEFINER: must read other rows + transition
--     the ticket. Authorization: caller must be the resolved current approver (or hr_admin override).
-- =========================================================================
CREATE OR REPLACE FUNCTION requests.act_on_approval(
  p_ticket_id uuid,
  p_decision  text,
  p_comments  text DEFAULT NULL
)
RETURNS requests.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller     uuid := hr.current_person_id();
  v_is_hr      boolean := hr.is_hr_admin();
  v_ticket     requests.tickets%ROWTYPE;
  v_appr       requests.approvals%ROWTYPE;
  v_signer     text;
  v_role_lbl   text;
  v_stamp      text;
  v_next       requests.approvals%ROWTYPE;
  v_assignment uuid;
  v_dias       numeric;
  v_new_status text;
  v_mode       text;
  v_blocking   int;
BEGIN
  IF p_decision NOT IN ('Aprobada', 'Rechazada', 'Modificada') THEN
    RAISE EXCEPTION 'decision invalida: % (Aprobada|Rechazada|Modificada)', p_decision
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM requests.tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket % no existe', p_ticket_id USING ERRCODE = 'P0002';
  END IF;
  IF v_ticket.status NOT IN ('Enviada', 'En_Revision') THEN
    RAISE EXCEPTION 'el ticket % no esta en un estado accionable (status=%)', p_ticket_id, v_ticket.status
      USING ERRCODE = '22023';
  END IF;

  -- The current gate = the lowest step_order pending approval row.
  SELECT * INTO v_appr
  FROM requests.approvals
  WHERE ticket_id = p_ticket_id
    AND kind = 'approval'
    AND decision = 'Pendiente'
  ORDER BY step_order ASC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no hay gate de aprobacion pendiente en el ticket %', p_ticket_id
      USING ERRCODE = '22004';
  END IF;

  -- R26 sequential ordering (S1): in sequential mode NO step may be actuated while ANY lower
  -- step_order row (any kind: approval OR processing) is still Pendiente. This enforces
  -- RRHH-recibe -> supervisor -> Planilla-verifica -> GG (PO-05 sec 5.9 / ADR-0027/0037). For
  -- non-sequential modes we keep the prior behavior (gate is the lowest pending approval row).
  SELECT (t.approval_chain_template->>'mode') INTO v_mode
  FROM requests.types t WHERE t.id = v_ticket.type_id;
  IF v_mode = 'sequential' THEN
    SELECT count(*) INTO v_blocking
    FROM requests.approvals
    WHERE ticket_id = p_ticket_id
      AND step_order < v_appr.step_order
      AND decision = 'Pendiente';
    IF v_blocking > 0 THEN
      RAISE EXCEPTION 'paso fuera de orden: hay % paso(s) previo(s) sin resolver en el ticket % (modo secuencial)', v_blocking, p_ticket_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- R5: no self-approval -- checked FIRST (hardest invariant). The requester can never actuate an
  -- approval gate on their own ticket, regardless of how the gate resolved.
  IF v_caller = v_ticket.requester_id THEN
    RAISE EXCEPTION 'R5: no se permite auto-aprobacion (ticket %)', p_ticket_id USING ERRCODE = '23514';
  END IF;

  -- Resolve the current approver. Pooled (NULL approver_id) gates are claimed by any hr_admin.
  IF v_appr.approver_id IS NOT NULL THEN
    IF NOT (v_caller = v_appr.approver_id OR v_caller = v_appr.delegated_to_id OR v_is_hr) THEN
      RAISE EXCEPTION 'no eres el aprobador actual del ticket %', p_ticket_id USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT v_is_hr THEN
      RAISE EXCEPTION 'gate pooled: requiere hr_admin para reclamarlo' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- R7 stamp (StampEngine parity; signer_name snapshot, ADR-0003).
  SELECT full_name INTO v_signer FROM hr.people WHERE id = v_caller;
  v_role_lbl := v_appr.approver_role;
  v_stamp := format('%s por %s (%s), %s (America/Panama)',
                    CASE p_decision WHEN 'Aprobada' THEN 'Aprobado'
                                    WHEN 'Rechazada' THEN 'Rechazado'
                                    ELSE 'Modificado' END,
                    COALESCE(v_signer, '?'), v_role_lbl,
                    to_char(now() AT TIME ZONE 'America/Panama', 'YYYY-MM-DD HH24:MI:SS'));

  UPDATE requests.approvals
     SET decision   = p_decision,
         decision_at = now(),
         approver_id = COALESCE(approver_id, v_caller),  -- pooled gate: record who claimed it
         comments   = p_comments,
         stamp_text = v_stamp,
         stamp_data = jsonb_build_object(
                        'signer_id', v_caller, 'signer_name', v_signer,
                        'signer_role', v_role_lbl, 'kind', 'approval',
                        'decision', p_decision, 'step_id', v_appr.step_order,
                        'signed_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF')),
         updated_at = now()
   WHERE id = v_appr.id;

  INSERT INTO audit.log (actor_id, action, schema_name, table_name, record_id, reason, metadata)
  VALUES (v_caller, 'custom', 'requests', 'approvals', v_appr.id, 'approval_actuated',
          jsonb_build_object('semantic_action', 'approval_actuated',
                             'ticket_id', p_ticket_id, 'decision', p_decision, 'step_order', v_appr.step_order));

  -- ---- Transition the ticket per decision (R16) ----
  IF p_decision = 'Rechazada' THEN
    v_new_status := 'Rechazada';
  ELSIF p_decision = 'Modificada' THEN
    v_new_status := 'Devuelta_Modificacion';
  ELSE
    -- Aprobada: is there a later approval gate still pending? If yes -> stay En_Revision and advance
    -- the pointer over any intervening processing steps to the next approval gate. If no -> final.
    SELECT * INTO v_next
    FROM requests.approvals
    WHERE ticket_id = p_ticket_id
      AND kind = 'approval'
      AND decision = 'Pendiente'
      AND step_order > v_appr.step_order
    ORDER BY step_order ASC
    LIMIT 1;
    IF FOUND THEN
      v_new_status := 'En_Revision';
    ELSE
      v_new_status := 'Aprobada';
    END IF;
  END IF;

  -- Ledger effects (NOT fire-and-forget; same txn). dias from the snapshot (ADR-0003: form_data is the
  -- frozen source of truth). At submit we RESERVED via apply_leave_effect('reserve') (pending += dias).
  SELECT requests.active_leave_assignment(v_ticket.requester_id) INTO v_assignment;
  v_dias := COALESCE((v_ticket.form_data->>'dias_solicitados')::numeric, 0);

  IF v_assignment IS NOT NULL AND v_dias > 0 THEN
    IF v_new_status = 'Aprobada' THEN
      -- final GG approval: pending -> used (commit).
      PERFORM requests.apply_leave_effect(v_assignment, 'commit', v_dias, p_ticket_id);
    ELSIF v_new_status = 'Rechazada' THEN
      -- reject: release the reservation -> restore available.
      PERFORM requests.apply_leave_effect(v_assignment, 'release', v_dias, p_ticket_id);
    END IF;
  END IF;

  UPDATE requests.tickets
     SET status = v_new_status,
         current_step = CASE WHEN v_new_status = 'En_Revision'
                             THEN COALESCE(v_next.step_order, current_step) ELSE current_step END,
         current_assignee_id = CASE WHEN v_new_status = 'En_Revision'
                                    THEN v_next.approver_id ELSE NULL END,
         resolved_at = CASE WHEN v_new_status IN ('Aprobada', 'Rechazada') THEN now() ELSE resolved_at END,
         updated_at = now()
   WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$$;

COMMENT ON FUNCTION requests.act_on_approval(uuid, text, text) IS
  'ApprovalEngine gate actuation (ADR-0015/0037, R5/R7/R9/R16). Actua SOLO sobre el menor step_order con kind=approval + decision=Pendiente. Resuelve el aprobador actual (approver_id, delegated_to_id, o pool hr_admin). R5: rechaza si caller==requester. Escribe sello (stamp_text/stamp_data, signer_name snapshot) + audit.log en la MISMA txn. Aprobada -> avanza al siguiente gate de aprobacion (saltando processing) o cierra Aprobada (commit del ledger); Rechazada -> Rechazada + release de la reserva; Modificada -> Devuelta_Modificacion. dias del snapshot form_data (ADR-0003). Efectos de ledger via requests.apply_leave_effect (no fire-and-forget). SECURITY DEFINER search_path='''' .';

REVOKE EXECUTE ON FUNCTION requests.act_on_approval(uuid, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION requests.act_on_approval(uuid, text, text) TO authenticated, service_role;

-- =========================================================================
-- (7) requests.process_step -- processing actuation (kind='processing', R8). NEVER a gate.
--     RRHH-recibe (sets received_by/at) + Planilla-verifica (sets processed_by/at). Stamps the row,
--     then ADVANCES requests.tickets.current_step + current_assignee_id to the next Pendiente step
--     (S2/S3 fix: it previously claimed to advance but did not). Never closes a ticket (that is
--     act_on_approval's job). SECURITY DEFINER; hr_admin-only (R8 admin processing).
-- =========================================================================
CREATE OR REPLACE FUNCTION requests.process_step(
  p_ticket_id uuid,
  p_role_kind text  -- 'received' (RRHH recibe) | 'processed' (Planilla verifica)
)
RETURNS requests.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := hr.current_person_id();
  v_ticket requests.tickets%ROWTYPE;
  v_appr   requests.approvals%ROWTYPE;
  v_signer text;
  v_label  text;
  v_stamp  text;
  v_mode   text;
  v_blocking int;
  v_next   requests.approvals%ROWTYPE;
BEGIN
  IF NOT hr.is_hr_admin() THEN
    RAISE EXCEPTION 'processing (R8) requiere hr_admin' USING ERRCODE = '42501';
  END IF;
  IF p_role_kind NOT IN ('received', 'processed') THEN
    RAISE EXCEPTION 'role_kind invalido: % (received|processed)', p_role_kind USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM requests.tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket % no existe', p_ticket_id USING ERRCODE = 'P0002';
  END IF;

  -- Find the lowest pending processing row; received vs processed disambiguated by subrole=planilla.
  IF p_role_kind = 'received' THEN
    SELECT * INTO v_appr FROM requests.approvals
    WHERE ticket_id = p_ticket_id AND kind = 'processing' AND decision = 'Pendiente'
    ORDER BY step_order ASC LIMIT 1;
    v_label := 'Recibido por %s (RRHH), %s';
  ELSE
    SELECT * INTO v_appr FROM requests.approvals
    WHERE ticket_id = p_ticket_id AND kind = 'processing' AND decision = 'Pendiente'
    ORDER BY step_order DESC LIMIT 1;
    v_label := 'Verificado por %s (Planilla), %s';
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no hay step de processing pendiente en el ticket %', p_ticket_id
      USING ERRCODE = '22004';
  END IF;

  -- R26 sequential ordering (S1): processing cannot fire out of order either. In sequential mode no
  -- step may be actuated while ANY lower step_order row (any kind) is still Pendiente -- e.g. Planilla
  -- (step 4 processing) must not verify before the supervisor gate (step 3) is signed (PO-05 sec 5.9 /
  -- ADR-0027/0037). Non-sequential modes keep the prior behavior.
  SELECT (t.approval_chain_template->>'mode') INTO v_mode
  FROM requests.types t WHERE t.id = v_ticket.type_id;
  IF v_mode = 'sequential' THEN
    SELECT count(*) INTO v_blocking
    FROM requests.approvals
    WHERE ticket_id = p_ticket_id
      AND step_order < v_appr.step_order
      AND decision = 'Pendiente';
    IF v_blocking > 0 THEN
      RAISE EXCEPTION 'paso fuera de orden: hay % paso(s) previo(s) sin resolver en el ticket % (modo secuencial)', v_blocking, p_ticket_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT full_name INTO v_signer FROM hr.people WHERE id = v_caller;
  v_stamp := format(v_label, COALESCE(v_signer, '?'),
                    to_char(now() AT TIME ZONE 'America/Panama', 'YYYY-MM-DD HH24:MI:SS'));

  UPDATE requests.approvals
     SET decision = 'Aprobada',          -- processing rows are stamped-and-advanced, not gates
         decision_at = now(),
         approver_id = COALESCE(approver_id, v_caller),
         stamp_text = v_stamp,
         stamp_data = jsonb_build_object(
                        'signer_id', v_caller, 'signer_name', v_signer,
                        'signer_role', v_appr.approver_role, 'kind', 'processing',
                        'role_kind', p_role_kind, 'step_id', v_appr.step_order,
                        'signed_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF')),
         updated_at = now()
   WHERE id = v_appr.id;

  -- S2/S3: advance the ticket pointer to the next Pendiente step (any kind), resolving its assignee,
  -- consistent with how act_on_approval advances. If none remains pending the pointer is left as-is
  -- (a still-pending approval gate keeps the prior pointer; terminal transitions are handled by
  -- act_on_approval, never here -- processing never closes a ticket).
  SELECT * INTO v_next
  FROM requests.approvals
  WHERE ticket_id = p_ticket_id
    AND decision = 'Pendiente'
    AND step_order > v_appr.step_order
  ORDER BY step_order ASC
  LIMIT 1;

  UPDATE requests.tickets
     SET received_by  = CASE WHEN p_role_kind = 'received'  THEN v_caller ELSE received_by  END,
         received_at  = CASE WHEN p_role_kind = 'received'  THEN now()    ELSE received_at  END,
         processed_by = CASE WHEN p_role_kind = 'processed' THEN v_caller ELSE processed_by END,
         processed_at = CASE WHEN p_role_kind = 'processed' THEN now()    ELSE processed_at END,
         current_step = COALESCE(v_next.step_order, current_step),
         current_assignee_id = CASE WHEN v_next.id IS NOT NULL
                                    THEN v_next.approver_id ELSE current_assignee_id END,
         updated_at = now()
   WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  INSERT INTO audit.log (actor_id, action, schema_name, table_name, record_id, reason, metadata)
  VALUES (v_caller, 'custom', 'requests', 'approvals', v_appr.id, 'step_processed',
          jsonb_build_object('semantic_action', 'step_processed',
                             'ticket_id', p_ticket_id, 'role_kind', p_role_kind, 'step_order', v_appr.step_order));

  RETURN v_ticket;
END;
$$;

COMMENT ON FUNCTION requests.process_step(uuid, text) IS
  'Processing actuation (R8, ADR-0027/0037): sella un step kind=processing (RRHH-recibe -> received_by/at; Planilla-verifica -> processed_by/at) y NUNCA bloquea/cierra. hr_admin-only. En modo secuencial valida orden (S1: ningun paso previo Pendiente). Tras sellar, AVANZA tickets.current_step + current_assignee_id al siguiente step Pendiente (S2/S3 fix: antes decia que avanzaba pero no lo hacia). Escribe stamp_text/stamp_data (kind=processing) + audit.log en la misma txn. SECURITY DEFINER search_path='''' .';

REVOKE EXECUTE ON FUNCTION requests.process_step(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION requests.process_step(uuid, text) TO authenticated, service_role;

-- =========================================================================
-- (7b) requests.ticket_pending_recipients -- resolves WHO should be notified for the ticket's NEXT
--      actionable step (S3 fix). The NotificationEngine notifies one named person at a time; for a
--      faithful chain the server actions must notify whoever must act NEXT = the lowest step_order row
--      still Pendiente (ANY kind: processing OR approval), not a guessed supervisor. For VACACIONES the
--      first such step after submit is RRHH-recibe (pooled hr_admin), NOT the supervisor -- so a naive
--      "notify the supervisor at submit" pings the wrong actor prematurely (S3). This resolver returns:
--        - the named approver_id when the next pending step has one (supervisor / president gate);
--        - the active hr_admin pool when the next pending step is pooled (approver_id NULL, role hr_admin
--          -- RRHH-recibe / Planilla-verifica), since those have no single assignee.
--      SECURITY DEFINER: expanding the hr_admin pool reads other people's employments (RLS would hide
--      them from a requester). Least-privilege: only a party to the ticket (requests.can_view_ticket) or
--      an hr_admin may resolve recipients. Generic (ADR-0015): every chain reuses it, no per-form logic.
-- =========================================================================
CREATE OR REPLACE FUNCTION requests.ticket_pending_recipients(p_ticket_id uuid)
RETURNS TABLE (person_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_step     int;
  v_role     text;
  v_assignee uuid;
BEGIN
  IF NOT (requests.can_view_ticket(p_ticket_id) OR hr.is_hr_admin()) THEN
    RAISE EXCEPTION 'no autorizado para resolver destinatarios del ticket %', p_ticket_id
      USING ERRCODE = '42501';
  END IF;

  -- The next actionable step = lowest step_order still Pendiente (any kind). Submit has no row (B1).
  SELECT a.step_order, a.approver_role, a.approver_id
    INTO v_step, v_role, v_assignee
  FROM requests.approvals a
  WHERE a.ticket_id = p_ticket_id AND a.decision = 'Pendiente'
  ORDER BY a.step_order ASC
  LIMIT 1;

  IF v_step IS NULL THEN
    RETURN;  -- nothing pending (terminal / fully signed)
  END IF;

  IF v_assignee IS NOT NULL THEN
    person_id := v_assignee;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Pooled step (no single assignee). The only pooled role in the MVP chains is hr_admin
  -- (RRHH-recibe / Planilla-verifica). Expand to the active hr_admin pool.
  IF v_role = 'hr_admin' THEN
    RETURN QUERY
      SELECT DISTINCT e.person_id
      FROM hr.employments e
      JOIN hr.people pe ON pe.id = e.person_id
      WHERE e.app_role IN ('hr_admin', 'admin')
        AND e.is_current = true
        AND e.deleted_at IS NULL
        AND pe.status = 'Activo'
        AND pe.deleted_at IS NULL;
  END IF;
  RETURN;
END;
$$;

COMMENT ON FUNCTION requests.ticket_pending_recipients(uuid) IS
  'Resuelve los destinatarios de notificacion del SIGUIENTE step accionable de un ticket (fix S3). Devuelve el approver_id nombrado del menor step_order Pendiente (gate supervisor/president), o el pool de hr_admin activos si ese step es pooled (approver_id NULL + role hr_admin: RRHH-recibe / Planilla-verifica). Asi el server action notifica a quien debe actuar primero (RRHH-recibe), no al supervisor prematuramente. Generico (ADR-0015): toda cadena lo reusa. SECURITY DEFINER (expande el pool hr_admin que RLS ocultaria a un requester); autorizacion: solo parte del ticket (can_view_ticket) o hr_admin. search_path='''' .';

REVOKE EXECUTE ON FUNCTION requests.ticket_pending_recipients(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION requests.ticket_pending_recipients(uuid) TO authenticated, service_role;

-- =========================================================================
-- (8) Re-seed VACACIONES: form_schema (§5) + corrected approval_chain_template (§7). Idempotent.
--     Resolved by code (no hardcoded UUID). INSERT if absent, else UPDATE.
-- =========================================================================
DO $$
DECLARE
  v_form jsonb := $form$
  {
    "version": 1,
    "fields": [
      { "key": "fecha_solicitud", "label": "Fecha", "source": "computed", "type": "date", "compute_fn": "now_date" },
      { "key": "nombre_empleado", "label": "Nombre del Empleado", "source": "profile", "type": "text", "path": "people.full_name" },
      { "key": "cedula", "label": "No. Cedula", "source": "profile", "type": "text", "path": "people.national_id" },
      { "key": "cargo", "label": "Cargo", "source": "profile", "type": "text", "path": "employments.position_text" },
      { "key": "departamento", "label": "Departamento", "source": "profile", "type": "text", "path": "employments.department_text" },
      { "key": "antiguedad", "label": "Antiguedad", "source": "computed", "type": "computed", "compute_fn": "tenure" },
      { "key": "saldo_vacaciones", "label": "Saldo acumulado de vacaciones", "source": "computed", "type": "computed", "compute_fn": "leave_balance" },
      { "key": "dias_solicitados", "label": "Dias solicitados (total)", "source": "computed", "type": "computed", "compute_fn": "working_days", "validate": [{ "rule_key": "dias_lte_saldo" }] },
      { "key": "tipo_pago", "label": "Tipo de Pago", "source": "user_input", "type": "select", "required": true,
        "options": [ { "value": "completas", "label": "Completas" }, { "value": "adelanto", "label": "Adelanto" }, { "value": "descuento", "label": "Descuento" } ] },
      { "key": "tiempo_solicitado", "label": "Tiempo Solicitado", "source": "user_input", "type": "select", "required": true,
        "options": [ { "value": "completas", "label": "Completas" }, { "value": "parciales", "label": "Parciales" } ] },
      { "key": "date_ranges", "label": "Desglose Del/Al", "source": "user_input", "type": "date_range_group", "group": "date_ranges", "max_repeat": 3, "required": true },
      { "key": "observaciones", "label": "Observaciones", "source": "user_input", "type": "textarea", "required": false }
    ]
  }
  $form$::jsonb;

  v_chain jsonb := $chain$
  {
    "mode": "sequential",
    "visibility": "universal",
    "steps": [
      { "step_id": 1, "step_order": 1, "kind": "submit", "role": "requester", "resolver": "self",
        "required": true, "paper_block": "Firma del Solicitante" },
      { "step_id": 2, "step_order": 2, "kind": "processing", "role": "hr_admin", "resolver": "any_hr_admin",
        "required": true, "sla_hours": 24 },
      { "step_id": 3, "step_order": 3, "kind": "approval", "role": "supervisor", "resolver": "selected_supervisor_id",
        "required": true, "sla_hours": 72, "paper_block": "POR EL GERENTE DE PROYECTO" },
      { "step_id": 4, "step_order": 4, "kind": "processing", "role": "hr_admin", "resolver": "any_hr_admin",
        "required": true, "sla_hours": 24, "subrole": "planilla",
        "paper_block": "Conocimiento y verificacion por PLANILLA", "ledger_effect": "verify_balance" },
      { "step_id": 5, "step_order": 5, "kind": "approval", "role": "president", "resolver": "president_user",
        "required": true, "sla_hours": 72, "paper_block": "Gerente General - Aprobado por",
        "ledger_effect": "commit_used" }
    ]
  }
  $chain$::jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM requests.types WHERE code = 'VACACIONES') THEN
    UPDATE requests.types
       SET form_schema = v_form,
           approval_chain_template = v_chain,
           allow_supervisor_override = true,
           sla_hours = 72,
           updated_at = now()
     WHERE code = 'VACACIONES';
  ELSE
    INSERT INTO requests.types
      (code, name, description, category, sop_reference, form_schema, approval_chain_template,
       allow_supervisor_override, sla_hours, is_active)
    VALUES
      ('VACACIONES', 'Solicitud de Vacaciones',
       'Solicitud de vacaciones (IC-RH-F-05-03, gobernada por PO-05).', 'permisos', 'IC-RH-F-05-03',
       v_form, v_chain, true, 72, true);
  END IF;
END $$;
