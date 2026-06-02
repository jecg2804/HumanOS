-- 062_scd2_change_optional_params_default_null
-- TYPES-STALE (igual que 061): los 7 params de empleo (position/department/office/supervisor) son
-- legitimamente nullable pero estaban sin DEFAULT -> los tipos generados los marcan `string` requerido.
-- Fix behavior-preserving: DEFAULT NULL en los params 2-12 (regla de orden PG). Body IDENTICO.
CREATE OR REPLACE FUNCTION hr.apply_employment_scd2_change(
  p_person_id uuid,
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
  p_actor_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_current hr.employments%ROWTYPE;
  v_critical_changed boolean := false;
BEGIN
  SELECT * INTO v_current
  FROM hr.employments
  WHERE person_id = p_person_id AND is_current = true;

  IF NOT FOUND THEN
    INSERT INTO hr.employments (
      person_id, position_id, position_text, department_id, department_text,
      office_id, office_text, supervisor_id, hire_date, app_role,
      employment_type_id, created_by
    ) VALUES (
      p_person_id, p_position_id, p_position_text, p_department_id, p_department_text,
      p_office_id, p_office_text, p_supervisor_id, p_hire_date, p_app_role,
      p_employment_type_id, p_actor_id
    );
    RETURN;
  END IF;

  IF (COALESCE(v_current.position_id::text, '') IS DISTINCT FROM COALESCE(p_position_id::text, ''))
     OR (COALESCE(v_current.position_text, '') IS DISTINCT FROM COALESCE(p_position_text, ''))
     OR (COALESCE(v_current.department_id::text, '') IS DISTINCT FROM COALESCE(p_department_id::text, ''))
     OR (COALESCE(v_current.department_text, '') IS DISTINCT FROM COALESCE(p_department_text, ''))
     OR (COALESCE(v_current.supervisor_id::text, '') IS DISTINCT FROM COALESCE(p_supervisor_id::text, ''))
     OR v_current.app_role IS DISTINCT FROM p_app_role
     OR COALESCE(v_current.employment_type_id::text, '') IS DISTINCT FROM COALESCE(p_employment_type_id::text, '')
  THEN
    v_critical_changed := true;
  END IF;

  IF v_critical_changed THEN
    UPDATE hr.employments
    SET valid_to = CURRENT_DATE
    WHERE id = v_current.id;

    INSERT INTO hr.employments (
      person_id, position_id, position_text, department_id, department_text,
      office_id, office_text, supervisor_id, hire_date, app_role,
      employment_type_id, created_by, created_from
    ) VALUES (
      p_person_id, p_position_id, p_position_text, p_department_id, p_department_text,
      p_office_id, p_office_text, p_supervisor_id, p_hire_date, p_app_role,
      p_employment_type_id, p_actor_id, 'edit'
    );

    INSERT INTO audit.log (actor_id, action, record_id, reason, metadata)
    VALUES (
      (SELECT id FROM hr.people WHERE auth_id = p_actor_id),
      'custom', p_person_id, 'employment_scd2_transition',
      jsonb_build_object('semantic_action', 'employment_scd2_transition',
                         'previous_employment_id', v_current.id)
    );
  ELSE
    UPDATE hr.employments
    SET office_id = p_office_id,
        office_text = p_office_text,
        hire_date = p_hire_date,
        updated_at = now()
    WHERE id = v_current.id;
  END IF;
END;
$function$;
