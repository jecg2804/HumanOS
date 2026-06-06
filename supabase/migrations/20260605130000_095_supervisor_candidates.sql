-- 095_supervisor_candidates
-- Supervisor-override candidate list (R6/R10): the requester may pick a different approving supervisor
-- than their employment default (allow_supervisor_override=true on VACACIONES). The new-request form
-- needs a candidate list, but RLS on hr.people hides other people's rows from a plain requester query.
-- This thin SECURITY DEFINER resolver returns the ACTIVE supervisors (people referenced as a
-- supervisor_id by any current employment) + the president (GG), excluding the caller (R5/R6: you cannot
-- pick yourself). Generic + reusable across forms with allow_supervisor_override.
-- ADDITIVE. requests.* only. NO public.*, NO humanos.*, NO auth.users.

CREATE OR REPLACE FUNCTION requests.supervisor_candidates()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT p.id, p.full_name
  FROM hr.people p
  WHERE p.deleted_at IS NULL
    AND p.status = 'Activo'
    AND (hr.current_person_id() IS NULL OR p.id <> hr.current_person_id())  -- R5/R6: not self
    AND (
      p.id IN (
        SELECT e.supervisor_id
        FROM hr.employments e
        WHERE e.supervisor_id IS NOT NULL AND e.is_current = true AND e.deleted_at IS NULL
      )
      OR p.id IN (
        SELECT e.person_id
        FROM hr.employments e
        WHERE e.app_role = 'president' AND e.is_current = true AND e.deleted_at IS NULL
      )
    )
  ORDER BY p.full_name;
$$;

COMMENT ON FUNCTION requests.supervisor_candidates() IS
  'Candidatos a supervisor-aprobador para el override (R6/R10, allow_supervisor_override): personas Activas que son supervisores reales (referenciadas como supervisor_id en algun employment current) o el president (GG), EXCLUYENDO al caller (R5/R6: no puedes elegirte). SECURITY DEFINER (lista personas que RLS ocultaria a un requester); generico para cualquier form con override. search_path='''' .';

REVOKE EXECUTE ON FUNCTION requests.supervisor_candidates() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION requests.supervisor_candidates() TO authenticated, service_role;
