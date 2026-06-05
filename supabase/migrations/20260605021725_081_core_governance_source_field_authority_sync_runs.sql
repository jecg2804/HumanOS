-- 081_core_governance_source_field_authority_sync_runs
-- F0.2 (ADR-0032 / SP-0b decision #6). Governance MDM en core: registro de fuentes,
-- autoridad por campo (survivorship), y log de corridas ETL. Hace REAL la autoridad
-- por campo que el Edge sdx-sync aplica al conformar core/hr.
-- Tablas de governance (NO masters cross-app) => sin *_external_ids.
-- RLS habilitada; policies SPLIT por comando (evita multiple_permissive_policies).

-- ============================================================
-- core.source_systems : registro de sistemas-fuente (code = DOMAIN canonico core.source_system)
-- ============================================================
CREATE TABLE core.source_systems (
  code         core.source_system PRIMARY KEY,
  display_name text NOT NULL,
  precedence   integer NOT NULL DEFAULT 100,
  trust_rank   integer NOT NULL DEFAULT 100,
  is_live      boolean NOT NULL DEFAULT false,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE core.source_systems IS 'Registro de sistemas-fuente para MDM. code = vocab canonico (DOMAIN core.source_system, ADR-0025). precedence/trust_rank son tiebreakers COARSE (menor = mas confiable); la autoridad real es por-campo en core.field_authority. ADR-0032.';
COMMENT ON COLUMN core.source_systems.precedence IS 'Orden de supervivencia coarse cuando field_authority no decide (menor = gana). Advisory, ajustable.';
COMMENT ON COLUMN core.source_systems.trust_rank IS 'Confianza relativa de la fuente en calidad de dato (menor = mas confiable). Advisory.';
COMMENT ON COLUMN core.source_systems.is_live IS 'TRUE si la fuente esta integrada/en-vivo hoy (spectrum, humanos_app). FALSE = futura (payday, b2w).';

ALTER TABLE core.source_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_systems_select_authenticated" ON core.source_systems
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "source_systems_insert_admin" ON core.source_systems
  FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "source_systems_update_admin" ON core.source_systems
  FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "source_systems_delete_admin" ON core.source_systems
  FOR DELETE TO authenticated USING (hr.is_hr_admin());

CREATE TRIGGER touch_updated_at_source_systems
  BEFORE UPDATE ON core.source_systems
  FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

GRANT SELECT ON core.source_systems TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.source_systems TO service_role;

INSERT INTO core.source_systems (code, display_name, precedence, trust_rank, is_live, notes) VALUES
  ('spectrum',     'Spectrum SDX (Dexter+Chaney) - master data empleo/org/obras/equipo', 10, 10, true,  'Live read-only SOAP/XML. Posee empleo/org. Ingesta via Edge sdx-sync.'),
  ('humanos_app',  'HumanOS - onboarding self-service + estado local',                   15, 15, true,  'Onboarding aporta identidad/cedula self; employment_status local (manual_override).'),
  ('payday',       'PayDay - planilla (salario, cedula historica)',                      20, 20, false, 'Futuro. Posee salario.'),
  ('b2w',          'B2W',                                                                40, 40, false, 'Futuro / por definir.'),
  ('manual_entry', 'Captura manual (hr_admin)',                                          50, 50, true,  'Fallback humano.');

-- ============================================================
-- core.field_authority : que fuente gana por campo (survivorship atributo-a-atributo)
-- ============================================================
CREATE TABLE core.field_authority (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity               text NOT NULL,
  field_name           text NOT NULL,
  authoritative_source core.source_system NOT NULL REFERENCES core.source_systems(code) ON DELETE RESTRICT,
  strategy             text NOT NULL CHECK (strategy IN ('sor_wins','most_recent','manual_override')),
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity, field_name)
);
COMMENT ON TABLE core.field_authority IS 'Autoridad por campo (survivorship atributo-a-atributo) que el Edge sdx-sync aplica al conformar core/hr. ADR-0032 decision #6.';
COMMENT ON COLUMN core.field_authority.entity IS 'Entidad logica: person | employment | compensation.';
COMMENT ON COLUMN core.field_authority.strategy IS 'sor_wins=la fuente autoritativa pisa; most_recent=gana el mas reciente; manual_override=nunca overwrite ciego (revision humana).';

ALTER TABLE core.field_authority ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_authority_select_authenticated" ON core.field_authority
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "field_authority_insert_admin" ON core.field_authority
  FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "field_authority_update_admin" ON core.field_authority
  FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "field_authority_delete_admin" ON core.field_authority
  FOR DELETE TO authenticated USING (hr.is_hr_admin());

CREATE TRIGGER touch_updated_at_field_authority
  BEFORE UPDATE ON core.field_authority
  FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

GRANT SELECT ON core.field_authority TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.field_authority TO service_role;

INSERT INTO core.field_authority (entity, field_name, authoritative_source, strategy, notes) VALUES
  ('employment','department_code',   'spectrum',    'sor_wins',        'Spectrum posee organizacion.'),
  ('employment','occupation',        'spectrum',    'sor_wins',        NULL),
  ('employment','union_code',        'spectrum',    'sor_wins',        NULL),
  ('employment','wage_class',        'spectrum',    'sor_wins',        NULL),
  ('employment','cost_center',       'spectrum',    'sor_wins',        NULL),
  ('employment','employment_status', 'humanos_app', 'manual_override', 'LOCAL. Spectrum puede estar stale; NUNCA overwrite ciego.'),
  ('person','national_id',           'humanos_app', 'sor_wins',        'Cedula self-entered via onboarding (+ historico Samantha / PayDay futuro como fill).'),
  ('person','contact',               'humanos_app', 'sor_wins',        NULL),
  ('person','emergency_contact',     'humanos_app', 'sor_wins',        NULL),
  ('person','dependents',            'humanos_app', 'sor_wins',        NULL),
  ('compensation','salary',          'payday',      'sor_wins',        'PayDay futuro.');

-- ============================================================
-- core.sync_runs : bitacora de corridas de ingesta (observabilidad; idempotencia vive en el upsert)
-- ============================================================
CREATE TABLE core.sync_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system core.source_system NOT NULL REFERENCES core.source_systems(code) ON DELETE RESTRICT,
  service       text,
  entity        text,
  batch_id      text NOT NULL,
  status        text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','failed')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  rows_read     integer NOT NULL DEFAULT 0,
  rows_upserted integer NOT NULL DEFAULT 0,
  rows_flagged  integer NOT NULL DEFAULT 0,
  error         text,
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE core.sync_runs IS 'Bitacora de cada corrida de ingesta (Edge sdx-sync u otra). La idempotencia real esta en el upsert por clave natural; esto es observabilidad. ADR-0032.';
COMMENT ON COLUMN core.sync_runs.service IS 'Servicio fuente (ej. GetEmployee, GetJob) o batch general.';
COMMENT ON COLUMN core.sync_runs.batch_id IS 'Identificador de la corrida (agrupa filas/servicios de un mismo pull).';
COMMENT ON COLUMN core.sync_runs.rows_flagged IS 'Conflictos marcados para revision humana (survivorship conservador: flag > overwrite).';

CREATE INDEX idx_sync_runs_source_started ON core.sync_runs (source_system, started_at DESC);
CREATE INDEX idx_sync_runs_batch ON core.sync_runs (batch_id);

ALTER TABLE core.sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_runs_select_admin" ON core.sync_runs
  FOR SELECT TO authenticated USING (hr.is_hr_admin());

GRANT SELECT ON core.sync_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core.sync_runs TO service_role;
