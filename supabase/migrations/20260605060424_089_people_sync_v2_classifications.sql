-- 089_people_sync_v2_classifications
-- F0.x (ADR-0032 field_authority + ADR-0034 people-sync design, SP-0b). People sync v2 = Spectrum GetEmployee survivorship (FLAG-ONLY).
-- Adds: (1) hr.employment_classifications -- SCD-2 sidecar for Spectrum's payroll/labor axis,
--           SEPARATE from hr.employments (HR-org FKs). One current row per person.
--       (2) hr.apply_spectrum_classification(...) -- SCD-2 upsert of the sidecar (SECURITY DEFINER).
--       (3) hr.sync_spectrum_people(...) -- the survivorship txn: crosswalk + enrich + FLAG drift.
-- FLAG-ONLY: never writes hr.people identity, never auto-changes status. Helpers reused (NOT redefined):
--   hr.is_hr_admin / hr.is_supervisor_of / hr.current_person_id / hr.is_president_or_admin /
--   hr.current_app_role / hr.touch_updated_at. RLS mirrors hr.employments exactly.

-- =========================================================================
-- (1) hr.employment_classifications  <- Spectrum GetEmployee (payroll/labor axis)
-- =========================================================================
CREATE TABLE hr.employment_classifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        uuid NOT NULL REFERENCES hr.people(id) ON DELETE CASCADE,
  department_code  text,
  occupation       text,
  cost_center      text,
  union_code       text,
  wage_class       text,
  worker_comp_code text,
  trade            text,
  valid_from       date NOT NULL DEFAULT CURRENT_DATE,
  valid_to         date CHECK (valid_to IS NULL OR valid_to >= valid_from),
  is_current       boolean NOT NULL DEFAULT true,
  source_system    text NOT NULL DEFAULT 'spectrum',
  created_from     text NOT NULL DEFAULT 'spectrum_sync',
  deleted_at       timestamptz,
  deleted_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_employment_classifications_current
  ON hr.employment_classifications (person_id)
  WHERE is_current AND deleted_at IS NULL;
CREATE INDEX idx_employment_classifications_person_current
  ON hr.employment_classifications (person_id, is_current);

COMMENT ON TABLE hr.employment_classifications IS
  'SCD-2 sidecar de la clasificacion payroll/labor de Spectrum (GetEmployee). SEPARADA de hr.employments (eje HR-org). Spectrum es la autoridad de este eje (ADR-0032 field_authority; ADR-0034). Una fila vigente por persona (UNIQUE parcial). FLAG-ONLY pipeline: nunca toca identidad ni status de hr.people.';
COMMENT ON COLUMN hr.employment_classifications.id IS 'PK.';
COMMENT ON COLUMN hr.employment_classifications.person_id IS 'FK a hr.people(id), ON DELETE CASCADE. La persona clasificada.';
COMMENT ON COLUMN hr.employment_classifications.department_code IS 'Spectrum Department_Code (DIRECT/INDIRE/OPERAC).';
COMMENT ON COLUMN hr.employment_classifications.occupation IS 'Spectrum Occupation (texto libre).';
COMMENT ON COLUMN hr.employment_classifications.cost_center IS 'Spectrum Cost_Center (MAR/ADM/EQO/REH/MOV/EQS/ING/CIV).';
COMMENT ON COLUMN hr.employment_classifications.union_code IS 'Spectrum Union_Code (SANTRAICO/NONUNION; puede venir vacio).';
COMMENT ON COLUMN hr.employment_classifications.wage_class IS 'Spectrum Wage_Class.';
COMMENT ON COLUMN hr.employment_classifications.worker_comp_code IS 'Spectrum Worker_Comp_Code (DIRECT/INDIR).';
COMMENT ON COLUMN hr.employment_classifications.trade IS 'Spectrum Trade (Calificado/No Calificado/No Sindicalizado).';
COMMENT ON COLUMN hr.employment_classifications.valid_from IS 'Inicio de vigencia SCD-2 (fecha de aparicion del valor en un sync).';
COMMENT ON COLUMN hr.employment_classifications.valid_to IS 'Fin de vigencia SCD-2. NULL = vigente. Se fija a CURRENT_DATE al cerrar.';
COMMENT ON COLUMN hr.employment_classifications.is_current IS 'true = fila vigente. Manejado EXPLICITAMENTE por hr.apply_spectrum_classification (true al insertar, false al cerrar); es el predicado del UNIQUE parcial.';
COMMENT ON COLUMN hr.employment_classifications.source_system IS 'Sistema de origen (texto plano, no el dominio core.source_system). Default spectrum.';
COMMENT ON COLUMN hr.employment_classifications.created_from IS 'Procedencia de la fila (spectrum_sync).';
COMMENT ON COLUMN hr.employment_classifications.deleted_at IS 'Soft-delete. NULL = activo.';
COMMENT ON COLUMN hr.employment_classifications.deleted_by IS 'Actor del soft-delete (si aplica).';
COMMENT ON COLUMN hr.employment_classifications.created_at IS 'Timestamp de creacion de la fila.';
COMMENT ON COLUMN hr.employment_classifications.updated_at IS 'Timestamp de ultima actualizacion (trigger hr.touch_updated_at).';

