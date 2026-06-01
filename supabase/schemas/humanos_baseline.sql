-- =============================================================================
-- HumanOS — Schema Baseline (INTROSPECTION-GENERATED)
-- =============================================================================
--
-- This file is an INTROSPECTION-GENERATED baseline, NOT a pg_dump.
-- It was reconstructed on 2026-06-01 by querying the Postgres system catalogs
-- (pg_class, pg_attribute, pg_constraint, pg_index, pg_policies, pg_proc,
-- pg_trigger, obj_description/col_description) via the Supabase MCP server.
--
-- Project: bzeoszympkkicwlfdtcn  (live DB, SHARED with MovimientOS)
-- Scope:   the 9 HumanOS schemas only —
--            hr, requests, docs, workflows, audit,
--            notifications, files, performance, learning
--          (public.* / payroll.* / humanos.* belong to other apps and are
--           deliberately EXCLUDED.)
--
-- Purpose: human-readable reference + reproducibility snapshot of the schema
--          shape at a point in time.
--
-- SOURCE OF TRUTH: the LIVE database remains the source of truth. Going-forward
--          DDL changes live in supabase/migrations/ — NOT in this file. Do not
--          hand-edit this baseline to drive schema changes; regenerate it.
--
-- NOT INCLUDED: this baseline does NOT capture GRANTs / role privileges,
--          object OWNERSHIP, or SEQUENCE current values / state. It also omits
--          extensions, custom types/domains, and views unless they surface via
--          the sections below. Reconstructed CREATE statements use
--          format_type / pg_get_*def output and are high-fidelity but not
--          byte-identical to a server dump.
--
-- Sections (in order):
--   1. CREATE TABLE
--   2. Constraints (PK / FK / UNIQUE / CHECK)
--   3. Indexes (excluding constraint-backing)
--   4. RLS enable
--   5. Policies
--   6. Functions
--   7. Triggers
--   8. Comments (table + column)
-- =============================================================================


-- ===== SECTION: CREATE TABLE =====

-- ----- schema: audit -----
CREATE TABLE audit.log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  schema_name text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  actor_id uuid,
  actor_email text,
  actor_role text,
  field_changed text,
  old_value jsonb,
  new_value jsonb,
  changed_fields text[],
  metadata jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  session_id text,
  request_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ----- schema: files -----
CREATE TABLE files.uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_schema text NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'humanos'::text,
  file_size_bytes bigint,
  mime_type text,
  checksum_sha256 text,
  category text,
  tags text[],
  uploaded_by uuid,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  upload_source text,
  thumbnail_url text,
  page_count integer,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  retention_until date,
  legal_hold boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ----- schema: notifications -----
CREATE TABLE notifications.outbox (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  notification_type text NOT NULL,
  channel text NOT NULL,
  source_schema text,
  source_table text,
  source_id uuid,
  subject text,
  body text,
  body_html text,
  template_code text,
  template_variables jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_attempt_at timestamp with time zone,
  sent_at timestamp with time zone,
  read_at timestamp with time zone,
  error_message text,
  provider_message_id text,
  priority text NOT NULL DEFAULT 'normal'::text,
  scheduled_for timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb
);

-- ----- schema: requests -----

CREATE TABLE requests.approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  step_order integer NOT NULL,
  approver_role text NOT NULL,
  approver_id uuid,
  delegated_to_id uuid,
  delegated_at timestamp with time zone,
  delegation_reason text,
  decision text,
  decision_at timestamp with time zone,
  comments text,
  stamp_text text,
  stamp_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE requests.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid,
  actor_id uuid,
  action text NOT NULL,
  field_changed text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE requests.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE requests.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid,
  recipient_id uuid NOT NULL,
  notification_type text NOT NULL,
  channel text NOT NULL,
  subject text,
  body text,
  status text NOT NULL DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  read_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE requests.revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  revised_by uuid NOT NULL,
  revised_at timestamp with time zone NOT NULL DEFAULT now(),
  old_form_data jsonb NOT NULL,
  new_form_data jsonb NOT NULL,
  fields_changed text[],
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'Pendiente_Aceptacion'::text,
  responded_by uuid,
  responded_at timestamp with time zone,
  response_comments text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE requests.sequences (
  seq_type text NOT NULL,
  current_value bigint NOT NULL DEFAULT 0,
  prefix text,
  format text
);

CREATE TABLE requests.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL,
  type_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'Borrador'::text,
  current_step integer NOT NULL DEFAULT 0,
  current_assignee_id uuid,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_supervisor_id uuid,
  priority text NOT NULL DEFAULT 'normal'::text,
  sla_hours integer,
  sla_deadline timestamp with time zone,
  parent_ticket_id uuid,
  tags text[],
  submitted_at timestamp with time zone,
  resolved_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  received_by uuid,
  received_at timestamp with time zone,
  processed_by uuid,
  processed_at timestamp with time zone,
  manual_entry boolean NOT NULL DEFAULT false,
  created_by_hr_admin uuid
);

CREATE TABLE requests.types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  icon text,
  sop_reference text,
  sop_file_url text,
  form_schema jsonb,
  approval_chain_template jsonb,
  allow_supervisor_override boolean NOT NULL DEFAULT false,
  sla_hours integer,
  parent_type_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE requests.watchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  watcher_id uuid NOT NULL,
  watch_reason text,
  notify_on text[] NOT NULL DEFAULT ARRAY['decision'::text, 'comment'::text, 'modification'::text],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ----- schema: hr -----
CREATE TABLE hr.addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  address_type text NOT NULL DEFAULT 'residence'::text,
  street text,
  neighborhood text,
  city text,
  province text,
  postal_code text,
  country text DEFAULT 'Panamá'::text,
  is_current boolean NOT NULL DEFAULT true,
  valid_from date DEFAULT CURRENT_DATE,
  valid_to date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  contact_type text NOT NULL DEFAULT 'personal'::text,
  contact_name text,
  relationship text,
  phone text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  is_emergency boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.employment_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  short_name text NOT NULL,
  sop_reference text,
  has_vacations boolean NOT NULL,
  has_xiii_month boolean NOT NULL,
  has_seniority_premium boolean NOT NULL,
  ss_applies boolean NOT NULL,
  se_applies boolean NOT NULL,
  isr_applies boolean NOT NULL,
  severance_pct numeric(5,2) NOT NULL DEFAULT 0,
  union_fee_pct numeric(5,2) NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.employments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  position_id uuid,
  position_text text,
  department_id uuid,
  department_text text,
  supervisor_id uuid,
  office_id uuid,
  office_text text,
  hire_date date,
  termination_date date,
  termination_reason text,
  hiring_source text,
  app_role text NOT NULL DEFAULT 'employee'::text,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  is_current boolean DEFAULT (valid_to IS NULL),
  created_from text NOT NULL DEFAULT 'manual'::text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  employment_type_id uuid
);

CREATE TABLE hr.invite_code_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invite_code_id uuid NOT NULL,
  ip_address inet NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.invite_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  person_id uuid NOT NULL,
  generated_by uuid,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '30 days'::interval),
  consumed_at timestamp with time zone,
  consumed_by_auth_id uuid,
  invite_method text,
  delivery_target text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  validated_at timestamp with time zone,
  validated_delivery_target_hash text
);
CREATE TABLE hr.leave_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  policy_id uuid NOT NULL,
  accrual_start_date date NOT NULL,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  is_active boolean NOT NULL DEFAULT true,
  source_system text NOT NULL DEFAULT 'humanos'::text,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.leave_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  accrued numeric NOT NULL DEFAULT 0,
  used numeric NOT NULL DEFAULT 0,
  pending numeric NOT NULL DEFAULT 0,
  available numeric NOT NULL DEFAULT 0,
  as_of timestamp with time zone NOT NULL DEFAULT now(),
  source_system text NOT NULL DEFAULT 'humanos'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.leave_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  kind text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  event_date date NOT NULL,
  source_ticket_id uuid,
  reversal_of_id uuid,
  note text,
  source_system text NOT NULL DEFAULT 'humanos'::text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.leave_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'days'::text,
  accrual_method text NOT NULL,
  accrual_frequency text,
  accrual_rate numeric,
  max_balance_cap numeric,
  carryover_limit numeric,
  carryover_expiry_months integer,
  allow_negative_balance boolean NOT NULL DEFAULT false,
  reset_negative_on_carryover boolean NOT NULL DEFAULT false,
  proration_rule text,
  employment_type_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  source_system text NOT NULL DEFAULT 'humanos'::text,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location_type text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  movimientos_location_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.medical_info (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  blood_type text,
  allergies text,
  chronic_conditions text,
  current_medications text,
  doctor_name text,
  doctor_phone text,
  medical_insurance_provider text,
  medical_insurance_number text,
  css_number text,
  notes text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.org_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.people (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid,
  employee_code text,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'Activo'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  national_id text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  preferred_name text,
  date_of_birth date,
  gender text,
  nationality text,
  marital_status text,
  num_dependents integer NOT NULL DEFAULT 0,
  photo_url text,
  created_from text NOT NULL DEFAULT 'manual'::text,
  source_record_id text,
  needs_review boolean NOT NULL DEFAULT false,
  review_notes text
);

CREATE TABLE hr.person_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  source_system text NOT NULL,
  external_id text NOT NULL,
  external_data jsonb,
  last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.personal_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  document_type text NOT NULL,
  document_name text,
  file_url text NOT NULL,
  file_size_bytes integer,
  mime_type text,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  uploaded_by uuid,
  expires_at date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.positions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level integer,
  is_supervisor_position boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE hr.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  notification_email_enabled boolean NOT NULL DEFAULT true,
  notification_in_app_enabled boolean NOT NULL DEFAULT true,
  notification_whatsapp_enabled boolean NOT NULL DEFAULT false,
  notification_sms_enabled boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'es'::text,
  timezone text NOT NULL DEFAULT 'America/Panama'::text,
  dashboard_layout jsonb,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ----- schema: docs -----
CREATE TABLE docs.acknowledgments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sop_version_id uuid NOT NULL,
  person_id uuid NOT NULL,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  signature_method text NOT NULL DEFAULT 'click'::text,
  ip_address text,
  user_agent text,
  notes text
);

CREATE TABLE docs.article_acknowledgments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_version_id uuid NOT NULL,
  person_id uuid NOT NULL,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  signature_method text NOT NULL DEFAULT 'click'::text,
  ip_address inet,
  user_agent text,
  reading_duration_seconds integer,
  notes text
);

CREATE TABLE docs.article_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  parent_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE docs.article_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  version_number integer NOT NULL,
  title text NOT NULL,
  body_markdown text NOT NULL,
  body_html text,
  is_current boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT true,
  published_at timestamp with time zone,
  published_by uuid,
  change_notes text,
  edited_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE docs.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  slug text NOT NULL,
  title text NOT NULL,
  summary text,
  current_version_id uuid,
  is_published boolean NOT NULL DEFAULT false,
  is_required_reading boolean NOT NULL DEFAULT false,
  required_for_departments text[],
  required_for_roles text[],
  visibility text NOT NULL DEFAULT 'all_employees'::text,
  tags text[],
  search_keywords text,
  author_id uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  related_sop_id uuid,
  related_articles uuid[],
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE docs.generated (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_version_id uuid,
  for_person_id uuid NOT NULL,
  generated_by uuid,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  related_ticket_id uuid,
  file_url text NOT NULL,
  file_format text NOT NULL DEFAULT 'pdf'::text,
  rendered_content text,
  variables_used jsonb,
  stamp_data jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE docs.signature_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid,
  required_signers uuid[] NOT NULL,
  signed_by uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  provider text NOT NULL DEFAULT 'stamp'::text,
  external_id text,
  external_url text,
  status text NOT NULL DEFAULT 'pending'::text,
  signed_file_url text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  requested_by uuid,
  completed_at timestamp with time zone,
  expires_at timestamp with time zone,
  notes text
);

CREATE TABLE docs.sop_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sop_id uuid NOT NULL,
  version_number text NOT NULL,
  file_url text NOT NULL,
  gdrive_url text,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  published_by uuid,
  change_notes text,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE docs.sops (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  current_version_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE docs.template_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  version_number text NOT NULL,
  template_content text NOT NULL,
  css_styles text,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  published_by uuid,
  change_notes text,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE docs.templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  template_type text NOT NULL,
  current_version_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ----- schema: workflows -----
CREATE TABLE workflows.instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  process_version_id uuid NOT NULL,
  subject_person_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'iniciado'::text,
  current_step integer NOT NULL DEFAULT 0,
  total_steps integer NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  started_by uuid,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE workflows.process_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL,
  version_number text NOT NULL,
  steps jsonb NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  published_by uuid,
  change_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE workflows.processes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  current_version_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE workflows.step_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL,
  step_id text NOT NULL,
  step_order integer NOT NULL,
  step_name text NOT NULL,
  assigned_to_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  completed_at timestamp with time zone,
  completed_by uuid,
  related_ticket_id uuid,
  related_acknowledgment_id uuid,
  notes text,
  data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ----- schema: learning -----
CREATE TABLE learning.assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL,
  module_id uuid,
  attempt_number integer NOT NULL DEFAULT 1,
  score numeric,
  max_score numeric,
  percentage numeric,
  passing_score numeric,
  passed boolean,
  responses jsonb,
  correct_count integer,
  incorrect_count integer,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_seconds integer,
  graded_by uuid,
  graded_at timestamp with time zone,
  grading_method text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE learning.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL,
  module_id uuid,
  attended_at timestamp with time zone NOT NULL DEFAULT now(),
  duration_minutes integer,
  attendance_method text NOT NULL,
  location_id uuid,
  recorded_by uuid,
  attendance_sheet_file_id uuid,
  video_watch_percent numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE learning.certification_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  certification_id uuid NOT NULL,
  obtained_via text,
  related_enrollment_id uuid,
  issued_date date NOT NULL,
  expiration_date date,
  is_renewable boolean,
  certificate_number text,
  certificate_file_id uuid,
  issuing_body_signatory text,
  status text NOT NULL DEFAULT 'active'::text,
  revocation_reason text,
  renewed_to_id uuid,
  previous_assignment_id uuid,
  is_legally_required boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE learning.certifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  issuing_body text,
  issuing_body_type text,
  validity_months integer,
  is_renewable boolean NOT NULL DEFAULT true,
  is_required_by_law boolean NOT NULL DEFAULT false,
  legal_reference text,
  is_required_for_roles text[],
  is_required_for_locations text[],
  renewal_warning_days integer NOT NULL DEFAULT 60,
  grace_period_days integer NOT NULL DEFAULT 0,
  cost_to_obtain numeric,
  cost_to_renew numeric,
  paid_by text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE learning.course_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  module_order integer NOT NULL,
  name text NOT NULL,
  description text,
  content_type text NOT NULL,
  content_url text,
  content_storage_path text,
  related_sop_id uuid,
  related_article_id uuid,
  estimated_minutes integer,
  is_mandatory boolean NOT NULL DEFAULT true,
  has_assessment boolean NOT NULL DEFAULT false,
  passing_score numeric,
  assessment_questions jsonb,
  max_attempts integer,
  randomize_questions boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE learning.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text,
  name text NOT NULL,
  description text,
  long_description text,
  course_type text NOT NULL,
  delivery_method text,
  duration_hours numeric,
  effort_hours numeric,
  provider_type text,
  provider_name text,
  provider_contact text,
  cost_per_seat numeric,
  is_mandatory boolean NOT NULL DEFAULT false,
  required_for_roles text[],
  required_for_departments text[],
  required_for_locations text[],
  prerequisites uuid[],
  grants_certification_id uuid,
  validity_months integer,
  max_seats_per_session integer,
  min_seats_to_run integer,
  language text DEFAULT 'es'::text,
  available_languages text[] DEFAULT ARRAY['es'::text],
  is_active boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  thumbnail_url text,
  tags text[],
  related_sop_ids uuid[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE learning.enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  course_id uuid NOT NULL,
  enrollment_reason text,
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  enrolled_by uuid,
  session_id uuid,
  due_date date,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  expires_at timestamp with time zone,
  status text NOT NULL DEFAULT 'enrolled'::text,
  progress_percent integer NOT NULL DEFAULT 0,
  final_score numeric,
  final_grade text,
  passed boolean,
  certificate_file_id uuid,
  granted_certification_assignment_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE learning.training_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  record_type text NOT NULL,
  related_enrollment_id uuid,
  related_certification_id uuid,
  related_sop_acknowledgment_id uuid,
  related_article_acknowledgment_id uuid,
  training_name text,
  training_description text,
  duration_hours numeric,
  provider text,
  external_certificate_file_id uuid,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  recorded_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ----- schema: performance -----
CREATE TABLE performance.calibrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL,
  session_name text,
  session_date timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled'::text,
  facilitated_by uuid,
  participants uuid[],
  reviewees_calibrated uuid[],
  decisions jsonb,
  rating_distribution jsonb,
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE performance.cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cycle_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'planned'::text,
  self_evaluation_enabled boolean NOT NULL DEFAULT true,
  supervisor_evaluation_enabled boolean NOT NULL DEFAULT true,
  peer_evaluation_enabled boolean NOT NULL DEFAULT false,
  subordinate_evaluation_enabled boolean NOT NULL DEFAULT false,
  skip_level_enabled boolean NOT NULL DEFAULT false,
  goals_enabled boolean NOT NULL DEFAULT true,
  calibration_required boolean NOT NULL DEFAULT false,
  review_template_id uuid,
  goal_template_id uuid,
  applies_to_departments text[],
  applies_to_roles text[],
  applies_to_persons uuid[],
  self_review_deadline date,
  supervisor_review_deadline date,
  finalization_deadline date,
  closed_at timestamp with time zone,
  closed_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE performance.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  author_id uuid,
  is_anonymous boolean NOT NULL DEFAULT false,
  feedback_type text NOT NULL,
  visibility text NOT NULL DEFAULT 'recipient_supervisor'::text,
  title text,
  body text NOT NULL,
  competency text,
  related_goal_id uuid,
  related_review_id uuid,
  related_project text,
  acknowledged_by_recipient boolean NOT NULL DEFAULT false,
  acknowledged_at timestamp with time zone,
  recipient_response text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE performance.goal_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL,
  update_text text,
  progress_percent integer,
  new_status text,
  blockers text,
  next_steps text,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE performance.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  cycle_id uuid,
  title text NOT NULL,
  description text,
  goal_type text NOT NULL DEFAULT 'individual'::text,
  category text,
  measurement_criteria text,
  target_value text,
  current_value text,
  unit text,
  start_date date,
  target_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'active'::text,
  progress_percent integer NOT NULL DEFAULT 0,
  weight numeric,
  priority text DEFAULT 'normal'::text,
  parent_goal_id uuid,
  contributes_to_company_goal text,
  approved_by_supervisor boolean NOT NULL DEFAULT false,
  approved_at timestamp with time zone,
  approved_by uuid,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE performance.review_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  criteria jsonb NOT NULL,
  rating_scale jsonb NOT NULL,
  applies_to text NOT NULL DEFAULT 'general'::text,
  related_sop_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE performance.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL,
  template_id uuid,
  reviewee_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  review_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_score numeric,
  overall_rating text,
  strengths text,
  areas_improvement text,
  development_actions text,
  reviewer_comments text,
  achievements text,
  challenges text,
  learning_goals text,
  reviewee_acknowledgment_comments text,
  reviewee_disputes boolean NOT NULL DEFAULT false,
  reviewee_dispute_reason text,
  due_date date,
  started_at timestamp with time zone,
  submitted_at timestamp with time zone,
  shared_at timestamp with time zone,
  acknowledged_at timestamp with time zone,
  finalized_at timestamp with time zone,
  finalized_by uuid,
  calibration_id uuid,
  pre_calibration_score numeric,
  post_calibration_score numeric,
  calibration_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);


-- ===== SECTION: CONSTRAINTS (PK / FK / UNIQUE / CHECK) =====

-- ----- schema: hr -----
ALTER TABLE hr.addresses ADD CONSTRAINT addresses_address_type_check CHECK ((address_type = ANY (ARRAY['residence'::text, 'mailing'::text, 'other'::text])));
ALTER TABLE hr.addresses ADD CONSTRAINT addresses_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id) ON DELETE CASCADE;
ALTER TABLE hr.addresses ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);
ALTER TABLE hr.contacts ADD CONSTRAINT contacts_contact_type_check CHECK ((contact_type = ANY (ARRAY['personal'::text, 'emergency'::text, 'spouse'::text, 'parent'::text, 'other'::text])));
ALTER TABLE hr.contacts ADD CONSTRAINT contacts_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id) ON DELETE CASCADE;
ALTER TABLE hr.contacts ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);
ALTER TABLE hr.employment_types ADD CONSTRAINT employment_types_code_key UNIQUE (code);
ALTER TABLE hr.employment_types ADD CONSTRAINT employment_types_pkey PRIMARY KEY (id);
ALTER TABLE hr.employments ADD CONSTRAINT employments_app_role_check CHECK ((app_role = ANY (ARRAY['employee'::text, 'hr_admin'::text, 'president'::text, 'admin'::text])));
ALTER TABLE hr.employments ADD CONSTRAINT employments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE hr.employments ADD CONSTRAINT employments_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr.org_units(id);
ALTER TABLE hr.employments ADD CONSTRAINT employments_employment_type_id_fkey FOREIGN KEY (employment_type_id) REFERENCES hr.employment_types(id) ON DELETE RESTRICT;
ALTER TABLE hr.employments ADD CONSTRAINT employments_office_id_fkey FOREIGN KEY (office_id) REFERENCES hr.locations(id);
ALTER TABLE hr.employments ADD CONSTRAINT employments_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id) ON DELETE CASCADE;
ALTER TABLE hr.employments ADD CONSTRAINT employments_pkey PRIMARY KEY (id);
ALTER TABLE hr.employments ADD CONSTRAINT employments_position_id_fkey FOREIGN KEY (position_id) REFERENCES hr.positions(id);
ALTER TABLE hr.employments ADD CONSTRAINT employments_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES hr.people(id);
ALTER TABLE hr.employments ADD CONSTRAINT no_self_supervisor CHECK (((supervisor_id IS NULL) OR (supervisor_id <> person_id)));
ALTER TABLE hr.employments ADD CONSTRAINT valid_dates CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)));
ALTER TABLE hr.invite_code_attempts ADD CONSTRAINT invite_code_attempts_invite_code_id_fkey FOREIGN KEY (invite_code_id) REFERENCES hr.invite_codes(id) ON DELETE CASCADE;
ALTER TABLE hr.invite_code_attempts ADD CONSTRAINT invite_code_attempts_invite_ip_unique UNIQUE (invite_code_id, ip_address);
ALTER TABLE hr.invite_code_attempts ADD CONSTRAINT invite_code_attempts_pkey PRIMARY KEY (id);
ALTER TABLE hr.invite_codes ADD CONSTRAINT invite_codes_code_check CHECK ((length(code) = 8));
ALTER TABLE hr.invite_codes ADD CONSTRAINT invite_codes_code_key UNIQUE (code);
ALTER TABLE hr.invite_codes ADD CONSTRAINT invite_codes_consumed_by_auth_id_fkey FOREIGN KEY (consumed_by_auth_id) REFERENCES auth.users(id);
ALTER TABLE hr.invite_codes ADD CONSTRAINT invite_codes_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES hr.people(id);
ALTER TABLE hr.invite_codes ADD CONSTRAINT invite_codes_invite_method_check CHECK ((invite_method = ANY (ARRAY['email'::text, 'whatsapp'::text, 'paper'::text, 'in_person'::text])));
ALTER TABLE hr.invite_codes ADD CONSTRAINT invite_codes_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id) ON DELETE CASCADE;
ALTER TABLE hr.invite_codes ADD CONSTRAINT invite_codes_pkey PRIMARY KEY (id);
ALTER TABLE hr.leave_assignments ADD CONSTRAINT leave_assignments_check CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)));
ALTER TABLE hr.leave_assignments ADD CONSTRAINT leave_assignments_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id) ON DELETE CASCADE;
ALTER TABLE hr.leave_assignments ADD CONSTRAINT leave_assignments_pkey PRIMARY KEY (id);
ALTER TABLE hr.leave_assignments ADD CONSTRAINT leave_assignments_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES hr.leave_policies(id) ON DELETE RESTRICT;
ALTER TABLE hr.leave_balances ADD CONSTRAINT leave_balances_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES hr.leave_assignments(id) ON DELETE CASCADE;
ALTER TABLE hr.leave_balances ADD CONSTRAINT leave_balances_assignment_id_key UNIQUE (assignment_id);
ALTER TABLE hr.leave_balances ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);
ALTER TABLE hr.leave_ledger ADD CONSTRAINT leave_ledger_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES hr.leave_assignments(id) ON DELETE RESTRICT;
ALTER TABLE hr.leave_ledger ADD CONSTRAINT leave_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr.people(id) ON DELETE SET NULL;
ALTER TABLE hr.leave_ledger ADD CONSTRAINT leave_ledger_kind_check CHECK ((kind = ANY (ARRAY['accrual'::text, 'grant'::text, 'usage'::text, 'carryover_in'::text, 'carryover_expiry'::text, 'adjustment'::text, 'payout'::text, 'reversal'::text])));
ALTER TABLE hr.leave_ledger ADD CONSTRAINT leave_ledger_pkey PRIMARY KEY (id);
ALTER TABLE hr.leave_ledger ADD CONSTRAINT leave_ledger_reversal_of_id_fkey FOREIGN KEY (reversal_of_id) REFERENCES hr.leave_ledger(id) ON DELETE RESTRICT;
ALTER TABLE hr.leave_ledger ADD CONSTRAINT leave_ledger_source_ticket_id_fkey FOREIGN KEY (source_ticket_id) REFERENCES requests.tickets(id) ON DELETE SET NULL;
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_accrual_frequency_check CHECK ((accrual_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'annual'::text])));
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_accrual_method_check CHECK ((accrual_method = ANY (ARRAY['lump_sum'::text, 'periodic'::text, 'hourly'::text, 'unlimited'::text])));
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_accrual_rate_check CHECK (((accrual_rate IS NULL) OR (accrual_rate >= (0)::numeric)));
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_carryover_expiry_months_check CHECK (((carryover_expiry_months IS NULL) OR (carryover_expiry_months >= 0)));
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_carryover_limit_check CHECK (((carryover_limit IS NULL) OR (carryover_limit >= (0)::numeric)));
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_code_key UNIQUE (code);
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_employment_type_id_fkey FOREIGN KEY (employment_type_id) REFERENCES hr.employment_types(id) ON DELETE RESTRICT;
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_max_balance_cap_check CHECK (((max_balance_cap IS NULL) OR (max_balance_cap >= (0)::numeric)));
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_pkey PRIMARY KEY (id);
ALTER TABLE hr.leave_policies ADD CONSTRAINT leave_policies_unit_check CHECK ((unit = ANY (ARRAY['days'::text, 'hours'::text])));
ALTER TABLE hr.locations ADD CONSTRAINT locations_code_key UNIQUE (code);
ALTER TABLE hr.locations ADD CONSTRAINT locations_location_type_check CHECK ((location_type = ANY (ARRAY['office'::text, 'project'::text, 'workshop'::text, 'remote'::text, 'other'::text])));
ALTER TABLE hr.locations ADD CONSTRAINT locations_name_key UNIQUE (name);
ALTER TABLE hr.locations ADD CONSTRAINT locations_pkey PRIMARY KEY (id);
ALTER TABLE hr.medical_info ADD CONSTRAINT medical_info_blood_type_check CHECK (((blood_type IS NULL) OR (blood_type = ANY (ARRAY['A+'::text, 'A-'::text, 'B+'::text, 'B-'::text, 'AB+'::text, 'AB-'::text, 'O+'::text, 'O-'::text]))));
ALTER TABLE hr.medical_info ADD CONSTRAINT medical_info_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id) ON DELETE CASCADE;
ALTER TABLE hr.medical_info ADD CONSTRAINT medical_info_person_id_key UNIQUE (person_id);
ALTER TABLE hr.medical_info ADD CONSTRAINT medical_info_pkey PRIMARY KEY (id);
ALTER TABLE hr.medical_info ADD CONSTRAINT medical_info_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE hr.org_units ADD CONSTRAINT org_units_code_key UNIQUE (code);
ALTER TABLE hr.org_units ADD CONSTRAINT org_units_name_key UNIQUE (name);
ALTER TABLE hr.org_units ADD CONSTRAINT org_units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES hr.org_units(id);
ALTER TABLE hr.org_units ADD CONSTRAINT org_units_pkey PRIMARY KEY (id);
ALTER TABLE hr.people ADD CONSTRAINT people_auth_id_key UNIQUE (auth_id);
ALTER TABLE hr.people ADD CONSTRAINT people_code_key UNIQUE (employee_code);
ALTER TABLE hr.people ADD CONSTRAINT people_pkey PRIMARY KEY (id);
ALTER TABLE hr.person_sources ADD CONSTRAINT person_sources_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id) ON DELETE CASCADE;
ALTER TABLE hr.person_sources ADD CONSTRAINT person_sources_pkey PRIMARY KEY (id);
ALTER TABLE hr.person_sources ADD CONSTRAINT person_sources_source_system_check CHECK ((source_system = ANY (ARRAY['movimientos'::text, 'excel_samantha'::text, 'payday'::text, 'spectrum'::text, 'manual'::text, 'humanos_v1'::text, 'onboarding'::text])));
ALTER TABLE hr.person_sources ADD CONSTRAINT person_sources_source_system_external_id_key UNIQUE (source_system, external_id);
ALTER TABLE hr.personal_documents ADD CONSTRAINT personal_documents_document_type_check CHECK ((document_type = ANY (ARRAY['cedula_scan'::text, 'pasaporte'::text, 'contrato'::text, 'certificacion'::text, 'diploma'::text, 'licencia_conducir'::text, 'curriculum'::text, 'foto_perfil'::text, 'examen_medico'::text, 'otro'::text])));
ALTER TABLE hr.personal_documents ADD CONSTRAINT personal_documents_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id) ON DELETE CASCADE;
ALTER TABLE hr.personal_documents ADD CONSTRAINT personal_documents_pkey PRIMARY KEY (id);
ALTER TABLE hr.personal_documents ADD CONSTRAINT personal_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);
ALTER TABLE hr.positions ADD CONSTRAINT positions_pkey PRIMARY KEY (id);
ALTER TABLE hr.positions ADD CONSTRAINT positions_title_key UNIQUE (title);
ALTER TABLE hr.user_settings ADD CONSTRAINT user_settings_language_check CHECK ((language = ANY (ARRAY['es'::text, 'en'::text])));
ALTER TABLE hr.user_settings ADD CONSTRAINT user_settings_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id) ON DELETE CASCADE;
ALTER TABLE hr.user_settings ADD CONSTRAINT user_settings_person_id_key UNIQUE (person_id);
ALTER TABLE hr.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);

