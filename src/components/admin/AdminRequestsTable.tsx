'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RequestStatusBadge } from '@/components/solicitudes/RequestStatusBadge';
import { Input } from '@/components/ui/input';
import type { RequestStatus } from '@/types/database';

export type AdminTableRow = {
  id: string;
  request_number: string | null;
  type_id: string;
  type_name: string;
  type_icon: string | null;
  type_code: string;
  requester_id: string;
  requester_name: string;
  requester_code: string;
  status: RequestStatus;
  date_submitted: string | null;
  created_at: string;
  pending_for_me: boolean;
};

export type AdminTableType = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  rows: AdminTableRow[];
  types: AdminTableType[];
  initial: {
    pendientesMias: boolean;
    vencidas: boolean;
    desdeIso: string | null;
  };
};

const ALL_STATUSES: RequestStatus[] = [
  'Enviada',
  'En Revisión',
  'Aprobada',
  'Rechazada',
  'Completada',
  'Cancelada',
];

const PAGE_SIZE = 20;

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

function daysInStatus(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'hoy';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'hoy';
  return `${days} ${days === 1 ? 'día' : 'días'}`;
}

function nowMinusFiveDaysMs(): number {
  return Date.now() - 5 * 24 * 60 * 60 * 1000;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function AdminRequestsTable({ rows, types, initial }: Props) {
  // Defaults: all statuses except Borrador (server already excludes Borrador, this just affects UI checkboxes)
  const [statuses, setStatuses] = useState<Set<RequestStatus>>(
    new Set(ALL_STATUSES),
  );
  const [typeIds, setTypeIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<string>(toDateInputValue(initial.desdeIso));
  const [dateTo, setDateTo] = useState<string>('');
  const [pendientesMias, setPendientesMias] = useState<boolean>(initial.pendientesMias);
  const [vencidas, setVencidas] = useState<boolean>(initial.vencidas);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const toTs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;
    const fiveDaysAgo = nowMinusFiveDaysMs();

    return rows.filter((r) => {
      if (statuses.size > 0 && !statuses.has(r.status)) return false;
      if (typeIds.size > 0 && !typeIds.has(r.type_id)) return false;
      if (pendientesMias && !r.pending_for_me) return false;
      if (vencidas) {
        if (r.status !== 'Enviada' && r.status !== 'En Revisión') return false;
        if (!r.date_submitted) return false;
        if (new Date(r.date_submitted).getTime() >= fiveDaysAgo) return false;
      }
      if (searchLower) {
        const hay = (r.requester_name + ' ' + r.requester_code).toLowerCase();
        if (!hay.includes(searchLower)) return false;
      }
      if (fromTs !== null) {
        if (!r.date_submitted) return false;
        if (new Date(r.date_submitted).getTime() < fromTs) return false;
      }
      if (toTs !== null) {
        if (!r.date_submitted) return false;
        if (new Date(r.date_submitted).getTime() > toTs) return false;
      }
      return true;
    });
  }, [rows, statuses, typeIds, search, dateFrom, dateTo, pendientesMias, vencidas]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleStatus(s: RequestStatus) {
    const next = new Set(statuses);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStatuses(next);
    setPage(1);
  }

  function toggleType(id: string) {
    const next = new Set(typeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTypeIds(next);
    setPage(1);
  }

  function clearAll() {
    setStatuses(new Set(ALL_STATUSES));
    setTypeIds(new Set());
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPendientesMias(false);
    setVencidas(false);
    setPage(1);
  }

  const hasAnyFilter =
    statuses.size !== ALL_STATUSES.length ||
    typeIds.size > 0 ||
    search.trim() !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    pendientesMias ||
    vencidas;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold">Todas las solicitudes</h2>
          <p className="text-sm text-neutral-500">
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
            {hasAnyFilter ? ' (filtrado)' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {hasAnyFilter ? (
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-neutral-600 underline hover:text-neutral-900"
            >
              Limpiar filtros
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="md:hidden text-sm px-3 py-1.5 rounded-md border border-neutral-300"
          >
            {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>
      </div>

      <div
        className={`rounded-lg border border-neutral-200 bg-white p-4 space-y-4 ${
          filtersOpen ? '' : 'hidden md:block'
        }`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-2">
              Estado
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => {
                const active = statuses.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className={`px-2.5 py-1 rounded-full border text-xs transition ${
                      active
                        ? 'border-transparent text-white'
                        : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                    }`}
                    style={active ? { background: '#1B3A5C' } : undefined}
                    aria-pressed={active}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-2">
              Tipo
            </p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {types.map((t) => {
                const active = typeIds.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className={`px-2.5 py-1 rounded-full border text-xs transition ${
                      active
                        ? 'border-transparent text-white'
                        : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                    }`}
                    style={active ? { background: '#1B3A5C' } : undefined}
                    aria-pressed={active}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-500 font-medium block mb-1">
              Buscar solicitante
            </label>
            <Input
              type="text"
              placeholder="Nombre o código"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-500 font-medium block mb-1">
              Desde
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-500 font-medium block mb-1">
              Hasta
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pendientesMias}
              onChange={(e) => {
                setPendientesMias(e.target.checked);
                setPage(1);
              }}
            />
            <span>Solo pendientes mías</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={vencidas}
              onChange={(e) => {
                setVencidas(e.target.checked);
                setPage(1);
              }}
            />
            <span>Solo vencidas (&gt;5 días)</span>
          </label>
        </div>
      </div>

      {paged.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-600">
          No hay solicitudes que coincidan con los filtros.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="md:hidden space-y-3">
            {paged.map((r) => (
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
                        {r.type_icon ? <span aria-hidden="true">{r.type_icon}</span> : null}
                        <span>{r.type_name}</span>
                      </p>
                      <p className="text-xs text-neutral-600 mt-1">
                        {r.requester_name}{' '}
                        <span className="text-neutral-400 font-mono">{r.requester_code}</span>
                      </p>
                    </div>
                    <RequestStatusBadge status={r.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
                    <span>Enviada: {formatDate(r.date_submitted)}</span>
                    <span>{daysInStatus(r.date_submitted ?? r.created_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                    <th className="px-4 py-3 font-medium">Número</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Solicitante</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Enviada</th>
                    <th className="px-4 py-3 font-medium">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
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
                        <Link
                          href={`/solicitudes/${r.id}`}
                          className="flex items-center gap-1.5"
                        >
                          {r.type_icon ? (
                            <span aria-hidden="true">{r.type_icon}</span>
                          ) : null}
                          <span>{r.type_name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/solicitudes/${r.id}`} className="block">
                          <span>{r.requester_name}</span>{' '}
                          <span className="text-neutral-400 font-mono text-xs">
                            {r.requester_code}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/solicitudes/${r.id}`} className="block">
                          <RequestStatusBadge status={r.status} />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/solicitudes/${r.id}`} className="block">
                          {formatDate(r.date_submitted)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        <Link href={`/solicitudes/${r.id}`} className="block">
                          {daysInStatus(r.date_submitted ?? r.created_at)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 rounded-md border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-neutral-600">
                Página {safePage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 rounded-md border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
