-- 049_fk_covering_indexes.sql
-- Audit P2.23: add covering indexes for foreign keys that lacked one.
--
-- 68 FKs across the 9 HumanOS schemas had no index on their referencing column(s).
-- An unindexed FK causes slow joins, slow/blocking parent UPDATE/DELETE (cascade
-- scans the child with a seq scan), and lock contention. The hot path flagged by
-- the audit is requests.tickets (received_by/processed_by/selected_supervisor_id/
-- created_by_hr_admin). Indexing all of them now is cheap (most tables are empty)
-- and is standard best practice.
--
-- All idempotent (IF NOT EXISTS). No data change. Generated from pg_constraint
-- (FKs lacking a leading-column index).

CREATE INDEX IF NOT EXISTS article_versions_edited_by_fkidx ON docs.article_versions (edited_by);
CREATE INDEX IF NOT EXISTS article_versions_published_by_fkidx ON docs.article_versions (published_by);
CREATE INDEX IF NOT EXISTS articles_author_id_fkidx ON docs.articles (author_id);
CREATE INDEX IF NOT EXISTS articles_current_version_id_fkidx ON docs.articles (current_version_id);
CREATE INDEX IF NOT EXISTS articles_related_sop_id_fkidx ON docs.articles (related_sop_id);
CREATE INDEX IF NOT EXISTS articles_reviewed_by_fkidx ON docs.articles (reviewed_by);
CREATE INDEX IF NOT EXISTS assessments_graded_by_fkidx ON learning.assessments (graded_by);
CREATE INDEX IF NOT EXISTS attendance_location_id_fkidx ON learning.attendance (location_id);
CREATE INDEX IF NOT EXISTS attendance_recorded_by_fkidx ON learning.attendance (recorded_by);
CREATE INDEX IF NOT EXISTS calibrations_facilitated_by_fkidx ON performance.calibrations (facilitated_by);
CREATE INDEX IF NOT EXISTS certification_assignments_previous_assignment_id_fkidx ON learning.certification_assignments (previous_assignment_id);
CREATE INDEX IF NOT EXISTS certification_assignments_related_enrollment_id_fkidx ON learning.certification_assignments (related_enrollment_id);
CREATE INDEX IF NOT EXISTS certification_assignments_renewed_to_id_fkidx ON learning.certification_assignments (renewed_to_id);
CREATE INDEX IF NOT EXISTS course_modules_related_article_id_fkidx ON learning.course_modules (related_article_id);
CREATE INDEX IF NOT EXISTS course_modules_related_sop_id_fkidx ON learning.course_modules (related_sop_id);
CREATE INDEX IF NOT EXISTS courses_created_by_fkidx ON learning.courses (created_by);
CREATE INDEX IF NOT EXISTS courses_grants_certification_id_fkidx ON learning.courses (grants_certification_id);
CREATE INDEX IF NOT EXISTS cycles_closed_by_fkidx ON performance.cycles (closed_by);
CREATE INDEX IF NOT EXISTS cycles_review_template_id_fkidx ON performance.cycles (review_template_id);
CREATE INDEX IF NOT EXISTS employments_created_by_fkidx ON hr.employments (created_by);
CREATE INDEX IF NOT EXISTS employments_office_id_fkidx ON hr.employments (office_id);
CREATE INDEX IF NOT EXISTS employments_position_id_fkidx ON hr.employments (position_id);
CREATE INDEX IF NOT EXISTS enrollments_enrolled_by_fkidx ON learning.enrollments (enrolled_by);
CREATE INDEX IF NOT EXISTS enrollments_granted_certification_assignment_id_fkidx ON learning.enrollments (granted_certification_assignment_id);
CREATE INDEX IF NOT EXISTS feedback_related_goal_id_fkidx ON performance.feedback (related_goal_id);
CREATE INDEX IF NOT EXISTS feedback_related_review_id_fkidx ON performance.feedback (related_review_id);
CREATE INDEX IF NOT EXISTS generated_generated_by_fkidx ON docs.generated (generated_by);
CREATE INDEX IF NOT EXISTS goal_updates_updated_by_fkidx ON performance.goal_updates (updated_by);
CREATE INDEX IF NOT EXISTS goals_approved_by_fkidx ON performance.goals (approved_by);
CREATE INDEX IF NOT EXISTS goals_created_by_fkidx ON performance.goals (created_by);
CREATE INDEX IF NOT EXISTS instances_process_version_id_fkidx ON workflows.instances (process_version_id);
CREATE INDEX IF NOT EXISTS instances_started_by_fkidx ON workflows.instances (started_by);
CREATE INDEX IF NOT EXISTS invite_codes_consumed_by_auth_id_fkidx ON hr.invite_codes (consumed_by_auth_id);
CREATE INDEX IF NOT EXISTS invite_codes_generated_by_fkidx ON hr.invite_codes (generated_by);
CREATE INDEX IF NOT EXISTS leave_assignments_policy_id_fkidx ON hr.leave_assignments (policy_id);
CREATE INDEX IF NOT EXISTS leave_ledger_created_by_fkidx ON hr.leave_ledger (created_by);
CREATE INDEX IF NOT EXISTS leave_ledger_reversal_of_id_fkidx ON hr.leave_ledger (reversal_of_id);
CREATE INDEX IF NOT EXISTS leave_ledger_source_ticket_id_fkidx ON hr.leave_ledger (source_ticket_id);
CREATE INDEX IF NOT EXISTS leave_policies_employment_type_id_fkidx ON hr.leave_policies (employment_type_id);
CREATE INDEX IF NOT EXISTS medical_info_updated_by_fkidx ON hr.medical_info (updated_by);
CREATE INDEX IF NOT EXISTS org_units_parent_id_fkidx ON hr.org_units (parent_id);
CREATE INDEX IF NOT EXISTS personal_documents_uploaded_by_fkidx ON hr.personal_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS process_versions_published_by_fkidx ON workflows.process_versions (published_by);
CREATE INDEX IF NOT EXISTS processes_current_version_id_fkidx ON workflows.processes (current_version_id);
CREATE INDEX IF NOT EXISTS review_templates_related_sop_id_fkidx ON performance.review_templates (related_sop_id);
CREATE INDEX IF NOT EXISTS reviews_calibration_id_fkidx ON performance.reviews (calibration_id);
CREATE INDEX IF NOT EXISTS reviews_finalized_by_fkidx ON performance.reviews (finalized_by);
CREATE INDEX IF NOT EXISTS reviews_template_id_fkidx ON performance.reviews (template_id);
CREATE INDEX IF NOT EXISTS revisions_responded_by_fkidx ON requests.revisions (responded_by);
CREATE INDEX IF NOT EXISTS revisions_revised_by_fkidx ON requests.revisions (revised_by);
CREATE INDEX IF NOT EXISTS signature_requests_requested_by_fkidx ON docs.signature_requests (requested_by);
CREATE INDEX IF NOT EXISTS sop_versions_published_by_fkidx ON docs.sop_versions (published_by);
CREATE INDEX IF NOT EXISTS sops_current_version_id_fkidx ON docs.sops (current_version_id);
CREATE INDEX IF NOT EXISTS step_assignments_completed_by_fkidx ON workflows.step_assignments (completed_by);
CREATE INDEX IF NOT EXISTS step_assignments_related_acknowledgment_id_fkidx ON workflows.step_assignments (related_acknowledgment_id);
CREATE INDEX IF NOT EXISTS step_assignments_related_ticket_id_fkidx ON workflows.step_assignments (related_ticket_id);
CREATE INDEX IF NOT EXISTS template_versions_published_by_fkidx ON docs.template_versions (published_by);
CREATE INDEX IF NOT EXISTS templates_current_version_id_fkidx ON docs.templates (current_version_id);
CREATE INDEX IF NOT EXISTS tickets_created_by_hr_admin_fkidx ON requests.tickets (created_by_hr_admin);
CREATE INDEX IF NOT EXISTS tickets_processed_by_fkidx ON requests.tickets (processed_by);
CREATE INDEX IF NOT EXISTS tickets_received_by_fkidx ON requests.tickets (received_by);
CREATE INDEX IF NOT EXISTS tickets_selected_supervisor_id_fkidx ON requests.tickets (selected_supervisor_id);
CREATE INDEX IF NOT EXISTS training_records_recorded_by_fkidx ON learning.training_records (recorded_by);
CREATE INDEX IF NOT EXISTS training_records_related_article_acknowledgment_id_fkidx ON learning.training_records (related_article_acknowledgment_id);
CREATE INDEX IF NOT EXISTS training_records_related_certification_id_fkidx ON learning.training_records (related_certification_id);
CREATE INDEX IF NOT EXISTS training_records_related_enrollment_id_fkidx ON learning.training_records (related_enrollment_id);
CREATE INDEX IF NOT EXISTS training_records_related_sop_acknowledgment_id_fkidx ON learning.training_records (related_sop_acknowledgment_id);
CREATE INDEX IF NOT EXISTS uploads_deleted_by_fkidx ON files.uploads (deleted_by);
