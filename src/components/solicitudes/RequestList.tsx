import Link from 'next/link';
import { RequestStatusBadge } from './RequestStatusBadge';
import type { RequestStatus } from '@/types/database';

export type RequestListRow = {
  id: string;
  request_number: string | null;
  type_name: string;
  type_icon: string | null;
  type_code: string;
  status: RequestStatus;
  date_submitted: string | null;
  created_at: string;
};

function formatDate(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function timeInStatus(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'hoy';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) {
    if (hours < 1) return 'hoy';
    return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  const days = Math.floor(hours / 24);
  if (days === 0) return 'hoy';
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

export function RequestList({ rows }: { rows: RequestListRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile: cards */}
      <ul className="md:hidden space-y-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/solicitudes/${r.id}`}
              className="block rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-400 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-neutral-500">
                    {r.request_number ?? '—'}
                  </p>
                  <p className="font-medium text-sm mt-0.5 flex items-center gap-1.5">
                    {r.type_icon && <span aria-hidden="true">{r.type_icon}</span>}
                    <span>{r.type_name}</span>
                  </p>
                </div>
                <RequestStatusBadge status={r.status} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
                <span>Enviada: {formatDate(r.date_submitted)}</span>
                <span>{timeInStatus(r.date_submitted ?? r.created_at)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Enviada</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b last:border-0 border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/solicitudes/${r.id}`} className="block">
                      {r.request_number ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/solicitudes/${r.id}`} className="flex items-center gap-1.5">
                      {r.type_icon && <span aria-hidden="true">{r.type_icon}</span>}
                      <span>{r.type_name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/solicitudes/${r.id}`} className="block">
                      {formatDate(r.date_submitted)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/solicitudes/${r.id}`} className="block">
                      <RequestStatusBadge status={r.status} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    <Link href={`/solicitudes/${r.id}`} className="block">
                      {timeInStatus(r.date_submitted ?? r.created_at)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
