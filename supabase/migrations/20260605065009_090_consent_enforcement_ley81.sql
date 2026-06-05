-- 090_consent_enforcement_ley81
-- SEC-CONSENT (R27 / Ley 81): wire consent end-to-end at the DB layer. ADR-0035 + spec
-- docs/superpowers/specs/2026-06-05-sec-consent-ley81-design.md. Additive only; zero destructive ops.
--
-- The gap (verified live 2026-06-05): hr.consent has 0 rows; nothing writes consent. Onboarding ships
-- (Group 2 wizard) capturing medical data (hr.medical_info = 43 rows / 43 persons, 0 with a 'medical'
-- consent granted=true) and emergency contacts WITHOUT capturing Ley 81 consent and WITHOUT blocking
-- the sensitive write. Medical data = sensitive (salud) => Ley 81 requires prior, express, irrefutable
-- consent. ANTAI fines $1,000-$10,000/infraction; internal use does not exempt.
--
-- Defense-in-depth, fail-closed, 3 layers (only L1+L2 are DB; L3 = UI gate, separate slice):
--   L1 - atomic guard inside hr.complete_onboarding_writes (primary): the RPC takes 4 new consent
--        params (DEFAULT NULL so CREATE OR REPLACE keeps signature compatibility + existing grants),
--        writes hr.consent rows FIRST, and RAISEs BEFORE the medical/emergency INSERT if a required
--        scope is not granted. One transaction => consent + sensitive data are atomic (the RAISE rolls
--        back even the people-link / invite-consume).
--   L2 - BEFORE INSERT OR UPDATE trigger on hr.medical_info (table-level guarantee): blocks ANY route
--        (RPC, owner self-insert via RLS, future /perfil, admin tooling, ad-hoc SQL) that writes
--        sensitive medical payload without a vigente 'medical' consent. Required because the RLS of
--        hr.medical_info lets the owner self-insert AND the RPC runs SECURITY DEFINER (RLS bypassed),
--        so an RPC-only guard leaves the owner-self-insert path open. Allows soft-delete / metadata
--        updates (no change to sensitive columns) so hr_admin corrections + updated_at touches survive.
--
-- Mandatory ordering: the RPC writes the consent row BEFORE the medical INSERT so the L2 trigger sees
-- the consent committed-in-tx.
--
-- The 43 medical rows without consent: FLAG-FOR-RECONSENT, never fabricate consent (Ley 81 requires
-- consent be actively given; backfilling fake rows is itself an infraction). Flag-only UPDATE reusing
-- the existing hr.people.needs_review + review_notes (no new column) with a 'SEC-CONSENT' marker, plus
-- a read-only worklist view hr.v_pending_reconsent (RLS inherited, no medical payload). 42 of the 43
-- are ETL (no auth account) and re-consent automatically when they onboard (the new gate covers them);
-- the 1 onboarded person is handled by a /perfil banner (follow-up P2).
--
-- Helpers reused (NOT redefined): hr.current_person_id(), hr.is_hr_admin(). New shared helper
-- hr.has_active_consent (consumed by both L1 and L2). No hr.record_consent wrapper (3 inline INSERTs in
-- one function do not justify an extra SECURITY DEFINER object - ADR-0035 decision 2).

