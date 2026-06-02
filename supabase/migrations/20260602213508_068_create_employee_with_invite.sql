-- 068_create_employee_with_invite
-- NOTE: superseded ~2 min later by 070_create_employee_drop_redundant_user_settings (CREATE OR
-- REPLACE) -- this version's explicit hr.user_settings insert duplicates the row that
-- hr_people_default_settings_trigger already creates, so it aborts on a real call. Kept as the
-- honest as-applied record (append-only); a fresh replay defines this then immediately replaces it
-- via 070 before the function is ever invoked. See 070 for the why.
--
-- CODE-ADMIN-TX (P2): admin employee creation (createEmployeeAction) did 4 sequential PostgREST
-- writes with NO surrounding transaction -> a mid-sequence failure left a corrupted HR
-- system-of-record: orphan hr.people (employments insert fails), a person without an invite
-- (invite insert fails), or a silently-failed hr.user_settings (its error was discarded).
-- This wraps all 4 writes in one SECURITY DEFINER function so they are all-or-nothing (a function
-- invocation is atomic: any exception inside rolls back every write). Mirrors the existing
-- complete_onboarding_writes (037) and apply_employment_scd2_change (038). The invite code stays
-- CSPRNG-generated in Node and is passed in (load-bearing bootstrap secret; do NOT generate in SQL).
-- EXECUTE restricted to service_role -- the only caller is the admin/service-role client -- matching
-- the 044/065 least-privilege posture. Does NOT unify with self-signup provisioning (Group 3).
-- Output columns are new_* so they cannot shadow the columns referenced in RETURNING.

CREATE OR REPLACE FUNCTION hr.create_employee_with_invite(
  p_full_name text,
  p_national_id text,
  p_employee_code text,
  p_position_id uuid,
  p_position_text text,
  p_department_id uuid,
  p_department_text text,
  p_office_id uuid,
  p_office_text text,
  p_supervisor_id uuid,
  p_hire_date date,
  p_app_role text,
  p_employment_type_id uuid,
  p_actor_id uuid,
  p_invite_code text,
  p_invite_method text,
  p_delivery_target text
)
RETURNS TABLE (new_person_id uuid, new_invite_id uuid, new_invite_code text, new_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_person_id uuid;
  v_invite_id uuid;
  v_invite_code text;
  v_expires_at timestamptz;
BEGIN
  INSERT INTO hr.people (full_name, national_id, employee_code, status, created_from)
  VALUES (p_full_name, p_national_id, NULLIF(p_employee_code, ''), 'Activo', 'manual')
  RETURNING id INTO v_person_id;

  INSERT INTO hr.employments (
    person_id, position_id, position_text, department_id, department_text,
    office_id, office_text, supervisor_id, hire_date, app_role,
    employment_type_id, created_from
  ) VALUES (
    v_person_id, p_position_id, p_position_text, p_department_id, p_department_text,
    p_office_id, p_office_text, p_supervisor_id, p_hire_date, p_app_role,
    p_employment_type_id, 'manual'
  );

  INSERT INTO hr.user_settings (person_id) VALUES (v_person_id);

  INSERT INTO hr.invite_codes (code, person_id, generated_by, invite_method, delivery_target)
  VALUES (p_invite_code, v_person_id, p_actor_id, p_invite_method, p_delivery_target)
  RETURNING id, code, expires_at INTO v_invite_id, v_invite_code, v_expires_at;

  RETURN QUERY SELECT v_person_id, v_invite_id, v_invite_code, v_expires_at;
END;
$function$;

REVOKE EXECUTE ON FUNCTION hr.create_employee_with_invite(text, text, text, uuid, text, uuid, text, uuid, text, uuid, date, text, uuid, uuid, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION hr.create_employee_with_invite(text, text, text, uuid, text, uuid, text, uuid, text, uuid, date, text, uuid, uuid, text, text, text) TO service_role;

COMMENT ON FUNCTION hr.create_employee_with_invite(text, text, text, uuid, text, uuid, text, uuid, text, uuid, date, text, uuid, uuid, text, text, text) IS
  'CODE-ADMIN-TX: atomic admin employee creation (hr.people + hr.employments + hr.user_settings + hr.invite_codes) in one SECURITY DEFINER transaction. Replaces 4 non-transactional PostgREST writes in createEmployeeAction; a partial failure previously left orphan/broken records. Invite code is CSPRNG-generated in Node and passed as p_invite_code. service_role only. Does not unify with self-signup (Group 3).';
