-- 084_core_jobs_phases_obra_hierarchy
-- F0.2 masters (ADR-0032 / SP-0b) - DESIGN A (adjacency list), ratificado por Jaime + research
-- (4 threads + 3 lentes adversariales) + validacion LIVE 2026-06-05.
-- core.jobs: UNA fila por Job_Number (obra base Y extra), Single-Table-Inheritance con discriminador.
--   obra_code = grouping derivado (siempre presente); parent_job_id = self-FK NULLABLE soft (NULL para
--   base y para extras huerfanos cuya obra base no existe en Spectrum: 24-401E1, 25-501E*, 25-502E*).
-- core.phases: grano STRUCTURAL (job_id, phase_code) - validado live: description/status/uom/cost_center
--   son CONSTANTES por (job, phase_code) (11 phases distintas en 24-404, no varian por cost_type).
--   El nivel categoria (Cost_Type: CON/EQA/EQI/ICS/MAT/OTR/SAL/SUB) + actuales $ -> DIFERIDO a
--   core.phase_costs (fact, SP-0b sec.8, con el consumidor planilla). Jaime: "structural master only".

-- =========================================================================
-- core.jobs  <- GetJob (52) + GetJobDates + GetJobUDF
-- =========================================================================
CREATE TABLE core.jobs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number           text NOT NULL,
  obra_code            text NOT NULL,
  extra_code           text,
  is_extra             boolean NOT NULL DEFAULT false,
  parent_job_id        uuid REFERENCES core.jobs(id) ON DELETE SET NULL,
  job_description      text,
  customer_id          uuid REFERENCES core.customers(id) ON DELETE SET NULL,
  customer_code        text,
  status_code          text,
  cost_center          text,
  division             text,
  address_1            text,
  address_2            text,
  city                 text,
  state                text,
  zip_code             text,
  certified_flag       text,
  work_state_tax_code  text,
  contract_number      text,
  project_manager_code text,
  superintendent_code  text,
  estimator_code       text,
  create_date          date,
  est_start_date       date,
  est_complete_date    date,
  projected_complete_date date,
  start_date           date,
  complete_date        date,
  udf                  jsonb,
  source_system        core.source_system NOT NULL DEFAULT 'spectrum',
  deleted_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_is_extra_matches_code CHECK (is_extra = (extra_code IS NOT NULL)),
  CONSTRAINT jobs_base_has_no_parent CHECK (is_extra OR parent_job_id IS NULL),
  CONSTRAINT jobs_no_self_parent CHECK (parent_job_id IS NULL OR parent_job_id <> id)
);
CREATE UNIQUE INDEX ux_jobs_number_active ON core.jobs (job_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_obra_code ON core.jobs (obra_code);
CREATE INDEX idx_jobs_parent ON core.jobs (parent_job_id);
CREATE INDEX idx_jobs_customer ON core.jobs (customer_id);
COMMENT ON TABLE core.jobs IS 'Master de obras/jobs conformado desde Spectrum SDX (GetJob). DESIGN A (adjacency list, Single-Table-Inheritance): UNA fila por Job_Number, base obra Y extra. core.phases referencia jobs.id uniformemente. ADR-0032 (#4 enmendado a Design A).';
COMMENT ON COLUMN core.jobs.job_number IS 'Clave natural Spectrum RAW (Job_Number), ej. 24-404 (base) o 24-404E1 (extra). UNIQUE entre filas activas.';
COMMENT ON COLUMN core.jobs.obra_code IS 'Codigo de obra DERIVADO de job_number (ej. 24-404). Siempre presente = el agrupador real (no hay entidad obra en Spectrum; algunas obras base no existen como fila, solo sus extras - huerfanos).';
COMMENT ON COLUMN core.jobs.extra_code IS 'Sufijo extra parseado (ej. E1, E10), NULL = obra base. is_extra = (extra_code IS NOT NULL).';
COMMENT ON COLUMN core.jobs.parent_job_id IS 'Self-FK SOFT a la obra base. NULL para base Y para extras huerfanos (obra base ausente de Spectrum). NO confiar para agrupar - usar obra_code.';
COMMENT ON COLUMN core.jobs.customer_code IS 'Customer_Code RAW de Spectrum; el Edge lo resuelve a customer_id (FK).';
COMMENT ON COLUMN core.jobs.project_manager_code IS 'Spectrum Project_Manager (codigo, vacio en live). Texto - NO FK a core.persons (VIEW no puede ser target de FK); resolver a hr.people si se puebla.';
COMMENT ON COLUMN core.jobs.udf IS 'GetJobUDF (20 slots UDF1..UDF20) como jsonb.';
ALTER TABLE core.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select" ON core.jobs FOR SELECT TO authenticated USING (deleted_at IS NULL OR hr.is_hr_admin());
CREATE POLICY "jobs_insert_admin" ON core.jobs FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "jobs_update_admin" ON core.jobs FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "jobs_delete_admin" ON core.jobs FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE TRIGGER touch_updated_at_jobs BEFORE UPDATE ON core.jobs FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
GRANT SELECT ON core.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.jobs TO service_role;

CREATE TABLE core.jobs_external_ids (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES core.jobs(id) ON DELETE CASCADE,
  source_system core.source_system NOT NULL,
  external_id   text NOT NULL,
  external_data jsonb,
  last_synced_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, external_id),
  UNIQUE (job_id, source_system)
);
COMMENT ON TABLE core.jobs_external_ids IS 'Crosswalk MDM XREF de core.jobs a sistemas-fuente (ej. payroll.projects de PayDay/ProjectSight). UNIQUE(source_system,external_id)+UNIQUE(job_id,source_system).';
ALTER TABLE core.jobs_external_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_xref_select_admin" ON core.jobs_external_ids FOR SELECT TO authenticated USING (hr.is_hr_admin());
GRANT SELECT ON core.jobs_external_ids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.jobs_external_ids TO service_role;