-- ----- schema: requests -----
ALTER TABLE requests.approvals ADD CONSTRAINT approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES hr.people(id);
ALTER TABLE requests.approvals ADD CONSTRAINT approvals_approver_role_check CHECK ((approver_role = ANY (ARRAY['supervisor'::text, 'hr_admin'::text, 'president'::text, 'specific_person'::text])));
ALTER TABLE requests.approvals ADD CONSTRAINT approvals_decision_check CHECK (((decision IS NULL) OR (decision = ANY (ARRAY['Pendiente'::text, 'Aprobada'::text, 'Rechazada'::text, 'Modificada'::text, 'Devuelta_Info'::text]))));
ALTER TABLE requests.approvals ADD CONSTRAINT approvals_delegated_to_id_fkey FOREIGN KEY (delegated_to_id) REFERENCES hr.people(id);
ALTER TABLE requests.approvals ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);
ALTER TABLE requests.approvals ADD CONSTRAINT approvals_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES requests.tickets(id) ON DELETE CASCADE;
ALTER TABLE requests.approvals ADD CONSTRAINT approvals_ticket_id_step_order_key UNIQUE (ticket_id, step_order);
ALTER TABLE requests.audit_log ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES hr.people(id);
ALTER TABLE requests.audit_log ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
ALTER TABLE requests.audit_log ADD CONSTRAINT audit_log_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES requests.tickets(id) ON DELETE CASCADE;
ALTER TABLE requests.comments ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES hr.people(id);
ALTER TABLE requests.comments ADD CONSTRAINT comments_pkey PRIMARY KEY (id);
ALTER TABLE requests.comments ADD CONSTRAINT comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES requests.tickets(id) ON DELETE CASCADE;
ALTER TABLE requests.notifications ADD CONSTRAINT notifications_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'whatsapp'::text, 'in_app'::text, 'sms'::text])));
ALTER TABLE requests.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE requests.notifications ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES hr.people(id);
ALTER TABLE requests.notifications ADD CONSTRAINT notifications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'read'::text])));
ALTER TABLE requests.notifications ADD CONSTRAINT notifications_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES requests.tickets(id) ON DELETE CASCADE;
ALTER TABLE requests.revisions ADD CONSTRAINT revisions_pkey PRIMARY KEY (id);
ALTER TABLE requests.revisions ADD CONSTRAINT revisions_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES hr.people(id);
ALTER TABLE requests.revisions ADD CONSTRAINT revisions_revised_by_fkey FOREIGN KEY (revised_by) REFERENCES hr.people(id);
ALTER TABLE requests.revisions ADD CONSTRAINT revisions_status_check CHECK ((status = ANY (ARRAY['Pendiente_Aceptacion'::text, 'Aceptada'::text, 'Rechazada'::text])));
ALTER TABLE requests.revisions ADD CONSTRAINT revisions_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES requests.tickets(id) ON DELETE CASCADE;
ALTER TABLE requests.sequences ADD CONSTRAINT sequences_pkey PRIMARY KEY (seq_type);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_created_by_hr_admin_fkey FOREIGN KEY (created_by_hr_admin) REFERENCES hr.people(id);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_current_assignee_id_fkey FOREIGN KEY (current_assignee_id) REFERENCES hr.people(id);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_parent_ticket_id_fkey FOREIGN KEY (parent_ticket_id) REFERENCES requests.tickets(id);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES hr.people(id);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_received_by_fkey FOREIGN KEY (received_by) REFERENCES hr.people(id);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES hr.people(id);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_selected_supervisor_id_fkey FOREIGN KEY (selected_supervisor_id) REFERENCES hr.people(id);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_status_check CHECK ((status = ANY (ARRAY['Borrador'::text, 'Enviada'::text, 'En_Revision'::text, 'Devuelta_Modificacion'::text, 'Aprobada'::text, 'Rechazada'::text, 'Completada'::text, 'Cancelada'::text])));
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);
ALTER TABLE requests.tickets ADD CONSTRAINT tickets_type_id_fkey FOREIGN KEY (type_id) REFERENCES requests.types(id);
ALTER TABLE requests.types ADD CONSTRAINT types_code_key UNIQUE (code);
ALTER TABLE requests.types ADD CONSTRAINT types_parent_type_id_fkey FOREIGN KEY (parent_type_id) REFERENCES requests.types(id);
ALTER TABLE requests.types ADD CONSTRAINT types_pkey PRIMARY KEY (id);
ALTER TABLE requests.watchers ADD CONSTRAINT watchers_pkey PRIMARY KEY (id);
ALTER TABLE requests.watchers ADD CONSTRAINT watchers_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES requests.tickets(id) ON DELETE CASCADE;
ALTER TABLE requests.watchers ADD CONSTRAINT watchers_ticket_id_watcher_id_key UNIQUE (ticket_id, watcher_id);
ALTER TABLE requests.watchers ADD CONSTRAINT watchers_watcher_id_fkey FOREIGN KEY (watcher_id) REFERENCES hr.people(id);

-- ----- schema: docs -----
ALTER TABLE docs.acknowledgments ADD CONSTRAINT acknowledgments_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id);
ALTER TABLE docs.acknowledgments ADD CONSTRAINT acknowledgments_pkey PRIMARY KEY (id);
ALTER TABLE docs.acknowledgments ADD CONSTRAINT acknowledgments_signature_method_check CHECK ((signature_method = ANY (ARRAY['click'::text, 'digital_stamp'::text, 'signed_pdf'::text])));
ALTER TABLE docs.acknowledgments ADD CONSTRAINT acknowledgments_sop_version_id_fkey FOREIGN KEY (sop_version_id) REFERENCES docs.sop_versions(id);
ALTER TABLE docs.acknowledgments ADD CONSTRAINT acknowledgments_sop_version_id_person_id_key UNIQUE (sop_version_id, person_id);
ALTER TABLE docs.article_acknowledgments ADD CONSTRAINT article_acknowledgments_article_version_id_fkey FOREIGN KEY (article_version_id) REFERENCES docs.article_versions(id);
ALTER TABLE docs.article_acknowledgments ADD CONSTRAINT article_acknowledgments_article_version_id_person_id_key UNIQUE (article_version_id, person_id);
ALTER TABLE docs.article_acknowledgments ADD CONSTRAINT article_acknowledgments_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id);
ALTER TABLE docs.article_acknowledgments ADD CONSTRAINT article_acknowledgments_pkey PRIMARY KEY (id);
ALTER TABLE docs.article_acknowledgments ADD CONSTRAINT article_acknowledgments_signature_method_check CHECK ((signature_method = ANY (ARRAY['click'::text, 'digital_stamp'::text, 'signed_pdf'::text])));
ALTER TABLE docs.article_categories ADD CONSTRAINT article_categories_name_key UNIQUE (name);
ALTER TABLE docs.article_categories ADD CONSTRAINT article_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES docs.article_categories(id);
ALTER TABLE docs.article_categories ADD CONSTRAINT article_categories_pkey PRIMARY KEY (id);
ALTER TABLE docs.article_categories ADD CONSTRAINT article_categories_slug_key UNIQUE (slug);
ALTER TABLE docs.article_versions ADD CONSTRAINT article_versions_article_id_fkey FOREIGN KEY (article_id) REFERENCES docs.articles(id) ON DELETE CASCADE;
ALTER TABLE docs.article_versions ADD CONSTRAINT article_versions_article_id_version_number_key UNIQUE (article_id, version_number);
ALTER TABLE docs.article_versions ADD CONSTRAINT article_versions_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES hr.people(id);
ALTER TABLE docs.article_versions ADD CONSTRAINT article_versions_pkey PRIMARY KEY (id);
ALTER TABLE docs.article_versions ADD CONSTRAINT article_versions_published_by_fkey FOREIGN KEY (published_by) REFERENCES hr.people(id);
ALTER TABLE docs.articles ADD CONSTRAINT articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES hr.people(id);
ALTER TABLE docs.articles ADD CONSTRAINT articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES docs.article_categories(id);
ALTER TABLE docs.articles ADD CONSTRAINT articles_current_version_fkey FOREIGN KEY (current_version_id) REFERENCES docs.article_versions(id);
ALTER TABLE docs.articles ADD CONSTRAINT articles_pkey PRIMARY KEY (id);
ALTER TABLE docs.articles ADD CONSTRAINT articles_related_sop_id_fkey FOREIGN KEY (related_sop_id) REFERENCES docs.sops(id);
ALTER TABLE docs.articles ADD CONSTRAINT articles_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES hr.people(id);
ALTER TABLE docs.articles ADD CONSTRAINT articles_slug_key UNIQUE (slug);
ALTER TABLE docs.articles ADD CONSTRAINT articles_visibility_check CHECK ((visibility = ANY (ARRAY['all_employees'::text, 'hr_only'::text, 'managers_plus'::text, 'specific_departments'::text, 'specific_roles'::text])));
ALTER TABLE docs.generated ADD CONSTRAINT generated_file_format_check CHECK ((file_format = ANY (ARRAY['pdf'::text, 'docx'::text, 'html'::text])));
ALTER TABLE docs.generated ADD CONSTRAINT generated_for_person_id_fkey FOREIGN KEY (for_person_id) REFERENCES hr.people(id);
ALTER TABLE docs.generated ADD CONSTRAINT generated_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES hr.people(id);
ALTER TABLE docs.generated ADD CONSTRAINT generated_pkey PRIMARY KEY (id);
ALTER TABLE docs.generated ADD CONSTRAINT generated_related_ticket_id_fkey FOREIGN KEY (related_ticket_id) REFERENCES requests.tickets(id);
ALTER TABLE docs.generated ADD CONSTRAINT generated_template_version_id_fkey FOREIGN KEY (template_version_id) REFERENCES docs.template_versions(id);
ALTER TABLE docs.signature_requests ADD CONSTRAINT signature_requests_document_id_fkey FOREIGN KEY (document_id) REFERENCES docs.generated(id);
ALTER TABLE docs.signature_requests ADD CONSTRAINT signature_requests_pkey PRIMARY KEY (id);
ALTER TABLE docs.signature_requests ADD CONSTRAINT signature_requests_provider_check CHECK ((provider = ANY (ARRAY['documenso'::text, 'docusign'::text, 'manual'::text, 'stamp'::text])));
ALTER TABLE docs.signature_requests ADD CONSTRAINT signature_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES hr.people(id);
ALTER TABLE docs.signature_requests ADD CONSTRAINT signature_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'partially_signed'::text, 'completed'::text, 'expired'::text, 'cancelled'::text])));
ALTER TABLE docs.sop_versions ADD CONSTRAINT sop_versions_pkey PRIMARY KEY (id);
ALTER TABLE docs.sop_versions ADD CONSTRAINT sop_versions_published_by_fkey FOREIGN KEY (published_by) REFERENCES hr.people(id);
ALTER TABLE docs.sop_versions ADD CONSTRAINT sop_versions_sop_id_fkey FOREIGN KEY (sop_id) REFERENCES docs.sops(id) ON DELETE CASCADE;
ALTER TABLE docs.sop_versions ADD CONSTRAINT sop_versions_sop_id_version_number_key UNIQUE (sop_id, version_number);
ALTER TABLE docs.sops ADD CONSTRAINT sops_category_check CHECK ((category = ANY (ARRAY['manual'::text, 'documento'::text, 'instructivo'::text, 'procedimiento'::text, 'formulario'::text])));
ALTER TABLE docs.sops ADD CONSTRAINT sops_code_key UNIQUE (code);
ALTER TABLE docs.sops ADD CONSTRAINT sops_current_version_fkey FOREIGN KEY (current_version_id) REFERENCES docs.sop_versions(id);
ALTER TABLE docs.sops ADD CONSTRAINT sops_pkey PRIMARY KEY (id);
ALTER TABLE docs.template_versions ADD CONSTRAINT template_versions_pkey PRIMARY KEY (id);
ALTER TABLE docs.template_versions ADD CONSTRAINT template_versions_published_by_fkey FOREIGN KEY (published_by) REFERENCES hr.people(id);
ALTER TABLE docs.template_versions ADD CONSTRAINT template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES docs.templates(id) ON DELETE CASCADE;
ALTER TABLE docs.template_versions ADD CONSTRAINT template_versions_template_id_version_number_key UNIQUE (template_id, version_number);
ALTER TABLE docs.templates ADD CONSTRAINT templates_code_key UNIQUE (code);
ALTER TABLE docs.templates ADD CONSTRAINT templates_current_version_fkey FOREIGN KEY (current_version_id) REFERENCES docs.template_versions(id);
ALTER TABLE docs.templates ADD CONSTRAINT templates_pkey PRIMARY KEY (id);
ALTER TABLE docs.templates ADD CONSTRAINT templates_template_type_check CHECK ((template_type = ANY (ARRAY['carta_trabajo'::text, 'constancia'::text, 'certificacion_laboral'::text, 'memo_amonestacion'::text, 'liquidacion'::text, 'aviso_descuento'::text, 'recibo_prestamo'::text, 'constancia_no_adeudo'::text, 'otro'::text])));

-- ----- schema: workflows -----
ALTER TABLE workflows.instances ADD CONSTRAINT instances_pkey PRIMARY KEY (id);
ALTER TABLE workflows.instances ADD CONSTRAINT instances_process_version_id_fkey FOREIGN KEY (process_version_id) REFERENCES workflows.process_versions(id);
ALTER TABLE workflows.instances ADD CONSTRAINT instances_started_by_fkey FOREIGN KEY (started_by) REFERENCES hr.people(id);
ALTER TABLE workflows.instances ADD CONSTRAINT instances_status_check CHECK ((status = ANY (ARRAY['iniciado'::text, 'en_progreso'::text, 'completado'::text, 'cancelado'::text, 'pausado'::text])));
ALTER TABLE workflows.instances ADD CONSTRAINT instances_subject_person_id_fkey FOREIGN KEY (subject_person_id) REFERENCES hr.people(id);
ALTER TABLE workflows.process_versions ADD CONSTRAINT process_versions_pkey PRIMARY KEY (id);
ALTER TABLE workflows.process_versions ADD CONSTRAINT process_versions_process_id_fkey FOREIGN KEY (process_id) REFERENCES workflows.processes(id) ON DELETE CASCADE;
ALTER TABLE workflows.process_versions ADD CONSTRAINT process_versions_process_id_version_number_key UNIQUE (process_id, version_number);
ALTER TABLE workflows.process_versions ADD CONSTRAINT process_versions_published_by_fkey FOREIGN KEY (published_by) REFERENCES hr.people(id);
ALTER TABLE workflows.processes ADD CONSTRAINT processes_code_key UNIQUE (code);
ALTER TABLE workflows.processes ADD CONSTRAINT processes_current_version_fkey FOREIGN KEY (current_version_id) REFERENCES workflows.process_versions(id);
ALTER TABLE workflows.processes ADD CONSTRAINT processes_pkey PRIMARY KEY (id);
ALTER TABLE workflows.step_assignments ADD CONSTRAINT step_assignments_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES hr.people(id);
ALTER TABLE workflows.step_assignments ADD CONSTRAINT step_assignments_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES hr.people(id);
ALTER TABLE workflows.step_assignments ADD CONSTRAINT step_assignments_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES workflows.instances(id) ON DELETE CASCADE;
ALTER TABLE workflows.step_assignments ADD CONSTRAINT step_assignments_pkey PRIMARY KEY (id);
ALTER TABLE workflows.step_assignments ADD CONSTRAINT step_assignments_related_acknowledgment_id_fkey FOREIGN KEY (related_acknowledgment_id) REFERENCES docs.acknowledgments(id);
ALTER TABLE workflows.step_assignments ADD CONSTRAINT step_assignments_related_ticket_id_fkey FOREIGN KEY (related_ticket_id) REFERENCES requests.tickets(id);
ALTER TABLE workflows.step_assignments ADD CONSTRAINT step_assignments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text, 'failed'::text])));

-- ----- schema: learning -----
ALTER TABLE learning.assessments ADD CONSTRAINT assessments_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES learning.enrollments(id) ON DELETE CASCADE;
ALTER TABLE learning.assessments ADD CONSTRAINT assessments_enrollment_id_module_id_attempt_number_key UNIQUE (enrollment_id, module_id, attempt_number);
ALTER TABLE learning.assessments ADD CONSTRAINT assessments_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES hr.people(id);
ALTER TABLE learning.assessments ADD CONSTRAINT assessments_grading_method_check CHECK ((grading_method = ANY (ARRAY['automatic'::text, 'manual'::text, 'hybrid'::text])));
ALTER TABLE learning.assessments ADD CONSTRAINT assessments_module_id_fkey FOREIGN KEY (module_id) REFERENCES learning.course_modules(id);
ALTER TABLE learning.assessments ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);
ALTER TABLE learning.attendance ADD CONSTRAINT attendance_attendance_method_check CHECK ((attendance_method = ANY (ARRAY['in_person_signed'::text, 'in_person_qr_scan'::text, 'in_person_facilitator_confirmed'::text, 'video_watched'::text, 'webinar_joined'::text, 'self_reported'::text, 'sop_acknowledged'::text])));
ALTER TABLE learning.attendance ADD CONSTRAINT attendance_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES learning.enrollments(id) ON DELETE CASCADE;
ALTER TABLE learning.attendance ADD CONSTRAINT attendance_location_id_fkey FOREIGN KEY (location_id) REFERENCES hr.locations(id);
ALTER TABLE learning.attendance ADD CONSTRAINT attendance_module_id_fkey FOREIGN KEY (module_id) REFERENCES learning.course_modules(id);
ALTER TABLE learning.attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);
ALTER TABLE learning.attendance ADD CONSTRAINT attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES hr.people(id);
ALTER TABLE learning.certification_assignments ADD CONSTRAINT certification_assignments_certification_id_fkey FOREIGN KEY (certification_id) REFERENCES learning.certifications(id);
ALTER TABLE learning.certification_assignments ADD CONSTRAINT certification_assignments_obtained_via_check CHECK ((obtained_via = ANY (ARRAY['course_completion'::text, 'external_exam'::text, 'transferred'::text, 'grandfathered'::text, 'manual_entry'::text])));
ALTER TABLE learning.certification_assignments ADD CONSTRAINT certification_assignments_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id);
ALTER TABLE learning.certification_assignments ADD CONSTRAINT certification_assignments_pkey PRIMARY KEY (id);
ALTER TABLE learning.certification_assignments ADD CONSTRAINT certification_assignments_previous_assignment_id_fkey FOREIGN KEY (previous_assignment_id) REFERENCES learning.certification_assignments(id);
ALTER TABLE learning.certification_assignments ADD CONSTRAINT certification_assignments_related_enrollment_id_fkey FOREIGN KEY (related_enrollment_id) REFERENCES learning.enrollments(id);
ALTER TABLE learning.certification_assignments ADD CONSTRAINT certification_assignments_renewed_to_id_fkey FOREIGN KEY (renewed_to_id) REFERENCES learning.certification_assignments(id);
ALTER TABLE learning.certification_assignments ADD CONSTRAINT certification_assignments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expiring_soon'::text, 'expired'::text, 'revoked'::text, 'superseded'::text, 'on_hold'::text])));
ALTER TABLE learning.certifications ADD CONSTRAINT certifications_code_key UNIQUE (code);
ALTER TABLE learning.certifications ADD CONSTRAINT certifications_issuing_body_type_check CHECK ((issuing_body_type = ANY (ARRAY['internal_iconsa'::text, 'external_private'::text, 'government'::text, 'industry_association'::text, 'union'::text])));
ALTER TABLE learning.certifications ADD CONSTRAINT certifications_paid_by_check CHECK ((paid_by = ANY (ARRAY['employee'::text, 'employer'::text, 'split'::text])));
ALTER TABLE learning.certifications ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);
ALTER TABLE learning.course_modules ADD CONSTRAINT course_modules_content_type_check CHECK ((content_type = ANY (ARRAY['video'::text, 'reading_material'::text, 'pdf'::text, 'quiz'::text, 'in_person_session'::text, 'practical_exercise'::text, 'sop_reading'::text, 'external_link'::text, 'scorm_package'::text, 'live_webinar'::text])));
ALTER TABLE learning.course_modules ADD CONSTRAINT course_modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES learning.courses(id) ON DELETE CASCADE;
ALTER TABLE learning.course_modules ADD CONSTRAINT course_modules_pkey PRIMARY KEY (id);
ALTER TABLE learning.course_modules ADD CONSTRAINT course_modules_related_article_id_fkey FOREIGN KEY (related_article_id) REFERENCES docs.articles(id);
ALTER TABLE learning.course_modules ADD CONSTRAINT course_modules_related_sop_id_fkey FOREIGN KEY (related_sop_id) REFERENCES docs.sops(id);
ALTER TABLE learning.courses ADD CONSTRAINT courses_code_key UNIQUE (code);
ALTER TABLE learning.courses ADD CONSTRAINT courses_course_type_check CHECK ((course_type = ANY (ARRAY['induction'::text, 'safety_ssoa'::text, 'technical'::text, 'soft_skills'::text, 'compliance'::text, 'certification_prep'::text, 'refresher'::text, 'orientation'::text, 'leadership'::text, 'language'::text, 'product'::text])));
ALTER TABLE learning.courses ADD CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr.people(id);
ALTER TABLE learning.courses ADD CONSTRAINT courses_delivery_method_check CHECK ((delivery_method = ANY (ARRAY['in_person'::text, 'online_self_paced'::text, 'online_live'::text, 'hybrid'::text, 'on_the_job'::text])));
ALTER TABLE learning.courses ADD CONSTRAINT courses_grants_cert_fkey FOREIGN KEY (grants_certification_id) REFERENCES learning.certifications(id);
ALTER TABLE learning.courses ADD CONSTRAINT courses_pkey PRIMARY KEY (id);
ALTER TABLE learning.courses ADD CONSTRAINT courses_provider_type_check CHECK ((provider_type = ANY (ARRAY['internal'::text, 'external'::text, 'self_study'::text])));
ALTER TABLE learning.enrollments ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES learning.courses(id);
ALTER TABLE learning.enrollments ADD CONSTRAINT enrollments_enrolled_by_fkey FOREIGN KEY (enrolled_by) REFERENCES hr.people(id);
ALTER TABLE learning.enrollments ADD CONSTRAINT enrollments_enrollment_reason_check CHECK ((enrollment_reason = ANY (ARRAY['mandatory_by_role'::text, 'mandatory_by_law'::text, 'self_enrolled'::text, 'assigned_by_supervisor'::text, 'assigned_by_hr'::text, 'onboarding'::text, 'certification_renewal'::text, 'remedial'::text, 'development_goal'::text])));
ALTER TABLE learning.enrollments ADD CONSTRAINT enrollments_granted_cert_fkey FOREIGN KEY (granted_certification_assignment_id) REFERENCES learning.certification_assignments(id);
ALTER TABLE learning.enrollments ADD CONSTRAINT enrollments_person_id_course_id_enrolled_at_key UNIQUE (person_id, course_id, enrolled_at);
ALTER TABLE learning.enrollments ADD CONSTRAINT enrollments_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id);
ALTER TABLE learning.enrollments ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);
ALTER TABLE learning.enrollments ADD CONSTRAINT enrollments_progress_percent_check CHECK (((progress_percent >= 0) AND (progress_percent <= 100)));
ALTER TABLE learning.enrollments ADD CONSTRAINT enrollments_status_check CHECK ((status = ANY (ARRAY['enrolled'::text, 'in_progress'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'expired'::text, 'waived'::text, 'no_show'::text])));
ALTER TABLE learning.training_records ADD CONSTRAINT training_records_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id);
ALTER TABLE learning.training_records ADD CONSTRAINT training_records_pkey PRIMARY KEY (id);
ALTER TABLE learning.training_records ADD CONSTRAINT training_records_record_type_check CHECK ((record_type = ANY (ARRAY['enrollment'::text, 'attendance'::text, 'certification'::text, 'sop_acknowledgment'::text, 'article_acknowledgment'::text, 'external_training'::text, 'on_the_job'::text])));
ALTER TABLE learning.training_records ADD CONSTRAINT training_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES hr.people(id);
ALTER TABLE learning.training_records ADD CONSTRAINT training_records_related_article_acknowledgment_id_fkey FOREIGN KEY (related_article_acknowledgment_id) REFERENCES docs.article_acknowledgments(id);
ALTER TABLE learning.training_records ADD CONSTRAINT training_records_related_certification_id_fkey FOREIGN KEY (related_certification_id) REFERENCES learning.certification_assignments(id);
ALTER TABLE learning.training_records ADD CONSTRAINT training_records_related_enrollment_id_fkey FOREIGN KEY (related_enrollment_id) REFERENCES learning.enrollments(id);
ALTER TABLE learning.training_records ADD CONSTRAINT training_records_related_sop_acknowledgment_id_fkey FOREIGN KEY (related_sop_acknowledgment_id) REFERENCES docs.acknowledgments(id);

