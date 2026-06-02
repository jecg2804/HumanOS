-- 054_foundation_lifecycle_columns
-- FOUNDATION-NOW (db-final-vision-design): soft-delete + system-of-record lineage + updated_at hygiene.
-- Additive, idempotent. Reuses hr.touch_updated_at() (Constitution 1.5). Excludes v2 modules
-- (performance.*/learning.*), append-only logs, and immutable *_versions tables.
-- SoR token = 'humanos_app' (NOT 'humanos' - collides with the deprecated humanos.* schema, R1).
-- person_sources is left untouched (it carries ORIGIN/lineage vocabulary, not SoR).

-- (1) updated_at column where a mutable record table lacks it + COMMENT
ALTER TABLE hr.invite_codes         ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE hr.person_sources       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE requests.revisions      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE requests.watchers       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE docs.signature_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE docs.generated          ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr.invite_codes','hr.person_sources','requests.revisions','requests.watchers',
    'docs.signature_requests','docs.generated'
  ] LOOP
    EXECUTE format('COMMENT ON COLUMN %s.updated_at IS %L', t,
      'Ultima modificacion server-authoritative (trigger hr.touch_updated_at). Comparador LWW para sync futuro.');
  END LOOP;
END $$;

-- (2) updated_at trigger (reuse hr.touch_updated_at) where missing.
--     hr.user_settings had updated_at but NO trigger (dead column) -> fixed here.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr.user_settings','hr.invite_codes','hr.person_sources',
    'requests.revisions','requests.watchers','docs.signature_requests','docs.generated'
  ] LOOP
    EXECUTE format('CREATE OR REPLACE TRIGGER touch_updated_at
      BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at()', t);
  END LOOP;
END $$;

-- (3) source_system (system-of-record) on hr master-data entities. Canonical SoR vocabulary.
DO $$
DECLARE t text; c text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr.people','hr.employments','hr.addresses','hr.contacts','hr.medical_info',
    'hr.personal_documents','hr.positions','hr.locations','hr.org_units'
  ] LOOP
    c := split_part(t,'.',2);
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS source_system text NOT NULL DEFAULT ''humanos_app''', t);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s_source_system_check', t, c);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %s_source_system_check
      CHECK (source_system IN (''humanos_app'',''payday'',''b2w'',''spectrum'',''manual_entry''))', t, c);
    EXECUTE format('COMMENT ON COLUMN %s.source_system IS %L', t,
      'Sistema de registro actual (system-of-record) de esta fila. humanos_app = masterizado por la app HumanOS (NO el schema deprecado humanos.*). El ORIGEN/lineage vive en hr.person_sources. MDM Pilar 8.');
  END LOOP;
END $$;

-- (3b) Align hr.leave_* (created in 047 with DEFAULT 'humanos', currently empty) to the canonical SoR vocabulary.
DO $$
DECLARE t text; c text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr.leave_assignments','hr.leave_balances','hr.leave_ledger','hr.leave_policies'
  ] LOOP
    c := split_part(t,'.',2);
    EXECUTE format('ALTER TABLE %s ALTER COLUMN source_system SET DEFAULT ''humanos_app''', t);
    EXECUTE format('UPDATE %s SET source_system=''humanos_app'' WHERE source_system=''humanos''', t);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s_source_system_check', t, c);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %s_source_system_check
      CHECK (source_system IN (''humanos_app'',''payday'',''b2w'',''spectrum'',''manual_entry''))', t, c);
    EXECUTE format('COMMENT ON COLUMN %s.source_system IS %L', t,
      'Sistema de registro actual (system-of-record). humanos_app = masterizado por HumanOS (NO el schema deprecado humanos.*). MDM Pilar 8.');
  END LOOP;
END $$;

-- (4) deleted_at (soft-delete; no hard-delete on domain records) + COMMENT. No blanket partial index.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr.people','hr.employments','hr.addresses','hr.contacts','hr.medical_info',
    'hr.personal_documents','hr.positions','hr.locations','hr.org_units','hr.user_settings',
    'requests.tickets','requests.comments','requests.watchers',
    'docs.articles','docs.article_categories','docs.sops','docs.templates',
    'docs.signature_requests','docs.generated',
    'workflows.instances','workflows.processes','workflows.step_assignments'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS deleted_at timestamptz', t);
    EXECUTE format('COMMENT ON COLUMN %s.deleted_at IS %L', t,
      'Soft-delete timestamp. NULL = activo. Sin hard-delete en tablas de dominio.');
  END LOOP;
END $$;

-- (5) deleted_by only on personal / Ley-81 tables (James decision #1) + COMMENT.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr.people','hr.medical_info','hr.personal_documents',
    'hr.addresses','hr.contacts','hr.employments'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS deleted_by uuid
      REFERENCES hr.people(id) ON DELETE SET NULL', t);
    EXECUTE format('COMMENT ON COLUMN %s.deleted_by IS %L', t,
      'Quien hizo el soft-delete (Ley 81 trazabilidad). FK hr.people.');
  END LOOP;
END $$;
