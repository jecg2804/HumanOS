-- Module 1 — Task 15: reemplazar policies permisivas (USING true) con policies por rol.
-- Aplicado via MCP el 2026-04-28. INSERT/UPDATE de requests y request_approvals queda exclusivamente
-- via RPCs SECURITY DEFINER (submit_request, decide_approval) o service-role; por eso no hay policy
-- de WRITE para usuarios authenticated en esas tablas.

DROP POLICY IF EXISTS authenticated_all_people ON humanos.people;
DROP POLICY IF EXISTS authenticated_all_request_types ON humanos.request_types;
DROP POLICY IF EXISTS authenticated_all_requests ON humanos.requests;
DROP POLICY IF EXISTS authenticated_all_approvals ON humanos.request_approvals;
DROP POLICY IF EXISTS authenticated_all_sequences ON humanos.sequences;

-- people
CREATE POLICY people_select_authenticated
  ON humanos.people FOR SELECT TO authenticated USING (true);

CREATE POLICY people_update_hr
  ON humanos.people FOR UPDATE TO authenticated
  USING (humanos.is_hr())
  WITH CHECK (humanos.is_hr());

-- request_types
CREATE POLICY request_types_select_authenticated
  ON humanos.request_types FOR SELECT TO authenticated USING (true);

-- requests: visibility por relación
CREATE POLICY requests_select_visible
  ON humanos.requests FOR SELECT TO authenticated USING (
    requester_id = humanos.me()
    OR humanos.is_hr()
    OR EXISTS (
      SELECT 1 FROM humanos.request_approvals ra
       WHERE ra.request_id = humanos.requests.id AND ra.approver_id = humanos.me()
    )
  );

-- request_approvals: misma visibilidad
CREATE POLICY approvals_select_visible
  ON humanos.request_approvals FOR SELECT TO authenticated USING (
    approver_id = humanos.me()
    OR humanos.is_hr()
    OR EXISTS (
      SELECT 1 FROM humanos.requests r
       WHERE r.id = humanos.request_approvals.request_id
         AND r.requester_id = humanos.me()
    )
  );

-- sequences: 0 policies + RLS habilitado = denegado a authenticated. Solo RPCs SECURITY DEFINER.

DO $$
DECLARE n_pol int;
BEGIN
  SELECT COUNT(*) INTO n_pol FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'humanos';
  RAISE NOTICE 'rls policies installed: %', n_pol;
END $$;
