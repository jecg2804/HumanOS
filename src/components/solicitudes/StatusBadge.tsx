// R16 ticket-status badge. Spanish labels + palette classes (Tailwind utilities, not raw hex).
const STYLES: Record<string, string> = {
  Borrador: 'bg-gray-100 text-gray-700',
  Enviada: 'bg-blue-100 text-blue-800',
  En_Revision: 'bg-amber-100 text-amber-800',
  Devuelta_Modificacion: 'bg-orange-100 text-orange-800',
  Aprobada: 'bg-green-100 text-green-800',
  Rechazada: 'bg-red-100 text-red-800',
  Completada: 'bg-green-100 text-green-800',
  Cancelada: 'bg-gray-100 text-gray-500',
};

const LABELS: Record<string, string> = {
  Borrador: 'Borrador',
  Enviada: 'Enviada',
  En_Revision: 'En revisión',
  Devuelta_Modificacion: 'Devuelta para modificación',
  Aprobada: 'Aprobada',
  Rechazada: 'Rechazada',
  Completada: 'Completada',
  Cancelada: 'Cancelada',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
        STYLES[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
