import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth/getMe';
import { createServerClient } from '@/lib/supabase/server';
import { AdminKPICards, type KPITypeBreakdown } from '@/components/admin/AdminKPICards';
import {
  AdminRequestsTable,
  type AdminTableRow,
  type AdminTableType,
} from '@/components/admin/AdminRequestsTable';
import type { RequestStatus, ApprovalDecision } from '@/types/database';

export const metadata = { title: 'Panel de RRHH — HumanOS' };

type RawRequest = {
  id: string;
  request_number: string | null;
  type_id: string;
  requester_id: string;
  status: RequestStatus;
  date_submitted: string | null;
  created_at: string;
};

type RawType = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
};

type RawPerson = {
  id: string;
  code: string;
  name: string;
};

type RawApproval = {
  request_id: string;
  approver_id: string;
  decision: ApprovalDecision | null;
};

// Lunes 00:00:00 hora local Panamá (UTC-5, sin DST).
// Construimos la fecha en UTC restando 5 horas para representar el inicio del lunes en hora Panamá.
function startOfWeekPanamaIso(): string {
  const PANAMA_OFFSET_HOURS = -5;
  const now = new Date();
  // "now" en hora Panamá:
  const nowPanamaMs = now.getTime() + PANAMA_OFFSET_HOURS * 60 * 60 * 1000;
  const nowPanama = new Date(nowPanamaMs);
  // Día de la semana en Panamá (0=Dom, 1=Lun, ... 6=Sáb)
  const dow = nowPanama.getUTCDay();
  // Cuántos días retroceder para llegar al lunes
  const daysSinceMonday = (dow + 6) % 7;
  // Construir lunes 00:00 hora Panamá expresado en UTC
  const mondayPanamaUTC = Date.UTC(
    nowPanama.getUTCFullYear(),
    nowPanama.getUTCMonth(),
    nowPanama.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
  );
  // Convertir de "00:00 Panamá" a UTC real: 00:00 Panamá = 05:00 UTC
  const mondayUtcMs = mondayPanamaUTC - PANAMA_OFFSET_HOURS * 60 * 60 * 1000;
  return new Date(mondayUtcMs).toISOString();
}

function fiveDaysAgoIsoNow(): string {
  return new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    pendientes?: string;
    desde?: string;
    vencidas?: string;
  }>;
}) {
  const me = await getMe();
  if (me.role !== 'hr_admin') {
    redirect('/inicio');
  }

  const sp = await searchParams;
  const initial = {
    pendientesMias: sp.pendientes === 'mias',
    vencidas: sp.vencidas === '1',
    desdeIso: typeof sp.desde === 'string' && sp.desde.length > 0 ? sp.desde : null,
  };

  const supa = await createServerClient();
  const weekStartIso = startOfWeekPanamaIso();
  const fiveDaysAgoIso = fiveDaysAgoIsoNow();

  // Fetch all requests (excluding Borradores), with types and requesters in parallel.
  const [
    requestsRes,
    typesRes,
    pendingApprovalsRes,
    weekCountRes,
    overdueCountRes,
  ] = await Promise.all([
    supa
      .from('requests')
      .select(
        'id, request_number, type_id, requester_id, status, date_submitted, created_at',
      )
      .neq('status', 'Borrador')
      .order('date_submitted', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supa.from('request_types').select('id, code, name, icon').eq('is_active', true),
    supa
      .from('request_approvals')
      .select('request_id, approver_id, decision')
      .eq('approver_id', me.id)
      .eq('decision', 'Pendiente'),
    supa
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .gte('date_submitted', weekStartIso),
    supa
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Enviada', 'En Revisión'])
      .lt('date_submitted', fiveDaysAgoIso),
  ]);

  const requests = (requestsRes.data ?? []) as RawRequest[];
  const types = (typesRes.data ?? []) as RawType[];
  const pendingApprovals = (pendingApprovalsRes.data ?? []) as RawApproval[];
  const semana = weekCountRes.count ?? 0;
  const vencidas = overdueCountRes.count ?? 0;
  const pendientesMias = pendingApprovals.length;

  // Fetch the requesters referenced in `requests` (and ensure `me` is included so we can resolve names).
  const requesterIds = Array.from(new Set(requests.map((r) => r.requester_id)));
  let peopleById = new Map<string, RawPerson>();
  if (requesterIds.length > 0) {
    const { data: people } = await supa
      .from('people')
      .select('id, code, name')
      .in('id', requesterIds);
    peopleById = new Map(((people ?? []) as RawPerson[]).map((p) => [p.id, p]));
  }

  const typesById = new Map(types.map((t) => [t.id, t]));
  const pendingRequestIds = new Set(pendingApprovals.map((a) => a.request_id));

  // Top 5 tipos activos (Enviada / En Revisión)
  const activeCounts = new Map<string, number>();
  for (const r of requests) {
    if (r.status === 'Enviada' || r.status === 'En Revisión') {
      activeCounts.set(r.type_id, (activeCounts.get(r.type_id) ?? 0) + 1);
    }
  }
  const topTypes: KPITypeBreakdown[] = Array.from(activeCounts.entries())
    .map(([typeId, count]) => {
      const t = typesById.get(typeId);
      return {
        type_name: t?.name ?? 'Desconocido',
        type_icon: t?.icon ?? null,
        count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const tableRows: AdminTableRow[] = requests.map((r) => {
    const t = typesById.get(r.type_id);
    const p = peopleById.get(r.requester_id);
    return {
      id: r.id,
      request_number: r.request_number,
      type_id: r.type_id,
      type_name: t?.name ?? 'Desconocido',
      type_icon: t?.icon ?? null,
      type_code: t?.code ?? '',
      requester_id: r.requester_id,
      requester_name: p?.name ?? 'Desconocido',
      requester_code: p?.code ?? '',
      status: r.status,
      date_submitted: r.date_submitted,
      created_at: r.created_at,
      pending_for_me: pendingRequestIds.has(r.id),
    };
  });

  const tableTypes: AdminTableType[] = types
    .map((t) => ({ id: t.id, code: t.code, name: t.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold">Panel de Recursos Humanos</h1>
        <p className="text-neutral-500 mt-1 text-sm md:text-base">
          Tienes acceso a todas las solicitudes y aprobaciones pendientes.
        </p>
      </header>

      <AdminKPICards
        kpis={{
          pendientesMias,
          semana,
          vencidas,
          weekStartIso,
          topTypes,
        }}
      />

      <AdminRequestsTable rows={tableRows} types={tableTypes} initial={initial} />
    </div>
  );
}
