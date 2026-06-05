import { describe, it, expect } from 'vitest';
import {
  isActionable,
  currentGate,
  hasLaterGate,
  actuate,
  resetSequentialFromStep,
  resetParallel,
  manualEntryBornStatus,
  ApprovalError,
} from './index';
import type { ApprovalRow, ChainMode } from '../types';

const REQ = 'req';
const SUP = 'sup';
const PRES = 'pres';

// VACACIONES rows right after instantiation (submit already Aprobada; gates Pendiente). NOTE the
// RRHH-recibe processing step (2) is still Pendiente here -- so the supervisor gate (3) is NOT yet
// actionable in sequential mode (S1: no gate fires while an earlier step is pending).
function freshRows(): ApprovalRow[] {
  return [
    { stepOrder: 1, kind: 'submit', decision: 'Aprobada', approverPersonId: REQ },
    { stepOrder: 2, kind: 'processing', decision: 'Pendiente', approverPersonId: null },
    { stepOrder: 3, kind: 'approval', decision: 'Pendiente', approverPersonId: SUP },
    { stepOrder: 4, kind: 'processing', decision: 'Pendiente', approverPersonId: null },
    { stepOrder: 5, kind: 'approval', decision: 'Pendiente', approverPersonId: PRES },
  ];
}

// After RRHH-recibe (step 2 stamped): the supervisor gate (3) is now the actionable step.
function rowsAfterRRHH(): ApprovalRow[] {
  return freshRows().map((r) =>
    r.stepOrder === 2 ? { ...r, decision: 'Aprobada' as const } : r
  );
}

describe('ApprovalEngine.isActionable', () => {
  it('Enviada / En_Revision are actionable; terminal states are not', () => {
    expect(isActionable('Enviada')).toBe(true);
    expect(isActionable('En_Revision')).toBe(true);
    expect(isActionable('Aprobada')).toBe(false);
    expect(isActionable('Rechazada')).toBe(false);
    expect(isActionable('Borrador')).toBe(false);
  });
});

describe('ApprovalEngine.currentGate (gates only on kind=approval)', () => {
  it('returns the lowest-order pending approval, skipping processing rows', () => {
    const gate = currentGate(freshRows());
    expect(gate?.stepOrder).toBe(3); // supervisor, not the processing step 2
    expect(gate?.kind).toBe('approval');
  });

  it('returns null when no approval gate is pending', () => {
    const rows = freshRows().map((r) =>
      r.kind === 'approval' ? { ...r, decision: 'Aprobada' as const } : r
    );
    expect(currentGate(rows)).toBeNull();
  });
});

describe('ApprovalEngine.hasLaterGate', () => {
  it('finds the GG gate after the supervisor', () => {
    expect(hasLaterGate(freshRows(), 3)).toBe(true);
  });
  it('no later gate after the final president gate', () => {
    expect(hasLaterGate(freshRows(), 5)).toBe(false);
  });
});

