import { describe, it, expect } from 'vitest';
import { approvalStamp, processingStamp, formatPanamaTimestamp } from './index';

const at = new Date('2026-06-05T18:30:45Z'); // 13:30:45 in America/Panama (UTC-5, no DST)

describe('StampEngine.formatPanamaTimestamp', () => {
  it('renders YYYY-MM-DD HH:MM:SS in America/Panama (UTC-5)', () => {
    expect(formatPanamaTimestamp(at)).toBe('2026-06-05 13:30:45');
  });
});

describe('StampEngine.approvalStamp (R7, gate)', () => {
  it('renders the approval stamp_text + audit stamp_data with signer snapshot', () => {
    const s = approvalStamp({
      signerId: 'sup-1',
      signerName: 'Maria Lopez',
      signerRole: 'supervisor',
      decision: 'Aprobada',
      stepId: 3,
      at,
    });
    expect(s.stamp_text).toBe(
      'Aprobado por Maria Lopez (supervisor), 2026-06-05 13:30:45 (America/Panama)'
    );
    expect(s.stamp_data).toMatchObject({
      signer_id: 'sup-1',
      signer_name: 'Maria Lopez',
      signer_role: 'supervisor',
      kind: 'approval',
      decision: 'Aprobada',
      step_id: 3,
    });
  });

  it('uses the right verb for rejection', () => {
    const s = approvalStamp({
      signerId: 'p', signerName: 'GG', signerRole: 'president',
      decision: 'Rechazada', stepId: 5, at,
    });
    expect(s.stamp_text).toMatch(/^Rechazado por GG/);
  });

  it('falls back to ? when signer name is null (snapshot of a nameless actor)', () => {
    const s = approvalStamp({
      signerId: 'x', signerName: null, signerRole: 'supervisor',
      decision: 'Aprobada', stepId: 3, at,
    });
    expect(s.stamp_text).toMatch(/Aprobado por \?/);
    expect(s.stamp_data.signer_name).toBeNull();
  });
});

describe('StampEngine.processingStamp (R8, never a gate but still stamps)', () => {
  it('renders the RRHH-recibe processing stamp', () => {
    const s = processingStamp({
      signerId: 'hr-1', signerName: 'Ana RRHH', signerRole: 'hr_admin',
      roleKind: 'received', stepId: 2, at,
    });
    expect(s.stamp_text).toBe('Recibido por Ana RRHH (RRHH), 2026-06-05 13:30:45');
    expect(s.stamp_data).toMatchObject({ kind: 'processing', role_kind: 'received', step_id: 2 });
  });

  it('renders the Planilla-verifica processing stamp', () => {
    const s = processingStamp({
      signerId: 'pl-1', signerName: 'Luis Planilla', signerRole: 'hr_admin',
      roleKind: 'processed', stepId: 4, at,
    });
    expect(s.stamp_text).toBe('Verificado por Luis Planilla (Planilla), 2026-06-05 13:30:45');
    expect(s.stamp_data).toMatchObject({ kind: 'processing', role_kind: 'processed', step_id: 4 });
  });
});