-- =========================================================================
-- core.phases  <- GetPhaseEnhanced (grano structural por (job, phase_code))
-- =========================================================================
CREATE TABLE core.phases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            uuid NOT NULL REFERENCES core.jobs(id) ON DELETE CASCADE,
  phase_code        text NOT NULL,
  description       text,
  status_code       text,
  unit_of_measure   text,
  cost_center       text,
  price_method_code text,
  start_date        date,
  end_date          date,
  complete_date     date,
  comment           text,
  source_system     core.source_system NOT NULL DEFAULT 'spectrum',
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_phases_job_code_active ON core.phases (job_id, phase_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_phases_job ON core.phases (job_id);
COMMENT ON TABLE core.phases IS 'Master estructural de fases/cost-codes conformado desde Spectrum SDX (GetPhaseEnhanced). Grano (job_id, phase_code) - description/status/uom/cost_center constantes por phase_code (validado live). El nivel categoria (Cost_Type) + actuales $ van a core.phase_costs (fact, DIFERIDO SP-0b sec.8). ADR-0032.';
COMMENT ON COLUMN core.phases.phase_code IS 'Codigo de fase Spectrum (Phase_Code), ej. 015200 (Campamento). UNIQUE por job entre filas activas.';
COMMENT ON COLUMN core.phases.description IS 'Descripcion de la fase (constante por phase_code; ej. 015200=Campamento para los 8 cost_types).';
COMMENT ON COLUMN core.phases.job_id IS 'FK a core.jobs (uniforme: base O extra; la fase pertenece a un Job_Number especifico). El mismo (phase_code,cost_type) puede existir en base y extra como filas distintas.';
ALTER TABLE core.phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phases_select" ON core.phases FOR SELECT TO authenticated USING (deleted_at IS NULL OR hr.is_hr_admin());
CREATE POLICY "phases_insert_admin" ON core.phases FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "phases_update_admin" ON core.phases FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "phases_delete_admin" ON core.phases FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE TRIGGER touch_updated_at_phases BEFORE UPDATE ON core.phases FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
GRANT SELECT ON core.phases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.phases TO service_role;

CREATE TABLE core.phases_external_ids (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id      uuid NOT NULL REFERENCES core.phases(id) ON DELETE CASCADE,
  source_system core.source_system NOT NULL,
  external_id   text NOT NULL,
  external_data jsonb,
  last_synced_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_system, external_id),
  UNIQUE (phase_id, source_system)
);
COMMENT ON TABLE core.phases_external_ids IS 'Crosswalk MDM XREF de core.phases a sistemas-fuente (ej. payroll.phases). UNIQUE(source_system,external_id)+UNIQUE(phase_id,source_system).';
ALTER TABLE core.phases_external_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phases_xref_select_admin" ON core.phases_external_ids FOR SELECT TO authenticated USING (hr.is_hr_admin());
GRANT SELECT ON core.phases_external_ids TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.phases_external_ids TO service_role;
