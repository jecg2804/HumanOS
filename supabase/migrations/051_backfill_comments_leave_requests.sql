-- 051_backfill_comments_leave_requests.sql
-- Audit P2.24 (targeted subset): backfill COMMENT ON COLUMN for the live / near-term
-- tables — the leave_* foundation (047) and the requests.* surface (Group 4) +
-- notifications.outbox. The learning.*/performance.*/workflows.* column comments are
-- intentionally deferred to each feature's group, where the column semantics are
-- final (commenting speculative future-group columns now risks documenting drift).

-- hr.leave_assignments
COMMENT ON COLUMN hr.leave_assignments.id IS 'PK.';
COMMENT ON COLUMN hr.leave_assignments.person_id IS 'Employee this assignment belongs to (FK hr.people).';
COMMENT ON COLUMN hr.leave_assignments.policy_id IS 'Leave policy applied to the person (FK hr.leave_policies).';
COMMENT ON COLUMN hr.leave_assignments.valid_from IS 'Start of this assignment validity window (SCD-style).';
COMMENT ON COLUMN hr.leave_assignments.valid_to IS 'End of validity window; NULL = currently valid.';
COMMENT ON COLUMN hr.leave_assignments.is_active IS 'Whether the assignment is active; a partial unique index enforces one active assignment per person+policy.';
COMMENT ON COLUMN hr.leave_assignments.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.leave_assignments.updated_at IS 'Last update timestamp (touch_updated_at trigger).';

-- hr.leave_balances (projection over the ledger)
COMMENT ON COLUMN hr.leave_balances.id IS 'PK.';
COMMENT ON COLUMN hr.leave_balances.assignment_id IS 'Assignment this balance projects (FK hr.leave_assignments).';
COMMENT ON COLUMN hr.leave_balances.accrued IS 'Total units accrued to date (projection from the ledger).';
COMMENT ON COLUMN hr.leave_balances.used IS 'Total units consumed to date.';
COMMENT ON COLUMN hr.leave_balances.as_of IS 'Timestamp this projection was last recomputed from the ledger.';
COMMENT ON COLUMN hr.leave_balances.source_system IS 'Provenance of the balance (humanos | imported | ...).';
COMMENT ON COLUMN hr.leave_balances.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.leave_balances.updated_at IS 'Last update timestamp (touch_updated_at trigger).';

-- hr.leave_ledger (append-only source of truth)
COMMENT ON COLUMN hr.leave_ledger.id IS 'PK.';
COMMENT ON COLUMN hr.leave_ledger.assignment_id IS 'Assignment this entry affects (FK hr.leave_assignments).';
COMMENT ON COLUMN hr.leave_ledger.kind IS 'Entry type (accrual, usage, adjustment, reversal, carryover). Determines the sign convention of amount.';
COMMENT ON COLUMN hr.leave_ledger.note IS 'Free-text note for the entry.';
COMMENT ON COLUMN hr.leave_ledger.source_system IS 'Provenance of the entry (humanos | imported | ...).';
COMMENT ON COLUMN hr.leave_ledger.created_by IS 'Actor who posted the entry (FK hr.people).';
COMMENT ON COLUMN hr.leave_ledger.created_at IS 'Append timestamp; ledger is immutable (no updated_at).';

-- hr.leave_policies
COMMENT ON COLUMN hr.leave_policies.id IS 'PK.';
COMMENT ON COLUMN hr.leave_policies.code IS 'Stable machine code (e.g. VACACIONES_LEY).';
COMMENT ON COLUMN hr.leave_policies.name IS 'Human-readable policy name.';
COMMENT ON COLUMN hr.leave_policies.accrual_frequency IS 'How often accrual runs (e.g. monthly, annual) when accrual_method is periodic.';
COMMENT ON COLUMN hr.leave_policies.carryover_expiry_months IS 'Months after carryover before carried-over balance expires; NULL = no expiry.';
COMMENT ON COLUMN hr.leave_policies.allow_negative_balance IS 'Whether usage may drive the balance below zero.';
COMMENT ON COLUMN hr.leave_policies.reset_negative_on_carryover IS 'Whether a negative balance is zeroed at carryover.';
COMMENT ON COLUMN hr.leave_policies.proration_rule IS 'Rule for prorating accrual on partial periods (e.g. by hire date).';
COMMENT ON COLUMN hr.leave_policies.is_active IS 'Whether the policy is currently assignable.';
COMMENT ON COLUMN hr.leave_policies.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN hr.leave_policies.updated_at IS 'Last update timestamp (touch_updated_at trigger).';

-- notifications.outbox
COMMENT ON COLUMN notifications.outbox.status IS 'Delivery state: pending -> sent | failed (terminal after max_attempts).';
COMMENT ON COLUMN notifications.outbox.updated_at IS 'Last update timestamp (touch_updated_at trigger).';

-- requests.* boilerplate (standard columns)
COMMENT ON COLUMN requests.approvals.id IS 'PK.';
COMMENT ON COLUMN requests.approvals.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN requests.audit_log.id IS 'PK.';
COMMENT ON COLUMN requests.audit_log.created_at IS 'Event timestamp (append-only).';
COMMENT ON COLUMN requests.comments.id IS 'PK.';
COMMENT ON COLUMN requests.comments.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN requests.comments.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN requests.notifications.id IS 'PK.';
COMMENT ON COLUMN requests.notifications.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN requests.revisions.id IS 'PK.';
COMMENT ON COLUMN requests.revisions.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN requests.tickets.id IS 'PK.';
COMMENT ON COLUMN requests.tickets.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN requests.tickets.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN requests.types.id IS 'PK.';
COMMENT ON COLUMN requests.types.created_at IS 'Row creation timestamp.';
COMMENT ON COLUMN requests.types.updated_at IS 'Last update timestamp (touch_updated_at trigger).';
COMMENT ON COLUMN requests.watchers.id IS 'PK.';
COMMENT ON COLUMN requests.watchers.created_at IS 'Row creation timestamp.';
