import Link from 'next/link';
import { getMe } from '@/lib/auth/getMe';
import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { RequestList, type RequestListRow } from '@/components/solicitudes/RequestList';
import type { RequestStatus } from '@/types/database';

export const metadata = { title: 'Mis solicitudes — HumanOS' };

type Filter = 'todas' | 'pendientes' | 'aprobadas' | 'rechazadas';

const FILTER_LABELS: Record<Filter, string> = {
  todas: 'Todas',
  pendientes: 'Pendientes',
  aprobadas: 'Aprobadas',
  rechazadas: 'Rechazadas',
};

const FILTER_STATUSES: Record<Filter, RequestStatus[] | null> = {
  todas: null,
  pendientes: ['Enviada', 'En Revisión'],
  aprobadas: ['Aprobada', 'Completada'],
  rechazadas: ['Rechazada'],
};

function parseFilter(v: string | string[] | undefined): Filter {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === 'pendientes' || s === 'aprobadas' || s === 'rechazadas') return s;
  return 'todas';
}

type RawRequest = {
  id: string;
  request_number: string | null;
  status: RequestStatus;
  date_submitted: string | null;
  created_at: string;
  type_id: string;
};

type RawType = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
};

export default async function MisSolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const filter = parseFilter(estado);
  const me = await getMe();
  const supa = await createServerClient();

  let query = supa
    .from('requests')
    .select('id, request_number, status, date_submitted, created_at, type_id')
    .eq('requester_id', me.id)
    .order('created_at', { ascending: false });

  const statuses = FILTER_STATUSES[filter];
  if (statuses) {
    query = query.in('status', statuses);
  }

  const { data: rawRequests } = await query;
  const requests = (rawRequests ?? []) as RawRequest[];

  const typeIds = Array.from(new Set(requests.map((r) => r.type_id)));
  let typesById = new Map<string, RawType>();
  if (typeIds.length > 0) {
    const { data: types } = await supa
      .from('request_types')
      .select('id, code, name, icon')
      .in('id', typeIds);
    typesById = new Map(((types ?? []) as RawType[]).map((t) => [t.id, t]));
  }

  const rows: RequestListRow[] = requests.map((r) => {
    const t = typesById.get(r.type_id);
    return {
      id: r.id,
      request_number: r.request_number,
      type_name: t?.name ?? 'Desconocido',
      type_icon: t?.icon ?? null,
      type_code: t?.code ?? '',
      status: r.status,
      date_submitted: r.date_submitted,
      created_at: r.created_at,
    };
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Mis solicitudes</h1>
          <p className="text-neutral-500 mt-1 text-sm md:text-base">
            Consulta el estado de tus solicitudes activas e históricas.
          </p>
        </div>
        <Link href="/solicitudes/nueva">
          <Button style={{ background: '#1B3A5C', color: 'white' }}>Nueva solicitud</Button>
        </Link>
      </header>

      <nav className="flex gap-2 flex-wrap" aria-label="Filtrar solicitudes por estado">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
          const active = filter === f;
          const href = f === 'todas' ? '/solicitudes' : `/solicitudes?estado=${f}`;
          return (
            <Link
              key={f}
              href={href}
              className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm transition ${
                active
                  ? 'border-transparent text-white'
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
              }`}
              style={active ? { background: '#1B3A5C' } : undefined}
            >
              {FILTER_LABELS[f]}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <RequestList rows={rows} />
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const message =
    filter === 'todas'
      ? 'Aún no has creado ninguna solicitud.'
      : `No tienes solicitudes ${FILTER_LABELS[filter].toLowerCase()}.`;
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
      <p className="text-neutral-600">{message}</p>
      <div className="mt-4">
        <Link href="/solicitudes/nueva">
          <Button style={{ background: '#1B3A5C', color: 'white' }}>Nueva solicitud</Button>
        </Link>
      </div>
    </div>
  );
}
