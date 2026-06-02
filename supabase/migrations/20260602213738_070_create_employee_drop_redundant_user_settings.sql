-- 070_create_employee_drop_redundant_user_settings
-- NOTE: Supabase migration history recorded this as version 20260602213738 with the name
-- "069_create_employee_drop_redundant_user_settings". Renumbered to 070 locally because the other
-- session concurrently committed 069 (069_restrict_authenticated_people_grant, version
-- 20260602213613, ~1.5 min earlier). The version timestamp is the unique key and orders correctly
-- after that 069. (Same concurrent-sessions symptom flagged in that migration -- both sessions are
-- aware of each other's work.)
--
-- Fix-forward on 068. hr.people has an AFTER INSERT trigger
-- (hr_people_default_settings_trigger -> hr.create_default_user_settings) that already creates the
-- hr.user_settings row. The explicit INSERT INTO hr.user_settings in 068 therefore hit a
-- duplicate-key (user_settings_person_id_key) and aborted the whole atomic call. The pre-existing
-- createEmployeeAction had the SAME redundant insert but DISCARDED its error (line 109), so it
-- failed silently in prod, harmlessly masked by the trigger -- making the path atomic + error-checked
-- surfaced it. Drop the explicit insert and rely on the trigger, consistent with
-- complete_onboarding_writes (which also never inserts user_settings). Found in 068 atomicity testing.
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

  -- hr.user_settings is created automatically by hr_people_default_settings_trigger
  -- (AFTER INSERT ON hr.people). Do NOT insert it here -- that duplicates the PK.

  INSERT INTO hr.invite_codes (code, person_id, generated_by, invite_method, delivery_target)
  VALUES (p_invite_code, v_person_id, p_actor_id, p_invite_method, p_delivery_target)
  RETURNING id, code, expires_at INTO v_invite_id, v_invite_code, v_expires_at;

  RETURN QUERY SELECT v_person_id, v_invite_id, v_invite_code, v_expires_at;
END;
$function$;

-- CREATE OR REPLACE preserves ACL, but re-assert least-privilege for a self-contained record.
REVOKE EXECUTE ON FUNCTION hr.create_employee_with_invite(text, text, text, uuid, text, uuid, text, uuid, text, uuid, date, text, uuid, uuid, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION hr.create_employee_with_invite(text, text, text, uuid, text, uuid, text, uuid, text, uuid, date, text, uuid, uuid, text, text, text) TO service_role;