-- ============================================================================
-- 1. hr.has_active_consent(person_id, scope) - shared live-consent predicate
--    Last row per scope wins (consent is append-only; a revocation = granted=false row that wins).
--    STABLE SECURITY DEFINER search_path='' so the trigger (defined as SECURITY DEFINER) and the RPC
--    can both read hr.consent regardless of caller RLS. REVOKE PUBLIC + GRANT authenticated (read-only
--    predicate; the future /perfil self-service re-consent will rely on it).
-- ============================================================================
CREATE OR REPLACE FUNCTION hr.has_active_consent(p_person_id uuid, p_scope text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(
    (
      SELECT c.granted
      FROM hr.consent c
      WHERE c.person_id = p_person_id
        AND c.scope = p_scope
      ORDER BY c.consent_at DESC, c.created_at DESC
      LIMIT 1
    ),
    false
  );
$function$;

REVOKE EXECUTE ON FUNCTION hr.has_active_consent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hr.has_active_consent(uuid, text) TO authenticated;

COMMENT ON FUNCTION hr.has_active_consent(uuid, text) IS
  'SEC-CONSENT (R27 Ley 81): true si la persona tiene consentimiento vigente para el scope dado. Append-only: la ultima fila por scope gana (revocacion = fila granted=false que gana). STABLE SECURITY DEFINER search_path=. Consumida por el guard L1 (hr.complete_onboarding_writes) y el trigger L2 (hr.enforce_medical_consent). REVOKE PUBLIC + GRANT authenticated.';

-- ============================================================================
-- 2. L2 trigger: hr.enforce_medical_consent() + trg_medical_consent_guard
--    BEFORE INSERT OR UPDATE on hr.medical_info. Fail-closed: RAISE unless a 'medical' consent is
--    vigente for the row's person. Allows soft-delete / metadata updates (no change to sensitive
--    payload columns) so corrections + updated_at touches do not require re-consent.
--    Sensitive columns = the actual medical payload; person_id/audit/lifecycle columns are exempt.
-- ============================================================================
CREATE OR REPLACE FUNCTION hr.enforce_medical_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_sensitive_changed boolean;
BEGIN
  -- On UPDATE, only enforce when the sensitive medical payload actually changes. A pure soft-delete
  -- (deleted_at), an updated_at/source/audit touch, or a metadata-only edit must not require consent
  -- (a person could be revoking + we still need to let hr_admin purge / annotate). IS DISTINCT FROM
  -- is null-safe.
  IF TG_OP = 'UPDATE' THEN
    v_sensitive_changed :=
         NEW.blood_type                 IS DISTINCT FROM OLD.blood_type
      OR NEW.allergies                  IS DISTINCT FROM OLD.allergies
      OR NEW.chronic_conditions         IS DISTINCT FROM OLD.chronic_conditions
      OR NEW.current_medications        IS DISTINCT FROM OLD.current_medications
      OR NEW.doctor_name                IS DISTINCT FROM OLD.doctor_name
      OR NEW.doctor_phone               IS DISTINCT FROM OLD.doctor_phone
      OR NEW.medical_insurance_provider IS DISTINCT FROM OLD.medical_insurance_provider
      OR NEW.medical_insurance_number   IS DISTINCT FROM OLD.medical_insurance_number
      OR NEW.css_number                 IS DISTINCT FROM OLD.css_number
      OR NEW.notes                      IS DISTINCT FROM OLD.notes;

    IF NOT v_sensitive_changed THEN
      RETURN NEW; -- soft-delete / metadata-only: allowed without consent
    END IF;
  END IF;

  -- INSERT, or UPDATE that changes sensitive payload: a vigente 'medical' consent is mandatory.
  IF NOT hr.has_active_consent(NEW.person_id, 'medical') THEN
    RAISE EXCEPTION 'SEC-CONSENT (R27 Ley 81): no se puede escribir informacion medica sin consentimiento medical vigente para la persona %', NEW.person_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION hr.enforce_medical_consent() IS
  'SEC-CONSENT (R27 Ley 81) L2 defense-in-depth: BEFORE INSERT/UPDATE en hr.medical_info. RAISE (check_violation) si no hay consentimiento medical vigente (hr.has_active_consent). Permite soft-delete/metadata (UPDATE sin cambio de columnas sensibles). Cubre la ruta owner-self-insert (RLS) y SQL ad-hoc que el guard L1 de la RPC no puede. SECURITY DEFINER search_path=.';

DROP TRIGGER IF EXISTS trg_medical_consent_guard ON hr.medical_info;
CREATE TRIGGER trg_medical_consent_guard
  BEFORE INSERT OR UPDATE ON hr.medical_info
  FOR EACH ROW
  EXECUTE FUNCTION hr.enforce_medical_consent();

