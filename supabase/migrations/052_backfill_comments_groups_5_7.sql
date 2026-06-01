-- 052_backfill_comments_groups_5_7.sql
-- Audit P2.24 (bulk): COMMENT ON COLUMN backfill for the Groups 5-7 schemas
-- (learning / performance / workflows). The gap is almost all boilerplate
-- (id / created_at / updated_at) plus ~10 domain columns; comments are structural
-- / name-derived (the feature semantics finalize when each group is built, but the
-- tables already exist and the Dashboard needs the coverage).

-- ===== boilerplate (id / created_at / updated_at) =====
COMMENT ON COLUMN learning.assessments.id IS 'PK.';
COMMENT ON COLUMN learning.assessments.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN learning.attendance.id IS 'PK.';
COMMENT ON COLUMN learning.attendance.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN learning.certification_assignments.id IS 'PK.';
COMMENT ON COLUMN learning.certification_assignments.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN learning.certification_assignments.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN learning.certifications.id IS 'PK.';
COMMENT ON COLUMN learning.certifications.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN learning.certifications.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN learning.course_modules.id IS 'PK.';
COMMENT ON COLUMN learning.course_modules.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN learning.course_modules.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN learning.courses.id IS 'PK.';
COMMENT ON COLUMN learning.courses.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN learning.courses.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN learning.enrollments.id IS 'PK.';
COMMENT ON COLUMN learning.enrollments.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN learning.enrollments.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN learning.training_records.id IS 'PK.';
COMMENT ON COLUMN learning.training_records.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN performance.calibrations.id IS 'PK.';
COMMENT ON COLUMN performance.calibrations.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN performance.calibrations.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN performance.cycles.id IS 'PK.';
COMMENT ON COLUMN performance.cycles.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN performance.cycles.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN performance.feedback.id IS 'PK.';
COMMENT ON COLUMN performance.feedback.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN performance.feedback.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN performance.goal_updates.id IS 'PK.';
COMMENT ON COLUMN performance.goal_updates.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN performance.goals.id IS 'PK.';
COMMENT ON COLUMN performance.goals.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN performance.goals.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN performance.review_templates.id IS 'PK.';
COMMENT ON COLUMN performance.review_templates.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN performance.review_templates.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN performance.reviews.id IS 'PK.';
COMMENT ON COLUMN performance.reviews.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN performance.reviews.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN workflows.instances.id IS 'PK.';
COMMENT ON COLUMN workflows.instances.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN workflows.instances.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN workflows.process_versions.id IS 'PK.';
COMMENT ON COLUMN workflows.process_versions.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN workflows.processes.id IS 'PK.';
COMMENT ON COLUMN workflows.processes.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN workflows.processes.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN workflows.step_assignments.id IS 'PK.';
COMMENT ON COLUMN workflows.step_assignments.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN workflows.step_assignments.updated_at IS 'Last update timestamp (touch_updated_at trigger).';

-- ===== domain columns =====
COMMENT ON COLUMN learning.certification_assignments.status IS 'Assignment state (default active; e.g. active, expired, revoked, renewed).';
COMMENT ON COLUMN learning.certifications.validity_months IS 'Months a certification stays valid before renewal; NULL = no expiry.';
COMMENT ON COLUMN learning.certifications.is_required_by_law IS 'Whether the certification is legally mandated (e.g. occupational safety).';
COMMENT ON COLUMN learning.certifications.is_active IS 'Whether the certification is currently tracked/offered.';
COMMENT ON COLUMN learning.courses.course_type IS 'Course classification (e.g. onboarding, safety, technical, compliance).';
COMMENT ON COLUMN learning.courses.duration_hours IS 'Nominal course duration in hours.';
COMMENT ON COLUMN learning.courses.is_mandatory IS 'Whether the course is required vs optional.';
COMMENT ON COLUMN learning.courses.is_active IS 'Whether the course is currently offered.';
COMMENT ON COLUMN learning.courses.tags IS 'Free-form tags for filtering/search.';
COMMENT ON COLUMN learning.enrollments.status IS 'Enrollment state (default enrolled; e.g. enrolled, in_progress, completed, cancelled, expired).';
