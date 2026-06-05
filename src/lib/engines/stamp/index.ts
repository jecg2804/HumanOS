// StampEngine (ADR-0027, R7). Pure rendering of the digital sello on every actuated step (gate AND
// processing). Audit-legal only -- NOT a certified e-signature (Documenso deferred to v1.1); UI labels
// "Aprobacion registrada", never "Firma electronica certificada". The DB functions
// requests.act_on_approval / requests.process_step render the same shapes at runtime; this TS twin is
// unit-tested and is the source the PDF/UI render from. signer_name is a snapshot (ADR-0003).

import type {
  Stamp,
  StampData,
  ActuationDecision,
  StepRole,
} from '../types';

const PANAMA_TZ = 'America/Panama';

/** Format an instant as 'YYYY-MM-DD HH:MM:SS' in America/Panama (matches the DB to_char output). */
export function formatPanamaTimestamp(at: Date): string {
  // en-CA gives YYYY-MM-DD; hour12:false gives 24h. Intl handles the TZ offset.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PANAMA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

const DECISION_VERB: Record<ActuationDecision, string> = {
  Aprobada: 'Aprobado',
  Rechazada: 'Rechazado',
  Modificada: 'Modificado',
};

export interface ApprovalStampInput {
  signerId: string;
  signerName: string | null;
  signerRole: StepRole | string;
  decision: ActuationDecision;
  stepId: number;
  at: Date;
}

/** Stamp for an approval gate actuation (kind='approval'). */
export function approvalStamp(input: ApprovalStampInput): Stamp {
  const ts = formatPanamaTimestamp(input.at);
  const stamp_text = `${DECISION_VERB[input.decision]} por ${input.signerName ?? '?'} (${input.signerRole}), ${ts} (America/Panama)`;
  const stamp_data: StampData = {
    signer_id: input.signerId,
    signer_name: input.signerName,
    signer_role: input.signerRole,
    kind: 'approval',
    decision: input.decision,
    step_id: input.stepId,
    signed_at: input.at.toISOString(),
  };
  return { stamp_text, stamp_data };
}

export interface ProcessingStampInput {
  signerId: string;
  signerName: string | null;
  signerRole: StepRole | string;
  /** received = RRHH recibe; processed = Planilla verifica. */
  roleKind: 'received' | 'processed';
  stepId: number;
  at: Date;
}

/** Stamp for a processing step actuation (kind='processing'; R8). Still stamps (R26 expediente). */
export function processingStamp(input: ProcessingStampInput): Stamp {
  const ts = formatPanamaTimestamp(input.at);
  const stamp_text =
    input.roleKind === 'received'
      ? `Recibido por ${input.signerName ?? '?'} (RRHH), ${ts}`
      : `Verificado por ${input.signerName ?? '?'} (Planilla), ${ts}`;
  const stamp_data: StampData = {
    signer_id: input.signerId,
    signer_name: input.signerName,
    signer_role: input.signerRole,
    kind: 'processing',
    role_kind: input.roleKind,
    step_id: input.stepId,
    signed_at: input.at.toISOString(),
  };
  return { stamp_text, stamp_data };
}