describe('ApprovalEngine.actuate -- supervisor gate (step 3)', () => {
  // RRHH already received (step 2 done), so the supervisor gate is genuinely actionable.
  const base = {
    rows: rowsAfterRRHH(),
    status: 'En_Revision' as const,
    mode: 'sequential' as ChainMode,
    requesterPersonId: REQ,
    gateStepOrder: 3,
    isHrAdmin: false,
  };

  it('S1: supervisor (step 3) cannot approve while RRHH-recibe (step 2 processing) is still pending', () => {
    try {
      actuate({
        rows: freshRows(), // step 2 still Pendiente
        status: 'En_Revision',
        mode: 'sequential',
        requesterPersonId: REQ,
        approverPersonId: SUP,
        gateStepOrder: 3,
        isHrAdmin: false,
        decision: 'Aprobada',
      });
      expect.unreachable('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ApprovalError);
      expect((e as ApprovalError).code).toBe('step_out_of_order');
    }
  });

  it('approve advances to the next approval gate (GG), staying En_Revision (skips processing 4)', () => {
    const r = actuate({ ...base, approverPersonId: SUP, decision: 'Aprobada' });
    expect(r.nextStatus).toBe('En_Revision');
    expect(r.nextGateStepOrder).toBe(5); // skipped processing step 4
    expect(r.ledgerEffect).toBeNull();
  });

  it('reject -> Rechazada + release ledger', () => {
    const r = actuate({ ...base, approverPersonId: SUP, decision: 'Rechazada' });
    expect(r.nextStatus).toBe('Rechazada');
    expect(r.ledgerEffect).toBe('release');
  });

  it('modify -> Devuelta_Modificacion, no ledger effect', () => {
    const r = actuate({ ...base, approverPersonId: SUP, decision: 'Modificada' });
    expect(r.nextStatus).toBe('Devuelta_Modificacion');
    expect(r.ledgerEffect).toBeNull();
  });

  it('R5: rejects self-approval (approver == requester)', () => {
    try {
      actuate({ ...base, approverPersonId: REQ, decision: 'Aprobada' });
      expect.unreachable('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ApprovalError);
      expect((e as ApprovalError).code).toBe('self_approval');
    }
  });

  it('rejects an actor who is not the gate approver', () => {
    expect(() =>
      actuate({ ...base, approverPersonId: 'someone-else', decision: 'Aprobada' })
    ).toThrow(/aprobador actual/);
  });

  it('rejects actuation when the ticket is not in an actionable status', () => {
    expect(() =>
      actuate({ ...base, status: 'Aprobada', approverPersonId: SUP, decision: 'Aprobada' })
    ).toThrow(ApprovalError);
  });
});

describe('ApprovalEngine.actuate -- GG final gate (step 5)', () => {
  it('approve -> Aprobada + commit ledger (no later gate)', () => {
    // Every earlier step resolved (RRHH recibe, supervisor, Planilla verifica) -> GG is actionable (S1).
    const rows = freshRows().map((r) =>
      r.stepOrder < 5 ? { ...r, decision: 'Aprobada' as const } : r
    );
    const r = actuate({
      rows,
      status: 'En_Revision',
      mode: 'sequential',
      requesterPersonId: REQ,
      approverPersonId: PRES,
      gateStepOrder: 5,
      isHrAdmin: false,
      decision: 'Aprobada',
    });
    expect(r.nextStatus).toBe('Aprobada');
    expect(r.ledgerEffect).toBe('commit');
    expect(r.nextGateStepOrder).toBeNull();
  });
});

describe('ApprovalEngine pooled gate (hr_admin)', () => {
  it('hr_admin can claim a pooled (null assignee) approval gate', () => {
    const rows: ApprovalRow[] = [
      { stepOrder: 1, kind: 'submit', decision: 'Aprobada', approverPersonId: REQ },
      { stepOrder: 2, kind: 'approval', decision: 'Pendiente', approverPersonId: null },
    ];
    const r = actuate({
      rows, status: 'En_Revision', mode: 'sequential', requesterPersonId: REQ,
      approverPersonId: 'hr-admin', gateStepOrder: 2, isHrAdmin: true, decision: 'Aprobada',
    });
    expect(r.nextStatus).toBe('Aprobada');
  });

  it('a non-hr_admin cannot claim a pooled gate', () => {
    const rows: ApprovalRow[] = [
      { stepOrder: 2, kind: 'approval', decision: 'Pendiente', approverPersonId: null },
    ];
    expect(() =>
      actuate({
        rows, status: 'En_Revision', mode: 'sequential', requesterPersonId: REQ,
        approverPersonId: 'someone', gateStepOrder: 2, isHrAdmin: false, decision: 'Aprobada',
      })
    ).toThrow(/pooled/);
  });
});

describe('ApprovalEngine revision resets', () => {
  it('sequential reset re-pends gates at-or-after the changed step (ADR-0037)', () => {
    const rows: ApprovalRow[] = [
      { stepOrder: 3, kind: 'approval', decision: 'Aprobada', approverPersonId: SUP },
      { stepOrder: 5, kind: 'approval', decision: 'Aprobada', approverPersonId: PRES },
    ];
    const out = resetSequentialFromStep(rows, 5);
    expect(out.find((r) => r.stepOrder === 3)?.decision).toBe('Aprobada'); // earlier gate stands
    expect(out.find((r) => r.stepOrder === 5)?.decision).toBe('Pendiente'); // changed gate re-pends
  });

  it('parallel reset re-pends all non-terminal gates (ADR-0004)', () => {
    const rows: ApprovalRow[] = [
      { stepOrder: 1, kind: 'approval', decision: 'Aprobada', approverPersonId: SUP },
      { stepOrder: 2, kind: 'approval', decision: 'Pendiente', approverPersonId: PRES },
      { stepOrder: 3, kind: 'approval', decision: 'Rechazada', approverPersonId: 'x' },
    ];
    const out = resetParallel(rows);
    expect(out.find((r) => r.stepOrder === 1)?.decision).toBe('Pendiente');
    expect(out.find((r) => r.stepOrder === 2)?.decision).toBe('Pendiente');
    expect(out.find((r) => r.stepOrder === 3)?.decision).toBe('Rechazada'); // terminal stands
  });
});

describe('ApprovalEngine manual-entry bypass (ADR-0005)', () => {
  it('manual entry is born Aprobada', () => {
    expect(manualEntryBornStatus()).toBe('Aprobada');
  });
});