-- ============================================================================
-- 3. CREATE OR REPLACE hr.complete_onboarding_writes - L1 atomic guard + consent writes.
--    +4 trailing params with DEFAULT NULL. NOTE: adding params changes the signature, so this is a NEW
--    function object (NOT an in-place replace of the live 11-arg one). We therefore DROP the old 11-arg
--    overload (else it lingers as a consent-BYPASS path) and set least-privilege grants explicitly on
--    the new 15-arg signature (a fresh function defaults to PUBLIC EXECUTE). The consent rows are
--    written BEFORE the medical/emergency INSERTs; the guard RAISEs first if a required scope is not
--    granted => fail-closed, atomic rollback of the whole tx (incl. people-link). Consent INSERTs are
--    append-only + idempotent via NOT EXISTS on (person_id, scope, legal_version, granted=true).
-- ============================================================================
DROP FUNCTION IF EXISTS hr.complete_onboarding_writes(
  uuid, uuid, uuid, text, jsonb, jsonb, jsonb, timestamptz, timestamptz, text, text);

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
  p_user_agent text DEFAULT NULL,
  p_consent_data_processing boolean DEFAULT NULL,
  p_consent_emergency boolean DEFAULT NULL,
  p_consent_medical boolean DEFAULT NULL,
  p_consent_legal_version text DEFAULT NULL
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
  v_has_emergency boolean;
  v_has_medical boolean;
  v_ip inet;
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

  -- Determine which sensitive sections actually carry data (the guard only enforces consent for data
  -- that is actually present; consenting without filling a section is legally inocuo).
  v_has_emergency := p_emergency IS NOT NULL
                     AND COALESCE(NULLIF(p_emergency->>'contact_name', ''), NULLIF(p_emergency->>'phone', '')) IS NOT NULL;
  -- v_has_medical requires at least one NON-EMPTY value (not just a touched-then-cleared key like
  -- {"blood_type":""}) so we never write an all-NULL medical row or demand medical consent for no data.
  v_has_medical   := p_medical IS NOT NULL AND p_medical <> '{}'::jsonb
                     AND EXISTS (SELECT 1 FROM jsonb_each_text(p_medical) e WHERE NULLIF(trim(e.value), '') IS NOT NULL);

  -- L1 fail-closed consent gate. legal_version is mandatory whenever any consent is asserted (it pins
  -- the exact consented text; a NULL/'' version makes the consent unauditable).
  IF (v_has_medical OR v_has_emergency)
     AND (p_consent_legal_version IS NULL OR p_consent_legal_version = '') THEN
    RAISE EXCEPTION 'SEC-CONSENT (R27 Ley 81): p_consent_legal_version es obligatorio cuando se escriben datos sensibles (medicos o de emergencia).'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_has_medical AND p_consent_medical IS NOT TRUE THEN
    RAISE EXCEPTION 'SEC-CONSENT (R27 Ley 81): no se puede registrar informacion medica sin consentimiento medical otorgado.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_has_emergency AND p_consent_emergency IS NOT TRUE THEN
    RAISE EXCEPTION 'SEC-CONSENT (R27 Ley 81): no se puede registrar el contacto de emergencia sin consentimiento emergency_contact otorgado.'
      USING ERRCODE = 'check_violation';
  END IF;

  v_ip := NULLIF(p_ip_address, '')::inet;

  -- Write consent rows FIRST (mandatory ordering: the L2 trigger must see consent committed-in-tx
  -- before the medical INSERT). Append-only + idempotent: only insert a granted=true row if no
  -- identical (person, scope, legal_version, granted=true) row exists yet. actor_id = the person
  -- (self-consent during onboarding). Only insert a scope when the caller granted it.
  IF p_consent_data_processing IS TRUE AND p_consent_legal_version IS NOT NULL AND p_consent_legal_version <> '' THEN
    INSERT INTO hr.consent (person_id, scope, legal_version, granted, actor_id, ip, user_agent)
    SELECT p_person_id, 'data_processing', p_consent_legal_version, true, p_person_id, v_ip, NULLIF(p_user_agent, '')
    WHERE NOT EXISTS (
      SELECT 1 FROM hr.consent
      WHERE person_id = p_person_id AND scope = 'data_processing'
        AND legal_version = p_consent_legal_version AND granted = true
    );
  END IF;

  IF p_consent_emergency IS TRUE AND p_consent_legal_version IS NOT NULL AND p_consent_legal_version <> '' THEN
    INSERT INTO hr.consent (person_id, scope, legal_version, granted, actor_id, ip, user_agent)
    SELECT p_person_id, 'emergency_contact', p_consent_legal_version, true, p_person_id, v_ip, NULLIF(p_user_agent, '')
    WHERE NOT EXISTS (
      SELECT 1 FROM hr.consent
      WHERE person_id = p_person_id AND scope = 'emergency_contact'
        AND legal_version = p_consent_legal_version AND granted = true
    );
  END IF;

  IF p_consent_medical IS TRUE AND p_consent_legal_version IS NOT NULL AND p_consent_legal_version <> '' THEN
    INSERT INTO hr.consent (person_id, scope, legal_version, granted, actor_id, ip, user_agent)
    SELECT p_person_id, 'medical', p_consent_legal_version, true, p_person_id, v_ip, NULLIF(p_user_agent, '')
    WHERE NOT EXISTS (
      SELECT 1 FROM hr.consent
      WHERE person_id = p_person_id AND scope = 'medical'
        AND legal_version = p_consent_legal_version AND granted = true
    );
  END IF;

  -- People link / invite consume (unchanged). NOTE: the consent gate above RAISEs before reaching
  -- here when data is present without consent, so a failed onboarding never persists this link.
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

  IF v_has_medical THEN
    -- The L2 trigger now also guards this INSERT (defense-in-depth); the L1 gate above already
    -- ensured p_consent_medical IS TRUE + the consent row was written, so this passes.
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

    -- Clear the SEC-CONSENT flag for this person now that a vigente medical consent exists (only the
    -- SEC-CONSENT marker is removed; other review reasons are preserved). needs_review is cleared only
    -- if no other marker remains in review_notes.
    UPDATE hr.people p
    SET review_notes = NULLIF(
          trim(both ' |' from
            regexp_replace(COALESCE(p.review_notes, ''), '\s*\|?\s*SEC-CONSENT:[^|]*', '', 'g')
          ), ''),
        needs_review = (
          NULLIF(
            trim(both ' |' from
              regexp_replace(COALESCE(p.review_notes, ''), '\s*\|?\s*SEC-CONSENT:[^|]*', '', 'g')
            ), ''
          ) IS NOT NULL
        ),
        updated_at = now()
    WHERE p.id = p_person_id
      AND COALESCE(p.review_notes, '') LIKE '%SEC-CONSENT:%';
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

