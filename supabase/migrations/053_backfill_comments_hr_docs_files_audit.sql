-- 053_backfill_comments_hr_docs_files_audit.sql
-- Audit P2.24 (completion): the remaining 84 columns without COMMENT across the
-- LIVE hr.* tables (non-leave), all docs.*, files.uploads, and audit.log. After
-- this + 051 + 052, every column in the 9 HumanOS schemas has a COMMENT.
-- Boilerplate (id/created_at/updated_at) gets standard text; domain columns get
-- specific comments.

-- ===== domain columns (live hr.* + audit) =====
COMMENT ON COLUMN audit.log.ip_address IS 'Client IP of the actor (forensics).';
COMMENT ON COLUMN audit.log.user_agent IS 'Client user-agent of the actor (forensics).';
COMMENT ON COLUMN hr.addresses.notes IS 'Free-form notes.';
COMMENT ON COLUMN hr.employment_types.display_order IS 'Sort order for UI lists.';
COMMENT ON COLUMN hr.employment_types.is_active IS 'Whether this employment type is currently assignable.';
COMMENT ON COLUMN hr.employment_types.notes IS 'Free-form notes.';
COMMENT ON COLUMN hr.employments.notes IS 'Free-form notes.';
COMMENT ON COLUMN hr.invite_codes.generated_by IS 'hr_admin who generated the code (FK hr.people).';
COMMENT ON COLUMN hr.invite_codes.generated_at IS 'When the code was generated.';
COMMENT ON COLUMN hr.invite_codes.consumed_at IS 'When the code was consumed during onboarding; NULL = unused.';
COMMENT ON COLUMN hr.invite_codes.notes IS 'Free-form notes.';
COMMENT ON COLUMN hr.personal_documents.uploaded_at IS 'When the document was uploaded.';
COMMENT ON COLUMN hr.personal_documents.notes IS 'Free-form notes.';
COMMENT ON COLUMN hr.user_settings.person_id IS 'Owner of these settings (FK hr.people).';
COMMENT ON COLUMN hr.user_settings.notification_email_enabled IS 'Master switch for email notifications (per-type granularity lives in preferences JSONB).';
COMMENT ON COLUMN hr.user_settings.notification_in_app_enabled IS 'Master switch for in-app notifications.';
COMMENT ON COLUMN hr.user_settings.language IS 'UI language preference (default es).';
COMMENT ON COLUMN hr.user_settings.timezone IS 'User timezone (default America/Panama).';
COMMENT ON COLUMN hr.user_settings.dashboard_layout IS 'Persisted dashboard layout preferences (JSONB).';
COMMENT ON COLUMN hr.user_settings.two_factor_enabled IS 'Whether 2FA is enabled for this user.';

-- ===== boilerplate id =====
COMMENT ON COLUMN docs.acknowledgments.id IS 'PK.';
COMMENT ON COLUMN docs.article_acknowledgments.id IS 'PK.';
COMMENT ON COLUMN docs.article_categories.id IS 'PK.';
COMMENT ON COLUMN docs.article_versions.id IS 'PK.';
COMMENT ON COLUMN docs.articles.id IS 'PK.';
COMMENT ON COLUMN docs.generated.id IS 'PK.';
COMMENT ON COLUMN docs.signature_requests.id IS 'PK.';
COMMENT ON COLUMN docs.sop_versions.id IS 'PK.';
COMMENT ON COLUMN docs.sops.id IS 'PK.';
COMMENT ON COLUMN docs.template_versions.id IS 'PK.';
COMMENT ON COLUMN docs.templates.id IS 'PK.';
COMMENT ON COLUMN hr.addresses.id IS 'PK.';
COMMENT ON COLUMN hr.contacts.id IS 'PK.';
COMMENT ON COLUMN hr.employment_types.id IS 'PK.';
COMMENT ON COLUMN hr.employments.id IS 'PK.';
COMMENT ON COLUMN hr.invite_code_attempts.id IS 'PK.';
COMMENT ON COLUMN hr.invite_codes.id IS 'PK.';
COMMENT ON COLUMN hr.locations.id IS 'PK.';
COMMENT ON COLUMN hr.medical_info.id IS 'PK.';
COMMENT ON COLUMN hr.org_units.id IS 'PK.';
COMMENT ON COLUMN hr.person_sources.id IS 'PK.';
COMMENT ON COLUMN hr.personal_documents.id IS 'PK.';
COMMENT ON COLUMN hr.positions.id IS 'PK.';
COMMENT ON COLUMN hr.user_settings.id IS 'PK.';

-- ===== boilerplate created_at =====
COMMENT ON COLUMN docs.article_categories.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN docs.article_versions.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN docs.articles.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN docs.generated.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN docs.sop_versions.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN docs.sops.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN docs.template_versions.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN docs.templates.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN files.uploads.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.addresses.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.contacts.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.employment_types.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.employments.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.invite_code_attempts.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.invite_codes.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.locations.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.medical_info.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.org_units.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.people.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.person_sources.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.personal_documents.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.positions.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.user_settings.created_at IS 'Row creation timestamp.';

-- ===== boilerplate updated_at =====
COMMENT ON COLUMN docs.article_categories.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN docs.articles.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN docs.sops.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN docs.templates.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN files.uploads.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.addresses.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.contacts.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.employment_types.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.employments.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.invite_code_attempts.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.locations.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.medical_info.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.org_units.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.people.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.personal_documents.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.positions.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN hr.user_settings.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
