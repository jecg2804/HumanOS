import { describe, it, expect } from 'vitest';
import {
  resolvePerson,
  instantiate,
  firstActionableStep,
  ChainResolutionError,
} from './index';
import type { ChainTemplate, ChainStep, TicketContext } from '../types';

const REQ = 'req-person';
const SUP = 'sup-person';
const EMP_SUP = 'emp-sup-person';
const PRES = 'pres-person';

// VACACIONES chain (migration 094 §7): submit -> RRHH processing -> supervisor approval ->
// Planilla processing -> GG/president approval (LAST).
const vacacionesChain: ChainTemplate = {
  mode: 'sequential',
  visibility: 'universal',
  steps: [
    { step_id: 1, step_order: 1, kind: 'submit', role: 'requester', resolver: 'self', required: true },
    { step_id: 2, step_order: 2, kind: 'processing', role: 'hr_admin', resolver: 'any_hr_admin', required: true },
    { step_id: 3, step_order: 3, kind: 'approval', role: 'supervisor', resolver: 'selected_supervisor_id', required: true },
    { step_id: 4, step_order: 4, kind: 'processing', role: 'hr_admin', resolver: 'any_hr_admin', required: true, subrole: 'planilla' },
    { step_id: 5, step_order: 5, kind: 'approval', role: 'president', resolver: 'president_user', required: true },
  ],
};

function ctx(overrides: Partial<TicketContext> = {}): TicketContext {
  return {
    id: 'ticket-1',
    requesterPersonId: REQ,
    selectedSupervisorId: SUP,
    employmentSupervisorId: EMP_SUP,
    presidentPersonId: PRES,
    manualEntry: false,
    ...overrides,
  };
}

const step = (s: Partial<ChainStep>): ChainStep => ({
  step_id: 1, step_order: 1, kind: 'approval', role: 'supervisor',
  resolver: 'selected_supervisor_id', required: true, ...s,
});

describe('ChainResolver.resolvePerson', () => {
  it('self -> requester', () => {
    expect(resolvePerson(step({ kind: 'submit', resolver: 'self' }), ctx())).toBe(REQ);
  });

  it('selected_supervisor_id uses the chosen supervisor', () => {
    expect(resolvePerson(step({ resolver: 'selected_supervisor_id' }), ctx())).toBe(SUP);
  });

  it('selected_supervisor_id falls back to employment supervisor when no selection (ADR-0020)', () => {
    expect(
      resolvePerson(step({ resolver: 'selected_supervisor_id' }), ctx({ selectedSupervisorId: null }))
    ).toBe(EMP_SUP);
  });

  it('throws when no supervisor can be resolved', () => {
    expect(() =>
      resolvePerson(step({ resolver: 'selected_supervisor_id' }), ctx({ selectedSupervisorId: null, employmentSupervisorId: null }))
    ).toThrow(ChainResolutionError);
  });

  it('R5/R6: rejects requester == supervisor', () => {
    try {
      resolvePerson(step({ resolver: 'selected_supervisor_id' }), ctx({ selectedSupervisorId: REQ }));
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ChainResolutionError);
      expect((e as ChainResolutionError).code).toBe('self_supervisor');
    }
  });

  it('any_hr_admin -> null (pooled)', () => {
    expect(resolvePerson(step({ resolver: 'any_hr_admin', role: 'hr_admin', kind: 'processing' }), ctx())).toBeNull();
  });

  it('president_user -> the president', () => {
    expect(resolvePerson(step({ resolver: 'president_user', role: 'president' }), ctx())).toBe(PRES);
  });
});

describe('ChainResolver.instantiate (VACACIONES)', () => {
  it('materializes the 4 non-submit steps with correct kinds + assignees (B1: no submit row)', () => {
    const rows = instantiate(vacacionesChain, ctx());
    // B1: the submit step (step_order 1, role requester) does NOT become an approvals row -- it would
    // violate approvals_approver_role_check. Only approval | processing steps materialize.
    expect(rows).toEqual([
      { stepOrder: 2, role: 'hr_admin', kind: 'processing', approverPersonId: null },
      { stepOrder: 3, role: 'supervisor', kind: 'approval', approverPersonId: SUP },
      { stepOrder: 4, role: 'hr_admin', kind: 'processing', approverPersonId: null },
      { stepOrder: 5, role: 'president', kind: 'approval', approverPersonId: PRES },
    ]);
  });

  it('B1: never emits a submit row', () => {
    const rows = instantiate(vacacionesChain, ctx());
    expect(rows.some((r) => r.kind === 'submit')).toBe(false);
    expect(rows.some((r) => r.role === 'requester')).toBe(false);
  });

  it('BL-2: omits the president gate when the requester IS the president', () => {
    const rows = instantiate(vacacionesChain, ctx({ requesterPersonId: PRES, selectedSupervisorId: SUP }));
    expect(rows.some((r) => r.role === 'president')).toBe(false);
    // the remaining non-submit steps remain (RRHH processing, supervisor, Planilla processing).
    expect(rows.map((r) => r.stepOrder)).toEqual([2, 3, 4]);
  });
});

describe('ChainResolver.firstActionableStep', () => {
  it('returns the first actionable step (RRHH processing, step 2)', () => {
    const rows = instantiate(vacacionesChain, ctx());
    expect(firstActionableStep(rows)?.stepOrder).toBe(2);
  });
});