COMMENT ON FUNCTION hr.complete_onboarding_writes(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, timestamptz, timestamptz, text, text, boolean, boolean, boolean, text) IS
  'ONBOARDING-TX + SEC-CONSENT (R27 Ley 81 L1): atomic onboarding writes in one SECURITY DEFINER tx. Links hr.people.auth_id, consumes the invite, writes hr.contacts (emergency) / hr.medical_info / hr.addresses / docs.acknowledgments. SEC-CONSENT (ADR-0035): +4 trailing consent params (p_consent_data_processing/_emergency/_medical, p_consent_legal_version, all DEFAULT NULL => signature-compatible). Writes hr.consent rows FIRST and RAISEs (fail-closed, full rollback) before writing sensitive data if a required scope is not granted (medical when p_medical present; emergency_contact when emergency present) or if p_consent_legal_version is missing. Consent INSERTs are append-only + idempotent (NOT EXISTS). After writing medical it clears the SEC-CONSENT re-consent marker on hr.people. EXECUTE service_role-only (the old 11-arg overload is dropped above; grants set explicitly on the new 15-arg signature).';

REVOKE EXECUTE ON FUNCTION hr.complete_onboarding_writes(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, timestamptz, timestamptz, text, text, boolean, boolean, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.complete_onboarding_writes(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, timestamptz, timestamptz, text, text, boolean, boolean, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION hr.complete_onboarding_writes(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, timestamptz, timestamptz, text, text, boolean, boolean, boolean, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION hr.complete_onboarding_writes(uuid, uuid, uuid, text, jsonb, jsonb, jsonb, timestamptz, timestamptz, text, text, boolean, boolean, boolean, text) TO service_role;

-- ============================================================================
-- 4. Flag the 43 (reuse hr.people.needs_review + review_notes; NO new column; NEVER fabricate consent).
--    Stamp a 'SEC-CONSENT:' marker so the worklist/view can filter cleanly. Idempotent: only stamps a
--    person that does not already carry the marker. Expected: 43 persons flagged.
-- ============================================================================
UPDATE hr.people p
SET needs_review = true,
    review_notes = CASE
                     WHEN COALESCE(NULLIF(p.review_notes, ''), '') = '' THEN
                       'SEC-CONSENT: re-consentimiento Ley 81 pendiente (datos medicos sin consentimiento) ' || now()::date
                     ELSE
                       p.review_notes || ' | SEC-CONSENT: re-consentimiento Ley 81 pendiente (datos medicos sin consentimiento) ' || now()::date
                   END,
    updated_at = now()
WHERE EXISTS (
        SELECT 1 FROM hr.medical_info m
        WHERE m.person_id = p.id AND m.deleted_at IS NULL
      )
  AND NOT hr.has_active_consent(p.id, 'medical')
  AND COALESCE(p.review_notes, '') NOT LIKE '%SEC-CONSENT:%';

-- ============================================================================
-- 5. hr.v_pending_reconsent - read-only worklist for hr_admin. security_invoker=on so it runs with the
--    querying role's privileges and inherits hr.people RLS (without it a PG view runs as its owner and
--    would bypass RLS). No medical payload. can_prompt_now = the person has an auth account (can be
--    prompted at next login) vs ETL (re-consents automatically on onboarding).
-- ============================================================================
CREATE OR REPLACE VIEW hr.v_pending_reconsent
WITH (security_invoker = on) AS
  SELECT p.id AS person_id,
         p.full_name,
         p.auth_id,
         (p.auth_id IS NOT NULL) AS can_prompt_now
  FROM hr.people p
  WHERE EXISTS (
          SELECT 1 FROM hr.medical_info m
          WHERE m.person_id = p.id AND m.deleted_at IS NULL
        )
    AND NOT hr.has_active_consent(p.id, 'medical');

COMMENT ON VIEW hr.v_pending_reconsent IS
  'SEC-CONSENT (R27 Ley 81) worklist hr_admin: personas con informacion medica vigente pero SIN consentimiento medical vigente (las 43 a re-consentir). Read-only, hereda RLS de hr.people (security_invoker), sin payload medico. can_prompt_now = tiene cuenta auth (prompt en /perfil) vs ETL (re-consiente al onboardear).';
