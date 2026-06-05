// Group 4 engines -- shared types (ADR-0015 generic engines; ADR-0020 chain grammar; ADR-0027/0037
// kind + sequential). These mirror the DB JSONB shapes 1:1 so the engines map directly onto
// requests.types.form_schema and requests.types.approval_chain_template, and onto requests.approvals
// / requests.tickets. No per-form logic lives here (the ADR-0015 promise): every request type plugs
// in via config.

// ----------------------------------------------------------------------------
// FormEngine -- form_schema (field-source matrix). The mental model (CLAUDE.md): every SOP field is
// exactly one of profile | user_input | computed. The user only ever edits user_input.
// ----------------------------------------------------------------------------
export type FieldSource = 'profile' | 'user_input' | 'computed';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file_upload'
  | 'signature_canvas'
  | 'date_range_group'
  | 'computed';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldValidationRule {
  rule_key: string;
  args?: unknown;
}

export interface FormField {
  key: string;
  label: string;
  source: FieldSource;
  type: FieldType;
  /** profile: dot-path into hr.* (e.g. 'people.full_name'). */
  path?: string;
  /** computed: server-resolved registry key (e.g. 'leave_balance', 'working_days', 'tenure'). */
  compute_fn?: string;
  required?: boolean;
  options?: FieldOption[];
  /** repeatable group id (e.g. 'date_ranges'). */
  group?: string;
  /** cap on repeatable rows (e.g. 3 for VACACIONES Del/Al). */
  max_repeat?: number;
  validate?: FieldValidationRule[];
}

export interface FormSchema {
  version: number;
  fields: FormField[];
}

export interface ValidationError {
  key: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

/** A single Del/Al row for the date_range_group field type. */
export interface DateRange {
  del: string; // ISO date
  al: string; // ISO date
}

// ----------------------------------------------------------------------------
// ChainResolver / ApprovalEngine -- approval_chain_template (ADR-0020 / ADR-0027 / ADR-0037).
// ----------------------------------------------------------------------------
export type StepKind = 'submit' | 'approval' | 'processing';

export type StepRole =
  | 'requester'
  | 'supervisor'
  | 'hr_admin'
  | 'president'
  | 'specific_person';

export type Resolver =
  | 'self'
  | 'selected_supervisor_id'
  | 'any_hr_admin'
  | 'president_user'
  | 'specific_person';

export type ChainMode =
  | 'sequential'
  | 'parallel'
  | 'direct_hr_admin'
  | 'any_of_hr'
  | 'parent_only';

export type LedgerEffect = 'verify_balance' | 'commit_used' | null;

export interface ChainStep {
  step_id: number;
  step_order: number;
  kind: StepKind;
  role: StepRole;
  resolver: Resolver;
  required: boolean;
  sla_hours?: number;
  /** e.g. 'planilla' (Asist. Planillas subset of hr_admin). */
  subrole?: string;
  /** SOP signature-block label for the PDF (StampEngine). */
  paper_block?: string;
  ledger_effect?: LedgerEffect;
}

export interface ChainTemplate {
  mode: ChainMode;
  visibility: 'universal';
  steps: ChainStep[];
}

// ----------------------------------------------------------------------------
// Runtime context + DB-row mirrors (subset of the columns the engines touch).
// ----------------------------------------------------------------------------
export interface TicketContext {
  id: string;
  requesterPersonId: string;
  selectedSupervisorId: string | null;
  /** resolved current employment supervisor (NULL fallback for selected_supervisor_id). */
  employmentSupervisorId: string | null;
  /** the president person id (provisional GG=president, ADR-0030). */
  presidentPersonId: string | null;
  manualEntry: boolean;
}

export interface ResolvedStep {
  stepOrder: number;
  role: StepRole;
  kind: StepKind;
  /** concrete person, or null for a pooled (any_hr_admin) gate / unassigned. */
  approverPersonId: string | null;
}

// R16 ticket statuses (8). Mirrors requests.tickets.status CHECK.
export type TicketStatus =
  | 'Borrador'
  | 'Enviada'
  | 'En_Revision'
  | 'Devuelta_Modificacion'
  | 'Aprobada'
  | 'Rechazada'
  | 'Completada'
  | 'Cancelada';

// requests.approvals.decision CHECK (nullable). Note: the actuation API uses the first three.
export type ApprovalDecision =
  | 'Pendiente'
  | 'Aprobada'
  | 'Rechazada'
  | 'Modificada'
  | 'Devuelta_Info';

export type ActuationDecision = 'Aprobada' | 'Rechazada' | 'Modificada';

export interface ApprovalRow {
  stepOrder: number;
  kind: StepKind;
  decision: ApprovalDecision;
  approverPersonId: string | null;
}

// ----------------------------------------------------------------------------
// StampEngine -- R7 sello (ADR-0027). Audit-legal only, NOT a certified e-signature.
// ----------------------------------------------------------------------------
export interface StampData {
  signer_id: string;
  signer_name: string | null;
  signer_role: StepRole | string;
  kind: StepKind;
  decision?: ActuationDecision;
  role_kind?: 'received' | 'processed';
  step_id: number;
  signed_at: string;
}

export interface Stamp {
  stamp_text: string;
  stamp_data: StampData;
}