ALTER TABLE hr.employment_classifications ENABLE ROW LEVEL SECURITY;

-- RLS mirrors hr.employments EXACTLY (one policy per command, all TO authenticated).
CREATE POLICY "employment_classifications_select" ON hr.employment_classifications
  FOR SELECT TO authenticated
  USING (
    person_id = hr.current_person_id()
    OR hr.is_supervisor_of(person_id)
    OR hr.is_hr_admin()
    OR hr.is_president_or_admin()
  );
CREATE POLICY "employment_classifications_insert" ON hr.employment_classifications
  FOR INSERT TO authenticated
  WITH CHECK (hr.is_hr_admin());
CREATE POLICY "employment_classifications_update" ON hr.employment_classifications
  FOR UPDATE TO authenticated
  USING (hr.is_hr_admin())
  WITH CHECK (hr.is_hr_admin());
CREATE POLICY "employment_classifications_delete" ON hr.employment_classifications
  FOR DELETE TO authenticated
  USING (hr.current_app_role() = 'admin');

CREATE TRIGGER touch_updated_at_employment_classifications
  BEFORE UPDATE ON hr.employment_classifications
  FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

GRANT SELECT ON hr.employment_classifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr.employment_classifications TO service_role;

-- =========================================================================
-- (2) hr.apply_spectrum_classification -- SCD-2 upsert of the sidecar
-- =========================================================================
CREATE OR REPLACE FUNCTION hr.apply_spectrum_classification(
  p_person_id        uuid,
  p_department_code  text,
  p_occupation       text,
  p_cost_center      text,
  p_union_code       text,
  p_wage_class       text,
  p_worker_comp_code text,
  p_trade            text,
  p_batch_id         text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current hr.employment_classifications%ROWTYPE;
  v_new_id  uuid;
  v_changed boolean := false;
BEGIN
  SELECT * INTO v_current
  FROM hr.employment_classifications
  WHERE person_id = p_person_id AND is_current AND deleted_at IS NULL;

  -- No current row: first classification for this person.
  IF NOT FOUND THEN
    INSERT INTO hr.employment_classifications (
      person_id, department_code, occupation, cost_center, union_code,
      wage_class, worker_comp_code, trade, is_current, source_system, created_from
    ) VALUES (
      p_person_id, p_department_code, p_occupation, p_cost_center, p_union_code,
      p_wage_class, p_worker_comp_code, p_trade, true, 'spectrum', 'spectrum_sync'
    )
    RETURNING id INTO v_new_id;
    RETURN v_new_id;
  END IF;

  -- Change detection: any of the 7 fields differs (COALESCE to '' so NULL/empty are equal).
  IF (COALESCE(v_current.department_code,'')  IS DISTINCT FROM COALESCE(p_department_code,''))
     OR (COALESCE(v_current.occupation,'')       IS DISTINCT FROM COALESCE(p_occupation,''))
     OR (COALESCE(v_current.cost_center,'')      IS DISTINCT FROM COALESCE(p_cost_center,''))
     OR (COALESCE(v_current.union_code,'')       IS DISTINCT FROM COALESCE(p_union_code,''))
     OR (COALESCE(v_current.wage_class,'')       IS DISTINCT FROM COALESCE(p_wage_class,''))
     OR (COALESCE(v_current.worker_comp_code,'') IS DISTINCT FROM COALESCE(p_worker_comp_code,''))
     OR (COALESCE(v_current.trade,'')            IS DISTINCT FROM COALESCE(p_trade,''))
  THEN
    v_changed := true;
  END IF;

  IF v_changed THEN
    -- Close the old row EXPLICITLY (valid_to + is_current=false) so the partial UNIQUE frees up.
    UPDATE hr.employment_classifications
    SET valid_to = CURRENT_DATE, is_current = false, updated_at = now()
    WHERE id = v_current.id;

    INSERT INTO hr.employment_classifications (
      person_id, department_code, occupation, cost_center, union_code,
      wage_class, worker_comp_code, trade, is_current, source_system, created_from
    ) VALUES (
      p_person_id, p_department_code, p_occupation, p_cost_center, p_union_code,
      p_wage_class, p_worker_comp_code, p_trade, true, 'spectrum', 'spectrum_sync'
    )
    RETURNING id INTO v_new_id;

    -- audit.log: system actor (actor_id NULL); schema_name/table_name/source_system are NOT NULL.
    INSERT INTO audit.log (
      schema_name, table_name, record_id, action, actor_id, reason, metadata, source_system
    ) VALUES (
      'hr', 'employment_classifications', p_person_id, 'custom', NULL,
      'spectrum_classification_scd2_transition',
      jsonb_build_object(
        'semantic_action', 'spectrum_classification_scd2_transition',
        'batch_id', p_batch_id,
        'person_id', p_person_id,
        'before', jsonb_build_object(
          'department_code', v_current.department_code, 'occupation', v_current.occupation,
          'cost_center', v_current.cost_center, 'union_code', v_current.union_code,
          'wage_class', v_current.wage_class, 'worker_comp_code', v_current.worker_comp_code,
          'trade', v_current.trade),
        'after', jsonb_build_object(
          'department_code', p_department_code, 'occupation', p_occupation,
          'cost_center', p_cost_center, 'union_code', p_union_code,
          'wage_class', p_wage_class, 'worker_comp_code', p_worker_comp_code,
          'trade', p_trade)
      ),
      'spectrum'
    );

    RETURN v_new_id;
  END IF;

  -- No change: touch updated_at only.
  UPDATE hr.employment_classifications SET updated_at = now() WHERE id = v_current.id;
  RETURN v_current.id;
END;
$$;

COMMENT ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) IS
  'SCD-2 upsert del sidecar hr.employment_classifications desde Spectrum. SECURITY DEFINER, search_path=''''. Inserta si no hay vigente; cierra+inserta+audita si algun campo cambia; toca updated_at si no. is_current manejado explicito. EXECUTE service_role-only. ADR-0032 + ADR-0034.';
REVOKE EXECUTE ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION hr.apply_spectrum_classification(uuid,text,text,text,text,text,text,text,text) TO service_role;

-- =========================================================================
-- (3) hr.sync_spectrum_people -- survivorship txn: crosswalk + enrich + FLAG
-- =========================================================================
CREATE OR REPLACE FUNCTION hr.sync_spectrum_people(p_records jsonb, p_batch_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec            jsonb;
  v_code         text;
  v_name         text;
  v_status       text;
  v_dept         text;
  v_occupation   text;
  v_cost_center  text;
  v_union        text;
  v_wage_class   text;
  v_worker_comp  text;
  v_trade        text;
  v_person_id    uuid;
  v_local_status text;
  v_mapped       text;
  v_matched      integer := 0;
  v_enriched     integer := 0;
  v_skipped      integer := 0;
  v_flags        jsonb := '[]'::jsonb;
  v_skipped_codes jsonb := '[]'::jsonb;
BEGIN
  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' THEN
    RETURN jsonb_build_object('matched',0,'enriched',0,'flagged',0,'skipped',0,
                              'flags','[]'::jsonb,'skipped_codes','[]'::jsonb);
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    -- Normalize the code to UPPER so the crosswalk key (external_id) and the case-insensitive
    -- people lookup stay consistent (M3: avoids a duplicate crosswalk row on future case drift).
    v_code := NULLIF(upper(trim(COALESCE(rec->>'Employee_Code',''))), '');
    IF v_code IS NULL THEN
      CONTINUE;  -- no code, nothing to resolve
    END IF;
    v_name        := NULLIF(trim(COALESCE(rec->>'Employee_Name','')), '');
    v_status      := upper(COALESCE(rec->>'Employment_Status',''));
    v_dept        := NULLIF(trim(COALESCE(rec->>'Department_Code','')), '');
    v_occupation  := NULLIF(trim(COALESCE(rec->>'Occupation','')), '');
    v_cost_center := NULLIF(trim(COALESCE(rec->>'Cost_Center','')), '');
    v_union       := NULLIF(trim(COALESCE(rec->>'Union_Code','')), '');
    v_wage_class  := NULLIF(trim(COALESCE(rec->>'Wage_Class','')), '');
    v_worker_comp := NULLIF(trim(COALESCE(rec->>'Worker_Comp_Code','')), '');
    v_trade       := NULLIF(trim(COALESCE(rec->>'Trade','')), '');

    -- Z-sentinel: starts with 'Z' AND contains '9999' (ZRIO9999, ZEIS99999). Skip, count, do not flag.
    IF v_code LIKE 'Z%' AND v_code LIKE '%9999%' THEN
      v_skipped := v_skipped + 1;
      v_skipped_codes := v_skipped_codes || to_jsonb(v_code);
      CONTINUE;
    END IF;

    -- Resolve person: (1) existing spectrum crosswalk, else (2) employee_code case-insensitive.
    SELECT person_id INTO v_person_id
    FROM hr.person_sources
    WHERE source_system = 'spectrum' AND external_id = v_code
    LIMIT 1;

    IF v_person_id IS NULL THEN
      SELECT id INTO v_person_id
      FROM hr.people
      WHERE upper(employee_code) = upper(v_code) AND deleted_at IS NULL
      LIMIT 1;
    END IF;

    IF v_person_id IS NOT NULL THEN
      -- Upsert the crosswalk (full record verbatim into external_data).
      INSERT INTO hr.person_sources (person_id, source_system, external_id, external_data, last_synced_at)
      VALUES (v_person_id, 'spectrum', v_code, rec, now())
      ON CONFLICT (source_system, external_id) DO UPDATE
        SET person_id = EXCLUDED.person_id,
            external_data = EXCLUDED.external_data,
            last_synced_at = now(),
            updated_at = now();

      -- Enrich classification (SCD-2 sidecar).
      PERFORM hr.apply_spectrum_classification(
        v_person_id, v_dept, v_occupation, v_cost_center, v_union,
        v_wage_class, v_worker_comp, v_trade, p_batch_id);
      v_enriched := v_enriched + 1;
      v_matched  := v_matched + 1;

      -- Status drift: map Spectrum status -> local; compare to hr.people.status. FLAG only.
      v_mapped := CASE WHEN v_status = 'A' THEN 'Activo' ELSE 'Inactivo' END;
      SELECT status INTO v_local_status FROM hr.people WHERE id = v_person_id;
      IF v_local_status IS DISTINCT FROM v_mapped THEN
        v_flags := v_flags || jsonb_build_object(
          'employee_code', v_code, 'name', v_name, 'reason', 'status_drift',
          'spectrum_value', v_status, 'local_value', v_local_status);
      END IF;

    ELSE
      -- Unmatched. Only ACTIVE unmatched are reconciliation-worthy. FLAG, never create.
      IF v_status = 'A' THEN
        v_flags := v_flags || jsonb_build_object(
          'employee_code', v_code, 'name', v_name, 'reason', 'new_active_unmatched');
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'matched', v_matched,
    'enriched', v_enriched,
    'flagged', jsonb_array_length(v_flags),
    'skipped', v_skipped,
    'flags', v_flags,
    'skipped_codes', v_skipped_codes
  );
END;
$$;

COMMENT ON FUNCTION hr.sync_spectrum_people(jsonb,text) IS
  'Transaccion de survivorship people v2 (Spectrum GetEmployee). SECURITY DEFINER, search_path=''''. Por record: salta Z-sentinels; resuelve persona (crosswalk -> employee_code); upsert hr.person_sources; enriquece clasificacion (SCD-2); FLAGea status_drift y new_active_unmatched. FLAG-ONLY: nunca escribe identidad ni status de hr.people, nunca crea personas. Retorna jsonb {matched,enriched,flagged,skipped,flags,skipped_codes}. EXECUTE service_role-only. ADR-0032 + ADR-0034.';
REVOKE EXECUTE ON FUNCTION hr.sync_spectrum_people(jsonb,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION hr.sync_spectrum_people(jsonb,text) FROM anon;
REVOKE EXECUTE ON FUNCTION hr.sync_spectrum_people(jsonb,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION hr.sync_spectrum_people(jsonb,text) TO service_role;
