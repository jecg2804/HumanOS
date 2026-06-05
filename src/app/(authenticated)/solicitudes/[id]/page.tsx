import { createSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/solicitudes/StatusBadge';
import { TicketActions, type TicketActionMode } from '@/components/solicitudes/TicketActions';
import type { FormSchema, DateRange } from '@/lib/engines/types';

interface ApprovalRow {
  step_order: number;
  approver_role: string;
  approver_id: string | null;
  kind: string;
  decision: string | null;
  decision_at: string | null;
  stamp_text: string | null;
  comments: string | null;
}

export default async function SolicitudDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <p className="p-6">No autenticado</p>;

  const { data: ticket } = await supabase
    .schema('requests')
    .from('tickets')
    .select(
      `id, ticket_number, status, created_at, form_data, requester_id, current_step,
       type:types(name, code, form_schema),
       requester:people!requester_id(full_name)`
    )
    .eq('id', id)
    .maybeSingle();

  if (!ticket) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-navy-500">Solicitud no encontrada</h1>
        <p className="text-gray-600 text-sm mt-2">
          No existe o no tienes permiso para verla.
        </p>
      </main>
    );
  }

  const { data: approvalsRaw } = await supabase
    .schema('requests')
    .from('approvals')
    .select('step_order, approver_role, approver_id, kind, decision, decision_at, stamp_text, comments')
    .eq('ticket_id', id)
    .order('step_order', { ascending: true });
  const approvals = (approvalsRaw ?? []) as ApprovalRow[];

  // Viewer identity + role (own rows are always RLS-visible).
  const { data: viewer } = await supabase
    .schema('hr')
    .from('people')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();
  const viewerPersonId = viewer?.id ?? null;

  let viewerIsHrAdmin = false;
  if (viewerPersonId) {
    const { data: viewerEmp } = await supabase
      .schema('hr')
      .from('employments')
      .select('app_role')
      .eq('person_id', viewerPersonId)
      .eq('is_current', true)
      .maybeSingle();
    viewerIsHrAdmin = ['hr_admin', 'admin'].includes(
      (viewerEmp as { app_role?: string } | null)?.app_role ?? ''
    );
  }

  const type = (Array.isArray(ticket.type) ? ticket.type[0] : ticket.type) as
    | { name: string; code: string; form_schema: unknown }
    | null;
  const requester = (Array.isArray(ticket.requester) ? ticket.requester[0] : ticket.requester) as
    | { full_name: string }
    | null;
  const schema = (type?.form_schema as FormSchema | null) ?? null;
  const formData = (ticket.form_data ?? {}) as Record<string, unknown>;

  // Resolve the viewer's available action against the next pending step (the RPCs re-validate).
  const actionMode = resolveAction(ticket.status, approvals, viewerPersonId, ticket.requester_id, viewerIsHrAdmin);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-navy-500">{type?.name ?? 'Solicitud'}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="text-sm text-gray-500 mt-1 font-mono">{ticket.ticket_number}</p>
        <p className="text-sm text-gray-600">
          Solicitado por {requester?.full_name ?? '—'} ·{' '}
          {new Date(ticket.created_at).toLocaleDateString('es-PA')}
        </p>
      </div>

      {/* Snapshot (ADR-0003) */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-navy-700 mb-3">Detalle de la solicitud</h2>
        <dl className="space-y-2 text-sm">
          {schema?.fields.map((f) => (
            <div key={f.key} className="flex justify-between gap-4 border-b last:border-0 py-1.5">
              <dt className="text-gray-600">{f.label}</dt>
              <dd className="font-medium text-right">{formatValue(f.key, formData[f.key])}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Timeline */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-navy-700 mb-3">Cadena de aprobación</h2>
        <ol className="space-y-3">
          <li className="text-sm">
            <span className="font-medium">Firma del solicitante</span> ·{' '}
            <span className="text-green-700">Enviada</span>
            <span className="block text-xs text-gray-500">{requester?.full_name ?? '—'}</span>
          </li>
          {approvals.map((a) => (
            <li key={a.step_order} className="text-sm">
              <span className="font-medium">{stepLabel(a)}</span> ·{' '}
              <DecisionLabel decision={a.decision} />
              {a.stamp_text && (
                <span className="block text-xs text-gray-500">{a.stamp_text}</span>
              )}
              {a.comments && (
                <span className="block text-xs text-gray-600 italic">“{a.comments}”</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Action panel */}
      {actionMode && (
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-navy-700 mb-3">
            {actionMode.kind === 'gate' ? 'Tu decisión' : 'Acción de Recursos Humanos'}
          </h2>
          <TicketActions ticketId={ticket.id} mode={actionMode} />
        </section>
      )}
    </main>
  );
}

function resolveAction(
  status: string,
  approvals: ApprovalRow[],
  viewerPersonId: string | null,
  requesterId: string,
  viewerIsHrAdmin: boolean
): TicketActionMode | null {
  if (!['Enviada', 'En_Revision'].includes(status)) return null;
  const pending = approvals
    .filter((a) => a.decision === 'Pendiente')
    .sort((a, b) => a.step_order - b.step_order);
  const next = pending[0];
  if (!next) return null;

  if (next.kind === 'approval') {
    if (!viewerPersonId || viewerPersonId === requesterId) return null; // R5
    const isAssignee = next.approver_id === viewerPersonId;
    const isPooledHr = next.approver_id === null && viewerIsHrAdmin;
    return isAssignee || isPooledHr ? { kind: 'gate' } : null;
  }

  // processing: hr_admin only. First processing step = received (RRHH); a later one = processed (Planilla).
  if (next.kind === 'processing' && viewerIsHrAdmin) {
    const lowerProcessing = approvals.filter(
      (a) => a.kind === 'processing' && a.step_order < next.step_order
    ).length;
    const roleKind = lowerProcessing === 0 ? ('received' as const) : ('processed' as const);
    return {
      kind: 'process',
      roleKind,
      label: roleKind === 'received' ? 'Marcar recibido (RRHH)' : 'Marcar verificado (Planilla)',
    };
  }
  return null;
}

const ROLE_LABELS: Record<string, string> = {
  supervisor: 'Supervisor (Gerente de Proyecto)',
  hr_admin: 'Recursos Humanos',
  president: 'Gerencia General',
  specific_person: 'Aprobador asignado',
};

function stepLabel(a: ApprovalRow): string {
  const role = ROLE_LABELS[a.approver_role] ?? a.approver_role;
  if (a.kind === 'processing') return `${role} (recepción / verificación)`;
  return role;
}

function DecisionLabel({ decision }: { decision: string | null }) {
  if (decision === 'Aprobada') return <span className="text-green-700">Aprobada</span>;
  if (decision === 'Rechazada') return <span className="text-red-700">Rechazada</span>;
  if (decision === 'Modificada') return <span className="text-orange-700">Modificada</span>;
  return <span className="text-amber-700">Pendiente</span>;
}

function formatValue(key: string, value: unknown): string {
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
