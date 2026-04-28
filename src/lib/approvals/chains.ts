import type { ApprovalRole } from './roles';

export type RequestTypeCode =
  | 'VACACIONES'
  | 'ACCION_PERSONAL'
  | 'PRESTAMO'
  | 'ACTUALIZACION_DATOS'
  | 'RECLAMO_PAGO';

/**
 * Calcula el chain efectivo de approval para un submit, partiendo del chain base
 * que viene en humanos.request_types.approval_chain. Solo PRESTAMO con monto > $250
 * extiende el chain agregando 'presidencia' al final (regla del IC-RH-D-02).
 */
export function effectiveChain(
  typeCode: RequestTypeCode,
  formData: Record<string, unknown>,
  baseChain: ApprovalRole[],
): ApprovalRole[] {
  if (typeCode === 'PRESTAMO') {
    const monto = Number(formData.monto_solicitado);
    if (Number.isFinite(monto) && monto > 250 && !baseChain.includes('presidencia')) {
      return [...baseChain, 'presidencia'];
    }
  }
  return baseChain;
}
