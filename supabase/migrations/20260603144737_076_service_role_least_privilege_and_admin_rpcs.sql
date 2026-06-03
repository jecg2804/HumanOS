-- 076_service_role_least_privilege_and_admin_rpcs
-- Reverses the blanket service_role GRANT ALL of 075 (which re-enabled the pattern ADR-0001
-- explicitly rejects: service_role + manual checks = the 2026-05-25 47-user-deletion class).
-- Replaces it with the industry-standard layering (Supabase: RLS+authenticated default ->
-- SECURITY DEFINER RPC for cross-policy -> service_role last-resort for no-session server work):
--   (a) two SECURITY DEFINER RPCs for the LOGGED-IN hr_admin paths (regenerate invite, update
--       person profile), called by `authenticated` via the session client and guarded by
--       hr.is_hr_admin(); the privileged write runs as owner (createEmployee / CODE-ADMIN-TX pattern).
--   (b) NARROW service_role grants ONLY on the tables the genuinely-no-session paths touch
--       (onboarding pre-auth + the Vercel cron worker; ADR-0006) -- least-privilege, not GRANT ALL.
-- Verified: the only admin-client (service_role) call sites are employees-actions (createEmployee=RPC;
-- regenerate/update=RPC after this), onboarding/actions (no-session), cron route (no-session). No
-- other file uses service_role. Existing SECURITY DEFINER RPCs run as owner and keep working
-- regardless of these table grants.

-- 1) Reverse 075: drop the blanket TABLE/SEQUENCE grants + default privileges from service_role.
--    Keep schema USAGE + FUNCTION execute (service_role legitimately CALLS the definer RPCs).
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['hr','requests','docs','files','workflows','audit','notifications','learning','performance','mdm']
  LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM service_role', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM service_role', s);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM service_role', s);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM service_role', s);
  END LOOP;
END $$;

-- 2) NARROW service_role grants for the no-session paths (onboarding pre-auth + cron worker).
--    Traced from src/lib/onboarding/actions.ts + src/app/api/cron/process-notifications/route.ts.
GRANT SELECT, UPDATE ON hr.invite_codes      TO service_role; -- validate read + validated-at CAS; complete/avatar read
GRANT SELECT, UPDATE ON hr.people            TO service_role; -- validate/complete/cron read; reportError needs_review update
GRANT SELECT          ON hr.employments      TO service_role; -- validate preview + reportError hr_admins lookup
GRANT SELECT          ON hr.positions        TO service_role; -- validate preview join
GRANT SELECT          ON hr.org_units        TO service_role; -- validate preview join
GRANT SELECT          ON hr.locations        TO service_role; -- validate preview join
GRANT SELECT          ON hr.employment_types TO service_role; -- validate preview join
GRANT SELECT, UPDATE ON notifications.outbox TO service_role; -- cron read + mark sent/failed

-- 3) RPC: regenerate invite code (LOGGED-IN hr_admin path). Called by `authenticated` via the
--    session client; the internal hr.is_hr_admin() guard runs in the caller's JWT context (auth.uid()
--    is preserved inside SECURITY DEFINER). Atomic: expire prior unconsumed + insert new (CSPRNG code
--    generated in Node, passed in) + audit entry.
CREATE OR REPLACE FUNCTION hr.regenerate_invite_code(
  p_person_id uuid,
  p_code text,
  p_invite_method text,
  p_delivery_target text
) RETURNS TABLE (out_code text, out_expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF NOT hr.is_hr_admin() THEN
    RAISE EXCEPTION 'not authorized: hr_admin required' USING ERRCODE = '42501';
  END IF;
  v_actor := hr.current_person_id();

  UPDATE hr.invite_codes SET expires_at = now()
   WHERE person_id = p_person_id AND consumed_at IS NULL;

  INSERT INTO hr.invite_codes (code, person_id, generated_by, invite_method, delivery_target)
  VALUES (p_code, p_person_id, v_actor, p_invite_method, p_delivery_target)
  RETURNING code, expires_at INTO out_code, out_expires_at;

  INSERT INTO audit.log (actor_id, action, record_id, schema_name, table_name, reason, metadata)
  VALUES (v_actor, 'custom', p_person_id, 'hr', 'invite_codes', 'invite_code_regenerated',
          jsonb_build_object('semantic_action', 'invite_code_regenerated', 'new_code', p_code));

  RETURN NEXT;
END $$;
COMMENT ON FUNCTION hr.regenerate_invite_code(uuid,text,text,text) IS
  'hr_admin-only (guard interno is_hr_admin): expira invites previos no consumidos + inserta uno nuevo + asiento audit, atomico. Llamar via session client (authenticated). Reemplaza el path service_role directo de regenerateInviteCodeAction (SEC-ROLE-RPC / ADR-0001).';
REVOKE ALL ON FUNCTION hr.regenerate_invite_code(uuid,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION hr.regenerate_invite_code(uuid,text,text,text) TO authenticated;

-- 4) RPC: update person profile (LOGGED-IN hr_admin path). hr.people stays SELECT-only for
--    authenticated (069); this RPC does the privileged write as owner after the is_hr_admin guard.
--    Employment changes still go through hr.apply_employment_scd2_change (unchanged).
CREATE OR REPLACE FUNCTION hr.update_person_profile(
  p_person_id uuid,
  p_full_name text,
  p_national_id text,
  p_employee_code text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT hr.is_hr_admin() THEN
    RAISE EXCEPTION 'not authorized: hr_admin required' USING ERRCODE = '42501';
  END IF;
  UPDATE hr.people
     SET full_name = p_full_name,
         national_id = p_national_id,
         employee_code = p_employee_code,
         updated_at = now()
   WHERE id = p_person_id;
END $$;
COMMENT ON FUNCTION hr.update_person_profile(uuid,text,text,text) IS
  'hr_admin-only (guard interno is_hr_admin): actualiza campos editables de hr.people. Llamar via session client (authenticated); hr.people sigue SELECT-only para authenticated (069), el write va aqui como owner. Reemplaza el people-update directo service_role de updateEmployeeAction (SEC-ROLE-RPC / ADR-0001).';
REVOKE ALL ON FUNCTION hr.update_person_profile(uuid,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION hr.update_person_profile(uuid,text,text,text) TO authenticated;
