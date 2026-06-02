-- 059_consent_and_access_log_ley81
-- SEC-CONSENT (R27 Ley 81): consentimiento versionado + log de acceso de lectura a datos sensibles.
-- Scopes de consent y ON DELETE de person_id: ajustables por ALTER si James/abogado cambian (no bloquea).

-- (a) Consentimiento versionado. Append-only (revocar = fila nueva granted=false). Owner+hr_admin (R13).
CREATE TABLE hr.consent (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     uuid NOT NULL REFERENCES hr.people(id) ON DELETE CASCADE,
  scope         text NOT NULL CHECK (scope IN ('medical','emergency_contact','data_processing')),
  legal_version text NOT NULL,
  granted       boolean NOT NULL,
  consent_at    timestamptz NOT NULL DEFAULT now(),
  actor_id      uuid REFERENCES hr.people(id) ON DELETE SET NULL,
  ip            inet,
  user_agent    text,
  source_system mdm.source_system NOT NULL DEFAULT 'humanos_app',
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr.consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY consent_select ON hr.consent FOR SELECT TO authenticated
  USING (person_id = hr.current_person_id() OR hr.is_hr_admin());
CREATE POLICY consent_insert ON hr.consent FOR INSERT TO authenticated
  WITH CHECK (person_id = hr.current_person_id() OR hr.is_hr_admin());
COMMENT ON TABLE hr.consent IS 'Consentimiento Ley 81 versionado (R27). Append-only: revocar = fila nueva granted=false. Owner+hr_admin (R13).';
COMMENT ON COLUMN hr.consent.person_id IS 'Persona que consiente. FK hr.people. ON DELETE CASCADE (ajustable si Ley 81 exige retencion).';
COMMENT ON COLUMN hr.consent.scope IS 'Ambito del consentimiento: medical | emergency_contact | data_processing. Ajustable por abogado.';
COMMENT ON COLUMN hr.consent.legal_version IS 'Version del texto legal consentido (validado por abogado). Apunta al texto vigente al firmar.';
COMMENT ON COLUMN hr.consent.granted IS 'true = otorgado, false = revocado. La revocacion es una fila nueva (historia inmutable).';
COMMENT ON COLUMN hr.consent.consent_at IS 'Momento del consentimiento/revocacion.';
COMMENT ON COLUMN hr.consent.actor_id IS 'Quien registro el consentimiento (self o hr_admin). FK hr.people.';
COMMENT ON COLUMN hr.consent.ip IS 'IP desde donde se registro (evidencia Ley 81).';
COMMENT ON COLUMN hr.consent.user_agent IS 'User-agent desde donde se registro (evidencia Ley 81).';
COMMENT ON COLUMN hr.consent.source_system IS 'System-of-record. ADR-0025.';
COMMENT ON COLUMN hr.consent.created_at IS 'Insercion del registro.';

-- (b) Access log (R27: trazabilidad de LECTURA a datos sensibles). Append-only. Solo hr_admin lee.
CREATE TABLE audit.access_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid REFERENCES hr.people(id) ON DELETE SET NULL,
  event_type    text NOT NULL CHECK (event_type IN ('view','search','export','login')),
  entity_schema text NOT NULL,
  entity_table  text NOT NULL,
  entity_id     uuid,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_system mdm.source_system NOT NULL DEFAULT 'humanos_app',
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit.access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY access_log_select_admin ON audit.access_log FOR SELECT TO authenticated USING (hr.is_hr_admin());
COMMENT ON TABLE audit.access_log IS 'Log de acceso/lectura (R27 Ley 81). Append-only, solo hr_admin lee. Inserts via audit.log_access() SECURITY DEFINER.';
COMMENT ON COLUMN audit.access_log.id IS 'PK. gen_random_uuid (convencion: uuidv7 al migrar a PG18, swap no-breaking).';
COMMENT ON COLUMN audit.access_log.actor_id IS 'Quien hizo el acceso. FK hr.people.';
COMMENT ON COLUMN audit.access_log.event_type IS 'view | search | export | login.';
COMMENT ON COLUMN audit.access_log.entity_schema IS 'Schema de la entidad accedida (p.ej. hr).';
COMMENT ON COLUMN audit.access_log.entity_table IS 'Tabla accedida (p.ej. medical_info).';
COMMENT ON COLUMN audit.access_log.entity_id IS 'PK del registro accedido (si aplica).';
COMMENT ON COLUMN audit.access_log.metadata IS 'Contexto extra del acceso (jsonb).';
COMMENT ON COLUMN audit.access_log.source_system IS 'System-of-record. ADR-0025.';
COMMENT ON COLUMN audit.access_log.created_at IS 'Momento del acceso.';

-- (c) Path controlado de escritura. La app lo llama al LEER datos sensibles (wiring Group 3).
CREATE OR REPLACE FUNCTION audit.log_access(
  p_event_type text, p_schema text, p_table text,
  p_entity_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO audit.access_log(actor_id, event_type, entity_schema, entity_table, entity_id, metadata)
  VALUES (hr.current_person_id(), p_event_type, p_schema, p_table, p_entity_id, p_metadata);
$$;
REVOKE EXECUTE ON FUNCTION audit.log_access(text,text,text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit.log_access(text,text,text,uuid,jsonb) TO authenticated;
COMMENT ON FUNCTION audit.log_access IS 'Registra un acceso de lectura (R27). La app lo llama al leer hr.medical_info/personal_documents (wiring en Group 3). REVOKE PUBLIC + GRANT authenticated.';
