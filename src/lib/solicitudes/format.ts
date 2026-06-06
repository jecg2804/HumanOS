// Shared formatting for ticket views + the PDF expediente, so labels never drift between the screen
// and the printed document.
import type { DateRange } from '@/lib/engines/types';

export const ROLE_LABELS: Record<string, string> = {
  supervisor: 'Supervisor (Gerente de Proyecto)',
  hr_admin: 'Recursos Humanos',
  president: 'Gerencia General',
  specific_person: 'Aprobador asignado',
};

/** Step label for the approval timeline (role + whether it's a processing/recepción step). */
export function stepLabel(role: string, kind: string): string {
  const r = ROLE_LABELS[role] ?? role;
  return kind === 'processing' ? `${r} (recepción / verificación)` : r;
}

/** Plain-text decision label (the screen adds color around it; the PDF uses it as-is). */
export function decisionLabel(decision: string | null): string {
  switch (decision) {
    case 'Aprobada':
      return 'Aprobada';
    case 'Rechazada':
      return 'Rechazada';
    case 'Modificada':
      return 'Modificada';
    default:
      return 'Pendiente';
  }
}

/** Render a snapshot field value (date_range_group gets the "Del X al Y" treatment). */
export function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'date_ranges' && Array.isArray(value)) {
    return (value as DateRange[])
      .filter((r) => r?.del || r?.al)
      .map((r) => `Del ${r.del} al ${r.al}`)
      .join(' · ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
