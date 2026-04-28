-- Module 1 — Task 11: Funciones auxiliares para auth, role resolution y numeración atómica.
-- Aplicado via Supabase MCP el 2026-04-28. Smoke tests al final emitieron NOTICEs OK.

CREATE OR REPLACE FUNCTION humanos.me() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM humanos.people WHERE auth_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION humanos.is_hr() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM humanos.people WHERE auth_id = auth.uid()
    AND code IN ('KOSM01','OLM206','MAN943','MEN943')
  )
$$;

-- Resolución de roles semánticos a person uuid. supervisor_directo retorna NULL si el requester no
-- tiene supervisor_id (fallback A del spec §4.1.1) y emite RAISE NOTICE para trazabilidad.
CREATE OR REPLACE FUNCTION humanos.resolve_approver(p_role text, p_requester_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  IF p_role = 'supervisor_directo' THEN
    SELECT supervisor_id INTO v_id FROM humanos.people WHERE id = p_requester_id;
    IF v_id IS NULL THEN
      RAISE NOTICE 'resolve_approver: requester % has no supervisor_id, skipping step', p_requester_id;
    END IF;
  ELSIF p_role = 'hr_oficial' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code='OLM206';
  ELSIF p_role = 'hr_planilla' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code='MAN943';
  ELSIF p_role = 'hr_gerente' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code='KOSM01';
  ELSIF p_role = 'presidencia' THEN
    SELECT id INTO v_id FROM humanos.people WHERE code='EIS772';
  ELSE
    RAISE EXCEPTION 'unknown role: %', p_role;
  END IF;
  RETURN v_id;
END;
$$;

-- Numerador atómico: HUM-YYYY-NNNN.
CREATE OR REPLACE FUNCTION humanos.next_request_number() RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_n bigint;
BEGIN
  UPDATE humanos.sequences SET current_value = current_value + 1
  WHERE name='request_number' RETURNING current_value INTO v_n;
  RETURN format('HUM-%s-%s', extract(year from now())::int, lpad(v_n::text, 4, '0'));
END;
$$;

-- Smoke
DO $$
DECLARE r1 uuid; r2 uuid; r3 text;
BEGIN
  SELECT humanos.resolve_approver('hr_gerente', NULL) INTO r1;
  RAISE NOTICE 'resolve(hr_gerente)=%', r1;

  SELECT humanos.resolve_approver('supervisor_directo',
    (SELECT id FROM humanos.people WHERE code='KOSM01')) INTO r2;
  RAISE NOTICE 'resolve(supervisor_directo of KOSM01)=%', r2;

  SELECT humanos.next_request_number() INTO r3;
  RAISE NOTICE 'next_request_number=%', r3;
  UPDATE humanos.sequences SET current_value = current_value - 1 WHERE name='request_number';
END $$;
