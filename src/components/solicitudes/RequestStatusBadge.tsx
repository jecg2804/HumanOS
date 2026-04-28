import { Badge } from '@/components/ui/badge';
import type { RequestStatus } from '@/types/database';

type StatusStyle = {
  background: string;
  color: string;
  label: string;
};

const STATUS_STYLES: Record<RequestStatus, StatusStyle> = {
  Borrador: { background: '#E5E7EB', color: '#374151', label: 'Borrador' },
  Enviada: { background: '#0A6EBD', color: 'white', label: 'Enviada' },
  'En Revisión': { background: '#B45309', color: 'white', label: 'En Revisión' },
  Aprobada: { background: '#1A7F5A', color: 'white', label: 'Aprobada' },
  Rechazada: { background: '#C0392B', color: 'white', label: 'Rechazada' },
  Completada: { background: '#0F5132', color: 'white', label: 'Completada' },
  Cancelada: { background: '#9CA3AF', color: 'white', label: 'Cancelada' },
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <Badge
      style={{ background: style.background, color: style.color }}
      className="border-transparent"
    >
      {style.label}
    </Badge>
  );
}