-- ----- schema: performance -----
ALTER TABLE performance.calibrations ADD CONSTRAINT calibrations_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES performance.cycles(id);
ALTER TABLE performance.calibrations ADD CONSTRAINT calibrations_facilitated_by_fkey FOREIGN KEY (facilitated_by) REFERENCES hr.people(id);
ALTER TABLE performance.calibrations ADD CONSTRAINT calibrations_pkey PRIMARY KEY (id);
ALTER TABLE performance.calibrations ADD CONSTRAINT calibrations_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])));
ALTER TABLE performance.cycles ADD CONSTRAINT cycles_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES hr.people(id);
ALTER TABLE performance.cycles ADD CONSTRAINT cycles_cycle_type_check CHECK ((cycle_type = ANY (ARRAY['semestral'::text, 'anual'::text, 'trimestral'::text, 'mensual'::text, 'project_end'::text, 'probation'::text, 'continuous'::text, 'adhoc'::text])));
ALTER TABLE performance.cycles ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);
ALTER TABLE performance.cycles ADD CONSTRAINT cycles_review_template_fkey FOREIGN KEY (review_template_id) REFERENCES performance.review_templates(id);
ALTER TABLE performance.cycles ADD CONSTRAINT cycles_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'open'::text, 'in_review'::text, 'in_calibration'::text, 'closed'::text, 'cancelled'::text])));
ALTER TABLE performance.cycles ADD CONSTRAINT valid_cycle_dates CHECK ((period_end >= period_start));
ALTER TABLE performance.feedback ADD CONSTRAINT feedback_author_id_fkey FOREIGN KEY (author_id) REFERENCES hr.people(id);
ALTER TABLE performance.feedback ADD CONSTRAINT feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['continuous'::text, 'kudos'::text, 'constructive'::text, 'request_for_feedback'::text, '360_response'::text, 'praise'::text, 'concern'::text])));
ALTER TABLE performance.feedback ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);
ALTER TABLE performance.feedback ADD CONSTRAINT feedback_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES hr.people(id);
ALTER TABLE performance.feedback ADD CONSTRAINT feedback_related_goal_id_fkey FOREIGN KEY (related_goal_id) REFERENCES performance.goals(id);
ALTER TABLE performance.feedback ADD CONSTRAINT feedback_related_review_id_fkey FOREIGN KEY (related_review_id) REFERENCES performance.reviews(id);
ALTER TABLE performance.feedback ADD CONSTRAINT feedback_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'recipient_only'::text, 'recipient_supervisor'::text, 'public'::text, 'hr_only'::text])));
ALTER TABLE performance.goal_updates ADD CONSTRAINT goal_updates_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES performance.goals(id) ON DELETE CASCADE;
ALTER TABLE performance.goal_updates ADD CONSTRAINT goal_updates_pkey PRIMARY KEY (id);
ALTER TABLE performance.goal_updates ADD CONSTRAINT goal_updates_progress_percent_check CHECK (((progress_percent >= 0) AND (progress_percent <= 100)));
ALTER TABLE performance.goal_updates ADD CONSTRAINT goal_updates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES hr.people(id);
ALTER TABLE performance.goals ADD CONSTRAINT goals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES hr.people(id);
ALTER TABLE performance.goals ADD CONSTRAINT goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr.people(id);
ALTER TABLE performance.goals ADD CONSTRAINT goals_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES performance.cycles(id);
ALTER TABLE performance.goals ADD CONSTRAINT goals_goal_type_check CHECK ((goal_type = ANY (ARRAY['individual'::text, 'team'::text, 'company'::text, 'development'::text, 'okr'::text, 'stretch'::text])));
ALTER TABLE performance.goals ADD CONSTRAINT goals_parent_goal_id_fkey FOREIGN KEY (parent_goal_id) REFERENCES performance.goals(id);
ALTER TABLE performance.goals ADD CONSTRAINT goals_person_id_fkey FOREIGN KEY (person_id) REFERENCES hr.people(id);
ALTER TABLE performance.goals ADD CONSTRAINT goals_pkey PRIMARY KEY (id);
ALTER TABLE performance.goals ADD CONSTRAINT goals_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text])));
ALTER TABLE performance.goals ADD CONSTRAINT goals_progress_percent_check CHECK (((progress_percent >= 0) AND (progress_percent <= 100)));
ALTER TABLE performance.goals ADD CONSTRAINT goals_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'on_track'::text, 'at_risk'::text, 'off_track'::text, 'completed'::text, 'cancelled'::text, 'deferred'::text, 'overdue'::text])));
ALTER TABLE performance.review_templates ADD CONSTRAINT review_templates_applies_to_check CHECK ((applies_to = ANY (ARRAY['general'::text, 'office'::text, 'field'::text, 'manager'::text, 'specific_role'::text])));
ALTER TABLE performance.review_templates ADD CONSTRAINT review_templates_code_key UNIQUE (code);
ALTER TABLE performance.review_templates ADD CONSTRAINT review_templates_pkey PRIMARY KEY (id);
ALTER TABLE performance.review_templates ADD CONSTRAINT review_templates_related_sop_id_fkey FOREIGN KEY (related_sop_id) REFERENCES docs.sops(id);
ALTER TABLE performance.reviews ADD CONSTRAINT no_self_review_unless_self_type CHECK (((review_type = 'self'::text) OR (reviewer_id <> reviewee_id)));
ALTER TABLE performance.reviews ADD CONSTRAINT reviews_calibration_fkey FOREIGN KEY (calibration_id) REFERENCES performance.calibrations(id);
ALTER TABLE performance.reviews ADD CONSTRAINT reviews_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES performance.cycles(id);
ALTER TABLE performance.reviews ADD CONSTRAINT reviews_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES hr.people(id);
ALTER TABLE performance.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE performance.reviews ADD CONSTRAINT reviews_review_type_check CHECK ((review_type = ANY (ARRAY['self'::text, 'supervisor'::text, 'peer'::text, 'subordinate'::text, 'skip_level'::text])));
ALTER TABLE performance.reviews ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES hr.people(id);
ALTER TABLE performance.reviews ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES hr.people(id);
ALTER TABLE performance.reviews ADD CONSTRAINT reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'submitted'::text, 'shared_with_reviewee'::text, 'acknowledged'::text, 'finalized'::text, 'disputed'::text, 'cancelled'::text])));
ALTER TABLE performance.reviews ADD CONSTRAINT reviews_template_id_fkey FOREIGN KEY (template_id) REFERENCES performance.review_templates(id);

-- ----- schema: audit -----
ALTER TABLE audit.log ADD CONSTRAINT log_action_check CHECK ((action = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text, 'restore'::text, 'custom'::text, 'login'::text, 'logout'::text, 'export'::text, 'view_sensitive'::text])));
ALTER TABLE audit.log ADD CONSTRAINT log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES hr.people(id);
ALTER TABLE audit.log ADD CONSTRAINT log_pkey PRIMARY KEY (id);

-- ----- schema: files -----
ALTER TABLE files.uploads ADD CONSTRAINT files_uploads_category_check CHECK (((category IS NULL) OR (category = ANY (ARRAY['attachment'::text, 'evidence'::text, 'signed_document'::text, 'avatar'::text, 'profile_photo'::text, 'certificate_scan'::text, 'payslip_proof'::text, 'original_paper_form'::text, 'medical_document'::text, 'contract_document'::text, 'incident_photo'::text, 'identification_document'::text, 'other'::text]))));
ALTER TABLE files.uploads ADD CONSTRAINT uploads_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES hr.people(id);
ALTER TABLE files.uploads ADD CONSTRAINT uploads_pkey PRIMARY KEY (id);
ALTER TABLE files.uploads ADD CONSTRAINT uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES hr.people(id);

-- ----- schema: notifications -----
ALTER TABLE notifications.outbox ADD CONSTRAINT outbox_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'whatsapp'::text, 'in_app'::text, 'sms'::text, 'push'::text])));
ALTER TABLE notifications.outbox ADD CONSTRAINT outbox_pkey PRIMARY KEY (id);
ALTER TABLE notifications.outbox ADD CONSTRAINT outbox_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));
ALTER TABLE notifications.outbox ADD CONSTRAINT outbox_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES hr.people(id);
ALTER TABLE notifications.outbox ADD CONSTRAINT outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'sent'::text, 'failed'::text, 'read'::text, 'dismissed'::text, 'cancelled'::text])));


-- ===== SECTION: INDEXES (excluding constraint-backing) =====

-- ----- schema: hr -----
CREATE INDEX idx_addresses_current ON hr.addresses USING btree (person_id) WHERE (is_current = true);
CREATE INDEX idx_addresses_person ON hr.addresses USING btree (person_id);
CREATE INDEX idx_contacts_emergency ON hr.contacts USING btree (person_id) WHERE (is_emergency = true);
CREATE INDEX idx_contacts_person ON hr.contacts USING btree (person_id);
CREATE INDEX idx_employments_app_role ON hr.employments USING btree (app_role) WHERE (is_current = true);
CREATE INDEX idx_employments_current ON hr.employments USING btree (person_id) WHERE (is_current = true);
CREATE INDEX idx_employments_department ON hr.employments USING btree (department_id);
CREATE INDEX idx_employments_employment_type_id ON hr.employments USING btree (employment_type_id);
CREATE UNIQUE INDEX idx_employments_one_current ON hr.employments USING btree (person_id) WHERE (is_current = true);
CREATE INDEX idx_employments_person ON hr.employments USING btree (person_id);
CREATE INDEX idx_employments_supervisor ON hr.employments USING btree (supervisor_id);
CREATE INDEX idx_invite_code_attempts_invite_ip ON hr.invite_code_attempts USING btree (invite_code_id, ip_address);
CREATE INDEX idx_invite_codes_code_unconsumed ON hr.invite_codes USING btree (code) WHERE (consumed_at IS NULL);
CREATE INDEX idx_invite_codes_person_id ON hr.invite_codes USING btree (person_id);
CREATE INDEX idx_leave_assignments_person ON hr.leave_assignments USING btree (person_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_leave_assignment_active ON hr.leave_assignments USING btree (person_id, policy_id) WHERE (is_active AND (deleted_at IS NULL));
CREATE INDEX idx_leave_ledger_assignment ON hr.leave_ledger USING btree (assignment_id, event_date);
CREATE INDEX idx_leave_policies_active ON hr.leave_policies USING btree (is_active) WHERE (deleted_at IS NULL);
CREATE INDEX idx_medical_person ON hr.medical_info USING btree (person_id);
CREATE INDEX idx_people_auth_id ON hr.people USING btree (auth_id) WHERE (auth_id IS NOT NULL);
CREATE INDEX idx_people_employee_code ON hr.people USING btree (employee_code) WHERE (employee_code IS NOT NULL);
CREATE INDEX idx_people_national_id ON hr.people USING btree (national_id) WHERE (national_id IS NOT NULL);
CREATE INDEX idx_people_needs_review ON hr.people USING btree (needs_review) WHERE (needs_review = true);
CREATE INDEX idx_people_status ON hr.people USING btree (status);
CREATE INDEX idx_person_sources_person ON hr.person_sources USING btree (person_id);
CREATE INDEX idx_personal_docs_expiring ON hr.personal_documents USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (is_active = true));
CREATE INDEX idx_personal_docs_person ON hr.personal_documents USING btree (person_id);
CREATE INDEX idx_personal_docs_type ON hr.personal_documents USING btree (document_type);

-- ----- schema: requests -----
CREATE INDEX idx_approvals_approver ON requests.approvals USING btree (approver_id) WHERE (approver_id IS NOT NULL);
CREATE INDEX idx_approvals_delegated ON requests.approvals USING btree (delegated_to_id) WHERE (delegated_to_id IS NOT NULL);
CREATE INDEX idx_approvals_pending ON requests.approvals USING btree (ticket_id) WHERE ((decision IS NULL) OR (decision = 'Pendiente'::text));
CREATE INDEX idx_approvals_ticket ON requests.approvals USING btree (ticket_id);
CREATE INDEX idx_audit_action ON requests.audit_log USING btree (action);
CREATE INDEX idx_audit_actor ON requests.audit_log USING btree (actor_id) WHERE (actor_id IS NOT NULL);
CREATE INDEX idx_audit_created ON requests.audit_log USING btree (created_at DESC);
CREATE INDEX idx_audit_ticket ON requests.audit_log USING btree (ticket_id) WHERE (ticket_id IS NOT NULL);
CREATE INDEX idx_comments_author ON requests.comments USING btree (author_id);
CREATE INDEX idx_comments_ticket ON requests.comments USING btree (ticket_id);
CREATE INDEX idx_notifications_recipient ON requests.notifications USING btree (recipient_id);
CREATE INDEX idx_notifications_ticket ON requests.notifications USING btree (ticket_id) WHERE (ticket_id IS NOT NULL);
CREATE INDEX idx_notifications_unread ON requests.notifications USING btree (recipient_id) WHERE ((read_at IS NULL) AND (status = 'sent'::text));
CREATE INDEX idx_revisions_pending ON requests.revisions USING btree (ticket_id) WHERE (status = 'Pendiente_Aceptacion'::text);
CREATE INDEX idx_revisions_ticket ON requests.revisions USING btree (ticket_id);
CREATE INDEX idx_tickets_current_assignee ON requests.tickets USING btree (current_assignee_id) WHERE (current_assignee_id IS NOT NULL);
CREATE INDEX idx_tickets_manual_entry ON requests.tickets USING btree (manual_entry) WHERE (manual_entry = true);
CREATE INDEX idx_tickets_parent ON requests.tickets USING btree (parent_ticket_id) WHERE (parent_ticket_id IS NOT NULL);
CREATE INDEX idx_tickets_requester ON requests.tickets USING btree (requester_id);
CREATE INDEX idx_tickets_sla_overdue ON requests.tickets USING btree (sla_deadline) WHERE ((sla_deadline IS NOT NULL) AND (resolved_at IS NULL));
CREATE INDEX idx_tickets_status ON requests.tickets USING btree (status);
CREATE INDEX idx_tickets_type ON requests.tickets USING btree (type_id);
CREATE INDEX idx_types_active ON requests.types USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_types_parent ON requests.types USING btree (parent_type_id) WHERE (parent_type_id IS NOT NULL);
CREATE INDEX idx_watchers_person ON requests.watchers USING btree (watcher_id);
CREATE INDEX idx_watchers_ticket ON requests.watchers USING btree (ticket_id);

-- ----- schema: docs -----
CREATE INDEX idx_acks_person ON docs.acknowledgments USING btree (person_id);
CREATE INDEX idx_acks_sop_version ON docs.acknowledgments USING btree (sop_version_id);
CREATE INDEX idx_article_acks_person ON docs.article_acknowledgments USING btree (person_id);
CREATE INDEX idx_article_acks_version ON docs.article_acknowledgments USING btree (article_version_id);
CREATE INDEX idx_article_categories_active ON docs.article_categories USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_article_categories_parent ON docs.article_categories USING btree (parent_id) WHERE (parent_id IS NOT NULL);
CREATE INDEX idx_article_versions_article ON docs.article_versions USING btree (article_id);
CREATE UNIQUE INDEX idx_article_versions_one_current ON docs.article_versions USING btree (article_id) WHERE (is_current = true);
CREATE INDEX idx_articles_category ON docs.articles USING btree (category_id) WHERE (category_id IS NOT NULL);
CREATE INDEX idx_articles_published ON docs.articles USING btree (is_published) WHERE (is_published = true);
CREATE INDEX idx_articles_required ON docs.articles USING btree (is_required_reading) WHERE (is_required_reading = true);
CREATE INDEX idx_articles_tags ON docs.articles USING gin (tags);
CREATE INDEX idx_generated_person ON docs.generated USING btree (for_person_id);
CREATE INDEX idx_generated_template ON docs.generated USING btree (template_version_id) WHERE (template_version_id IS NOT NULL);
CREATE INDEX idx_generated_ticket ON docs.generated USING btree (related_ticket_id) WHERE (related_ticket_id IS NOT NULL);
CREATE INDEX idx_sig_requests_document ON docs.signature_requests USING btree (document_id) WHERE (document_id IS NOT NULL);
CREATE INDEX idx_sig_requests_status ON docs.signature_requests USING btree (status);
CREATE UNIQUE INDEX idx_sop_versions_one_current ON docs.sop_versions USING btree (sop_id) WHERE (is_current = true);
CREATE INDEX idx_sop_versions_sop ON docs.sop_versions USING btree (sop_id);
CREATE INDEX idx_sops_active ON docs.sops USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_sops_category ON docs.sops USING btree (category);
CREATE UNIQUE INDEX idx_template_versions_one_current ON docs.template_versions USING btree (template_id) WHERE (is_current = true);
CREATE INDEX idx_template_versions_template ON docs.template_versions USING btree (template_id);
CREATE INDEX idx_templates_active ON docs.templates USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_templates_type ON docs.templates USING btree (template_type);

-- ----- schema: learning -----
CREATE INDEX idx_assessments_enrollment ON learning.assessments USING btree (enrollment_id);
CREATE INDEX idx_assessments_module ON learning.assessments USING btree (module_id) WHERE (module_id IS NOT NULL);
CREATE INDEX idx_assessments_passed ON learning.assessments USING btree (enrollment_id, passed);
CREATE INDEX idx_attendance_enrollment ON learning.attendance USING btree (enrollment_id);
CREATE INDEX idx_attendance_module ON learning.attendance USING btree (module_id) WHERE (module_id IS NOT NULL);
CREATE INDEX idx_cert_assignments_active ON learning.certification_assignments USING btree (person_id, status) WHERE (status = 'active'::text);
CREATE INDEX idx_cert_assignments_cert ON learning.certification_assignments USING btree (certification_id);
CREATE INDEX idx_cert_assignments_expiring ON learning.certification_assignments USING btree (expiration_date) WHERE ((expiration_date IS NOT NULL) AND (status = ANY (ARRAY['active'::text, 'expiring_soon'::text])));
CREATE INDEX idx_cert_assignments_person ON learning.certification_assignments USING btree (person_id);
CREATE INDEX idx_certifications_active ON learning.certifications USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_certifications_required ON learning.certifications USING btree (is_required_by_law) WHERE (is_required_by_law = true);
CREATE INDEX idx_course_modules_course ON learning.course_modules USING btree (course_id, module_order);
CREATE INDEX idx_courses_active ON learning.courses USING btree (is_active, is_published) WHERE (is_active AND is_published);
CREATE INDEX idx_courses_mandatory ON learning.courses USING btree (is_mandatory) WHERE (is_mandatory = true);
CREATE INDEX idx_courses_tags ON learning.courses USING gin (tags);
CREATE INDEX idx_courses_type ON learning.courses USING btree (course_type);
CREATE INDEX idx_enrollments_course ON learning.enrollments USING btree (course_id);
CREATE INDEX idx_enrollments_due ON learning.enrollments USING btree (due_date) WHERE ((status = ANY (ARRAY['enrolled'::text, 'in_progress'::text])) AND (due_date IS NOT NULL));
CREATE INDEX idx_enrollments_person ON learning.enrollments USING btree (person_id);
CREATE INDEX idx_enrollments_status ON learning.enrollments USING btree (status);
CREATE INDEX idx_training_records_person ON learning.training_records USING btree (person_id, recorded_at DESC);
CREATE INDEX idx_training_records_type ON learning.training_records USING btree (record_type);

-- ----- schema: performance -----
CREATE INDEX idx_calibrations_cycle ON performance.calibrations USING btree (cycle_id);
CREATE INDEX idx_cycles_period ON performance.cycles USING btree (period_start, period_end);
CREATE INDEX idx_cycles_status ON performance.cycles USING btree (status);
CREATE INDEX idx_feedback_author ON performance.feedback USING btree (author_id) WHERE ((author_id IS NOT NULL) AND (NOT is_anonymous));
CREATE INDEX idx_feedback_recipient ON performance.feedback USING btree (recipient_id, created_at DESC);
CREATE INDEX idx_goal_updates_goal ON performance.goal_updates USING btree (goal_id, created_at DESC);
CREATE INDEX idx_goals_cycle ON performance.goals USING btree (cycle_id) WHERE (cycle_id IS NOT NULL);
CREATE INDEX idx_goals_overdue ON performance.goals USING btree (target_date) WHERE (status = ANY (ARRAY['active'::text, 'on_track'::text, 'at_risk'::text, 'off_track'::text]));
CREATE INDEX idx_goals_parent ON performance.goals USING btree (parent_goal_id) WHERE (parent_goal_id IS NOT NULL);
CREATE INDEX idx_goals_person ON performance.goals USING btree (person_id);
CREATE INDEX idx_goals_status ON performance.goals USING btree (status);
CREATE INDEX idx_reviews_cycle ON performance.reviews USING btree (cycle_id);
CREATE INDEX idx_reviews_disputed ON performance.reviews USING btree (id) WHERE (reviewee_disputes = true);
CREATE INDEX idx_reviews_pending ON performance.reviews USING btree (reviewer_id) WHERE (status = ANY (ARRAY['pending'::text, 'in_progress'::text]));
CREATE INDEX idx_reviews_reviewee ON performance.reviews USING btree (reviewee_id);
CREATE INDEX idx_reviews_reviewer ON performance.reviews USING btree (reviewer_id);
CREATE INDEX idx_reviews_status ON performance.reviews USING btree (status);

-- ----- schema: audit -----
CREATE INDEX idx_audit_log_action ON audit.log USING btree (action);
CREATE INDEX idx_audit_log_actor ON audit.log USING btree (actor_id) WHERE (actor_id IS NOT NULL);
CREATE INDEX idx_audit_log_created ON audit.log USING btree (created_at DESC);
CREATE INDEX idx_audit_log_record ON audit.log USING btree (schema_name, table_name, record_id) WHERE (record_id IS NOT NULL);
CREATE INDEX idx_audit_log_schema_action ON audit.log USING btree (schema_name, action, created_at DESC);

-- ----- schema: files -----
CREATE INDEX idx_files_category ON files.uploads USING btree (category) WHERE (category IS NOT NULL);
CREATE INDEX idx_files_entity ON files.uploads USING btree (entity_schema, entity_table, entity_id) WHERE (is_deleted = false);
CREATE INDEX idx_files_legal_hold ON files.uploads USING btree (id) WHERE (legal_hold = true);
CREATE INDEX idx_files_retention ON files.uploads USING btree (retention_until) WHERE ((retention_until IS NOT NULL) AND (is_deleted = false));
CREATE INDEX idx_files_uploaded_by ON files.uploads USING btree (uploaded_by) WHERE (uploaded_by IS NOT NULL);

-- ----- schema: notifications -----
CREATE INDEX idx_outbox_failed ON notifications.outbox USING btree (last_attempt_at) WHERE (status = 'failed'::text);
CREATE INDEX idx_outbox_pending ON notifications.outbox USING btree (scheduled_for, priority DESC) WHERE (status = ANY (ARRAY['pending'::text, 'queued'::text]));
CREATE INDEX idx_outbox_recipient ON notifications.outbox USING btree (recipient_id, created_at DESC);
CREATE INDEX idx_outbox_recipient_unread ON notifications.outbox USING btree (recipient_id, status, created_at DESC) WHERE ((channel = 'in_app'::text) AND (status = ANY (ARRAY['pending'::text, 'queued'::text, 'sent'::text])));
CREATE INDEX idx_outbox_source ON notifications.outbox USING btree (source_schema, source_table, source_id) WHERE (source_id IS NOT NULL);
CREATE INDEX idx_outbox_unread ON notifications.outbox USING btree (recipient_id) WHERE ((read_at IS NULL) AND (status = 'sent'::text));
CREATE INDEX idx_outbox_worker_pending ON notifications.outbox USING btree (channel, status, scheduled_for) WHERE (status = 'pending'::text);

-- ----- schema: workflows -----
CREATE INDEX idx_instances_active ON workflows.instances USING btree (subject_person_id) WHERE (status = ANY (ARRAY['iniciado'::text, 'en_progreso'::text]));
CREATE INDEX idx_instances_status ON workflows.instances USING btree (status);
CREATE INDEX idx_instances_subject ON workflows.instances USING btree (subject_person_id);
CREATE UNIQUE INDEX idx_process_versions_one_current ON workflows.process_versions USING btree (process_id) WHERE (is_current = true);
CREATE INDEX idx_process_versions_process ON workflows.process_versions USING btree (process_id);
CREATE INDEX idx_step_assignments_assignee ON workflows.step_assignments USING btree (assigned_to_id) WHERE (assigned_to_id IS NOT NULL);
CREATE INDEX idx_step_assignments_instance ON workflows.step_assignments USING btree (instance_id);
CREATE INDEX idx_step_assignments_pending ON workflows.step_assignments USING btree (assigned_to_id) WHERE (status = 'pending'::text);


-- ===== SECTION: RLS ENABLE =====

-- ----- schema: hr -----
ALTER TABLE hr.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.employment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.employments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.invite_code_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.leave_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.leave_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.person_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.personal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.user_settings ENABLE ROW LEVEL SECURITY;

-- ----- schema: requests -----
ALTER TABLE requests.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests.revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests.types ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests.watchers ENABLE ROW LEVEL SECURITY;

-- ----- schema: docs -----
ALTER TABLE docs.acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.article_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.generated ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.sop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs.templates ENABLE ROW LEVEL SECURITY;

-- ----- schema: workflows -----
ALTER TABLE workflows.instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows.process_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows.step_assignments ENABLE ROW LEVEL SECURITY;

-- ----- schema: learning -----
ALTER TABLE learning.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.certification_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.training_records ENABLE ROW LEVEL SECURITY;

