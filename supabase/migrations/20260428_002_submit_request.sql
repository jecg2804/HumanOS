-- Module 1 — Task 12: submit_request RPC atómica.
-- Crea humanos.requests + N humanos.request_approvals según chain resuelto.
-- Steps con approver=NULL se saltean (fallback A). Si todo el chain queda vacío, request → Aprobada inmediata.
-- Aplicado via MCP el 2026-04-28; smoke OK.

CREATE OR REPLACE FUNCTION humanos.submit_request(
  p_type_code text,
  p_requester_id uuid,
  p_form_data jsonb,
  p_attachments jsonb,
  p_approval_chain text[]
) RETURNS TABLE(request_id uuid, request_number text, first_approver_id uuid)
LANGUAGE plpgsql AS $$
DECLARE
  v_type_id uuid;
  v_request_id uuid;
  v_number text;
  v_role text;
  v_approver uuid;
  v_step int := 1;
  v_first uuid := NULL;
BEGIN
  SELECT id INTO v_type_id FROM humanos.request_types
   WHERE code = p_type_code AND is_active = true;
  IF v_type_id IS NULL THEN
    RAISE EXCEPTION 'unknown or inactive type: %', p_type_code;
  END IF;

  v_number := humanos.next_request_number();

  INSERT INTO humanos.requests (request_number, type_id, requester_id, status, form_data, attachments, date_submitted)
  VALUES (v_number, v_type_id, p_requester_id, 'Enviada', p_form_data, p_attachments, now())
  RETURNING id INTO v_request_id;

  FOREACH v_role IN ARRAY p_approval_chain LOOP
    v_approver := humanos.resolve_approver(v_role, p_requester_id);
    IF v_approver IS NOT NULL THEN
      INSERT INTO humanos.request_approvals (request_id, approver_id, step_order, role_required, decision)
      VALUES (v_request_id, v_approver, v_step, v_role, 'Pendiente');
      IF v_first IS NULL THEN v_first := v_approver; END IF;
      v_step := v_step + 1;
    END IF;
  END LOOP;

  IF v_first IS NULL THEN
    UPDATE humanos.requests SET status='Aprobada', date_resolved=now() WHERE id = v_request_id;
  END IF;

  RETURN QUERY SELECT v_request_id, v_number, v_first;
END;
$$;

-- Smoke
DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM humanos.submit_request(
    'VACACIONES',
    (SELECT id FROM humanos.people WHERE code='KOSM01'),
    '{"smoke_test": true}'::jsonb,
    '[]'::jsonb,
    ARRAY['hr_oficial','hr_gerente']
  );
  RAISE NOTICE 'submit_request smoke: id=%, number=%, first=%', r.request_id, r.request_number, r.first_approver_id;
  DELETE FROM humanos.request_approvals WHERE request_id = r.request_id;
  DELETE FROM humanos.requests WHERE id = r.request_id;
  UPDATE humanos.sequences SET current_value = current_value - 1 WHERE name='request_number';
END $$;
