-- 061_onboarding_writes_optional_params_default_null
-- TYPES-STALE: los tipos regenerados (CLI) marcan los params sin DEFAULT como `string` requerido,
-- pero p_photo_path/p_ip_address/p_user_agent son legitimamente nullable (foto/ip/UA opcionales; el
-- body ya los maneja null-safe via COALESCE / insert directo). Fix behavior-preserving: DEFAULT NULL
-- en los params 4-11 (regla PG: un param con default no puede preceder a uno sin default -> defaulteamos
-- desde p_photo_path en adelante). Body IDENTICO; CREATE OR REPLACE preserva grants (service_role).
CREATE OR REPLACE FUNCTION hr.complete_onboarding_writes(
  p_invite_id uuid,
  p_person_id uuid,
  p_auth_id uuid,
  p_photo_path text DEFAULT NULL,
  p_emergency jsonb DEFAULT NULL,
  p_medical jsonb DEFAULT NULL,
  p_address jsonb DEFAULT NULL,
  p_ack_ethics_at timestamptz DEFAULT NULL,
  p_ack_child_labor_at timestamptz DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_ethics_version_id uuid;
  v_child_labor_version_id uuid;
  v_existing_auth uuid;
BEGIN
  SELECT sv.id INTO v_ethics_version_id
  FROM docs.sops s
  JOIN docs.sop_versions sv ON sv.sop_id = s.id
  WHERE s.code = 'IC-RH-M-01' AND sv.is_current = true
  LIMIT 1;

  SELECT sv.id INTO v_child_labor_version_id
  FROM docs.sops s
  JOIN docs.sop_versions sv ON sv.sop_id = s.id
  WHERE s.code = 'IC-RH-D-07' AND sv.is_current = true
  LIMIT 1;

  IF v_ethics_version_id IS NULL OR v_child_labor_version_id IS NULL THEN
    RAISE EXCEPTION 'SOPs IC-RH-M-01 o IC-RH-D-07 no encontrados o sin version current. Aplicar migration 033 primero.';
  END IF;

  SELECT auth_id INTO v_existing_auth FROM hr.people WHERE id = p_person_id;
  IF v_existing_auth IS NULL THEN
    UPDATE hr.people
    SET auth_id = p_auth_id,
        photo_url = COALESCE(p_photo_path, photo_url),
        updated_at = now()
    WHERE id = p_person_id;
  ELSIF v_existing_auth <> p_auth_id THEN
    RAISE EXCEPTION 'hr.people.auth_id ya esta linkeado a otro auth.user; aborting onboarding';
  ELSE
    UPDATE hr.people
    SET photo_url = COALESCE(p_photo_path, photo_url),
        updated_at = now()
    WHERE id = p_person_id;
  END IF;

  UPDATE hr.invite_codes
  SET consumed_at = COALESCE(consumed_at, now()),
      consumed_by_auth_id = COALESCE(consumed_by_auth_id, p_auth_id)
  WHERE id = p_invite_id AND (consumed_at IS NULL OR consumed_by_auth_id = p_auth_id);

  INSERT INTO hr.contacts (
    person_id, contact_type, contact_name, relationship, phone, is_primary, is_emergency
  )
  SELECT p_person_id, 'emergency', p_emergency->>'contact_name', p_emergency->>'relationship',
         p_emergency->>'phone', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM hr.contacts
    WHERE person_id = p_person_id AND contact_type = 'emergency' AND is_primary = true
  );

  IF p_emergency ? 'phone_alt' AND p_emergency->>'phone_alt' <> '' THEN
    INSERT INTO hr.contacts (
      person_id, contact_type, contact_name, relationship, phone, is_primary, is_emergency
    )
    SELECT p_person_id, 'emergency', p_emergency->>'contact_name', p_emergency->>'relationship',
           p_emergency->>'phone_alt', false, true
    WHERE NOT EXISTS (
      SELECT 1 FROM hr.contacts
      WHERE person_id = p_person_id AND contact_type = 'emergency'
        AND phone = p_emergency->>'phone_alt'
    );
  END IF;

  IF p_medical IS NOT NULL AND p_medical <> '{}'::jsonb THEN
    INSERT INTO hr.medical_info (
      person_id, blood_type, allergies, chronic_conditions, current_medications,
      doctor_name, doctor_phone, medical_insurance_provider, medical_insurance_number, css_number
    ) VALUES (
      p_person_id,
      NULLIF(p_medical->>'blood_type', ''),
      NULLIF(p_medical->>'allergies', ''),
      NULLIF(p_medical->>'chronic_conditions', ''),
      NULLIF(p_medical->>'current_medications', ''),
      NULLIF(p_medical->>'doctor_name', ''),
      NULLIF(p_medical->>'doctor_phone', ''),
      NULLIF(p_medical->>'medical_insurance_provider', ''),
      NULLIF(p_medical->>'medical_insurance_number', ''),
      NULLIF(p_medical->>'css_number', '')
    )
    ON CONFLICT (person_id) DO UPDATE
    SET blood_type = EXCLUDED.blood_type,
        allergies = EXCLUDED.allergies,
        chronic_conditions = EXCLUDED.chronic_conditions,
        current_medications = EXCLUDED.current_medications,
        doctor_name = EXCLUDED.doctor_name,
        doctor_phone = EXCLUDED.doctor_phone,
        medical_insurance_provider = EXCLUDED.medical_insurance_provider,
        medical_insurance_number = EXCLUDED.medical_insurance_number,
        css_number = EXCLUDED.css_number,
        updated_at = now();
  END IF;

  INSERT INTO hr.addresses (
    person_id, address_type, street, neighborhood, city, province, postal_code, is_current
  )
  SELECT p_person_id, 'residence',
         NULLIF(p_address->>'street', ''),
         NULLIF(p_address->>'neighborhood', ''),
         NULLIF(p_address->>'city', ''),
         p_address->>'province',
         NULLIF(p_address->>'postal_code', ''),
         true
  WHERE NOT EXISTS (
    SELECT 1 FROM hr.addresses
    WHERE person_id = p_person_id AND address_type = 'residence' AND is_current = true
  );

  INSERT INTO docs.acknowledgments (
    sop_version_id, person_id, acknowledged_at, signature_method, ip_address, user_agent
  )
  SELECT v_ethics_version_id, p_person_id, p_ack_ethics_at, 'click', p_ip_address, p_user_agent
  WHERE NOT EXISTS (
    SELECT 1 FROM docs.acknowledgments
    WHERE sop_version_id = v_ethics_version_id AND person_id = p_person_id
  );

  INSERT INTO docs.acknowledgments (
    sop_version_id, person_id, acknowledged_at, signature_method, ip_address, user_agent
  )
  SELECT v_child_labor_version_id, p_person_id, p_ack_child_labor_at, 'click', p_ip_address, p_user_agent
  WHERE NOT EXISTS (
    SELECT 1 FROM docs.acknowledgments
    WHERE sop_version_id = v_child_labor_version_id AND person_id = p_person_id
  );
END;
$function$;
