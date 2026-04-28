-- Module 1 — Task 13: decide_approval RPC atómica.
-- Verifica ownership del approval, aplica decisión, cierra o avanza el flujo.
-- Aplicado via MCP el 2026-04-28; smoke OK (2 NOTICEs: step 1 partial, step 2 final).

CREATE OR REPLACE FUNCTION humanos.decide_approval(
  p_approval_id uuid,
  p_decider_id uuid,
  p_decision text,
  p_comments text
) RETURNS TABLE(request_status text, next_approver_id uuid, is_final boolean)
LANGUAGE plpgsql AS $$
DECLARE
  v_approval humanos.request_approvals%ROWTYPE;
  v_request_id uuid;
  v_next humanos.request_approvals%ROWTYPE;
BEGIN
  SELECT * INTO v_approval FROM humanos.request_approvals WHERE id = p_approval_id FOR UPDATE;
  IF v_approval.id IS NULL THEN RAISE EXCEPTION 'approval not found'; END IF;
  IF v_approval.approver_id != p_decider_id THEN RAISE EXCEPTION 'not your approval'; END IF;
  IF v_approval.decision != 'Pendiente' THEN RAISE EXCEPTION 'already decided'; END IF;
  IF p_decision NOT IN ('Aprobada','Rechazada','Solicita Info') THEN RAISE EXCEPTION 'bad decision'; END IF;

  v_request_id := v_approval.request_id;

  UPDATE humanos.request_approvals
     SET decision=p_decision, comments=p_comments, decided_at=now()
   WHERE id = p_approval_id;

  IF p_decision = 'Rechazada' THEN
    UPDATE humanos.requests SET status='Rechazada', date_resolved=now() WHERE id=v_request_id;
    RETURN QUERY SELECT 'Rechazada'::text, NULL::uuid, true;
    RETURN;
  END IF;

  -- Solicita Info: por ahora se trata igual que Aprobada parcial (UI v1 solo expone Aprobar/Rechazar).
  SELECT * INTO v_next FROM humanos.request_approvals
   WHERE request_id = v_request_id AND decision = 'Pendiente'
   ORDER BY step_order ASC LIMIT 1;

  IF v_next.id IS NULL THEN
    UPDATE humanos.requests SET status='Aprobada', date_resolved=now() WHERE id=v_request_id;
    RETURN QUERY SELECT 'Aprobada'::text, NULL::uuid, true;
  ELSE
    UPDATE humanos.requests SET status='En Revisión' WHERE id=v_request_id AND status='Enviada';
    RETURN QUERY SELECT 'En Revisión'::text, v_next.approver_id, false;
  END IF;
END;
$$;

-- Smoke: crea dummy con 2 approvals (Rocío → Samantha), decide ambos, verifica transiciones.
DO $$
DECLARE
  r RECORD; appr1 uuid; appr2 uuid; samantha uuid; rocio uuid;
  d1 RECORD; d2 RECORD;
BEGIN
  SELECT id INTO samantha FROM humanos.people WHERE code='KOSM01';
  SELECT id INTO rocio FROM humanos.people WHERE code='OLM206';

  SELECT * INTO r FROM humanos.submit_request(
    'VACACIONES', samantha, '{"smoke":"decide"}'::jsonb, '[]'::jsonb,
    ARRAY['hr_oficial','hr_gerente']
  );
  SELECT id INTO appr1 FROM humanos.request_approvals WHERE request_id=r.request_id AND step_order=1;
  SELECT id INTO appr2 FROM humanos.request_approvals WHERE request_id=r.request_id AND step_order=2;

  SELECT * INTO d1 FROM humanos.decide_approval(appr1, rocio, 'Aprobada', 'smoke step 1');
  RAISE NOTICE 'decide step1: status=%, next=%, final=%', d1.request_status, d1.next_approver_id, d1.is_final;

  SELECT * INTO d2 FROM humanos.decide_approval(appr2, samantha, 'Aprobada', 'smoke step 2');
  RAISE NOTICE 'decide step2: status=%, next=%, final=%', d2.request_status, d2.next_approver_id, d2.is_final;

  DELETE FROM humanos.request_approvals WHERE request_id=r.request_id;
  DELETE FROM humanos.requests WHERE id=r.request_id;
  UPDATE humanos.sequences SET current_value = current_value - 1 WHERE name='request_number';
END $$;
