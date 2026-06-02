-- 071_create_employee_with_invite_default_null_params
-- Behavior-preserving: add DEFAULT NULL to the optional params of hr.create_employee_with_invite so
-- the Supabase CLI types them as optional (?: string) instead of required string -- otherwise the
-- caller (createEmployeeAction) cannot pass null for empty position_text/supervisor_id/etc. without
-- a tsc error. Same fix 061/062 applied to complete_onboarding_writes + apply_employment_scd2_change.
-- Only p_full_name + p_national_id stay required (always provided); Postgres requires every param
-- after the first defaulted one to also default, so 3..17 all get DEFAULT NULL. The action still
-- passes the effectively-required ones (hire_date/app_role/employment_type_id/actor_id/invite_*) on
-- every call, and the invite_codes/people NOT NULL + CHECK constraints enforce validity at runtime.
CREATE OR REPLACE FUNCTION hr.create_employee_with_invite(
  p_full_name text,
  p_national_id text,
  p_employee_code text DEFAULT NULL,
  p_position_id uuid DEFAULT NULL,
  p_position_text text DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_department_text text DEFAULT NULL,
  p_office_id uuid DEFAULT NULL,
  p_office_text text DEFAULT NULL,
  p_supervisor_id uuid DEFAULT NULL,
  p_hire_date date DEFAULT NULL,
  p_app_role text DEFAULT NULL,
  p_employment_type_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_invite_code text DEFAULT NULL,
  p_invite_method text DEFAULT NULL,
  p_delivery_target text DEFAULT NULL
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

  -- hr.user_settings is created automatically by hr_people_default_settings_trigger.

  INSERT INTO hr.invite_codes (code, person_id, generated_by, invite_method, delivery_target)
  VALUES (p_invite_code, v_person_id, p_actor_id, p_invite_method, p_delivery_target)
  RETURNING id, code, expires_at INTO v_invite_id, v_invite_code, v_expires_at;

  RETURN QUERY SELECT v_person_id, v_invite_id, v_invite_code, v_expires_at;
END;
$function$;

REVOKE EXECUTE ON FUNCTION hr.create_employee_with_invite(text, text, text, uuid, text, uuid, text, uuid, text, uuid, date, text, uuid, uuid, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION hr.create_employee_with_invite(text, text, text, uuid, text, uuid, text, uuid, text, uuid, date, text, uuid, uuid, text, text, text) TO service_role;

-- Re-assert COMMENT with accurate wording (070 moved user_settings to the trigger; the 068 comment
-- still described a direct user_settings insert). CREATE OR REPLACE preserves the old comment, so set it.
COMMENT ON FUNCTION hr.create_employee_with_invite(text, text, text, uuid, text, uuid, text, uuid, text, uuid, date, text, uuid, uuid, text, text, text) IS
  'CODE-ADMIN-TX: atomic admin employee creation in one SECURITY DEFINER transaction -- inserts hr.people + hr.employments + hr.invite_codes; hr.user_settings is created by the AFTER INSERT trigger on hr.people (hr_people_default_settings_trigger), not here. Replaces 4 non-transactional PostgREST writes in createEmployeeAction; a partial failure previously left orphan/broken records. Invite code is CSPRNG-generated in Node and passed as p_invite_code. service_role only. Does not unify with self-signup (Group 3).';
