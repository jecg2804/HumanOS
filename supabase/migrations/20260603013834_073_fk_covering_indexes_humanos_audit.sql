-- 073_fk_covering_indexes_humanos_audit
-- F-16 (foundation reality-audit 2026-06-02): 9 FKs across HumanOS schemas lack a covering index.
-- Low impact today (tables near-empty) but deletes/joins/RLS predicates on these FK columns degrade
-- at Group 3+ volume. Plain btree on the referencing column; IF NOT EXISTS for idempotency.
CREATE INDEX IF NOT EXISTS idx_access_log_actor_id ON audit.access_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_addresses_deleted_by ON hr.addresses (deleted_by);
CREATE INDEX IF NOT EXISTS idx_consent_actor_id ON hr.consent (actor_id);
CREATE INDEX IF NOT EXISTS idx_consent_person_id ON hr.consent (person_id);
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_by ON hr.contacts (deleted_by);
CREATE INDEX IF NOT EXISTS idx_employments_deleted_by ON hr.employments (deleted_by);
CREATE INDEX IF NOT EXISTS idx_medical_info_deleted_by ON hr.medical_info (deleted_by);
CREATE INDEX IF NOT EXISTS idx_people_deleted_by ON hr.people (deleted_by);
CREATE INDEX IF NOT EXISTS idx_personal_documents_deleted_by ON hr.personal_documents (deleted_by);