-- ----- schema: performance -----
ALTER TABLE performance.calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance.goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance.review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance.reviews ENABLE ROW LEVEL SECURITY;

-- ----- schema: audit -----
ALTER TABLE audit.log ENABLE ROW LEVEL SECURITY;

-- ----- schema: files -----
ALTER TABLE files.uploads ENABLE ROW LEVEL SECURITY;

-- ----- schema: notifications -----
ALTER TABLE notifications.outbox ENABLE ROW LEVEL SECURITY;


-- ===== SECTION: POLICIES =====

-- ----- schema: hr -----
CREATE POLICY addresses_delete ON hr.addresses AS PERMISSIVE FOR DELETE TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY addresses_insert ON hr.addresses AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY addresses_select ON hr.addresses AS PERMISSIVE FOR SELECT TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY addresses_update ON hr.addresses AS PERMISSIVE FOR UPDATE TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY contacts_delete ON hr.contacts AS PERMISSIVE FOR DELETE TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY contacts_insert ON hr.contacts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY contacts_select ON hr.contacts AS PERMISSIVE FOR SELECT TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY contacts_update ON hr.contacts AS PERMISSIVE FOR UPDATE TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY employment_types_delete_hr_admin ON hr.employment_types AS PERMISSIVE FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE POLICY employment_types_insert_hr_admin ON hr.employment_types AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY employment_types_select_authenticated ON hr.employment_types AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY employment_types_update_hr_admin ON hr.employment_types AS PERMISSIVE FOR UPDATE TO authenticated USING (hr.is_hr_admin());
CREATE POLICY employments_delete ON hr.employments AS PERMISSIVE FOR DELETE TO authenticated USING ((hr.current_app_role() = 'admin'::text));
CREATE POLICY employments_insert ON hr.employments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY employments_select ON hr.employments AS PERMISSIVE FOR SELECT TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_supervisor_of(person_id) OR hr.is_hr_admin() OR hr.is_president_or_admin()));
CREATE POLICY employments_update ON hr.employments AS PERMISSIVE FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY invite_code_attempts_select_admin ON hr.invite_code_attempts AS PERMISSIVE FOR SELECT TO authenticated USING (hr.is_hr_admin());
CREATE POLICY invite_codes_insert_hr_admin ON hr.invite_codes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY invite_codes_select_hr_admin ON hr.invite_codes AS PERMISSIVE FOR SELECT TO authenticated USING (hr.is_hr_admin());
CREATE POLICY invite_codes_update_hr_admin ON hr.invite_codes AS PERMISSIVE FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY leave_assignments_select ON hr.leave_assignments AS PERMISSIVE FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ((person_id = hr.current_person_id()) OR hr.is_supervisor_of(person_id) OR hr.is_hr_admin())));
CREATE POLICY leave_assignments_write_admin ON hr.leave_assignments AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY leave_balances_select ON hr.leave_balances AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM hr.leave_assignments a
  WHERE ((a.id = leave_balances.assignment_id) AND ((a.person_id = hr.current_person_id()) OR hr.is_supervisor_of(a.person_id) OR hr.is_hr_admin())))));
CREATE POLICY leave_ledger_select ON hr.leave_ledger AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM hr.leave_assignments a
  WHERE ((a.id = leave_ledger.assignment_id) AND ((a.person_id = hr.current_person_id()) OR hr.is_supervisor_of(a.person_id) OR hr.is_hr_admin())))));
