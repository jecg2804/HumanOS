export type ApprovalRole =
  | 'supervisor_directo'
  | 'hr_oficial'
  | 'hr_planilla'
  | 'hr_gerente'
  | 'presidencia';

export const ROLE_LABEL: Record<ApprovalRole, string> = {
  supervisor_directo: 'Tu jefe directo',
  hr_oficial: 'Rocío Olmedo (RRHH)',
  hr_planilla: 'Milagros Manyoma (Planillas)',
  hr_gerente: 'Samantha Kosmas (Gerente RRHH)',
  presidencia: 'Rodrigo Eisenmann (Presidencia)',
};

export function readableChain(roles: ApprovalRole[]): string {
  return roles.map((r) => ROLE_LABEL[r]).join(' → ');
}

export function isApprovalRole(s: string): s is ApprovalRole {
  return s in ROLE_LABEL;
}
