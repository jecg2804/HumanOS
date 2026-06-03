-- 077_function_execute_least_privilege
-- Closes two MEDIUM gaps the 2026-06-03 foundation audit found in the 076 least-privilege work:
--   (1) 076 reversed 075's blanket service_role grant for TABLES + SEQUENCES but NOT FUNCTIONS, so
--       075's `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON FUNCTIONS TO service_role` still stood.
--       That lingering default-priv silently auto-granted service_role EXECUTE on the two new
--       authenticated-only RPCs (076) and would auto-grant it on every FUTURE function in the 10
--       schemas -- contradicting 076's stated intent. Reverse the FUNCTION default-priv + remove the
--       unintended service_role EXECUTE on the two RPCs.
--   (2) Seven legacy SECURITY DEFINER RLS helpers were EXECUTE-able by `anon` via the PUBLIC default
--       grant (never revoked), beyond the single intended pre-auth helper (hr.check_invite_code_rate_limit).
--       Not exploitable (each keys off auth.uid()=NULL for anon -> returns NULL/false), but it violates
--       the "only pre-auth helpers anon-reachable" model and trips 8 anon security advisor WARNs.
--       Verified safe to revoke: anon can SELECT ZERO HumanOS tables (no RLS policy is ever evaluated
--       as anon), and the pre-auth definer RPCs call these helpers as owner (postgres), not as anon.
--       authenticated (RLS evaluation) + service_role (definer-RPC calls) keep EXECUTE.

-- (1) Stop FUTURE auto-grants of EXECUTE to service_role on new functions (reverse 075's FUNCTION default-priv).
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['hr','requests','docs','files','workflows','audit','notifications','learning','performance','mdm']
  LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM service_role', s);
  END LOOP;
END $$;

-- (2) Remove the unintended service_role EXECUTE on the two authenticated-only admin RPCs (076).
--     It came only from 075's lingering default-priv; the server actions call them via the SESSION
--     client (authenticated), never via service_role, and is_hr_admin() would reject a no-session caller anyway.
REVOKE EXECUTE ON FUNCTION hr.regenerate_invite_code(uuid, text, text, text) FROM service_role;
REVOKE EXECUTE ON FUNCTION hr.update_person_profile(uuid, text, text, text) FROM service_role;

-- (3) Take the 7 legacy SECURITY DEFINER RLS helpers off the PUBLIC (anon) default grant; re-grant
--     authenticated (RLS evaluation) + service_role (definer-RPC calls). hr.check_invite_code_rate_limit
--     stays anon-reachable (the one intended pre-auth helper) and is intentionally NOT touched here.
REVOKE EXECUTE ON FUNCTION hr.current_app_role()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.current_person_id()         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.is_hr_admin()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.is_president_or_admin()     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.has_direct_reports()        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.is_supervisor_of(uuid)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION requests.can_view_ticket(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION hr.current_app_role()          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hr.current_person_id()         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hr.is_hr_admin()               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hr.is_president_or_admin()     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hr.has_direct_reports()        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hr.is_supervisor_of(uuid)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION requests.can_view_ticket(uuid) TO authenticated, service_role;
