// ChainResolver (ADR-0020, ADR-0027, ADR-0030, ADR-0037). Pure logic: turn each template step's
// abstract `resolver` into a concrete person at chain instantiation. The DB function
// requests.instantiate_chain mirrors this exact logic at runtime (it must, because it writes the
// rows under SECURITY DEFINER); this TS twin exists so the resolution + guards are unit-testable and
// so the server action can preview/validate before calling the RPC.
//
// Resolvers (all backed by existing columns/helpers):
//   - self                    -> requester (the submit step)
//   - selected_supervisor_id  -> ticket.selectedSupervisorId; NULL fallback -> employmentSupervisorId
//   - any_hr_admin            -> pool (null assignee; first hr_admin to act claims it)
//   - president_user          -> the president (provisional GG=president, ADR-0030)
//   - specific_person         -> not resolved here (edge actor); left unassigned

import type {
  ChainTemplate,
  ChainStep,
  TicketContext,
  ResolvedStep,
} from '../types';

export class ChainResolutionError extends Error {
  constructor(
    message: string,
    public readonly code: 'self_supervisor' | 'no_supervisor'
  ) {
    super(message);
    this.name = 'ChainResolutionError';
  }
}

/** Resolve a single step's approver person id (or null for pooled / unassigned / omitted). */
export function resolvePerson(
  step: ChainStep,
  ticket: TicketContext
): string | null {
  if (step.kind === 'submit' || step.resolver === 'self') {
    return ticket.requesterPersonId;
  }
  switch (step.resolver) {
    case 'selected_supervisor_id': {
      const person = ticket.selectedSupervisorId ?? ticket.employmentSupervisorId;
      if (person == null) {
        throw new ChainResolutionError(
          'No se pudo resolver el supervisor (sin seleccion ni supervisor en el empleo).',
          'no_supervisor'
        );
      }
      // R5/R6: a requester cannot be their own supervisor-approver.
      if (person === ticket.requesterPersonId) {
        throw new ChainResolutionError(
          'R5/R6: el solicitante no puede ser su propio supervisor.',
          'self_supervisor'
        );
      }
      return person;
    }
    case 'any_hr_admin':
      // pooled: claimed by the first hr_admin to act.
      return null;
    case 'president_user':
      return ticket.presidentPersonId;
    case 'specific_person':
    default:
      return null;
  }
}

/**
 * Instantiate the chain: produce the ordered list of approvals rows to INSERT. This mirrors the DB
 * function requests.instantiate_chain 1:1.
 *
 * B1: the submit step does NOT produce a row. The requester's submit (firma=envio, ADR-0027) is
 * captured by requests.tickets.submitted_at + requester_id; emitting a row would force
 * approver_role='requester', which violates approvals_approver_role_check (only supervisor|hr_admin|
 * president|specific_person). Only approval | processing steps become rows.
 *
 * BL-2: if the president gate resolves to the requester (requester IS the president), that gate is
 * OMITTED (no higher authority to chain on) -- the caller writes the audit flag.
 */
export function instantiate(
  template: ChainTemplate,
  ticket: TicketContext
): ResolvedStep[] {
  const rows: ResolvedStep[] = [];
  for (const step of template.steps) {
    // B1: submit is the requester's own action, not an approvals row.
    if (step.kind === 'submit') {
      continue;
    }
    const person = resolvePerson(step, ticket);
    // BL-2: president gate where requester is the president -> omit.
    if (
      step.kind === 'approval' &&
      step.resolver === 'president_user' &&
      person != null &&
      person === ticket.requesterPersonId
    ) {
      continue;
    }
    rows.push({
      stepOrder: step.step_order ?? step.step_id,
      role: step.role,
      kind: step.kind,
      approverPersonId: person,
    });
  }
  return rows;
}

/**
 * The first actionable step's pointer for sequential mode. Since instantiate() no longer emits the
 * submit step (B1), this is simply the first row; the kind guard remains as a defensive belt.
 */
export function firstActionableStep(
  rows: ResolvedStep[]
): ResolvedStep | null {
  return rows.find((r) => r.kind !== 'submit') ?? null;
}
