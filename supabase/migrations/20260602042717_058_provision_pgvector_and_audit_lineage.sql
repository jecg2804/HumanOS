-- 058_provision_pgvector_and_audit_lineage
-- PROVISION-NOW: habilita pgvector (RAG; tablas de embeddings = DEFER al shippear KB Group 3+).
-- audit.log lineage (decision #3: extender audit.log; audit.changes bitemporal DIFERIDO/YAGNI).

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE audit.log ADD COLUMN IF NOT EXISTS source_system mdm.source_system NOT NULL DEFAULT 'humanos_app';
COMMENT ON COLUMN audit.log.source_system IS 'Sistema que genero el evento de auditoria (system-of-record). ADR-0025. audit.changes bitemporal DIFERIDO (decision #3).';