CREATE POLICY leave_policies_select_all ON hr.leave_policies AS PERMISSIVE FOR SELECT TO authenticated USING ((deleted_at IS NULL));
CREATE POLICY leave_policies_write_admin ON hr.leave_policies AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY locations_modify ON hr.locations AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY locations_select ON hr.locations AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY medical_info_delete ON hr.medical_info AS PERMISSIVE FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE POLICY medical_info_insert ON hr.medical_info AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY medical_info_select ON hr.medical_info AS PERMISSIVE FOR SELECT TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY medical_info_update ON hr.medical_info AS PERMISSIVE FOR UPDATE TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY org_units_modify ON hr.org_units AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY org_units_select ON hr.org_units AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY people_delete ON hr.people AS PERMISSIVE FOR DELETE TO authenticated USING ((hr.current_app_role() = 'admin'::text));
CREATE POLICY people_insert ON hr.people AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY people_select ON hr.people AS PERMISSIVE FOR SELECT TO authenticated USING (((id = hr.current_person_id()) OR hr.is_supervisor_of(id) OR hr.is_hr_admin() OR hr.is_president_or_admin()));
CREATE POLICY people_update ON hr.people AS PERMISSIVE FOR UPDATE TO authenticated USING ((hr.is_hr_admin() OR (id = hr.current_person_id()))) WITH CHECK ((hr.is_hr_admin() OR (id = hr.current_person_id())));
CREATE POLICY person_sources_all ON hr.person_sources AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY personal_documents_delete ON hr.personal_documents AS PERMISSIVE FOR DELETE TO authenticated USING (hr.is_hr_admin());
CREATE POLICY personal_documents_insert ON hr.personal_documents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY personal_documents_select ON hr.personal_documents AS PERMISSIVE FOR SELECT TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY personal_documents_update ON hr.personal_documents AS PERMISSIVE FOR UPDATE TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY positions_modify ON hr.positions AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY positions_select ON hr.positions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY user_settings_insert_own ON hr.user_settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY user_settings_select_own_or_hr_admin ON hr.user_settings AS PERMISSIVE FOR SELECT TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY user_settings_update_own_or_hr_admin ON hr.user_settings AS PERMISSIVE FOR UPDATE TO authenticated USING (((person_id = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((person_id = hr.current_person_id()) OR hr.is_hr_admin()));

-- ----- schema: requests -----
CREATE POLICY approvals_modify ON requests.approvals AS PERMISSIVE FOR ALL TO authenticated USING (((approver_id = hr.current_person_id()) OR (delegated_to_id = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((approver_id = hr.current_person_id()) OR (delegated_to_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY approvals_select ON requests.approvals AS PERMISSIVE FOR SELECT TO authenticated USING (requests.can_view_ticket(ticket_id));
CREATE POLICY audit_log_select ON requests.audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((hr.is_hr_admin() OR hr.is_president_or_admin()));
CREATE POLICY comments_delete ON requests.comments AS PERMISSIVE FOR DELETE TO authenticated USING (((author_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY comments_insert ON requests.comments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((requests.can_view_ticket(ticket_id) AND (author_id = hr.current_person_id())));
CREATE POLICY comments_select ON requests.comments AS PERMISSIVE FOR SELECT TO authenticated USING ((requests.can_view_ticket(ticket_id) AND ((is_internal = false) OR hr.is_hr_admin())));
CREATE POLICY comments_update ON requests.comments AS PERMISSIVE FOR UPDATE TO authenticated USING (((author_id = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((author_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY notifications_select ON requests.notifications AS PERMISSIVE FOR SELECT TO authenticated USING (((recipient_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY notifications_update ON requests.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING ((recipient_id = hr.current_person_id())) WITH CHECK ((recipient_id = hr.current_person_id()));
CREATE POLICY revisions_modify ON requests.revisions AS PERMISSIVE FOR ALL TO authenticated USING (((revised_by = hr.current_person_id()) OR (responded_by = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((revised_by = hr.current_person_id()) OR (responded_by = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY revisions_select ON requests.revisions AS PERMISSIVE FOR SELECT TO authenticated USING (requests.can_view_ticket(ticket_id));
CREATE POLICY tickets_delete ON requests.tickets AS PERMISSIVE FOR DELETE TO authenticated USING ((hr.current_app_role() = 'admin'::text));
CREATE POLICY tickets_insert ON requests.tickets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((requester_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY tickets_select ON requests.tickets AS PERMISSIVE FOR SELECT TO authenticated USING (requests.can_view_ticket(id));
CREATE POLICY tickets_update ON requests.tickets AS PERMISSIVE FOR UPDATE TO authenticated USING ((((requester_id = hr.current_person_id()) AND (status = 'Borrador'::text)) OR (current_assignee_id = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((requester_id = hr.current_person_id()) OR (current_assignee_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY types_modify ON requests.types AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY types_select ON requests.types AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY watchers_delete ON requests.watchers AS PERMISSIVE FOR DELETE TO authenticated USING (((watcher_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY watchers_insert ON requests.watchers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((watcher_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY watchers_select ON requests.watchers AS PERMISSIVE FOR SELECT TO authenticated USING (((watcher_id = hr.current_person_id()) OR requests.can_view_ticket(ticket_id) OR hr.is_hr_admin()));

-- ----- schema: docs -----
CREATE POLICY docs_ack_admin ON docs.acknowledgments AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_articleack_admin ON docs.article_acknowledgments AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_categories_admin ON docs.article_categories AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_versions_admin ON docs.article_versions AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_articles_admin ON docs.articles AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_generated_admin ON docs.generated AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_signreq_admin ON docs.signature_requests AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_sopvers_admin ON docs.sop_versions AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_sops_admin ON docs.sops AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_tplvers_admin ON docs.template_versions AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY docs_templates_admin ON docs.templates AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());

-- ----- schema: workflows -----
CREATE POLICY wf_instances_admin ON workflows.instances AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY wf_versions_admin ON workflows.process_versions AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY wf_processes_admin ON workflows.processes AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY wf_assignments_admin ON workflows.step_assignments AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());

-- ----- schema: learning -----
CREATE POLICY learn_assess_admin ON learning.assessments AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY learn_attend_admin ON learning.attendance AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY learn_certassign_admin ON learning.certification_assignments AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY learn_certs_admin ON learning.certifications AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY learn_modules_admin ON learning.course_modules AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY learn_courses_admin ON learning.courses AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY learn_enroll_admin ON learning.enrollments AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY learn_records_admin ON learning.training_records AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());

-- ----- schema: performance -----
CREATE POLICY perf_calib_admin ON performance.calibrations AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY perf_cycles_admin ON performance.cycles AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY perf_feedback_admin ON performance.feedback AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY perf_gupdates_admin ON performance.goal_updates AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY perf_goals_admin ON performance.goals AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY perf_tpls_admin ON performance.review_templates AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY perf_reviews_admin ON performance.reviews AS PERMISSIVE FOR ALL TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());

-- ----- schema: audit -----
CREATE POLICY audit_log_select ON audit.log AS PERMISSIVE FOR SELECT TO authenticated USING ((hr.is_hr_admin() OR hr.is_president_or_admin()));

-- ----- schema: files -----
CREATE POLICY uploads_delete ON files.uploads AS PERMISSIVE FOR DELETE TO authenticated USING (((uploaded_by = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY uploads_insert ON files.uploads AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((uploaded_by = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY uploads_select ON files.uploads AS PERMISSIVE FOR SELECT TO authenticated USING (((uploaded_by = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY uploads_update ON files.uploads AS PERMISSIVE FOR UPDATE TO authenticated USING (((uploaded_by = hr.current_person_id()) OR hr.is_hr_admin())) WITH CHECK (((uploaded_by = hr.current_person_id()) OR hr.is_hr_admin()));

-- ----- schema: notifications -----
CREATE POLICY outbox_select ON notifications.outbox AS PERMISSIVE FOR SELECT TO authenticated USING (((recipient_id = hr.current_person_id()) OR hr.is_hr_admin()));
CREATE POLICY outbox_update ON notifications.outbox AS PERMISSIVE FOR UPDATE TO authenticated USING ((recipient_id = hr.current_person_id())) WITH CHECK ((recipient_id = hr.current_person_id()));


-- ===== SECTION: FUNCTIONS =====

-- ----- schema: hr -----
CREATE OR REPLACE FUNCTION hr.apply_employment_scd2_change(p_person_id uuid, p_position_id uuid, p_position_text text, p_department_id uuid, p_department_text text, p_office_id uuid, p_office_text text, p_supervisor_id uuid, p_hire_date date, p_app_role text, p_employment_type_id uuid, p_actor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current hr.employments%ROWTYPE;
  v_critical_changed boolean := false;
BEGIN
  SELECT * INTO v_current
  FROM hr.employments
  WHERE person_id = p_person_id AND is_current = true;

  IF NOT FOUND THEN
    INSERT INTO hr.employments (
      person_id, position_id, position_text, department_id, department_text,
      office_id, office_text, supervisor_id, hire_date, app_role,
      employment_type_id, created_by
    ) VALUES (
      p_person_id, p_position_id, p_position_text, p_department_id, p_department_text,
      p_office_id, p_office_text, p_supervisor_id, p_hire_date, p_app_role,
      p_employment_type_id, p_actor_id
    );
    RETURN;
  END IF;

  IF (COALESCE(v_current.position_id::text, '') IS DISTINCT FROM COALESCE(p_position_id::text, ''))
     OR (COALESCE(v_current.position_text, '') IS DISTINCT FROM COALESCE(p_position_text, ''))
     OR (COALESCE(v_current.department_id::text, '') IS DISTINCT FROM COALESCE(p_department_id::text, ''))
     OR (COALESCE(v_current.department_text, '') IS DISTINCT FROM COALESCE(p_department_text, ''))
     OR (COALESCE(v_current.supervisor_id::text, '') IS DISTINCT FROM COALESCE(p_supervisor_id::text, ''))
     OR v_current.app_role IS DISTINCT FROM p_app_role
     OR COALESCE(v_current.employment_type_id::text, '') IS DISTINCT FROM COALESCE(p_employment_type_id::text, '')
  THEN
    v_critical_changed := true;
  END IF;

  IF v_critical_changed THEN
    UPDATE hr.employments
    SET valid_to = CURRENT_DATE
    WHERE id = v_current.id;

    INSERT INTO hr.employments (
      person_id, position_id, position_text, department_id, department_text,
      office_id, office_text, supervisor_id, hire_date, app_role,
      employment_type_id, created_by, created_from
    ) VALUES (
      p_person_id, p_position_id, p_position_text, p_department_id, p_department_text,
      p_office_id, p_office_text, p_supervisor_id, p_hire_date, p_app_role,
      p_employment_type_id, p_actor_id, 'edit'
    );

    INSERT INTO audit.log (actor_id, action, record_id, reason, metadata)
    VALUES (
      (SELECT id FROM hr.people WHERE auth_id = p_actor_id),
      'custom', p_person_id, 'employment_scd2_transition',
      jsonb_build_object('semantic_action', 'employment_scd2_transition',
                         'previous_employment_id', v_current.id)
    );
  ELSE
    UPDATE hr.employments
    SET office_id = p_office_id,
        office_text = p_office_text,
        hire_date = p_hire_date,
        updated_at = now()
    WHERE id = v_current.id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION hr.check_invite_code_rate_limit(p_invite_code_id uuid, p_ip_address inet, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 15, p_block_minutes integer DEFAULT 15)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_record hr.invite_code_attempts;
  v_now timestamptz := now();
  v_blocked boolean := false;
  v_attempts_remaining integer;
BEGIN
  INSERT INTO hr.invite_code_attempts (invite_code_id, ip_address, attempts, first_attempt_at, last_attempt_at)
  VALUES (p_invite_code_id, p_ip_address, 1, v_now, v_now)
  ON CONFLICT (invite_code_id, ip_address) DO UPDATE
    SET attempts = CASE
        WHEN hr.invite_code_attempts.first_attempt_at < (v_now - make_interval(mins => p_window_minutes))
          THEN 1
        ELSE hr.invite_code_attempts.attempts + 1
      END,
      first_attempt_at = CASE
        WHEN hr.invite_code_attempts.first_attempt_at < (v_now - make_interval(mins => p_window_minutes))
          THEN v_now
        ELSE hr.invite_code_attempts.first_attempt_at
      END,
      last_attempt_at = v_now,
      blocked_until = CASE
        WHEN hr.invite_code_attempts.attempts + 1 >= p_max_attempts
             AND hr.invite_code_attempts.first_attempt_at >= (v_now - make_interval(mins => p_window_minutes))
          THEN v_now + make_interval(mins => p_block_minutes)
        ELSE hr.invite_code_attempts.blocked_until
      END
  RETURNING * INTO v_record;

  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    v_blocked := true;
  END IF;

  v_attempts_remaining := GREATEST(0, p_max_attempts - v_record.attempts);

  RETURN jsonb_build_object(
    'blocked', v_blocked,
    'blocked_until', v_record.blocked_until,
    'attempts', v_record.attempts,
    'attempts_remaining', v_attempts_remaining,
    'window_started_at', v_record.first_attempt_at
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION hr.complete_onboarding_writes(p_invite_id uuid, p_person_id uuid, p_auth_id uuid, p_photo_path text, p_emergency jsonb, p_medical jsonb, p_address jsonb, p_ack_ethics_at timestamp with time zone, p_ack_child_labor_at timestamp with time zone, p_ip_address text, p_user_agent text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ethics_version_id uuid;
  v_child_labor_version_id uuid;
  v_existing_auth uuid;
BEGIN
  SELECT sv.id INTO v_ethics_version_id
  FROM docs.sops s
  JOIN docs.sop_versions sv ON sv.sop_id = s.id
  WHERE s.code = 'IC-RH-M-01' AND sv.is_current = true
  LIMIT 1;

  SELECT sv.id INTO v_child_labor_version_id
  FROM docs.sops s
  JOIN docs.sop_versions sv ON sv.sop_id = s.id
  WHERE s.code = 'IC-RH-D-07' AND sv.is_current = true
  LIMIT 1;

  IF v_ethics_version_id IS NULL OR v_child_labor_version_id IS NULL THEN
    RAISE EXCEPTION 'SOPs IC-RH-M-01 o IC-RH-D-07 no encontrados o sin version current. Aplicar migration 033 primero.';
  END IF;

  SELECT auth_id INTO v_existing_auth FROM hr.people WHERE id = p_person_id;
  IF v_existing_auth IS NULL THEN
    UPDATE hr.people
    SET auth_id = p_auth_id,
        photo_url = COALESCE(p_photo_path, photo_url),
        updated_at = now()
    WHERE id = p_person_id;
  ELSIF v_existing_auth <> p_auth_id THEN
    RAISE EXCEPTION 'hr.people.auth_id ya esta linkeado a otro auth.user; aborting onboarding';
  ELSE
    UPDATE hr.people
    SET photo_url = COALESCE(p_photo_path, photo_url),
        updated_at = now()
    WHERE id = p_person_id;
  END IF;

  UPDATE hr.invite_codes
  SET consumed_at = COALESCE(consumed_at, now()),
      consumed_by_auth_id = COALESCE(consumed_by_auth_id, p_auth_id)
  WHERE id = p_invite_id AND (consumed_at IS NULL OR consumed_by_auth_id = p_auth_id);

  INSERT INTO hr.contacts (
    person_id, contact_type, contact_name, relationship, phone, is_primary, is_emergency
  )
  SELECT p_person_id, 'emergency', p_emergency->>'contact_name', p_emergency->>'relationship',
         p_emergency->>'phone', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM hr.contacts
    WHERE person_id = p_person_id AND contact_type = 'emergency' AND is_primary = true
  );

  IF p_emergency ? 'phone_alt' AND p_emergency->>'phone_alt' <> '' THEN
    INSERT INTO hr.contacts (
      person_id, contact_type, contact_name, relationship, phone, is_primary, is_emergency
    )
    SELECT p_person_id, 'emergency', p_emergency->>'contact_name', p_emergency->>'relationship',
           p_emergency->>'phone_alt', false, true
    WHERE NOT EXISTS (
      SELECT 1 FROM hr.contacts
      WHERE person_id = p_person_id AND contact_type = 'emergency'
        AND phone = p_emergency->>'phone_alt'
    );
  END IF;

  IF p_medical IS NOT NULL AND p_medical <> '{}'::jsonb THEN
    INSERT INTO hr.medical_info (
      person_id, blood_type, allergies, chronic_conditions, current_medications,
      doctor_name, doctor_phone, medical_insurance_provider, medical_insurance_number, css_number
    ) VALUES (
      p_person_id,
      NULLIF(p_medical->>'blood_type', ''),
      NULLIF(p_medical->>'allergies', ''),
      NULLIF(p_medical->>'chronic_conditions', ''),
      NULLIF(p_medical->>'current_medications', ''),
      NULLIF(p_medical->>'doctor_name', ''),
      NULLIF(p_medical->>'doctor_phone', ''),
      NULLIF(p_medical->>'medical_insurance_provider', ''),
      NULLIF(p_medical->>'medical_insurance_number', ''),
      NULLIF(p_medical->>'css_number', '')
    )
    ON CONFLICT (person_id) DO UPDATE
    SET blood_type = EXCLUDED.blood_type,
        allergies = EXCLUDED.allergies,
        chronic_conditions = EXCLUDED.chronic_conditions,
        current_medications = EXCLUDED.current_medications,
        doctor_name = EXCLUDED.doctor_name,
        doctor_phone = EXCLUDED.doctor_phone,
        medical_insurance_provider = EXCLUDED.medical_insurance_provider,
        medical_insurance_number = EXCLUDED.medical_insurance_number,
        css_number = EXCLUDED.css_number,
        updated_at = now();
  END IF;

  INSERT INTO hr.addresses (
    person_id, address_type, street, neighborhood, city, province, postal_code, is_current
  )
  SELECT p_person_id, 'residence',
         NULLIF(p_address->>'street', ''),
         NULLIF(p_address->>'neighborhood', ''),
         NULLIF(p_address->>'city', ''),
         p_address->>'province',
         NULLIF(p_address->>'postal_code', ''),
         true
  WHERE NOT EXISTS (
    SELECT 1 FROM hr.addresses
    WHERE person_id = p_person_id AND address_type = 'residence' AND is_current = true
  );

  INSERT INTO docs.acknowledgments (
    sop_version_id, person_id, acknowledged_at, signature_method, ip_address, user_agent
  )
  SELECT v_ethics_version_id, p_person_id, p_ack_ethics_at, 'click', p_ip_address, p_user_agent
  WHERE NOT EXISTS (
    SELECT 1 FROM docs.acknowledgments
    WHERE sop_version_id = v_ethics_version_id AND person_id = p_person_id
  );

  INSERT INTO docs.acknowledgments (
    sop_version_id, person_id, acknowledged_at, signature_method, ip_address, user_agent
  )
  SELECT v_child_labor_version_id, p_person_id, p_ack_child_labor_at, 'click', p_ip_address, p_user_agent
  WHERE NOT EXISTS (
    SELECT 1 FROM docs.acknowledgments
    WHERE sop_version_id = v_child_labor_version_id AND person_id = p_person_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION hr.create_default_user_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO hr.user_settings (person_id)
  VALUES (NEW.id)
  ON CONFLICT (person_id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION hr.current_app_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT e.app_role
  FROM hr.employments e
  JOIN hr.people p ON p.id = e.person_id
  WHERE p.auth_id = auth.uid()
    AND e.is_current = true
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION hr.current_person_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT id FROM hr.people WHERE auth_id = auth.uid() LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION hr.find_auth_user_by_identifier(p_field text, p_value text)
 RETURNS TABLE(id uuid, email text, phone text, raw_app_meta_data jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT id, email, phone, raw_app_meta_data
  FROM auth.users
  WHERE (p_field = 'email' AND email = lower(trim(p_value)))
     OR (p_field = 'phone' AND phone = p_value)
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION hr.has_direct_reports()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS(
    SELECT 1
    FROM hr.employments e
    JOIN hr.people p ON p.id = e.supervisor_id
    WHERE p.auth_id = auth.uid()
      AND e.is_current = true
  );
$function$
;

CREATE OR REPLACE FUNCTION hr.is_hr_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT hr.current_app_role() IN ('hr_admin', 'admin');
$function$
;

CREATE OR REPLACE FUNCTION hr.is_president_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT hr.current_app_role() IN ('president', 'admin');
$function$
;

CREATE OR REPLACE FUNCTION hr.is_supervisor_of(target_person_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM hr.employments e
    WHERE e.person_id = target_person_id
      AND e.is_current = true
      AND e.supervisor_id = hr.current_person_id()
  );
$function$
;

CREATE OR REPLACE FUNCTION hr.post_leave_ledger_entry(p_assignment_id uuid, p_kind text, p_amount numeric, p_event_date date DEFAULT CURRENT_DATE, p_source_ticket_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
 RETURNS hr.leave_ledger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_policy hr.leave_policies%rowtype;
  v_prev_available numeric;
  v_pending numeric;
  v_new_balance numeric;
  v_new_accrued numeric;
  v_new_used numeric;
  v_ledger hr.leave_ledger;
begin
  if not hr.is_hr_admin() then
    raise exception 'not authorized: only hr_admin may post leave ledger entries';
  end if;
  select p.* into v_policy
  from hr.leave_assignments a join hr.leave_policies p on p.id = a.policy_id
  where a.id = p_assignment_id and a.deleted_at is null;
  if not found then
    raise exception 'leave assignment % not found or inactive', p_assignment_id;
  end if;
  insert into hr.leave_balances (assignment_id) values (p_assignment_id)
    on conflict (assignment_id) do nothing;
  select available, pending into v_prev_available, v_pending
  from hr.leave_balances where assignment_id = p_assignment_id for update;
  v_new_balance := coalesce(v_prev_available, 0) + p_amount;
  if p_amount < 0 and not v_policy.allow_negative_balance and v_new_balance < 0 then
    raise exception 'leave balance would go negative (%) and policy % disallows it', v_new_balance, v_policy.code;
  end if;
  if p_amount > 0 and v_policy.max_balance_cap is not null and v_new_balance > v_policy.max_balance_cap then
    raise exception 'leave balance % exceeds cap % for policy %', v_new_balance, v_policy.max_balance_cap, v_policy.code;
  end if;
  insert into hr.leave_ledger (assignment_id, kind, amount, balance_after, event_date, source_ticket_id, note, created_by)
  values (p_assignment_id, p_kind, p_amount, v_new_balance, p_event_date, p_source_ticket_id, p_note, hr.current_person_id())
  returning * into v_ledger;
  select coalesce(sum(amount) filter (where amount > 0), 0),
         coalesce(-sum(amount) filter (where amount < 0), 0)
    into v_new_accrued, v_new_used
  from hr.leave_ledger where assignment_id = p_assignment_id;
  update hr.leave_balances
    set accrued = v_new_accrued, used = v_new_used,
        available = v_new_accrued - v_new_used - coalesce(pending, 0), as_of = now()
  where assignment_id = p_assignment_id;
  return v_ledger;
end;
$function$
;

CREATE OR REPLACE FUNCTION hr.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

-- ----- schema: notifications -----
CREATE OR REPLACE FUNCTION notifications.enqueue(p_recipient_id uuid, p_notification_type text, p_subject text, p_body text, p_template_code text, p_template_variables jsonb, p_metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_pref jsonb;
  v_email_opted_in boolean;
BEGIN
  INSERT INTO notifications.outbox (
    recipient_id, channel, status, subject, body,
    template_code, template_variables, metadata, notification_type
  ) VALUES (
    p_recipient_id, 'in_app', 'pending', p_subject, p_body,
    p_template_code, p_template_variables, p_metadata, p_notification_type
  );

  SELECT preferences -> 'notifications' -> 'email' -> p_notification_type
  INTO v_pref
  FROM hr.user_settings
  WHERE person_id = p_recipient_id;

  v_email_opted_in := COALESCE(v_pref::boolean, true);

  IF v_email_opted_in THEN
    INSERT INTO notifications.outbox (
      recipient_id, channel, status, subject, body,
      template_code, template_variables, metadata, notification_type
    ) VALUES (
      p_recipient_id, 'email', 'pending', p_subject, p_body,
      p_template_code, p_template_variables, p_metadata, p_notification_type
    );
  END IF;
END;
$function$
;

-- ----- schema: requests -----
CREATE OR REPLACE FUNCTION requests.can_view_ticket(p_ticket_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT
    hr.is_hr_admin()
    OR hr.is_president_or_admin()
    OR EXISTS (
      SELECT 1 FROM requests.tickets t
      WHERE t.id = p_ticket_id
        AND (
          t.requester_id = hr.current_person_id()
          OR t.current_assignee_id = hr.current_person_id()
          OR EXISTS (
            SELECT 1 FROM requests.watchers w
            WHERE w.ticket_id = t.id AND w.watcher_id = hr.current_person_id()
          )
          OR EXISTS (
            SELECT 1 FROM requests.approvals a
            WHERE a.ticket_id = t.id AND (a.approver_id = hr.current_person_id() OR a.delegated_to_id = hr.current_person_id())
          )
        )
    );
$function$
;


-- ===== SECTION: TRIGGERS =====

-- ----- schema: hr -----
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON hr.addresses FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON hr.contacts FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER touch_updated_at_employment_types BEFORE UPDATE ON hr.employment_types FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_employments_updated_at BEFORE UPDATE ON hr.employments FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER tg_invite_code_attempts_updated_at BEFORE UPDATE ON hr.invite_code_attempts FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER touch_leave_assignments BEFORE UPDATE ON hr.leave_assignments FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER touch_leave_balances BEFORE UPDATE ON hr.leave_balances FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER touch_leave_policies BEFORE UPDATE ON hr.leave_policies FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON hr.locations FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_medical_updated_at BEFORE UPDATE ON hr.medical_info FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_org_units_updated_at BEFORE UPDATE ON hr.org_units FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER hr_people_default_settings_trigger AFTER INSERT ON hr.people FOR EACH ROW EXECUTE FUNCTION hr.create_default_user_settings();
CREATE TRIGGER trg_people_updated_at BEFORE UPDATE ON hr.people FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_personal_docs_updated_at BEFORE UPDATE ON hr.personal_documents FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_positions_updated_at BEFORE UPDATE ON hr.positions FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

-- ----- schema: requests -----
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON requests.comments FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON requests.tickets FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_types_updated_at BEFORE UPDATE ON requests.types FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

-- ----- schema: docs -----
CREATE TRIGGER trg_article_categories_updated_at BEFORE UPDATE ON docs.article_categories FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_articles_updated_at BEFORE UPDATE ON docs.articles FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_sops_updated_at BEFORE UPDATE ON docs.sops FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON docs.templates FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

-- ----- schema: workflows -----
CREATE TRIGGER trg_instances_updated_at BEFORE UPDATE ON workflows.instances FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_processes_updated_at BEFORE UPDATE ON workflows.processes FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_step_assignments_updated_at BEFORE UPDATE ON workflows.step_assignments FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

-- ----- schema: learning -----
CREATE TRIGGER trg_cert_assignments_updated_at BEFORE UPDATE ON learning.certification_assignments FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_certifications_updated_at BEFORE UPDATE ON learning.certifications FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_course_modules_updated_at BEFORE UPDATE ON learning.course_modules FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON learning.courses FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_enrollments_updated_at BEFORE UPDATE ON learning.enrollments FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

-- ----- schema: performance -----
CREATE TRIGGER trg_calibrations_updated_at BEFORE UPDATE ON performance.calibrations FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_cycles_updated_at BEFORE UPDATE ON performance.cycles FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_feedback_updated_at BEFORE UPDATE ON performance.feedback FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON performance.goals FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_review_templates_updated_at BEFORE UPDATE ON performance.review_templates FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON performance.reviews FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

-- ----- schema: files -----
CREATE TRIGGER trg_files_updated_at BEFORE UPDATE ON files.uploads FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();

-- ----- schema: notifications -----
CREATE TRIGGER trg_outbox_updated_at BEFORE UPDATE ON notifications.outbox FOR EACH ROW EXECUTE FUNCTION hr.touch_updated_at();


-- ===== SECTION: COMMENTS (table + column) =====

-- ----- schema: hr -----
COMMENT ON COLUMN hr.addresses.address_type IS 'residence (donde vive, principal), mailing (correspondencia, puede ser diferente), other.';
COMMENT ON COLUMN hr.addresses.city IS 'Ciudad.';
COMMENT ON COLUMN hr.addresses.country IS 'País. Default Panamá.';
COMMENT ON COLUMN hr.addresses.is_current IS 'TRUE si esta es la dirección actual del address_type. FALSE para histórico.';
COMMENT ON COLUMN hr.addresses.neighborhood IS 'Barrio / corregimiento (importante en Panamá).';
COMMENT ON COLUMN hr.addresses.person_id IS 'Dueño de la dirección.';
COMMENT ON COLUMN hr.addresses.postal_code IS 'Código postal (en Panamá menos usado).';
COMMENT ON COLUMN hr.addresses.province IS 'Provincia (Panamá tiene 10 provincias + comarcas).';
COMMENT ON COLUMN hr.addresses.street IS 'Calle, casa/edificio, apartamento. Formato libre.';
COMMENT ON COLUMN hr.addresses.valid_from IS 'Cuándo empezó esta dirección.';
COMMENT ON COLUMN hr.addresses.valid_to IS 'Cuándo dejó de ser vigente. NULL = actual.';
COMMENT ON COLUMN hr.contacts.contact_name IS 'Nombre del contacto (para tipo emergency/spouse/parent). NULL si es contact_type=personal.';
COMMENT ON COLUMN hr.contacts.contact_type IS 'personal (datos propios del empleado: phone/email del empleado mismo), emergency (a quien llamar), spouse, parent, other.';
COMMENT ON COLUMN hr.contacts.email IS 'Email. Validar formato en app layer.';
COMMENT ON COLUMN hr.contacts.is_emergency IS 'TRUE = contacto de emergencia (persona a llamar). Separado de is_primary porque empleado puede tener phone personal Y contacto emergencia distintos.';
COMMENT ON COLUMN hr.contacts.is_primary IS 'TRUE = contacto principal de su contact_type. Una sola persona por tipo debería ser primary (validar en app o trigger).';
COMMENT ON COLUMN hr.contacts.notes IS 'Notas (ej: "llamar después de 6pm", "no habla español").';
COMMENT ON COLUMN hr.contacts.person_id IS 'Empleado dueño del contacto.';
COMMENT ON COLUMN hr.contacts.phone IS 'Teléfono. Formato libre, validar en app layer.';
COMMENT ON COLUMN hr.contacts.relationship IS 'Relación con el empleado: madre, padre, hermano, esposa, amigo, vecino.';
COMMENT ON COLUMN hr.employment_types.code IS 'Identificador stable snake_case sin acentos. Usado en queries y form_schema JSONB.';
COMMENT ON COLUMN hr.employment_types.has_seniority_premium IS 'Empleado acumula prima de antiguedad. Solo tiempo_indefinido per IC-RH-D-05.';
COMMENT ON COLUMN hr.employment_types.has_vacations IS 'Empleado tiene derecho a vacaciones acumuladas. Disparador F-05-03 elegibilidad.';
COMMENT ON COLUMN hr.employment_types.has_xiii_month IS 'Empleado tiene derecho a decimo tercer mes.';
COMMENT ON COLUMN hr.employment_types.isr_applies IS 'Se descuenta Impuesto Sobre la Renta.';
COMMENT ON COLUMN hr.employment_types.name IS 'Nombre formal completo segun IC-RH-D-05.';
COMMENT ON COLUMN hr.employment_types.se_applies IS 'Se descuenta Seguro Educativo.';
COMMENT ON COLUMN hr.employment_types.severance_pct IS 'Porcentaje indemnizacion al terminar contrato. 6.00 obra_determinada (fin de fase). 0 resto.';
COMMENT ON COLUMN hr.employment_types.short_name IS 'Display compacto para UI dropdowns y tablas.';
COMMENT ON COLUMN hr.employment_types.sop_reference IS 'Codigo SOP donde se documenta este tipo. R26 traceability.';
COMMENT ON COLUMN hr.employment_types.ss_applies IS 'Se descuenta Seguro Social.';
COMMENT ON COLUMN hr.employment_types.union_fee_pct IS 'Cuota sindical Suntracs. 1.00 obra_determinada construccion. 0 resto.';
COMMENT ON COLUMN hr.employments.app_role IS 'Rol HumanOS de la persona en su empleo current: employee (default), hr_admin (equipo RRHH), president (Gerencia General), admin (tecnico). NO existe valor supervisor — ser supervisor emerge contextualmente de hr.employments.supervisor_id apuntando a esta persona.';
COMMENT ON COLUMN hr.employments.created_by IS 'Usuario auth que creó el registro.';
COMMENT ON COLUMN hr.employments.created_from IS 'Cómo se creó este registro: manual, migration (de Excel/Spectrum), promotion, transfer, rehire.';
COMMENT ON COLUMN hr.employments.department_id IS 'Departamento (FK a hr.org_units). NULL si department_text se usa como fallback.';
COMMENT ON COLUMN hr.employments.department_text IS 'Departamento como string si no está catalogado. Eventualmente debe migrarse a department_id.';
COMMENT ON COLUMN hr.employments.employment_type_id IS 'FK a hr.employment_types per IC-RH-D-05. Nullable transitoriamente para los 184 empleados pre-MVP. Reconciliacion gradual por Samantha (J-item backlog). REQUIRED en UI F4 nuevo empleado.';
COMMENT ON COLUMN hr.employments.hire_date IS 'Fecha de contratación de este empleo específico. Cambios de puesto que mantienen continuidad pueden tener mismo hire_date.';
COMMENT ON COLUMN hr.employments.hiring_source IS 'Cómo llegó el empleado: referido, web, agencia, recontratación, transferido. Para reportes de reclutamiento.';
COMMENT ON COLUMN hr.employments.is_current IS 'Generated: TRUE si valid_to IS NULL. Constraint garantiza solo un current por persona.';
COMMENT ON COLUMN hr.employments.office_id IS 'Ubicación principal de trabajo (FK a hr.locations). Para distinguir oficina vs proyecto vs campo.';
COMMENT ON COLUMN hr.employments.office_text IS 'Ubicación como string si no está catalogada.';
COMMENT ON COLUMN hr.employments.person_id IS 'Empleado al que pertenece este empleo.';
COMMENT ON COLUMN hr.employments.position_id IS 'Cargo formal (FK a hr.positions). NULL si position_text se usa como fallback.';
COMMENT ON COLUMN hr.employments.position_text IS 'Fallback string si no se ha catalogado el cargo en hr.positions. Eventualmente toda data debe usar position_id.';
COMMENT ON COLUMN hr.employments.supervisor_id IS 'Jefe directo (FK a hr.people). NULL = sin supervisor (presidente, primer nivel). Pattern de aprobación usa este campo como default sugerido.';
COMMENT ON COLUMN hr.employments.termination_date IS 'Fecha de terminación. NULL si empleo aún activo. Cuando se llena, también se llena valid_to.';
COMMENT ON COLUMN hr.employments.termination_reason IS 'Razón: renuncia, despido_con_causa, despido_sin_causa, jubilacion, mutuo_acuerdo, fallecimiento, fin_proyecto.';
COMMENT ON COLUMN hr.employments.valid_from IS 'Cuándo este registro de empleo empezó a ser vigente (SCD-2). Generalmente igual a hire_date pero pueden diferir en correcciones retroactivas.';
COMMENT ON COLUMN hr.employments.valid_to IS 'Cuándo dejó de ser vigente. NULL = empleo current. Al cambiar puesto, se cierra (valid_to=today) y se crea row nuevo.';
COMMENT ON COLUMN hr.invite_code_attempts.attempts IS 'Counter dentro de TTL window. Reset cuando window expira (sliding).';
COMMENT ON COLUMN hr.invite_code_attempts.blocked_until IS 'NULL si no bloqueado. Set cuando attempts >= MAX dentro de TTL window.';
COMMENT ON COLUMN hr.invite_code_attempts.first_attempt_at IS 'Timestamp primer attempt en TTL window actual. Base del sliding window.';
COMMENT ON COLUMN hr.invite_code_attempts.invite_code_id IS 'FK a hr.invite_codes; ON DELETE CASCADE.';
COMMENT ON COLUMN hr.invite_code_attempts.ip_address IS 'IP del requester (inet). Source: x-forwarded-for header (Vercel-injected).';
COMMENT ON COLUMN hr.invite_code_attempts.last_attempt_at IS 'Timestamp del attempt mas reciente.';
COMMENT ON COLUMN hr.invite_codes.code IS '8 chars alfanumericos. Unico. Generado server-side. Case-sensitive.';
COMMENT ON COLUMN hr.invite_codes.consumed_by_auth_id IS 'auth.users.id creado durante sign-up. Vinculacion es 1:1 con hr.people.auth_id.';
COMMENT ON COLUMN hr.invite_codes.delivery_target IS 'A donde se envio: email address, phone number, entregado fisico, etc.';
COMMENT ON COLUMN hr.invite_codes.expires_at IS 'Default +30 dias. Si expira sin consumir, hr_admin debe regenerar.';
COMMENT ON COLUMN hr.invite_codes.invite_method IS 'Como se entrego al empleado: email, whatsapp (v1.1), paper (impreso), in_person.';
COMMENT ON COLUMN hr.invite_codes.person_id IS 'Persona en hr.people a la que se vincula auth.user resultante del sign-up.';
COMMENT ON COLUMN hr.invite_codes.validated_at IS 'NEW.A Batch 3 - timestamp del primer attempt que paso gates code+cedula. NULL hasta primera validacion exitosa. No se resetea sin regenerate.';
COMMENT ON COLUMN hr.invite_codes.validated_delivery_target_hash IS 'NEW.A Batch 3 - SHA256 hex del primer delivery_target normalizado que paso gates. Attempts subsecuentes con hash distinto = REJECTED (kills cross-app enumeration oracle). Rescue: F5 regenerate-invite emite nuevo code con columnas NULL.';
COMMENT ON COLUMN hr.leave_assignments.accrual_start_date IS 'When accrual begins (>= hire date; enforced app/RPC).';
COMMENT ON COLUMN hr.leave_assignments.deleted_at IS 'Soft-delete. NULL = active.';
COMMENT ON COLUMN hr.leave_assignments.source_system IS 'Row provenance.';
COMMENT ON COLUMN hr.leave_balances.available IS 'accrued - used - pending = the "dias disponibles" value the VACACIONES form reads (source: computed).';
COMMENT ON COLUMN hr.leave_balances.pending IS 'Approved-but-future + in-flight ticket reservations.';
COMMENT ON COLUMN hr.leave_ledger.amount IS 'Signed units: + accrual/grant, - usage/payout.';
COMMENT ON COLUMN hr.leave_ledger.balance_after IS 'Running net balance through this row.';
COMMENT ON COLUMN hr.leave_ledger.event_date IS 'Business date (separate from created_at system date).';
COMMENT ON COLUMN hr.leave_ledger.reversal_of_id IS 'For kind=reversal: the ledger row being reversed.';
COMMENT ON COLUMN hr.leave_ledger.source_ticket_id IS 'Approved requests.tickets that produced this entry.';
COMMENT ON COLUMN hr.leave_policies.accrual_method IS 'lump_sum|periodic|hourly|unlimited.';
COMMENT ON COLUMN hr.leave_policies.accrual_rate IS 'Units accrued per accrual_frequency period.';
COMMENT ON COLUMN hr.leave_policies.carryover_limit IS 'Max units carried to next year; NULL = unlimited.';
COMMENT ON COLUMN hr.leave_policies.deleted_at IS 'Soft-delete (no hard deletes). NULL = active.';
COMMENT ON COLUMN hr.leave_policies.employment_type_id IS 'FK hr.employment_types; NULL = applies to all. Panama vacaciones rules differ by contract type.';
COMMENT ON COLUMN hr.leave_policies.max_balance_cap IS 'Max balance; NULL = uncapped.';
COMMENT ON COLUMN hr.leave_policies.source_system IS 'Row provenance: humanos|payday|manual_entry.';
COMMENT ON COLUMN hr.leave_policies.unit IS 'days|hours. One unit per policy.';
COMMENT ON COLUMN hr.locations.code IS 'Código corto (ej: "OFI-CTL", "PRY-L3").';
COMMENT ON COLUMN hr.locations.is_active IS 'FALSE = ubicación cerrada (proyecto terminado).';
COMMENT ON COLUMN hr.locations.location_type IS 'office (oficina corporativa), project (obra de campo), workshop (taller mecánico), remote (trabajo a distancia), other.';
COMMENT ON COLUMN hr.locations.movimientos_location_id IS 'Soft reference a public.locations.id (sin FK cross-schema). Para mapping eventual.';
COMMENT ON COLUMN hr.locations.name IS 'Nombre de la ubicación (ej: "Oficina Central", "Proyecto Línea 3", "Taller").';
COMMENT ON COLUMN hr.locations.notes IS 'Notas: dirección física, contacto del supervisor, condiciones especiales.';
COMMENT ON COLUMN hr.medical_info.allergies IS 'Alergias conocidas (texto libre): medicamentos, alimentos, materiales.';
COMMENT ON COLUMN hr.medical_info.blood_type IS 'Tipo de sangre. Crítico para construcción (accidentes). A+, A-, B+, B-, AB+, AB-, O+, O-.';
COMMENT ON COLUMN hr.medical_info.chronic_conditions IS 'Condiciones crónicas relevantes para SSO (diabetes, hipertensión, asma).';
COMMENT ON COLUMN hr.medical_info.css_number IS 'Número de Caja de Seguro Social (CSS) de Panamá.';
COMMENT ON COLUMN hr.medical_info.current_medications IS 'Medicamentos actuales. Importante en caso de emergencia.';
COMMENT ON COLUMN hr.medical_info.doctor_name IS 'Médico de cabecera.';
COMMENT ON COLUMN hr.medical_info.doctor_phone IS 'Contacto del médico de cabecera.';
COMMENT ON COLUMN hr.medical_info.medical_insurance_number IS 'Número de póliza.';
COMMENT ON COLUMN hr.medical_info.medical_insurance_provider IS 'Aseguradora (ASSA, Mapfre, Internacional de Seguros, etc.).';
COMMENT ON COLUMN hr.medical_info.notes IS 'Notas adicionales relevantes para emergencias.';
COMMENT ON COLUMN hr.medical_info.person_id IS 'Empleado al que pertenece la info médica (1:1 unique).';
COMMENT ON COLUMN hr.medical_info.updated_by IS 'Quién actualizó el registro (empleado dueño o hr_admin).';
COMMENT ON COLUMN hr.org_units.code IS 'Código corto opcional para reportes (ej: "CON", "ING").';
COMMENT ON COLUMN hr.org_units.is_active IS 'FALSE = departamento histórico/disuelto. Empleados pasados aún linkean a él.';
COMMENT ON COLUMN hr.org_units.name IS 'Nombre del departamento (ej: "Construcción", "Ingeniería", "Recursos Humanos").';
COMMENT ON COLUMN hr.org_units.parent_id IS 'Departamento padre para jerarquía. NULL = top-level. Ej: "Construcción" → "Obra Línea 3".';
COMMENT ON COLUMN hr.people.auth_id IS 'FK a auth.users.id de Supabase Auth. NULL = persona registrada en BD sin login activo (ex-empleado, persona en proceso de onboarding).';
COMMENT ON COLUMN hr.people.created_from IS 'Sistema fuente: manual | movimientos | excel_samantha | payday | onboarding | humanos_v1.';
COMMENT ON COLUMN hr.people.date_of_birth IS 'Fecha de nacimiento. Para cálculos: edad mínima para contratar, jubilación, beneficios por edad.';
COMMENT ON COLUMN hr.people.employee_code IS 'Código de empleado Spectrum (ej: VAL130). Puede ser NULL para empleados que no están en Spectrum.';
COMMENT ON COLUMN hr.people.full_name IS 'Nombre completo formal (ej: "Adolfo Antonio Valderrama Mendoza"). Para documentos legales.';
COMMENT ON COLUMN hr.people.gender IS 'Género auto-reportado por el empleado. Para estadísticas demográficas y formularios oficiales (CSS).';
COMMENT ON COLUMN hr.people.id IS 'UUID inmutable. Natural key del sistema. Referenciado por todas las tablas hr/requests/docs/etc.';
COMMENT ON COLUMN hr.people.marital_status IS 'Estado civil. Para trámites legales y beneficios (cónyuge en seguro).';
COMMENT ON COLUMN hr.people.national_id IS 'Cédula panameña o pasaporte. Natural key cuando existe. Puede ser NULL durante onboarding o casos especiales.';
COMMENT ON COLUMN hr.people.nationality IS 'Nacionalidad (default Panamá). Para trámites de visas, permisos de trabajo.';
COMMENT ON COLUMN hr.people.needs_review IS 'TRUE si vino de consolidación automática con conflictos no resueltos. RRHH debe revisar.';
COMMENT ON COLUMN hr.people.num_dependents IS 'Número de dependientes (para ISR y beneficios). Actualizable por empleado via solicitud actualización datos.';
COMMENT ON COLUMN hr.people.photo_url IS 'URL en Supabase Storage. Para directorio interno, gafetes, perfiles.';
COMMENT ON COLUMN hr.people.preferred_name IS 'Nombre como prefiere ser llamado en comunicación interna (ej: "Adolfo" o "Tonito"). Default = primer nombre de full_name si NULL.';
COMMENT ON COLUMN hr.people.review_notes IS 'Notas cuando needs_review=true: qué conflicto se encontró en consolidación. Ej: "Dos rows en Excel con cédula similar".';
COMMENT ON COLUMN hr.people.source_record_id IS 'ID externo del sistema fuente al consolidar. Ej: "VAL130" si vino de Spectrum, fila Excel si vino de Excel.';
COMMENT ON COLUMN hr.people.status IS 'Estado en ICONSA: Activo | Inactivo | Suspendido | Vacaciones. Default Activo. Cambiar a Inactivo NO borra row.';
COMMENT ON COLUMN hr.person_sources.external_data IS 'Snapshot de los datos originales del sistema fuente. Para audit y rollback.';
COMMENT ON COLUMN hr.person_sources.external_id IS 'ID en el sistema fuente. Ej: "VAL130" en Spectrum, row 23 en Excel.';
COMMENT ON COLUMN hr.person_sources.last_synced_at IS 'Última vez que se sincronizó con el sistema fuente. Para detectar drift de datos.';
COMMENT ON COLUMN hr.person_sources.person_id IS 'Persona consolidada en hr.people.';
COMMENT ON COLUMN hr.person_sources.source_system IS 'Sistema fuente: movimientos (public.people), excel_samantha, payday, spectrum, manual (HR creó), humanos_v1, onboarding.';
COMMENT ON COLUMN hr.personal_documents.document_name IS 'Nombre descriptivo (ej: "Cédula vigente 2024", "Diploma Ingeniería Civil USMA").';
COMMENT ON COLUMN hr.personal_documents.document_type IS 'cedula_scan, pasaporte, contrato, certificacion, diploma, licencia_conducir, curriculum, foto_perfil, examen_medico, otro.';
COMMENT ON COLUMN hr.personal_documents.expires_at IS 'Fecha de expiración del documento (cédula vence, contratos temporales vencen). Trigger notificación al expiring.';
COMMENT ON COLUMN hr.personal_documents.file_size_bytes IS 'Tamaño en bytes para UI y storage management.';
COMMENT ON COLUMN hr.personal_documents.file_url IS 'Path en Supabase Storage. Bucket separado con RLS estricta. Sensitive máxima.';
COMMENT ON COLUMN hr.personal_documents.is_active IS 'FALSE = doc archivado/reemplazado por versión nueva pero conservado por compliance.';
COMMENT ON COLUMN hr.personal_documents.mime_type IS 'MIME type (application/pdf, image/jpeg, etc.).';
COMMENT ON COLUMN hr.personal_documents.person_id IS 'Empleado dueño del documento.';
COMMENT ON COLUMN hr.personal_documents.uploaded_by IS 'Quién subió el doc (empleado dueño, hr_admin, sistema).';
COMMENT ON COLUMN hr.positions.is_active IS 'FALSE = cargo descontinuado, ya no se asigna pero empleos históricos lo referencian.';
COMMENT ON COLUMN hr.positions.is_supervisor_position IS 'TRUE = este cargo típicamente tiene reportes directos. Para auto-asignar app_role=supervisor en hr.employments.';
COMMENT ON COLUMN hr.positions.level IS 'Nivel jerárquico numérico (1=entry, 5=manager, 7=director). Para reportes y bandas salariales.';
COMMENT ON COLUMN hr.positions.title IS 'Cargo formal (ej: "Gerente de Proyectos", "Capataz", "Ingeniero Civil Senior").';
COMMENT ON COLUMN hr.user_settings.notification_sms_enabled IS 'v1.1 cuando se integre Twilio SMS.';
COMMENT ON COLUMN hr.user_settings.notification_whatsapp_enabled IS 'v1.1 cuando se integre Twilio WhatsApp Business API.';
COMMENT ON COLUMN hr.user_settings.preferences IS 'JSONB extensible para futuras preferences sin requerir migration: dashboard_columns, color_theme, kb_default_view, etc.';
COMMENT ON TABLE hr.addresses IS 'Direcciones físicas de empleados. Soporta histórico (valid_from/to) para SCD pattern.';
COMMENT ON TABLE hr.contacts IS 'Datos de contacto: propio (phone/email del empleado) y de terceros (emergencia, cónyuge). is_primary marca contacto principal por tipo.';
COMMENT ON TABLE hr.employment_types IS 'Catalogo tipos contrato laboral ICONSA segun IC-RH-D-05. SOR de reglas operacionales: vacaciones, XIII, indemnizacion, SS/SE/ISR, cuota sindical Suntracs. FormEngine y ApprovalEngine consultan esta tabla para logica condicional por tipo.';
COMMENT ON TABLE hr.employments IS 'SCD Type 2 — historial completo de empleo. Cambios de puesto/supervisor/departamento crean nuevo row (no UPDATE). Empleo vigente: is_current = TRUE.';
COMMENT ON TABLE hr.invite_code_attempts IS 'NEW.A Batch 3 rate-limit tracking per (invite_code, IP). Writes solo via hr.check_invite_code_rate_limit() SECURITY DEFINER. RLS: SELECT hr_admin (soporte/debug); INSERT/UPDATE solo definer fn. TTL 15 min sliding, max 5 attempts, block 15 min.';
COMMENT ON TABLE hr.invite_codes IS 'Codigos invite de un solo uso para sign-up flow. hr_admin genera via /admin/empleados/[id]/invitar. Consumido al completar /onboarding/[code] wizard. Triple validacion: code + national_id + employee_code.';
COMMENT ON TABLE hr.leave_assignments IS 'Binds a leave policy to an employee. DB-VISION 2026-05-29.';
COMMENT ON TABLE hr.leave_balances IS 'Read-optimized projection of hr.leave_ledger per assignment. Maintained by hr.post_leave_ledger_entry RPC, never hand-edited. DB-VISION 2026-05-29.';
COMMENT ON TABLE hr.leave_ledger IS 'Append-only leave transaction ledger (SOURCE OF TRUTH). DB-VISION 2026-05-29. Corrections = compensating rows (kind=reversal), never UPDATE/DELETE. Immutable (no updated_at/deleted_at).';
COMMENT ON TABLE hr.leave_policies IS 'Leave/time-off policy rules (vacaciones, permisos). SOR for accrual config. DB-VISION 2026-05-29. employment_type_id NULL = applies to all contract types.';
COMMENT ON TABLE hr.locations IS 'Catálogo de ubicaciones físicas ICONSA. Paralelo a public.locations de MovimientOS hasta consolidación futura.';
COMMENT ON TABLE hr.medical_info IS 'Información médica del empleado. SENSITIVE máxima: RLS muy estricta. 1:1 con hr.people.';
COMMENT ON TABLE hr.org_units IS 'Catálogo de departamentos / unidades organizacionales (Ingeniería, Construcción, RRHH, Administración, etc.).';
COMMENT ON TABLE hr.people IS 'ICONSA master people — identity layer. Cross-app: usado por HumanOS, eventualmente MovimientOS y futuras apps. Identidad mínima. Datos laborales en hr.employments. Contactos en hr.contacts. Docs en hr.personal_documents.';
COMMENT ON TABLE hr.person_sources IS 'Lineage tracking — quién es esta persona en cada sistema fuente. Útil para sync, reconciliación, audit.';
COMMENT ON TABLE hr.personal_documents IS 'Docs personales (scans, contratos, certificados). SENSITIVE: RLS estricta — solo empleado dueño + hr_admin. Files en Supabase Storage.';
COMMENT ON TABLE hr.positions IS 'Catálogo de cargos / posiciones (Gerente de Proyectos, Capataz, Ingeniero, etc.).';
COMMENT ON TABLE hr.user_settings IS 'Preferencias usuario para F33 /settings. 1:1 con hr.people. NotificationEngine respeta estas flags. preferences jsonb para extensiones futuras sin migrations.';

-- ----- schema: requests -----
COMMENT ON COLUMN requests.approvals.approver_id IS 'Persona específica asignada. Para supervisor: resuelto al crear ticket. Para hr_admin: queda NULL hasta que uno del equipo tome el ticket o se asigne explícitamente.';
COMMENT ON COLUMN requests.approvals.approver_role IS 'Rol esperado: supervisor (resuelto via hr.employments), hr_admin (cualquiera del equipo), president (Rodrigo), specific_person (persona específica configurada).';
COMMENT ON COLUMN requests.approvals.comments IS 'Comentarios del aprobador. Visibles al solicitante. Para notas internas usar requests.comments con is_internal=true.';
COMMENT ON COLUMN requests.approvals.decision IS 'Pendiente (default) | Aprobada | Rechazada | Modificada (creó revisión) | Devuelta_Info (solicita más info al requester).';
COMMENT ON COLUMN requests.approvals.decision_at IS 'Cuándo se tomó la decisión.';
COMMENT ON COLUMN requests.approvals.delegated_at IS 'Cuándo se delegó.';
COMMENT ON COLUMN requests.approvals.delegated_to_id IS 'Workday-style delegation. Si Samantha está OOO y delega a Rocío, delegated_to_id=Rocío. La decisión la toma delegated_to pero approver_id queda como histórico.';
COMMENT ON COLUMN requests.approvals.delegation_reason IS 'Razón de la delegación (vacaciones, conflicto de interés, carga).';
COMMENT ON COLUMN requests.approvals.stamp_data IS 'JSON con metadata legal del sello: {signer_id, signer_email, ip, user_agent, signed_at, geo}. Para audit y compliance.';
COMMENT ON COLUMN requests.approvals.stamp_text IS 'Sello formateado: "Aprobado por [Nombre], [Fecha hora]". Visible en PDF generado.';
COMMENT ON COLUMN requests.approvals.step_order IS 'Orden del paso en el chain (0-indexed). Coincide con tickets.current_step cuando es el paso activo.';
COMMENT ON COLUMN requests.approvals.ticket_id IS 'Ticket al que pertenece este paso.';
COMMENT ON COLUMN requests.audit_log.action IS 'Acción semántica: created, submitted, assigned, approved, rejected, commented, modified, etc.';
COMMENT ON COLUMN requests.audit_log.actor_id IS 'Persona que causó el cambio.';
COMMENT ON COLUMN requests.audit_log.field_changed IS 'Si la acción es un update, el campo específico modificado.';
COMMENT ON COLUMN requests.audit_log.metadata IS 'Contexto adicional: IP, user_agent, session_id, request_id. Para investigaciones forenses.';
COMMENT ON COLUMN requests.audit_log.new_value IS 'Valor nuevo (JSON).';
COMMENT ON COLUMN requests.audit_log.old_value IS 'Valor anterior (JSON para preservar tipo y estructura).';
COMMENT ON COLUMN requests.audit_log.ticket_id IS 'Ticket sobre el que se registra el cambio.';
COMMENT ON COLUMN requests.comments.author_id IS 'Quien escribe el comentario.';
COMMENT ON COLUMN requests.comments.body IS 'Contenido del comentario (puede ser markdown).';
COMMENT ON COLUMN requests.comments.is_internal IS 'TRUE = solo visible a hr_admin (notas internas, ej: "Verificar pago anterior"). FALSE = visible al solicitante y todos en chain.';
COMMENT ON COLUMN requests.comments.ticket_id IS 'Ticket sobre el que se comenta.';
COMMENT ON COLUMN requests.notifications.body IS 'Cuerpo plain text del mensaje.';
COMMENT ON COLUMN requests.notifications.channel IS 'Canal de envío. Una notificación lógica puede generar múltiples rows (email + in_app + whatsapp).';
COMMENT ON COLUMN requests.notifications.error_message IS 'Si status=failed, mensaje del error para debugging.';
COMMENT ON COLUMN requests.notifications.notification_type IS 'Tipo semántico: submitted, assigned, approved, rejected, modified, comment_added, sla_warning, etc.';
COMMENT ON COLUMN requests.notifications.read_at IS 'Cuándo el usuario marcó como leída.';
COMMENT ON COLUMN requests.notifications.recipient_id IS 'Persona que recibe la notificación.';
COMMENT ON COLUMN requests.notifications.sent_at IS 'Timestamp del envío exitoso al proveedor (Resend/Twilio).';
COMMENT ON COLUMN requests.notifications.status IS 'pending (no enviada) | sent (enviada al proveedor) | failed (error) | read (usuario abrió).';
COMMENT ON COLUMN requests.notifications.subject IS 'Asunto (para email) o título (para in_app/push).';
COMMENT ON COLUMN requests.notifications.ticket_id IS 'Ticket que generó la notificación. NULL = notificación general no asociada a ticket específico.';
COMMENT ON COLUMN requests.revisions.fields_changed IS 'Array denormalizado de campos que cambiaron. Permite query rápida "qué cambió" sin diff de JSONs.';
COMMENT ON COLUMN requests.revisions.new_form_data IS 'Valores nuevos propuestos por el aprobador.';
COMMENT ON COLUMN requests.revisions.old_form_data IS 'Snapshot completo de tickets.form_data antes de la modificación. Para audit.';
COMMENT ON COLUMN requests.revisions.reason IS 'Razón explicada por el aprobador del por qué propone modificar.';
COMMENT ON COLUMN requests.revisions.responded_at IS 'Cuándo respondió.';
COMMENT ON COLUMN requests.revisions.responded_by IS 'Solicitante (requester) que aceptó/rechazó la propuesta.';
COMMENT ON COLUMN requests.revisions.response_comments IS 'Comentarios del requester al aceptar/rechazar.';
COMMENT ON COLUMN requests.revisions.revised_at IS 'Cuándo se solicitó la revisión.';
COMMENT ON COLUMN requests.revisions.revised_by IS 'Aprobador que solicitó modificar el valor.';
COMMENT ON COLUMN requests.revisions.status IS 'Pendiente_Aceptacion (esperando al requester) | Aceptada (continúa chain) | Rechazada (requester no aceptó, ticket queda cerrado o vuelve a aprobador).';
COMMENT ON COLUMN requests.revisions.ticket_id IS 'Ticket al que pertenece esta revisión.';
COMMENT ON COLUMN requests.sequences.current_value IS 'Último valor emitido. Incrementar y retornar atómicamente al generar nuevo.';
COMMENT ON COLUMN requests.sequences.format IS 'Template de formato con placeholders: {year}, {value:04d}, etc. Ej: "HUM-{year}-{value:04d}" → "HUM-2026-0001".';
COMMENT ON COLUMN requests.sequences.prefix IS 'Prefijo string (HUM para HumanOS, MOV para MovimientOS si lo usa).';
COMMENT ON COLUMN requests.sequences.seq_type IS 'Tipo de secuencia (ticket_number, case_number).';
COMMENT ON COLUMN requests.tickets.created_by_hr_admin IS 'Si manual_entry=true, hr_admin que creó el ticket. NULL si manual_entry=false (creado por el propio requester).';
COMMENT ON COLUMN requests.tickets.current_assignee_id IS 'Aprobador en turno actual. Quien ve el ticket en su "bandeja de aprobaciones". Cambia con el chain.';
COMMENT ON COLUMN requests.tickets.current_step IS 'Índice del paso actual en approval_chain (0-indexed). Cambia al avanzar el chain.';
COMMENT ON COLUMN requests.tickets.form_data IS 'Datos llenados por el solicitante según form_schema del tipo. Estructura libre por tipo.';
COMMENT ON COLUMN requests.tickets.manual_entry IS 'TRUE si ticket fue creado por hr_admin en nombre del empleado (F32 /admin/solicitudes/manual-entry). Foto del formulario papel original adjunta via files.uploads con entity_table=tickets, entity_id=ticket.id, category=original_paper_form. Para personal sin acceso digital y migration period papel-digital.';
COMMENT ON COLUMN requests.tickets.notes IS 'Notas libres del solicitante o hr_admin. Diferente a comments (no es conversación).';
COMMENT ON COLUMN requests.tickets.parent_ticket_id IS 'Para relaciones entre tickets: un memo de amonestación puede ser hijo del ticket de reclamo. Permite forest de tickets relacionados.';
COMMENT ON COLUMN requests.tickets.priority IS 'low/normal/high/urgent. Define color de UI y orden en bandejas. Default normal.';
COMMENT ON COLUMN requests.tickets.processed_at IS 'Timestamp del paso procesado por planillas.';
COMMENT ON COLUMN requests.tickets.processed_by IS 'Solo para ACCION_PERSONAL: hr_admin que marca procesado por Asistente Planillas (paso 2 de R8).';
COMMENT ON COLUMN requests.tickets.received_at IS 'Timestamp del paso recibido por RRHH.';
COMMENT ON COLUMN requests.tickets.received_by IS 'Solo para ACCION_PERSONAL: hr_admin que marca recibido en RRHH (paso 1 de R8 per SOP F-05-01).';
COMMENT ON COLUMN requests.tickets.requester_id IS 'Persona que crea la solicitud. SIEMPRE el dueño del ticket, aunque current_assignee cambie con el chain.';
COMMENT ON COLUMN requests.tickets.resolved_at IS 'Cuando ticket llegó a estado terminal (Aprobada/Rechazada/Cancelada/Completada).';
COMMENT ON COLUMN requests.tickets.selected_supervisor_id IS 'Override del solicitante cuando type permite allow_supervisor_override. NULL = usa el de hr.employments del solicitante.';
COMMENT ON COLUMN requests.tickets.sla_deadline IS 'Fecha/hora cálculada de submitted_at + sla_hours. Sirve para queries de "tickets vencidos" y notificaciones.';
COMMENT ON COLUMN requests.tickets.sla_hours IS 'Horas para resolver. Tomado de requests.types.sla_hours al crear, pero puede ajustarse por ticket.';
COMMENT ON COLUMN requests.tickets.status IS 'Estado lifecycle: Borrador (sin enviar) → Enviada → En_Revision → Devuelta_Modificacion (back-and-forth) → Aprobada/Rechazada → Completada (procesada por RRHH).';
COMMENT ON COLUMN requests.tickets.submitted_at IS 'Cuando solicitante cambió status de Borrador a Enviada. Inicio del SLA.';
COMMENT ON COLUMN requests.tickets.tags IS 'Array de tags libres asignables por hr_admin: ["urgente", "proyecto-X", "auditado"].';
COMMENT ON COLUMN requests.tickets.ticket_number IS 'Identificador legible auto-generado (formato HUM-{year}-{0001}). Usado en UI, emails, conversaciones.';
COMMENT ON COLUMN requests.tickets.type_id IS 'Tipo de solicitud (FK a requests.types). Define form_schema, approval_chain, SLA.';
COMMENT ON COLUMN requests.types.allow_supervisor_override IS 'TRUE = solicitante puede elegir un supervisor distinto al de hr.employments. Para casos como aprobación por jefe de proyecto vs jefe jerárquico.';
COMMENT ON COLUMN requests.types.approval_chain_template IS 'JSONB con estructura {mode, visibility, steps[]}. Modes: parallel (todos stakeholders notificados dia 0, RRHH siempre incluido), direct_hr_admin (sin chain, cualquier hr_admin), any_of_hr (similar pero semantic distinct para documentos), parent_only (tipo parent sin chain real). Steps con resolver: selected_supervisor_id (override solicitante), any_hr_admin, president_user. Visibility universal: todos stakeholders ven el ticket desde dia 0.';
COMMENT ON COLUMN requests.types.category IS 'Agrupación funcional: compensacion, permisos, documentos, capacitacion, seguridad, datos_personales, externo.';
COMMENT ON COLUMN requests.types.code IS 'Identificador semántico único (ej: VACACIONES, PRESTAMO, CONSTANCIA_TRABAJO, ACCION_PERSONAL_AUMENTO).';
COMMENT ON COLUMN requests.types.description IS 'Texto explicativo del tipo de solicitud, mostrado al solicitante antes de iniciar.';
COMMENT ON COLUMN requests.types.form_schema IS 'JSON Schema del formulario: campos, tipos, validaciones, opciones de dropdowns. Renderizado dinámicamente en UI.';
COMMENT ON COLUMN requests.types.icon IS 'Nombre de icono Lucide para UI (ej: "FileText", "Calendar", "DollarSign").';
COMMENT ON COLUMN requests.types.is_active IS 'FALSE = tipo deprecado, no aparece como opción nueva pero tickets viejos lo siguen referenciando.';
COMMENT ON COLUMN requests.types.name IS 'Nombre visible en UI al solicitante (ej: "Solicitud de Vacaciones").';
COMMENT ON COLUMN requests.types.parent_type_id IS 'Self-reference para jerarquía. Sub-tipos de Acción de Personal (AUMENTO_SALARIO, DESPIDO, etc.) tienen parent = ACCION_PERSONAL.';
COMMENT ON COLUMN requests.types.sla_hours IS 'Horas dentro de las cuales debe resolverse esta solicitud. Genera sla_deadline en ticket al crearse. NULL = sin SLA.';
COMMENT ON COLUMN requests.types.sop_file_url IS 'Ruta al PDF del SOP en repo o storage para consulta del solicitante.';
COMMENT ON COLUMN requests.types.sop_reference IS 'Código del SOP ICONSA asociado (ej: "IC-RH-F-05-01"). Linkea solicitud con procedimiento oficial.';
COMMENT ON COLUMN requests.watchers.notify_on IS 'Eventos por los que quiere ser notificado: decision, comment, modification, status_change. Default todos.';
COMMENT ON COLUMN requests.watchers.ticket_id IS 'Ticket al que el usuario subscribe.';
COMMENT ON COLUMN requests.watchers.watch_reason IS 'Por qué sigue: requester (automático), approver (automático), mentioned (lo mencionaron en comment), manual (se suscribió voluntariamente).';
COMMENT ON COLUMN requests.watchers.watcher_id IS 'Persona que sigue el ticket.';
COMMENT ON TABLE requests.approvals IS 'Pasos de aprobación. stamp_data rico para audit legal. delegated_to_id soporta Workday-style delegation cuando aprobador está OOO.';
COMMENT ON TABLE requests.audit_log IS 'Audit inmutable de cambios en tickets. INSERT-only via app logic.';
COMMENT ON TABLE requests.comments IS 'Conversación en ticket. is_internal=true para notas internas RRHH no visibles al solicitante.';
COMMENT ON TABLE requests.notifications IS 'Log de todas las notificaciones enviadas. Audit + debugging + reportes.';
COMMENT ON TABLE requests.revisions IS 'Back-and-forth: aprobador modifica valor (ej: $300 → $200), solicitante debe aceptar antes de continuar chain.';
COMMENT ON TABLE requests.sequences IS 'Generador atómico de números secuenciales (ticket_number, etc.). Concurrencia-safe via UPDATE ... RETURNING.';
COMMENT ON TABLE requests.tickets IS 'Solicitudes RRHH. Attachments via files.uploads con entity_schema=''requests'', entity_table=''tickets'', entity_id=ticket.id. current_assignee_id apunta al aprobador en turno. selected_supervisor_id es el override del solicitante cuando aplica.';
COMMENT ON TABLE requests.types IS 'Catálogo de tipos de solicitud. Soporta jerarquía via parent_type_id (ej: ACCION_PERSONAL con sub-tipos AUMENTO_SALARIO, DESPIDO, PERMISOS, HORAS_EXTRAS, DESCUENTO, LIQUIDACION).';
COMMENT ON TABLE requests.watchers IS 'Subscribers a un ticket. Reciben notificaciones según notify_on. Jira/ServiceNow pattern.';

-- ----- schema: docs -----
COMMENT ON COLUMN docs.acknowledgments.acknowledged_at IS 'Timestamp del reconocimiento.';
COMMENT ON COLUMN docs.acknowledgments.ip_address IS 'IP de la persona al reconocer. Para audit.';
COMMENT ON COLUMN docs.acknowledgments.notes IS 'Notas opcionales del empleado o hr_admin.';
COMMENT ON COLUMN docs.acknowledgments.person_id IS 'Empleado que reconoció haber leído.';
COMMENT ON COLUMN docs.acknowledgments.signature_method IS 'click (botón "Acepto y leí"), digital_stamp (sello automático), signed_pdf (PDF firmado adjunto).';
COMMENT ON COLUMN docs.acknowledgments.sop_version_id IS 'Versión específica del SOP reconocida. Si SOP cambia después, este ack queda con la versión vieja (correcto para compliance).';
COMMENT ON COLUMN docs.acknowledgments.user_agent IS 'User agent del navegador para audit.';
COMMENT ON COLUMN docs.article_acknowledgments.acknowledged_at IS 'Cuándo reconoció.';
COMMENT ON COLUMN docs.article_acknowledgments.article_version_id IS 'Versión específica del artículo reconocida.';
COMMENT ON COLUMN docs.article_acknowledgments.ip_address IS 'IP para audit.';
COMMENT ON COLUMN docs.article_acknowledgments.notes IS 'Notas opcionales.';
COMMENT ON COLUMN docs.article_acknowledgments.person_id IS 'Empleado que reconoció haber leído.';
COMMENT ON COLUMN docs.article_acknowledgments.reading_duration_seconds IS 'Tiempo aproximado que el empleado estuvo en la página antes de marcar como leído. Anti-fraude soft (no determinístico pero útil).';
COMMENT ON COLUMN docs.article_acknowledgments.signature_method IS 'click (botón), digital_stamp, signed_pdf.';
COMMENT ON COLUMN docs.article_acknowledgments.user_agent IS 'User agent del navegador.';
COMMENT ON COLUMN docs.article_categories.description IS 'Descripción de la categoría.';
COMMENT ON COLUMN docs.article_categories.icon IS 'Icono Lucide para sidebar/navegación.';
COMMENT ON COLUMN docs.article_categories.is_active IS 'FALSE = categoría oculta pero artículos siguen accesibles via search.';
COMMENT ON COLUMN docs.article_categories.name IS 'Nombre visible (ej: "Políticas de Permisos", "Beneficios").';
COMMENT ON COLUMN docs.article_categories.parent_id IS 'Self-reference para jerarquía. NULL = root category.';
COMMENT ON COLUMN docs.article_categories.slug IS 'URL-safe identifier para rutas /wiki/[slug].';
COMMENT ON COLUMN docs.article_categories.sort_order IS 'Orden de aparición en navegación. Menor número aparece primero.';
COMMENT ON COLUMN docs.article_versions.article_id IS 'Artículo al que pertenece esta versión.';
COMMENT ON COLUMN docs.article_versions.body_html IS 'HTML pre-renderizado para mostrar. Generado al publicar para evitar re-render en cada vista.';
COMMENT ON COLUMN docs.article_versions.body_markdown IS 'Source markdown editado en TipTap/editor. Source of truth.';
COMMENT ON COLUMN docs.article_versions.change_notes IS 'Resumen de cambios respecto a versión anterior.';
COMMENT ON COLUMN docs.article_versions.edited_by IS 'Última persona que editó (puede diferir de published_by).';
COMMENT ON COLUMN docs.article_versions.is_current IS 'TRUE = versión activa. Constraint: solo una current por article.';
COMMENT ON COLUMN docs.article_versions.is_draft IS 'TRUE = borrador WIP, no visible al público. Solo author y reviewer ven.';
COMMENT ON COLUMN docs.article_versions.published_at IS 'Cuándo se publicó esta versión.';
COMMENT ON COLUMN docs.article_versions.published_by IS 'Quien publicó.';
COMMENT ON COLUMN docs.article_versions.title IS 'Título en esta versión (puede cambiar entre versiones).';
COMMENT ON COLUMN docs.article_versions.version_number IS 'Versión secuencial (1, 2, 3...).';
COMMENT ON COLUMN docs.articles.author_id IS 'Autor del artículo.';
COMMENT ON COLUMN docs.articles.category_id IS 'Categoría jerárquica del artículo (FK a docs.article_categories).';
COMMENT ON COLUMN docs.articles.current_version_id IS 'FK a la versión vigente del artículo.';
COMMENT ON COLUMN docs.articles.is_published IS 'TRUE = visible al público interno. FALSE = borrador.';
COMMENT ON COLUMN docs.articles.is_required_reading IS 'TRUE = empleados en required_for_departments/roles deben acknowledge antes de continuar onboarding o tarea.';
COMMENT ON COLUMN docs.articles.related_articles IS 'Array de IDs de artículos relacionados (cross-references).';
COMMENT ON COLUMN docs.articles.related_sop_id IS 'Link opcional a SOP formal del que este artículo es elaboración (ej: artículo sobre vacaciones referencia IC-RH-F-05-03).';
COMMENT ON COLUMN docs.articles.required_for_departments IS 'Si is_required_reading=true, departamentos donde aplica obligación.';
COMMENT ON COLUMN docs.articles.required_for_roles IS 'Si is_required_reading=true, roles donde aplica obligación.';
COMMENT ON COLUMN docs.articles.reviewed_at IS 'Cuándo se revisó.';
COMMENT ON COLUMN docs.articles.reviewed_by IS 'Quien revisó/aprobó la publicación (típicamente Samantha o Rodrigo).';
COMMENT ON COLUMN docs.articles.search_keywords IS 'Sinónimos y términos coloquiales para mejorar búsqueda (ej: "permiso médico" para artículo de licencias).';
COMMENT ON COLUMN docs.articles.slug IS 'URL slug único (ej: "vacaciones-empleado-campo"). Para rutas /wiki/[slug].';
COMMENT ON COLUMN docs.articles.summary IS 'Resumen 1-2 frases para listings y previews.';
COMMENT ON COLUMN docs.articles.tags IS 'Tags libres para búsqueda y filtrado.';
COMMENT ON COLUMN docs.articles.title IS 'Título del artículo. Visible en listings y SEO.';
COMMENT ON COLUMN docs.articles.view_count IS 'Contador denormalizado de vistas. Para analytics y "más leídos".';
COMMENT ON COLUMN docs.articles.visibility IS 'Control de acceso: all_employees (público interno), hr_only (sensitive), managers_plus (jefes y arriba), specific_departments/roles (custom).';
COMMENT ON COLUMN docs.generated.file_format IS 'pdf (común), docx (editable), html (preview).';
COMMENT ON COLUMN docs.generated.file_url IS 'Path al archivo generado en Storage.';
COMMENT ON COLUMN docs.generated.for_person_id IS 'Persona sobre quien es el doc (a quien se entrega la carta de trabajo).';
COMMENT ON COLUMN docs.generated.generated_at IS 'Cuándo se generó.';
COMMENT ON COLUMN docs.generated.generated_by IS 'Quien generó el doc (hr_admin típicamente).';
COMMENT ON COLUMN docs.generated.notes IS 'Notas administrativas.';
COMMENT ON COLUMN docs.generated.related_ticket_id IS 'Ticket que originó la generación (ej: solicitud de carta de trabajo → genera el PDF).';
COMMENT ON COLUMN docs.generated.rendered_content IS 'Snapshot del contenido renderizado (HTML/texto). Para reproducibilidad si template cambia y necesitamos saber qué decía exactamente.';
COMMENT ON COLUMN docs.generated.stamp_data IS 'JSON con datos del sello de firma: {signer_id, signed_at, ip, signature_method}.';
COMMENT ON COLUMN docs.generated.template_version_id IS 'Template específico usado para generar este doc. Si template cambia después, este doc preserva la versión usada.';
COMMENT ON COLUMN docs.generated.variables_used IS 'JSON con las variables sustituidas: {employee_name: "Adolfo", position: "Capataz", date: "2026-05-24"}. Para audit.';
COMMENT ON COLUMN docs.signature_requests.completed_at IS 'Cuándo todos firmaron.';
COMMENT ON COLUMN docs.signature_requests.document_id IS 'Documento que requiere firma (FK a docs.generated).';
COMMENT ON COLUMN docs.signature_requests.expires_at IS 'Si no se completa antes, se cancela automáticamente.';
COMMENT ON COLUMN docs.signature_requests.external_id IS 'ID en el sistema externo (Documenso document_id, DocuSign envelope_id).';
COMMENT ON COLUMN docs.signature_requests.external_url IS 'URL externa donde signers van a firmar.';
COMMENT ON COLUMN docs.signature_requests.notes IS 'Notas del flujo de firma.';
COMMENT ON COLUMN docs.signature_requests.provider IS 'documenso (v1.1), docusign (futuro alternativa), manual (firma física), stamp (sello digital MVP).';
COMMENT ON COLUMN docs.signature_requests.requested_at IS 'Cuándo se solicitó.';
COMMENT ON COLUMN docs.signature_requests.requested_by IS 'Quien creó la solicitud (hr_admin típicamente).';
COMMENT ON COLUMN docs.signature_requests.required_signers IS 'Array de UUIDs de hr.people que deben firmar.';
COMMENT ON COLUMN docs.signature_requests.signed_by IS 'Array de UUIDs de quienes YA firmaron. Compara contra required_signers para status partial.';
COMMENT ON COLUMN docs.signature_requests.signed_file_url IS 'Path al PDF firmado final (con firmas embebidas).';
COMMENT ON COLUMN docs.signature_requests.status IS 'pending (sin enviar) → sent (enviado a signers) → partially_signed → completed (todos firmaron) → expired/cancelled.';
COMMENT ON COLUMN docs.sop_versions.change_notes IS 'Resumen de cambios respecto a versión anterior. Para changelog.';
COMMENT ON COLUMN docs.sop_versions.file_url IS 'Path al PDF en repo o Storage. Source of truth para la versión.';
COMMENT ON COLUMN docs.sop_versions.gdrive_url IS 'Link al PDF en Google Drive donde ICONSA tiene el original.';
COMMENT ON COLUMN docs.sop_versions.is_current IS 'TRUE = versión activa. Constraint: solo una current por SOP.';
COMMENT ON COLUMN docs.sop_versions.published_at IS 'Cuándo se publicó esta versión.';
COMMENT ON COLUMN docs.sop_versions.published_by IS 'Quién publicó (hr_admin típicamente).';
COMMENT ON COLUMN docs.sop_versions.sop_id IS 'SOP al que pertenece esta versión.';
COMMENT ON COLUMN docs.sop_versions.version_number IS 'Identificador de versión (ej: "VV01", "VV02", "v1.5"). Formato definido por ICONSA.';
COMMENT ON COLUMN docs.sops.category IS 'manual (M), documento (D), instructivo (IT), procedimiento (PO), formulario (F). Define render y permisos.';
COMMENT ON COLUMN docs.sops.code IS 'Código ISO ICONSA (ej: IC-RH-F-05-01, IC-RH-M-01). Identificador único.';
COMMENT ON COLUMN docs.sops.current_version_id IS 'FK a docs.sop_versions de la versión vigente. Denormalizado para query rápida.';
COMMENT ON COLUMN docs.sops.description IS 'Descripción larga del SOP. Mostrada en listings de KB.';
COMMENT ON COLUMN docs.sops.is_active IS 'FALSE = SOP obsoleto/retirado. No aparece en listings nuevos, acknowledgments históricos se mantienen.';
COMMENT ON COLUMN docs.sops.title IS 'Título descriptivo (ej: "Acciones de Personal", "Manual de Ética y Conducta").';
COMMENT ON COLUMN docs.template_versions.change_notes IS 'Resumen de cambios.';
COMMENT ON COLUMN docs.template_versions.css_styles IS 'CSS específico para el template (firma de ICONSA, layout de la carta).';
COMMENT ON COLUMN docs.template_versions.is_current IS 'TRUE = versión activa. Constraint: solo una current por template.';
COMMENT ON COLUMN docs.template_versions.published_at IS 'Cuándo se publicó.';
COMMENT ON COLUMN docs.template_versions.published_by IS 'Quién publicó.';
COMMENT ON COLUMN docs.template_versions.template_content IS 'Contenido del template en HTML/Markdown con placeholders {{employee_name}}, {{position}}, etc.';
COMMENT ON COLUMN docs.template_versions.template_id IS 'Template al que pertenece la versión.';
COMMENT ON COLUMN docs.template_versions.version_number IS 'Identificador de versión (v1, v2, etc.).';
COMMENT ON COLUMN docs.templates.code IS 'Identificador (ej: CARTA_TRABAJO, LIQUIDACION_GENERAL, MEMO_AMONESTACION).';
COMMENT ON COLUMN docs.templates.current_version_id IS 'FK a docs.template_versions vigente.';
COMMENT ON COLUMN docs.templates.description IS 'Para qué se usa.';
COMMENT ON COLUMN docs.templates.is_active IS 'FALSE = template descontinuado.';
COMMENT ON COLUMN docs.templates.name IS 'Nombre legible.';
COMMENT ON COLUMN docs.templates.template_type IS 'Tipo de doc generado: carta_trabajo (común), constancia, certificacion_laboral (formal), memo_amonestacion, liquidacion, aviso_descuento, recibo_prestamo, constancia_no_adeudo, otro.';
COMMENT ON TABLE docs.acknowledgments IS 'Empleados reconocen haber leído SOP. Linkea a versión específica.';
COMMENT ON TABLE docs.article_acknowledgments IS 'Empleados reconocen haber leído artículo del wiki. Similar a docs.acknowledgments pero para articles (rich text) en lugar de sops (PDFs).';
COMMENT ON TABLE docs.article_categories IS 'Categorías jerárquicas del knowledge base. Ej: "Políticas de RRHH" > "Vacaciones", "Beneficios" > "Seguros".';
COMMENT ON TABLE docs.article_versions IS 'Historial de versiones de artículos. Cada edición publicada crea versión nueva. is_current = TRUE para la activa. is_draft = TRUE para borrador no publicado.';
COMMENT ON TABLE docs.articles IS 'Artículos del wiki/KB ICONSA (Notion/Confluence pattern). Rich text en versiones. Soporta required reading con tracking via docs.article_acknowledgments.';
COMMENT ON TABLE docs.generated IS 'Audit trail de docs generados. Snapshot del contenido para reproducibilidad.';
COMMENT ON TABLE docs.signature_requests IS 'Requests de firma. MVP: provider=stamp. v1.1: provider=documenso para firma legal.';
COMMENT ON TABLE docs.sop_versions IS 'Versionado de SOPs. Acknowledgments linkean a versión específica para compliance.';
COMMENT ON TABLE docs.sops IS 'Registry de SOPs/manuales/políticas ICONSA. Versiones en docs.sop_versions.';
COMMENT ON TABLE docs.template_versions IS 'Versiones de templates para docs generados. Cada cambio crea versión nueva preservando historial. Linkea a docs.generated para auditar qué template se usó.';
COMMENT ON TABLE docs.templates IS 'Templates para generar docs (carta de trabajo, liquidación, etc.). Versiones en docs.template_versions.';

-- ----- schema: workflows -----
COMMENT ON COLUMN workflows.instances.completed_at IS 'Cuándo terminó (todos los steps completados o cancelados).';
COMMENT ON COLUMN workflows.instances.context IS 'JSONB con form data del proceso, decisiones tomadas, datos calculados.';
COMMENT ON COLUMN workflows.instances.current_step IS 'Índice del paso actual (0-indexed).';
COMMENT ON COLUMN workflows.instances.process_version_id IS 'Versión del proceso usada. Si proceso cambia después, instance preserva versión.';
COMMENT ON COLUMN workflows.instances.started_at IS 'Cuándo se inició.';
COMMENT ON COLUMN workflows.instances.started_by IS 'Quien inició el proceso (hr_admin típicamente).';
COMMENT ON COLUMN workflows.instances.status IS 'iniciado → en_progreso → completado | cancelado | pausado.';
COMMENT ON COLUMN workflows.instances.subject_person_id IS 'Persona sobre quien se ejecuta el proceso (el onboarding-ee, offboarding-ee, evaluado).';
COMMENT ON COLUMN workflows.instances.total_steps IS 'Cantidad total de steps. Denormalizado para barra de progreso.';
COMMENT ON COLUMN workflows.process_versions.change_notes IS 'Cambios vs versión anterior.';
COMMENT ON COLUMN workflows.process_versions.is_current IS 'TRUE = versión activa. Constraint: solo una current.';
COMMENT ON COLUMN workflows.process_versions.process_id IS 'Proceso al que pertenece la versión.';
COMMENT ON COLUMN workflows.process_versions.published_at IS 'Cuándo se publicó.';
COMMENT ON COLUMN workflows.process_versions.published_by IS 'Quien publicó.';
COMMENT ON COLUMN workflows.process_versions.steps IS 'JSONB con array de pasos: [{id, order, name, role, type, condition?, auto_complete?, sop_code?}]. Soporta conditional logic y parallel steps.';
COMMENT ON COLUMN workflows.process_versions.version_number IS 'Versión secuencial.';
COMMENT ON COLUMN workflows.processes.category IS 'lifecycle (onboarding/offboarding), performance (evaluaciones), compliance (auditoría), career (promociones).';
COMMENT ON COLUMN workflows.processes.code IS 'Identificador del proceso (ej: onboarding_office, offboarding, evaluation_semestral).';
COMMENT ON COLUMN workflows.processes.current_version_id IS 'FK a workflows.process_versions vigente.';
COMMENT ON COLUMN workflows.processes.description IS 'Descripción del proceso.';
COMMENT ON COLUMN workflows.processes.is_active IS 'FALSE = proceso descontinuado.';
COMMENT ON COLUMN workflows.processes.name IS 'Nombre legible.';
COMMENT ON COLUMN workflows.step_assignments.assigned_to_id IS 'Persona responsable del step (hr_admin, supervisor, el propio subject_person, etc.).';
COMMENT ON COLUMN workflows.step_assignments.completed_at IS 'Cuándo se completó.';
COMMENT ON COLUMN workflows.step_assignments.completed_by IS 'Quien marcó como completado.';
COMMENT ON COLUMN workflows.step_assignments.data IS 'JSONB con datos específicos del step (ej: para "Asignar laptop" {laptop_serial: "XYZ"}).';
COMMENT ON COLUMN workflows.step_assignments.instance_id IS 'Instance a la que pertenece.';
COMMENT ON COLUMN workflows.step_assignments.notes IS 'Notas del responsable del step.';
COMMENT ON COLUMN workflows.step_assignments.related_acknowledgment_id IS 'Si step requiere reconocer SOP (ej: "Firmar inducción IC-RH-D-01"), FK al acknowledgment.';
COMMENT ON COLUMN workflows.step_assignments.related_ticket_id IS 'Si step requiere crear/aprobar ticket (ej: "Crear ticket de actualización de datos"), FK al ticket.';
COMMENT ON COLUMN workflows.step_assignments.status IS 'pending → in_progress → completed | skipped | failed.';
COMMENT ON COLUMN workflows.step_assignments.step_id IS 'Identificador del step según el JSONB steps del process_version. Coincide con steps[].id.';
COMMENT ON COLUMN workflows.step_assignments.step_name IS 'Nombre del step (denormalizado para UI rápida).';
COMMENT ON COLUMN workflows.step_assignments.step_order IS 'Orden del step (0-indexed).';
COMMENT ON TABLE workflows.instances IS 'Instancia activa de un proceso para una persona específica. Ej: el onboarding de Pedro García inició el 2026-05-20.';
COMMENT ON TABLE workflows.process_versions IS 'Versionado de procesos. steps jsonb soporta conditional logic, parallel steps.';
COMMENT ON TABLE workflows.processes IS 'Procesos multi-step: onboarding, offboarding, evaluación semestral. Versionados.';
COMMENT ON TABLE workflows.step_assignments IS 'Pasos individuales de una instance. Un row por step del process_version.steps. Linkea a tickets/acknowledgments cuando el step requiere acción específica.';

-- ----- schema: learning -----
COMMENT ON COLUMN learning.assessments.attempt_number IS 'Número de intento (1 = primer intento, 2 = retry).';
COMMENT ON COLUMN learning.assessments.completed_at IS 'Cuándo terminó.';
COMMENT ON COLUMN learning.assessments.correct_count IS 'Cantidad de respuestas correctas.';
COMMENT ON COLUMN learning.assessments.duration_seconds IS 'Tiempo total tomado.';
COMMENT ON COLUMN learning.assessments.enrollment_id IS 'Enrollment al que pertenece.';
COMMENT ON COLUMN learning.assessments.graded_at IS 'Cuándo se calificó.';
COMMENT ON COLUMN learning.assessments.graded_by IS 'Para manual/hybrid grading: quien calificó.';
COMMENT ON COLUMN learning.assessments.grading_method IS 'automatic (sistema califica), manual (instructor califica), hybrid (mezcla).';
COMMENT ON COLUMN learning.assessments.incorrect_count IS 'Cantidad de respuestas incorrectas.';
COMMENT ON COLUMN learning.assessments.max_score IS 'Puntaje máximo posible.';
COMMENT ON COLUMN learning.assessments.module_id IS 'Módulo evaluado.';
COMMENT ON COLUMN learning.assessments.notes IS 'Notas del evaluador.';
COMMENT ON COLUMN learning.assessments.passed IS 'TRUE = pasó el assessment.';
COMMENT ON COLUMN learning.assessments.passing_score IS 'Score mínimo requerido (heredado del module).';
COMMENT ON COLUMN learning.assessments.percentage IS 'Score / max_score * 100.';
COMMENT ON COLUMN learning.assessments.responses IS 'Respuestas del empleado: [{question_id, answer, correct, points_earned}].';
COMMENT ON COLUMN learning.assessments.score IS 'Puntaje obtenido.';
COMMENT ON COLUMN learning.assessments.started_at IS 'Cuándo empezó el assessment.';
COMMENT ON COLUMN learning.attendance.attendance_method IS 'in_person_signed, in_person_qr_scan, facilitator_confirmed, video_watched (>=X%), webinar_joined (zoom log).';
COMMENT ON COLUMN learning.attendance.attendance_sheet_file_id IS 'FK a files.uploads con el escaneo de la lista firmada (digitalización de IC-RH-F-02-04).';
COMMENT ON COLUMN learning.attendance.attended_at IS 'Cuándo asistió.';
COMMENT ON COLUMN learning.attendance.duration_minutes IS 'Cuánto duró la asistencia (calculado o auto-reportado).';
COMMENT ON COLUMN learning.attendance.enrollment_id IS 'Enrollment al que pertenece este registro.';
COMMENT ON COLUMN learning.attendance.location_id IS 'Ubicación física donde se dio (para in_person).';
COMMENT ON COLUMN learning.attendance.module_id IS 'Módulo específico atendido (NULL si es asistencia general).';
COMMENT ON COLUMN learning.attendance.notes IS 'Notas (justificación de ausencia, observación).';
COMMENT ON COLUMN learning.attendance.recorded_by IS 'Quien registró (facilitator típicamente).';
COMMENT ON COLUMN learning.attendance.video_watch_percent IS 'Para módulos video: % visto. Útil para determinar si cuenta como completado (usually >=80%).';
COMMENT ON COLUMN learning.certification_assignments.certificate_file_id IS 'FK a files.uploads con el PDF de la cert escaneada/emitida.';
COMMENT ON COLUMN learning.certification_assignments.certificate_number IS 'Número de certificado del proveedor (para verificación externa).';
COMMENT ON COLUMN learning.certification_assignments.certification_id IS 'Cert obtenida (FK al catálogo).';
COMMENT ON COLUMN learning.certification_assignments.expiration_date IS 'Fecha de expiración. NULL = no expira (cert perpetua).';
COMMENT ON COLUMN learning.certification_assignments.is_legally_required IS 'Denormalización de certifications.is_required_by_law para query rápida.';
COMMENT ON COLUMN learning.certification_assignments.is_renewable IS 'TRUE = renovable. Heredado del catálogo pero puede override.';
COMMENT ON COLUMN learning.certification_assignments.issued_date IS 'Fecha de emisión.';
COMMENT ON COLUMN learning.certification_assignments.issuing_body_signatory IS 'Persona que firmó la cert (instructor, autoridad).';
COMMENT ON COLUMN learning.certification_assignments.notes IS 'Notas administrativas.';
COMMENT ON COLUMN learning.certification_assignments.obtained_via IS 'Cómo obtuvo la cert: course_completion (vía enrollment interno), external_exam, transferred (de empleo anterior), grandfathered (pre-existing), manual_entry.';
COMMENT ON COLUMN learning.certification_assignments.person_id IS 'Empleado dueño de la cert.';
COMMENT ON COLUMN learning.certification_assignments.previous_assignment_id IS 'Si esta cert es renovación, FK a la anterior. Inversa de renewed_to_id.';
COMMENT ON COLUMN learning.certification_assignments.related_enrollment_id IS 'Enrollment que generó la cert (si obtained_via=course_completion).';
COMMENT ON COLUMN learning.certification_assignments.renewed_to_id IS 'Si esta cert fue renovada, FK a la nueva. Permite trazar cadena de renovaciones.';
COMMENT ON COLUMN learning.certification_assignments.revocation_reason IS 'Si status=revoked, razón (incumplimiento, fraude, error administrativo).';
COMMENT ON COLUMN learning.certifications.code IS 'Identificador (ej: TRABAJO-ALTURAS, MANEJO-EXPLOSIVOS, OPERADOR-GRUA).';
COMMENT ON COLUMN learning.certifications.cost_to_obtain IS 'Costo inicial.';
COMMENT ON COLUMN learning.certifications.cost_to_renew IS 'Costo de renovación (puede ser distinto).';
COMMENT ON COLUMN learning.certifications.description IS 'Para qué sirve.';
COMMENT ON COLUMN learning.certifications.grace_period_days IS 'Días después de expiración antes de bloquear al empleado de trabajos que requieren la cert.';
COMMENT ON COLUMN learning.certifications.is_renewable IS 'TRUE = puede renovarse al vencer.';
COMMENT ON COLUMN learning.certifications.is_required_for_locations IS 'Ubicaciones que la requieren (proyectos específicos).';
COMMENT ON COLUMN learning.certifications.is_required_for_roles IS 'Roles que la requieren.';
COMMENT ON COLUMN learning.certifications.issuing_body IS 'Quien emite (ej: "MITRADEL", "ICONSA", "SUNTRACS").';
COMMENT ON COLUMN learning.certifications.issuing_body_type IS 'internal_iconsa, external_private (empresa), government (MITRADEL, CSS), industry_association, union.';
COMMENT ON COLUMN learning.certifications.legal_reference IS 'Si is_required_by_law, referencia legal (ley, decreto).';
COMMENT ON COLUMN learning.certifications.name IS 'Nombre completo.';
COMMENT ON COLUMN learning.certifications.paid_by IS 'Quién paga la cert/renovación. Para tracking de costos y políticas de RRHH.';
COMMENT ON COLUMN learning.certifications.renewal_warning_days IS 'Días antes de expiración para empezar a alertar al empleado y HR. Genera notifications.outbox automáticas.';
COMMENT ON COLUMN learning.course_modules.assessment_questions IS 'Si has_assessment, array de preguntas: [{id, type, text, options, correct_answer, weight}].';
COMMENT ON COLUMN learning.course_modules.content_storage_path IS 'Path en Supabase Storage si el contenido está alojado.';
COMMENT ON COLUMN learning.course_modules.content_type IS 'Tipo de contenido. sop_reading linkea a docs.sops, scorm_package es estándar e-learning compatible.';
COMMENT ON COLUMN learning.course_modules.content_url IS 'URL externa al contenido (video YouTube, link a recurso).';
COMMENT ON COLUMN learning.course_modules.course_id IS 'Curso al que pertenece.';
COMMENT ON COLUMN learning.course_modules.description IS 'Descripción del módulo.';
COMMENT ON COLUMN learning.course_modules.estimated_minutes IS 'Tiempo estimado para completar el módulo.';
COMMENT ON COLUMN learning.course_modules.has_assessment IS 'TRUE = tiene quiz/evaluación al final.';
COMMENT ON COLUMN learning.course_modules.is_mandatory IS 'TRUE = obligatorio para completar el curso. FALSE = opcional.';
COMMENT ON COLUMN learning.course_modules.max_attempts IS 'Intentos máximos en el assessment. NULL = ilimitados.';
COMMENT ON COLUMN learning.course_modules.module_order IS 'Orden secuencial (0-indexed).';
COMMENT ON COLUMN learning.course_modules.name IS 'Nombre del módulo.';
COMMENT ON COLUMN learning.course_modules.passing_score IS 'Score mínimo para aprobar (si has_assessment).';
COMMENT ON COLUMN learning.course_modules.randomize_questions IS 'TRUE = aleatoriza orden de preguntas en cada intento.';
COMMENT ON COLUMN learning.course_modules.related_article_id IS 'Si content_type=reading_material, FK a docs.articles.';
COMMENT ON COLUMN learning.course_modules.related_sop_id IS 'Si content_type=sop_reading, FK al SOP.';
COMMENT ON COLUMN learning.courses.available_languages IS 'Array de idiomas disponibles.';
COMMENT ON COLUMN learning.courses.code IS 'Identificador único del curso (ej: INDUC-CAMPO-01, SAFETY-ALTURAS-V2).';
COMMENT ON COLUMN learning.courses.cost_per_seat IS 'Costo por participante (para budget tracking).';
COMMENT ON COLUMN learning.courses.created_by IS 'Quien creó el curso (típicamente HR o capacitación).';
COMMENT ON COLUMN learning.courses.delivery_method IS 'in_person (presencial), online_self_paced (a tu ritmo), online_live (webinar fechado), hybrid (mezcla), on_the_job (entrenamiento práctico).';
COMMENT ON COLUMN learning.courses.description IS 'Descripción corta para listados.';
COMMENT ON COLUMN learning.courses.effort_hours IS 'Horas de esfuerzo del participante (puede diferir de duration_hours si es a tu ritmo).';
COMMENT ON COLUMN learning.courses.grants_certification_id IS 'Si completar este curso otorga una certification, FK a learning.certifications. NULL = no otorga cert formal.';
COMMENT ON COLUMN learning.courses.is_published IS 'TRUE = visible en catálogo. FALSE = borrador.';
COMMENT ON COLUMN learning.courses.language IS 'Idioma primario (es, en).';
COMMENT ON COLUMN learning.courses.long_description IS 'Descripción completa para página del curso.';
COMMENT ON COLUMN learning.courses.max_seats_per_session IS 'Capacidad máxima por sesión in_person.';
COMMENT ON COLUMN learning.courses.min_seats_to_run IS 'Mínimo de inscritos para que la sesión se realice (cancela si no se alcanza).';
COMMENT ON COLUMN learning.courses.name IS 'Nombre del curso.';
COMMENT ON COLUMN learning.courses.prerequisites IS 'Array de course IDs que deben completarse antes de poder enrolarse.';
COMMENT ON COLUMN learning.courses.provider_contact IS 'Contacto del proveedor (email, teléfono, web).';
COMMENT ON COLUMN learning.courses.provider_name IS 'Nombre del proveedor externo si aplica.';
COMMENT ON COLUMN learning.courses.provider_type IS 'internal (ICONSA imparte), external (instructor/empresa externa), self_study.';
COMMENT ON COLUMN learning.courses.related_sop_ids IS 'SOPs que se cubren en este curso (ej: curso de inducción cubre IC-RH-D-01, IC-RH-M-01).';
COMMENT ON COLUMN learning.courses.required_for_departments IS 'Array de departamentos para los que es obligatorio.';
COMMENT ON COLUMN learning.courses.required_for_locations IS 'Array de ubicaciones donde es obligatorio (ej: ciertos proyectos requieren cert específica).';
COMMENT ON COLUMN learning.courses.required_for_roles IS 'Array de roles para los que el curso es obligatorio.';
COMMENT ON COLUMN learning.courses.thumbnail_url IS 'Imagen del curso para catálogo.';
COMMENT ON COLUMN learning.courses.validity_months IS 'Para cursos con refresher (ej: trabajo en altura cada 12 meses).';
COMMENT ON COLUMN learning.enrollments.cancelled_at IS 'Cuándo se canceló (si aplica).';
COMMENT ON COLUMN learning.enrollments.certificate_file_id IS 'FK a files.uploads con el PDF del certificado emitido.';
COMMENT ON COLUMN learning.enrollments.completed_at IS 'Cuándo completó (todos los módulos mandatory).';
COMMENT ON COLUMN learning.enrollments.course_id IS 'Curso en el que se inscribe.';
COMMENT ON COLUMN learning.enrollments.due_date IS 'Fecha límite para completar (para mandatory).';
COMMENT ON COLUMN learning.enrollments.enrolled_at IS 'Cuándo se inscribió.';
COMMENT ON COLUMN learning.enrollments.enrolled_by IS 'Quien lo inscribió (sí mismo, supervisor, HR, sistema).';
COMMENT ON COLUMN learning.enrollments.enrollment_reason IS 'Auditoría: por qué este empleado está inscrito. Importante para reportes y compliance.';
COMMENT ON COLUMN learning.enrollments.expires_at IS 'Si certificación con validez, cuándo expira la training.';
COMMENT ON COLUMN learning.enrollments.final_grade IS 'Calificación cualitativa (Aprobado, Reprobado, Excelente, etc.).';
COMMENT ON COLUMN learning.enrollments.final_score IS 'Score final del curso (promedio de assessments).';
COMMENT ON COLUMN learning.enrollments.granted_certification_assignment_id IS 'Si completar este enrollment otorgó una cert, FK al certification_assignment creado.';
COMMENT ON COLUMN learning.enrollments.notes IS 'Notas administrativas.';
COMMENT ON COLUMN learning.enrollments.passed IS 'TRUE = pasó. FALSE = falló. NULL = no completado aún.';
COMMENT ON COLUMN learning.enrollments.person_id IS 'Empleado inscrito.';
COMMENT ON COLUMN learning.enrollments.progress_percent IS '0-100. % de módulos mandatory completados.';
COMMENT ON COLUMN learning.enrollments.session_id IS 'Para cursos in_person, FK a learning.sessions (no creada todavía, futuro). NULL para self-paced.';
COMMENT ON COLUMN learning.enrollments.started_at IS 'Cuándo empezó (primera actividad).';
COMMENT ON COLUMN learning.training_records.duration_hours IS 'Horas de duración.';
COMMENT ON COLUMN learning.training_records.external_certificate_file_id IS 'FK a files.uploads con certificado externo escaneado.';
COMMENT ON COLUMN learning.training_records.notes IS 'Notas.';
COMMENT ON COLUMN learning.training_records.person_id IS 'Empleado dueño del record.';
COMMENT ON COLUMN learning.training_records.provider IS 'Proveedor (para external).';
COMMENT ON COLUMN learning.training_records.record_type IS 'Tipo de evento. external_training y on_the_job no tienen FK a enrollment porque son entries manuales (training fuera del LMS).';
COMMENT ON COLUMN learning.training_records.recorded_at IS 'Cuándo se registró en el sistema.';
COMMENT ON COLUMN learning.training_records.recorded_by IS 'Quien registró.';
COMMENT ON COLUMN learning.training_records.related_article_acknowledgment_id IS 'Si record_type=article_acknowledgment, FK al ack.';
COMMENT ON COLUMN learning.training_records.related_certification_id IS 'Si record_type=certification, FK al certification_assignment.';
COMMENT ON COLUMN learning.training_records.related_enrollment_id IS 'Si record_type=enrollment/attendance, FK al enrollment.';
COMMENT ON COLUMN learning.training_records.related_sop_acknowledgment_id IS 'Si record_type=sop_acknowledgment, FK al ack.';
COMMENT ON COLUMN learning.training_records.training_description IS 'Descripción.';
COMMENT ON COLUMN learning.training_records.training_name IS 'Para external_training/on_the_job: nombre del training.';
COMMENT ON TABLE learning.assessments IS 'Resultados de quizzes/evaluaciones en cursos. Patrón IC-RH-F-02-05 (Evaluación post-entrenamiento). Múltiples attempts permitidos según course config.';
COMMENT ON TABLE learning.attendance IS 'Registro de asistencia a módulos. Patrón IC-RH-F-02-04 (Lista Asistencia) digitalizado. Método in_person_signed crea referencia a archivo escaneado del listado firmado.';
COMMENT ON TABLE learning.certification_assignments IS 'Certificaciones obtenidas por cada persona. Tracking de expiry. status pasa automáticamente a expiring_soon (warning_days antes) y expired. renewed_to_id linkea a la nueva cert que la reemplaza al renovar.';
COMMENT ON TABLE learning.certifications IS 'Catálogo de certificaciones que empleados pueden obtener. Trabajo en altura, primeros auxilios, manejo de explosivos, etc. is_required_by_law triggers compliance alerts.';
COMMENT ON TABLE learning.course_modules IS 'Módulos/lecciones dentro de un curso. Ordenados por module_order. Tipo de contenido determina cómo se renderiza y trackea.';
COMMENT ON TABLE learning.courses IS 'Catálogo de cursos/capacitaciones. Patrón Docebo: course → modules → enrollments. Tipos cubren rango de ICONSA: induction (IC-RH-D-01), safety_ssoa (sindicato), technical, compliance.';
COMMENT ON TABLE learning.enrollments IS 'Inscripciones de empleados en cursos. Una persona puede tener múltiples enrollments en mismo course (refreshers). status track lifecycle. Linkea a certification_assignment si curso otorga cert.';
COMMENT ON TABLE learning.training_records IS 'Tabla unificada de historial de training de cada empleado. Incluye enrollments formales + sop acknowledgments + external training + on-the-job. Para "transcript completo" del empleado.';

-- ----- schema: performance -----
COMMENT ON COLUMN performance.calibrations.completed_at IS 'Cuándo terminó la sesión.';
COMMENT ON COLUMN performance.calibrations.cycle_id IS 'Ciclo al que pertenece la sesión.';
COMMENT ON COLUMN performance.calibrations.decisions IS 'Cambios de rating acordados: [{reviewee_id, original_score, calibrated_score, reason}].';
COMMENT ON COLUMN performance.calibrations.facilitated_by IS 'Quien facilita (HR típicamente).';
COMMENT ON COLUMN performance.calibrations.notes IS 'Notas de la sesión, contexto, decisiones macro.';
COMMENT ON COLUMN performance.calibrations.participants IS 'Managers que participaron en la sesión.';
COMMENT ON COLUMN performance.calibrations.rating_distribution IS 'Distribución de ratings post-calibration. Útil para reportes ejecutivos: {"5": 2, "4": 10, "3": 25, "2": 3, "1": 0}.';
COMMENT ON COLUMN performance.calibrations.reviewees_calibrated IS 'Empleados cuyos ratings fueron revisados en esta sesión.';
COMMENT ON COLUMN performance.calibrations.session_date IS 'Fecha/hora de la sesión.';
COMMENT ON COLUMN performance.calibrations.session_name IS 'Nombre descriptivo (ej: "Calibración Construcción H1-2026").';
COMMENT ON COLUMN performance.calibrations.status IS 'scheduled (programada) → in_progress → completed | cancelled.';
COMMENT ON COLUMN performance.cycles.applies_to_departments IS 'Departamentos incluidos. NULL/empty = todos.';
COMMENT ON COLUMN performance.cycles.applies_to_persons IS 'Override de scope. Si específico, solo estas personas aplican. NULL = usar departments+roles.';
COMMENT ON COLUMN performance.cycles.applies_to_roles IS 'Roles incluidos. NULL/empty = todos.';
COMMENT ON COLUMN performance.cycles.calibration_required IS 'TRUE = scores deben pasar por sesión de calibración antes de finalizar (alinea ratings entre managers para evitar inflation).';
COMMENT ON COLUMN performance.cycles.closed_at IS 'Cuándo se cerró el ciclo.';
COMMENT ON COLUMN performance.cycles.closed_by IS 'Quien cerró el ciclo.';
COMMENT ON COLUMN performance.cycles.cycle_type IS 'Tipo de ciclo: semestral/anual (recurrente), project_end (al cerrar proyecto), probation (período de prueba), continuous (feedback continuo sin deadline), adhoc (one-off).';
COMMENT ON COLUMN performance.cycles.finalization_deadline IS 'Fecha límite total del ciclo. Pasada esta fecha, status pasa a closed.';
COMMENT ON COLUMN performance.cycles.goal_template_id IS 'Template para goals (futura tabla performance.goal_templates).';
COMMENT ON COLUMN performance.cycles.goals_enabled IS 'TRUE = se manejan goals dentro del ciclo.';
COMMENT ON COLUMN performance.cycles.name IS 'Nombre del ciclo (ej: "Evaluación Semestral H1-2026", "Período Prueba Pedro García").';
COMMENT ON COLUMN performance.cycles.notes IS 'Notas internas de HR sobre el ciclo.';
COMMENT ON COLUMN performance.cycles.peer_evaluation_enabled IS 'TRUE = compañeros se evalúan entre sí (360).';
COMMENT ON COLUMN performance.cycles.period_end IS 'Fin del período evaluado.';
COMMENT ON COLUMN performance.cycles.period_start IS 'Inicio del período evaluado (NO del ciclo de evaluación, sino del trabajo evaluado).';
COMMENT ON COLUMN performance.cycles.review_template_id IS 'Template estándar para reviews del ciclo. Cada review puede usar otro si necesario.';
COMMENT ON COLUMN performance.cycles.self_evaluation_enabled IS 'TRUE = empleados se autoevalúan.';
COMMENT ON COLUMN performance.cycles.self_review_deadline IS 'Fecha límite para autoevaluaciones.';
COMMENT ON COLUMN performance.cycles.skip_level_enabled IS 'TRUE = jefe del jefe también evalúa (skip-level review).';
COMMENT ON COLUMN performance.cycles.status IS 'planned (configurando) → open (recibiendo evaluaciones) → in_review (HR revisando) → in_calibration (sesiones de calibración) → closed.';
COMMENT ON COLUMN performance.cycles.subordinate_evaluation_enabled IS 'TRUE = reportes evalúan a su jefe (upward feedback).';
COMMENT ON COLUMN performance.cycles.supervisor_evaluation_enabled IS 'TRUE = supervisores evalúan a reportes directos.';
COMMENT ON COLUMN performance.cycles.supervisor_review_deadline IS 'Fecha límite para evaluaciones de supervisor.';
COMMENT ON COLUMN performance.feedback.acknowledged_at IS 'Cuándo reconoció.';
COMMENT ON COLUMN performance.feedback.acknowledged_by_recipient IS 'TRUE = recipient reconoció haber visto.';
COMMENT ON COLUMN performance.feedback.author_id IS 'Quien escribe. NULL si is_anonymous=true (HR puede verlo para audit).';
COMMENT ON COLUMN performance.feedback.body IS 'Contenido principal.';
COMMENT ON COLUMN performance.feedback.competency IS 'Competencia evaluada (ej: "Comunicación", "Liderazgo", "Trabajo en equipo").';
COMMENT ON COLUMN performance.feedback.feedback_type IS 'continuous (continuo no asociado a ciclo), kudos (reconocimiento positivo), constructive (mejora), request_for_feedback, 360_response, praise (público), concern.';
COMMENT ON COLUMN performance.feedback.is_anonymous IS 'TRUE = author_id se oculta al recipient. HR puede verlo para audit.';
COMMENT ON COLUMN performance.feedback.recipient_id IS 'Quien recibe el feedback.';
COMMENT ON COLUMN performance.feedback.recipient_response IS 'Respuesta opcional del recipient.';
COMMENT ON COLUMN performance.feedback.related_goal_id IS 'Goal al que se refiere el feedback (si aplica).';
COMMENT ON COLUMN performance.feedback.related_project IS 'Proyecto/contexto del feedback.';
COMMENT ON COLUMN performance.feedback.related_review_id IS 'Review al que se asocia.';
COMMENT ON COLUMN performance.feedback.title IS 'Título opcional del feedback.';
COMMENT ON COLUMN performance.feedback.visibility IS 'private (solo author) | recipient_only | recipient_supervisor (recipient + jefe) | public (todos) | hr_only (sensitive).';
COMMENT ON COLUMN performance.goal_updates.blockers IS 'Obstáculos identificados.';
COMMENT ON COLUMN performance.goal_updates.goal_id IS 'Goal al que actualiza.';
COMMENT ON COLUMN performance.goal_updates.new_status IS 'Nuevo status si cambia (on_track → at_risk por ejemplo).';
COMMENT ON COLUMN performance.goal_updates.next_steps IS 'Próximas acciones planeadas.';
COMMENT ON COLUMN performance.goal_updates.progress_percent IS 'Nuevo valor de progreso.';
COMMENT ON COLUMN performance.goal_updates.update_text IS 'Comentario del check-in (texto libre).';
COMMENT ON COLUMN performance.goal_updates.updated_by IS 'Persona que hizo el update (dueño del goal típicamente).';
COMMENT ON COLUMN performance.goals.approved_at IS 'Cuándo se aprobó.';
COMMENT ON COLUMN performance.goals.approved_by IS 'Quien aprobó (típicamente supervisor del person_id).';
COMMENT ON COLUMN performance.goals.approved_by_supervisor IS 'TRUE = supervisor aprobó este goal como válido para evaluación.';
COMMENT ON COLUMN performance.goals.category IS 'Categoría libre (ej: "Operacional", "Liderazgo", "Técnico").';
COMMENT ON COLUMN performance.goals.completed_date IS 'Cuándo se completó realmente.';
COMMENT ON COLUMN performance.goals.contributes_to_company_goal IS 'Texto de goal corporativo al que aporta (cuando no hay parent_goal_id formal).';
COMMENT ON COLUMN performance.goals.created_by IS 'Quien creó el goal (puede ser el dueño o su supervisor).';
COMMENT ON COLUMN performance.goals.current_value IS 'Valor actual de progreso.';
COMMENT ON COLUMN performance.goals.cycle_id IS 'Ciclo asociado (NULL si es continuous goal sin ciclo formal).';
COMMENT ON COLUMN performance.goals.description IS 'Descripción detallada.';
COMMENT ON COLUMN performance.goals.goal_type IS 'individual (personal), team (colectivo), company (organizacional), development (aprendizaje), okr (Objectives-Key Results), stretch (aspiracional).';
COMMENT ON COLUMN performance.goals.is_public IS 'TRUE = visible a todos en la app (transparencia). FALSE = solo person + supervisor + HR.';
COMMENT ON COLUMN performance.goals.measurement_criteria IS 'Cómo se mide el éxito (texto libre, descripción de KPIs).';
COMMENT ON COLUMN performance.goals.parent_goal_id IS 'Para OKR cascading: este goal contribuye al goal del jefe/empresa.';
COMMENT ON COLUMN performance.goals.person_id IS 'Empleado dueño del goal.';
COMMENT ON COLUMN performance.goals.priority IS 'low, normal, high, critical.';
COMMENT ON COLUMN performance.goals.progress_percent IS '0-100. Empleado actualiza periódicamente.';
COMMENT ON COLUMN performance.goals.start_date IS 'Cuándo empezó a trabajarse el goal.';
COMMENT ON COLUMN performance.goals.status IS 'draft → active → on_track | at_risk | off_track → completed | cancelled | deferred | overdue.';
COMMENT ON COLUMN performance.goals.target_date IS 'Fecha objetivo de cumplimiento.';
COMMENT ON COLUMN performance.goals.target_value IS 'Valor meta a alcanzar (puede ser número, % o texto).';
COMMENT ON COLUMN performance.goals.title IS 'Título del objetivo.';
COMMENT ON COLUMN performance.goals.unit IS 'Unidad de medida (%, $, días, número de unidades).';
COMMENT ON COLUMN performance.goals.weight IS 'Peso del goal en evaluación final. Suma de weights de goals current de una persona debería ser ~1.0 o ~100.';
COMMENT ON COLUMN performance.review_templates.applies_to IS 'general | office | field | manager | specific_role. Define UI y criterios.';
COMMENT ON COLUMN performance.review_templates.code IS 'Identificador (ej: SEMESTRAL_OFICINA, SEMESTRAL_CAMPO, EVAL_360, PROBATION).';
COMMENT ON COLUMN performance.review_templates.criteria IS 'Array JSON de criterios: [{id, name, description, weight, rating_type}]. Estructura flexible para formularios variados.';
COMMENT ON COLUMN performance.review_templates.description IS 'Para qué se usa.';
COMMENT ON COLUMN performance.review_templates.is_active IS 'FALSE = template descontinuado.';
COMMENT ON COLUMN performance.review_templates.name IS 'Nombre legible.';
COMMENT ON COLUMN performance.review_templates.rating_scale IS 'Definición de la escala: {scale_type: "1_to_5", labels: {1: "No cumple", ..., 5: "Excede"}}. O cualitativa: {scale_type: "categorical", options: [...]}.';
COMMENT ON COLUMN performance.review_templates.related_sop_id IS 'SOP ICONSA que define este formato (ej: IC-RH-F-03-04 para evaluación de campo).';
COMMENT ON COLUMN performance.reviews.achievements IS 'Para self-review: logros del período según el evaluado.';
COMMENT ON COLUMN performance.reviews.acknowledged_at IS 'Cuándo reviewee reconoció haber visto.';
COMMENT ON COLUMN performance.reviews.areas_improvement IS 'Áreas de mejora identificadas.';
COMMENT ON COLUMN performance.reviews.calibration_id IS 'Sesión de calibración donde se ajustó el score (FK a performance.calibrations).';
COMMENT ON COLUMN performance.reviews.calibration_notes IS 'Notas del ajuste hecho en calibration.';
COMMENT ON COLUMN performance.reviews.challenges IS 'Para self-review: retos enfrentados.';
COMMENT ON COLUMN performance.reviews.cycle_id IS 'Ciclo al que pertenece la review.';
COMMENT ON COLUMN performance.reviews.development_actions IS 'Acciones de desarrollo acordadas (capacitaciones, mentoring, goals).';
COMMENT ON COLUMN performance.reviews.due_date IS 'Fecha límite para completar.';
COMMENT ON COLUMN performance.reviews.finalized_at IS 'Cuándo se cerró formalmente.';
COMMENT ON COLUMN performance.reviews.finalized_by IS 'Quien finalizó (hr_admin típicamente).';
COMMENT ON COLUMN performance.reviews.learning_goals IS 'Para self-review: qué quiere aprender en próximo período.';
COMMENT ON COLUMN performance.reviews.overall_rating IS 'Rating cualitativo: exceeds, meets, partial, below, not_applicable.';
COMMENT ON COLUMN performance.reviews.overall_score IS 'Score numérico final (escala definida en template).';
COMMENT ON COLUMN performance.reviews.post_calibration_score IS 'Score después de calibration session.';
COMMENT ON COLUMN performance.reviews.pre_calibration_score IS 'Score original antes de sesión de calibración. Permite tracking de cuánto cambió el score por calibration.';
COMMENT ON COLUMN performance.reviews.responses IS 'Respuestas por criterio: {criterion_id: {rating: 4, comment: "..."}}.';
COMMENT ON COLUMN performance.reviews.review_type IS 'self (empleado se evalúa), supervisor (jefe evalúa al reporte), peer (colega evalúa), subordinate (reporte evalúa a jefe — bottom-up), skip_level (jefe del jefe evalúa).';
COMMENT ON COLUMN performance.reviews.reviewee_acknowledgment_comments IS 'Respuesta del evaluado después de ver la review (comentarios).';
COMMENT ON COLUMN performance.reviews.reviewee_dispute_reason IS 'Si reviewee_disputes=true, razón del desacuerdo.';
COMMENT ON COLUMN performance.reviews.reviewee_disputes IS 'TRUE = empleado no está de acuerdo con la evaluación. Trigger workflow de revisión por HR/skip-level.';
COMMENT ON COLUMN performance.reviews.reviewee_id IS 'Persona evaluada.';
COMMENT ON COLUMN performance.reviews.reviewer_comments IS 'Comentarios generales del evaluador.';
COMMENT ON COLUMN performance.reviews.reviewer_id IS 'Persona que evalúa.';
COMMENT ON COLUMN performance.reviews.shared_at IS 'Cuándo se compartió al reviewee.';
COMMENT ON COLUMN performance.reviews.started_at IS 'Cuándo evaluador empezó a llenar.';
COMMENT ON COLUMN performance.reviews.status IS 'pending → in_progress → submitted → shared_with_reviewee → acknowledged → finalized | disputed | cancelled.';
COMMENT ON COLUMN performance.reviews.strengths IS 'Fortalezas identificadas (texto libre).';
COMMENT ON COLUMN performance.reviews.submitted_at IS 'Cuándo evaluador submitió.';
COMMENT ON COLUMN performance.reviews.template_id IS 'Template usado (override del cycle.review_template_id si necesario).';
COMMENT ON TABLE performance.calibrations IS 'Sesiones de calibración: managers se reúnen para alinear ratings y evitar score inflation/deflation. Workday Talent Calibration pattern.';
COMMENT ON TABLE performance.cycles IS 'Períodos de evaluación de desempeño. Ej: "Evaluación Semestral H1-2026" con period_start=2026-01-01, period_end=2026-06-30. Configura qué tipos de review se permiten y deadlines.';
COMMENT ON TABLE performance.feedback IS 'Feedback continuo (Lattice/Culture Amp pattern). Independiente de cycles formales. Tipos: kudos (positive), constructive (mejora), request (pidiendo feedback), praise (público).';
COMMENT ON TABLE performance.goal_updates IS 'Check-ins periódicos de progreso de goals. Pattern de Lattice/15Five "weekly updates".';
COMMENT ON TABLE performance.goals IS 'Objetivos del empleado. Soporta OKR pattern via parent_goal_id (cascading goals). goal_type=development es para learning goals (no contribuye a comp).';
COMMENT ON TABLE performance.review_templates IS 'Templates de formulario de evaluación. Define criterios y escala. Ej: IC-RH-F-03-03 (corta semestral oficina) vs IC-RH-F-03-04 (campo).';
COMMENT ON TABLE performance.reviews IS 'Instancia de evaluación. Un cycle puede generar múltiples reviews por reviewee (self + supervisor + peer). status sigue lifecycle: pending → in_progress → submitted → shared → acknowledged → finalized.';

-- ----- schema: audit -----
COMMENT ON COLUMN audit.log.action IS 'Tipo de acción: insert/update/delete (CRUD), restore (undelete), custom (app-specific), login/logout (auth), export (descarga masiva), view_sensitive (lectura de datos sensitive).';
COMMENT ON COLUMN audit.log.actor_email IS 'Email del actor denormalizado para preservar historial si la persona se elimina.';
COMMENT ON COLUMN audit.log.actor_id IS 'Persona que ejecutó la acción.';
COMMENT ON COLUMN audit.log.actor_role IS 'Rol del actor al momento de la acción (denormalizado por si cambia rol después).';
COMMENT ON COLUMN audit.log.changed_fields IS 'Array de nombres de campos modificados en updates. Permite filtrar por "qué cambió".';
COMMENT ON COLUMN audit.log.created_at IS 'Timestamp inmutable de cuándo ocurrió.';
COMMENT ON COLUMN audit.log.field_changed IS 'Para updates de un campo específico, el nombre del campo.';
COMMENT ON COLUMN audit.log.id IS 'PK inmutable del log entry.';
COMMENT ON COLUMN audit.log.metadata IS 'Datos adicionales contextuales: IP geolocation, device fingerprint, app version, etc.';
COMMENT ON COLUMN audit.log.new_value IS 'Valor nuevo (JSON).';
COMMENT ON COLUMN audit.log.old_value IS 'Valor anterior (JSON).';
COMMENT ON COLUMN audit.log.reason IS 'Razón explícita del cambio capturada de la UI (ej: "Corrección de error en cédula reportado por empleado").';
COMMENT ON COLUMN audit.log.record_id IS 'UUID del row afectado. NULL para eventos no asociados a registro (login, export, view_sensitive).';
COMMENT ON COLUMN audit.log.request_id IS 'Request ID HTTP para tracing distribuido.';
COMMENT ON COLUMN audit.log.schema_name IS 'Schema del registro afectado: hr, requests, docs, workflows, performance, learning, etc.';
COMMENT ON COLUMN audit.log.session_id IS 'ID de sesión de Supabase Auth para correlación.';
COMMENT ON COLUMN audit.log.table_name IS 'Tabla del registro afectado (sin schema prefix).';
COMMENT ON TABLE audit.log IS 'Log inmutable cross-app. INSERT-only via app logic o triggers SECURITY DEFINER. Pattern: schema_name+table_name+record_id identifica el registro afectado. Para acciones no-CRUD (login, export), record_id puede ser NULL y action describe el evento.';

-- ----- schema: files -----
COMMENT ON COLUMN files.uploads.category IS 'Categoría del archivo. Valores válidos enforced por CHECK. original_paper_form es crítico para F32 manual entry (foto del formulario papel firmado físicamente).';
COMMENT ON COLUMN files.uploads.checksum_sha256 IS 'Hash del contenido para detectar corrupción y deduplicar.';
COMMENT ON COLUMN files.uploads.delete_reason IS 'Razón de eliminación (correción, duplicado, GDPR request).';
COMMENT ON COLUMN files.uploads.deleted_at IS 'Si is_deleted=true, cuándo se eliminó.';
COMMENT ON COLUMN files.uploads.deleted_by IS 'Quien eliminó.';
COMMENT ON COLUMN files.uploads.entity_id IS 'UUID del row al que pertenece el archivo.';
COMMENT ON COLUMN files.uploads.entity_schema IS 'Schema del registro al que pertenece este archivo (requests, hr, docs, performance, learning).';
COMMENT ON COLUMN files.uploads.entity_table IS 'Tabla del registro (sin schema prefix). Ej: tickets, people, generated, enrollments.';
COMMENT ON COLUMN files.uploads.file_name IS 'Nombre original del archivo.';
COMMENT ON COLUMN files.uploads.file_path IS 'Ruta dentro del bucket de Storage.';
COMMENT ON COLUMN files.uploads.file_size_bytes IS 'Tamaño en bytes.';
COMMENT ON COLUMN files.uploads.id IS 'PK del upload.';
COMMENT ON COLUMN files.uploads.is_deleted IS 'Soft delete. is_deleted=true preserva metadata pero file_path puede haber sido removido del Storage.';
COMMENT ON COLUMN files.uploads.legal_hold IS 'TRUE = archivo bajo legal hold, NO se puede eliminar aunque retention_until expire. Para litigios activos.';
COMMENT ON COLUMN files.uploads.mime_type IS 'MIME type.';
COMMENT ON COLUMN files.uploads.page_count IS 'Para PDFs: cantidad de páginas.';
COMMENT ON COLUMN files.uploads.retention_until IS 'Fecha hasta la cual el archivo debe conservarse por compliance. NULL = sin política definida.';
COMMENT ON COLUMN files.uploads.storage_bucket IS 'Nombre del bucket Supabase Storage. Default humanos. Buckets distintos para data sensitive (ej: medical-docs con RLS extra).';
COMMENT ON COLUMN files.uploads.tags IS 'Tags libres para clasificación adicional.';
COMMENT ON COLUMN files.uploads.thumbnail_url IS 'URL de thumbnail para imágenes/PDFs (generado async).';
COMMENT ON COLUMN files.uploads.upload_source IS 'Origen: web_ui, mobile, whatsapp, email_attachment, api, migration.';
COMMENT ON COLUMN files.uploads.uploaded_at IS 'Timestamp de upload.';
COMMENT ON COLUMN files.uploads.uploaded_by IS 'Quien subió el archivo.';
COMMENT ON TABLE files.uploads IS 'Tabla cross-app de archivos. Polimórfica via entity_schema + entity_table + entity_id. Reemplaza columnas jsonb attachments dispersas. Files físicos en Supabase Storage (file_path es relativo al bucket).';

-- ----- schema: notifications -----
COMMENT ON COLUMN notifications.outbox.attempts IS 'Intentos hechos.';
COMMENT ON COLUMN notifications.outbox.body IS 'Cuerpo texto plano.';
COMMENT ON COLUMN notifications.outbox.body_html IS 'Cuerpo HTML para email.';
COMMENT ON COLUMN notifications.outbox.channel IS 'Canal de envío. Un mismo evento puede generar múltiples rows (email + in_app + whatsapp).';
COMMENT ON COLUMN notifications.outbox.created_at IS 'Cuándo se creó la notificación.';
COMMENT ON COLUMN notifications.outbox.error_message IS 'Error del último intento fallido.';
COMMENT ON COLUMN notifications.outbox.expires_at IS 'Si no se envía antes de esta fecha, cancelar. Para notificaciones time-sensitive irrelevantes después.';
COMMENT ON COLUMN notifications.outbox.id IS 'PK del envío.';
COMMENT ON COLUMN notifications.outbox.last_attempt_at IS 'Último intento.';
COMMENT ON COLUMN notifications.outbox.max_attempts IS 'Intentos máximos antes de dar por fallida.';
COMMENT ON COLUMN notifications.outbox.metadata IS 'Free-form JSONB metadata, used for deep_link, severity, context (Q5 grill). Read by NotificationItem client component to render deep link.';
COMMENT ON COLUMN notifications.outbox.notification_type IS 'Semantic type matching template_code. Used for opt-in filtering per ADR-0008.';
COMMENT ON COLUMN notifications.outbox.priority IS 'low, normal, high, urgent. Ordena la cola.';
COMMENT ON COLUMN notifications.outbox.provider_message_id IS 'ID retornado por proveedor (Resend message_id, Twilio sid, etc.) para tracking y webhooks de delivery.';
COMMENT ON COLUMN notifications.outbox.read_at IS 'Cuándo destinatario leyó.';
COMMENT ON COLUMN notifications.outbox.recipient_id IS 'Empleado destinatario.';
COMMENT ON COLUMN notifications.outbox.scheduled_for IS 'Para envío diferido (ej: recordatorio 24h antes de vencimiento). NULL = inmediato.';
COMMENT ON COLUMN notifications.outbox.sent_at IS 'Envío exitoso.';
COMMENT ON COLUMN notifications.outbox.source_id IS 'ID del row origen.';
COMMENT ON COLUMN notifications.outbox.source_schema IS 'Schema origen (requests, performance, learning, etc.).';
COMMENT ON COLUMN notifications.outbox.source_table IS 'Tabla origen.';
COMMENT ON COLUMN notifications.outbox.subject IS 'Asunto.';
COMMENT ON COLUMN notifications.outbox.template_code IS 'Referencia opcional a docs.templates.code si la notificación usa template formal.';
COMMENT ON COLUMN notifications.outbox.template_variables IS 'Variables para substitución en template: {employee_name: "...", ticket_number: "..."}.';
COMMENT ON TABLE notifications.outbox IS 'Cola de notificaciones a enviar. Worker async lee status=pending y despacha. source_schema/source_table/source_id linkean al origen polimórfico (un ticket, una review, una certificación próxima a vencer).';

-- ===== END OF BASELINE =====
