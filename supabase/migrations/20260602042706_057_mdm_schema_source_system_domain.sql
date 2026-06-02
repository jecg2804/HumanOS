-- 057_mdm_schema_source_system_domain
-- PROVISION-NOW: crea el schema mdm (vacio salvo el domain) + DOMAIN canonico mdm.source_system,
-- y converge las 13 columnas inline-CHECK (054) al DOMAIN (mecanismo unico). ADR-0025.

CREATE SCHEMA IF NOT EXISTS mdm;
COMMENT ON SCHEMA mdm IS 'Master Data Management: vocabularios canonicos + crosswalks {entity}_external_ids futuros (gradual, ADR-0014). Hospeda el DOMAIN source_system.';

CREATE DOMAIN mdm.source_system AS text
  CHECK (VALUE IN ('humanos_app','payday','b2w','spectrum','manual_entry'));
COMMENT ON DOMAIN mdm.source_system IS 'Vocabulario SoR canonico (system-of-record). humanos_app = nativo HumanOS (NO el schema prohibido humanos.*). Origen/lineage vive en hr.person_sources. ADR-0025.';

-- Converge las 13 columnas inline-CHECK (054) al DOMAIN. Conserva DEFAULT humanos_app + NOT NULL.
DO $$
DECLARE t text; c text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr.people','hr.employments','hr.addresses','hr.contacts','hr.medical_info',
    'hr.personal_documents','hr.positions','hr.locations','hr.org_units',
    'hr.leave_assignments','hr.leave_balances','hr.leave_ledger','hr.leave_policies'
  ] LOOP
    c := split_part(t,'.',2);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s_source_system_check', t, c);
    EXECUTE format('ALTER TABLE %s ALTER COLUMN source_system TYPE mdm.source_system', t);
    EXECUTE format('ALTER TABLE %s ALTER COLUMN source_system SET DEFAULT ''humanos_app''', t);
  END LOOP;
END $$;
