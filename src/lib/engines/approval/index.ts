// ApprovalEngine (ADR-0015, ADR-0020, ADR-0004, ADR-0005, ADR-0027, ADR-0037). Pure state-machine
// logic over the 8 R16 statuses + the 4 modes. The DB function requests.act_on_approval mirrors the
// transition rules at runtime (it must, to write rows under RLS); this TS twin is the canonical,
// unit-tested machine that the server action consults before/around the RPC and that documents the
// contract. No DB access here -- everything is a pure function of the approval rows + the decision.
//
// Hard rules baked in:
//   - Gates ONLY on kind='approval' (ADR-0027). processing rows are stamped+advanced, never block.
//   - Sequential (ADR-0037): approval gates fire in step_order; processing steps sit between them.
//     Parallel (ADR-0004): all approval gates open day 0.
//   - R5 no-self-approval: approverPersonId === requesterPersonId is rejected (code, not a DB CHECK).
//   - R9: approve / reject / modify.
//   - Manual-entry bypass (ADR-0005): 0 approval rows, ticket born Aprobada.

import type {
  ApprovalRow,
  ActuationDecision,
  TicketStatus,
  ChainMode,
} from '../types';

export class ApprovalError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'self_approval'
      | 'no_pending_gate'
      | 'not_current_approver'
      | 'invalid_status'
      | 'step_out_of_order'
  ) {
    super(message);
    this.name = 'ApprovalError';
  }
}

const ACTIONABLE_STATUSES: TicketStatus[] = ['Enviada', 'En_Revision'];

/** Is this status one from which an approval gate may be actuated? */
export function isActionable(status: TicketStatus): boolean {
  return ACTIONABLE_STATUSES.includes(status);
}

/**
 * The current approval gate = the lowest step_order row with kind='approval' and decision='Pendiente'.
 * processing rows are skipped entirely (they never gate). Returns null when no gate is pending.
 */
export function currentGate(rows: ApprovalRow[]): ApprovalRow | null {
  const pending = rows
    .filter((r) => r.kind === 'approval' && r.decision === 'Pendiente')
    .sort((a, b) => a.stepOrder - b.stepOrder);
  return pending[0] ?? null;
}

/** Is there a later approval gate still pending after a given step_order? */
export function hasLaterGate(rows: ApprovalRow[], afterStepOrder: number): boolean {
  return rows.some(
    (r) =>
      r.kind === 'approval' &&
      r.decision === 'Pendiente' &&
      r.stepOrder > afterStepOrder
  );
}

export interface ActuationInput {
  rows: ApprovalRow[];
  status: TicketStatus;
  mode: ChainMode;
  requesterPersonId: string;
  approverPersonId: string;
  /** the gate being actuated (must be the current gate, unless hr_admin override). */
  gateStepOrder: number;
  /** hr_admin may claim a pooled gate / override. */
  isHrAdmin: boolean;
  decision: ActuationDecision;
}

export interface ActuationResult {
  nextStatus: TicketStatus;
  /** ledger side-effect implied by the transition (the orchestration applies it). */
  ledgerEffect: 'commit' | 'release' | null;
  /** the next gate to point at (sequential) when staying En_Revision; null when terminal/final. */
  nextGateStepOrder: number | null;
}

/**
 * Compute the resulting status + side-effects of actuating an approval gate. Pure: it does not mutate
 * `rows`; the orchestration writes the row + transitions the ticket based on this result.
 */
export function actuate(input: ActuationInput): ActuationResult {
  if (!isActionable(input.status)) {
    throw new ApprovalError(
      `El ticket no esta en un estado accionable (status=${input.status}).`,
      'invalid_status'
    );
  }

  const gate = currentGate(input.rows);
  if (!gate) {
    throw new ApprovalError('No hay gate de aprobacion pendiente.', 'no_pending_gate');
  }

  // Sequential ordering (ADR-0037; mirrors requests.act_on_approval S1 exactly): NO gate may fire
  // while ANY earlier step -- approval OR processing -- is still Pendiente. This is why the supervisor
  // cannot approve before RRHH-recibe (a processing step), and GG cannot before Planilla-verifica. The
  // currentGate() helper only looks at approval gates, so this check (over ALL rows) is what actually
  // enforces the SOP order. parallel mode opens every gate day 0 (ADR-0004) and skips this.
  if (input.mode === 'sequential') {
    const earlierPending = input.rows.some(
      (r) => r.decision === 'Pendiente' && r.stepOrder < gate.stepOrder
    );
    if (earlierPending) {
      throw new ApprovalError(
        'Paso fuera de orden: hay un paso previo sin resolver (orden secuencial).',
        'step_out_of_order'
      );
    }
    // The actuated gate must be the current (lowest pending) approval gate.
    if (gate.stepOrder !== input.gateStepOrder) {
      throw new ApprovalError(
        'No es el gate actual (orden secuencial).',
        'not_current_approver'
      );
    }
  }

  const targetGate =
    input.rows.find(
      (r) =>
        r.kind === 'approval' &&
        r.decision === 'Pendiente' &&
        r.stepOrder === input.gateStepOrder
    ) ?? gate;

  // R5: no self-approval -- checked FIRST (the hardest invariant). The requester can never actuate a
  // gate on their own ticket, regardless of how the gate resolved.
  if (input.approverPersonId === input.requesterPersonId) {
    throw new ApprovalError('R5: no se permite auto-aprobacion.', 'self_approval');
  }

  // The actor must be the gate's approver, or an hr_admin claiming a pooled gate.
  if (targetGate.approverPersonId != null) {
    if (
      targetGate.approverPersonId !== input.approverPersonId &&
      !input.isHrAdmin
    ) {
      throw new ApprovalError('No eres el aprobador actual.', 'not_current_approver');
    }
  } else if (!input.isHrAdmin) {
    throw new ApprovalError('Gate pooled: requiere hr_admin.', 'not_current_approver');
  }

  if (input.decision === 'Rechazada') {
    return { nextStatus: 'Rechazada', ledgerEffect: 'release', nextGateStepOrder: null };
  }
  if (input.decision === 'Modificada') {
    return {
      nextStatus: 'Devuelta_Modificacion',
      ledgerEffect: null,
      nextGateStepOrder: null,
    };
  }

  // Aprobada: advance over processing steps to the next approval gate; if none, the ticket is final.
  // Simulate the gate being approved, then look for a later pending gate.
  const simulated = input.rows.map((r) =>
    r.stepOrder === targetGate.stepOrder && r.kind === 'approval'
      ? { ...r, decision: 'Aprobada' as const }
      : r
  );
  const next = currentGate(simulated);
  if (next && next.stepOrder > targetGate.stepOrder) {
    return {
      nextStatus: 'En_Revision',
      ledgerEffect: null,
      nextGateStepOrder: next.stepOrder,
    };
  }
  return { nextStatus: 'Aprobada', ledgerEffect: 'commit', nextGateStepOrder: null };
}

/**
 * ADR-0037 sequential revision reset: when an accepted revision changes attested fields, reset to
 * Pendiente every approval gate at-or-after the lowest step_order whose attested fields changed;
 * earlier gates that signed unchanged values stand. Pure: returns the new rows.
 *
 * @param changedFromStepOrder the lowest step_order affected by the modification (the orchestration
 *   computes this from the field-attribution rule, A9).
 */
export function resetSequentialFromStep(
  rows: ApprovalRow[],
  changedFromStepOrder: number
): ApprovalRow[] {
  return rows.map((r) =>
    r.kind === 'approval' && r.stepOrder >= changedFromStepOrder
      ? { ...r, decision: 'Pendiente' as const }
      : r
  );
}

/**
 * ADR-0004 parallel revision reset: an accepted revision resets ALL non-terminal approval gates
 * (Pendiente + Aprobada; not Rechazada/Modificada) to Pendiente and the chain re-runs. Pure.
 */
export function resetParallel(rows: ApprovalRow[]): ApprovalRow[] {
  return rows.map((r) =>
    r.kind === 'approval' && (r.decision === 'Pendiente' || r.decision === 'Aprobada')
      ? { ...r, decision: 'Pendiente' as const }
      : r
  );
}

/**
 * Manual-entry bypass (ADR-0005): no approval rows are instantiated; the ticket is born Aprobada and
 * the ledger is committed (a back-filled paper vacation already consumed the balance). Returns the
 * born status; the orchestration writes the audit flag + ledger commit.
 */
export function manualEntryBornStatus(): TicketStatus {
  return 'Aprobada';
}
