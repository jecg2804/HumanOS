import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMe } from '@/lib/auth/getMe';
import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RequestStatusBadge } from '@/components/solicitudes/RequestStatusBadge';
import {
  RequestTimeline,
  type TimelineApproval,
} from '@/components/solicitudes/RequestTimeline';
import { RequestDetailRenderer } from '@/components/solicitudes/RequestDetailRenderer';
import { RequestActions } from '@/components/solicitudes/RequestActions';
import type {
  ApprovalDecision,
  Request as RequestRow,
  RequestApproval,
  RequestStatus,
} from '@/types/database';

export const metadata = { title: 'Solicitud — HumanOS' };

type Attachment = { name: string; url: string; mime: string; size: number };

type RequesterRow = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  department: string | null;
};

type TypeRow = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  approval_chain: string[];
  sop_reference: string | null;
};

type ApprovalRow = RequestApproval & {
  approver_name: string;
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

function computeMyPendingApprovalId(
  approvals: ApprovalRow[],
  myId: string,
): string | null {
  const sorted = [...approvals].sort((a, b) => a.step_order - b.step_order);
  for (const a of sorted) {
    const decision: ApprovalDecision = a.decision ?? 'Pendiente';
    if (decision === 'Pendiente') {
      // First pending row in order: must be mine.
      return a.approver_id === myId ? a.id : null;
    }
    if (decision !== 'Aprobada') {
      // Rechazada or Solicita Info: chain is broken; nobody else can decide.
      return null;
    }
  }
  return null;
}

export default async function SolicitudDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getMe();
  const supa = await createServerClient();

  const { data: req } = await supa
    .from('requests')
    .select(
      'id, request_number, type_id, requester_id, status, form_data, attachments, date_submitted, date_resolved, notes, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!req) notFound();
  const request = req as RequestRow;

  const [{ data: typeData }, { data: requesterData }, { data: approvalRows }] =
    await Promise.all([
      supa
        .from('request_types')
        .select('id, code, name, icon, approval_chain, sop_reference')
        .eq('id', request.type_id)
        .single(),
      supa
        .from('people')
        .select('id, name, code, email, department')
        .eq('id', request.requester_id)
        .single(),
      supa
        .from('request_approvals')
        .select(
          'id, request_id, approver_id, step_order, role_required, decision, comments, decided_at',
        )
        .eq('request_id', request.id)
        .order('step_order'),
    ]);

  if (!typeData || !requesterData) notFound();
  const type = typeData as TypeRow;
  const requester = requesterData as RequesterRow;
  const rawApprovals = (approvalRows ?? []) as RequestApproval[];

  // Approver names lookup
  const approverIds = Array.from(new Set(rawApprovals.map((a) => a.approver_id)));
  const approverNamesById = new Map<string, string>();
  if (approverIds.length > 0) {
    const { data: approverPeople } = await supa
      .from('people')
      .select('id, name')
      .in('id', approverIds);
    for (const p of (approverPeople ?? []) as Array<{ id: string; name: string }>) {
      approverNamesById.set(p.id, p.name);
    }
  }
  const approvals: ApprovalRow[] = rawApprovals.map((a) => ({
    ...a,
    approver_name: approverNamesById.get(a.approver_id) ?? '—',
  }));

  // Visibility: requester, hr_admin, or any approver.
  const isRequester = request.requester_id === me.id;
  const isHr = me.role === 'hr_admin';
  const isApprover = approvals.some((a) => a.approver_id === me.id);
  if (!isRequester && !isHr && !isApprover) notFound();

  const myPendingApprovalId = computeMyPendingApprovalId(approvals, me.id);

  // Detect missing supervisor step (fallback A) and Solicita Info rows.
  const baseChain = (type.approval_chain ?? []) as string[];
  const hasSolicitaInfo = approvals.some((a) => a.decision === 'Solicita Info');
  const baseRequiresSupervisor = baseChain.includes('supervisor_directo');
  const hasSupervisorRow = approvals.some(
    (a) => a.role_required === 'supervisor_directo',
  );
  const showFaltaSupervisor = baseRequiresSupervisor && !hasSupervisorRow;

  // Lookup empleado_objeto name for ACCION_PERSONAL
  let empleadoObjetoName: string | undefined;
  if (type.code === 'ACCION_PERSONAL') {
    const empId = (request.form_data as { empleado_objeto_id?: string })
      .empleado_objeto_id;
    if (empId) {
      const { data: emp } = await supa
        .from('people')
        .select('name')
        .eq('id', empId)
        .maybeSingle();
      empleadoObjetoName = (emp as { name?: string } | null)?.name;
    }
  }

  const attachments = (request.attachments ?? []) as Attachment[];
  const status: RequestStatus = request.status;

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="text-sm text-neutral-500">
        <Link href="/solicitudes" className="hover:underline">
          Mis solicitudes
        </Link>{' '}
        / <span>{request.request_number ?? 'Solicitud'}</span>
      </nav>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className="font-mono text-lg font-semibold"
                style={{ color: '#1B3A5C' }}
              >
                {request.request_number ?? '—'}
              </p>
              <CardTitle className="text-base mt-1 flex items-center gap-1.5">
                {type.icon && <span aria-hidden="true">{type.icon}</span>}
                <span>{type.name}</span>
              </CardTitle>
            </div>
            <RequestStatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <span className="text-neutral-500">Enviada:</span>{' '}
            {formatDate(request.date_submitted)}
          </div>
          {request.date_resolved && (
            <div>
              <span className="text-neutral-500">Resuelta:</span>{' '}
              {formatDate(request.date_resolved)}
            </div>
          )}
          {!isRequester && (
            <div className="sm:col-span-2">
              <span className="text-neutral-500">Solicitante:</span>{' '}
              <strong>{requester.name}</strong>{' '}
              <span className="text-neutral-500">({requester.code})</span>
              {requester.department && (
                <span className="text-neutral-500"> · {requester.department}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(showFaltaSupervisor || hasSolicitaInfo) && (
        <FaltaSupervisorCallout
          showFaltaSupervisor={showFaltaSupervisor}
          hasSolicitaInfo={hasSolicitaInfo}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la solicitud</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestDetailRenderer
            typeCode={type.code}
            formData={request.form_data ?? {}}
            attachments={attachments}
            empleadoObjetoName={empleadoObjetoName}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Línea de tiempo de aprobaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestTimeline
            approvals={approvals.map(
              (a): TimelineApproval => ({
                id: a.id,
                step_order: a.step_order,
                role_required: a.role_required,
                approver_name: a.approver_name,
                decision: a.decision,
                decided_at: a.decided_at,
                comments: a.comments,
              }),
            )}
            requesterName={requester.name}
            createdAt={request.created_at}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestActions
            ctx={{
              request: {
                id: request.id,
                status,
                requester_id: request.requester_id,
                type_code: type.code,
              },
              me: { id: me.id, role: me.role },
              myPendingApprovalId,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function FaltaSupervisorCallout({
  showFaltaSupervisor,
  hasSolicitaInfo,
}: {
  showFaltaSupervisor: boolean;
  hasSolicitaInfo: boolean;
}) {
  return (
    <div
      className="border-l-4 p-4 rounded text-sm"
      style={{ borderColor: '#F5A623', background: '#FEF6E7' }}
    >
      {showFaltaSupervisor && (
        <>
          <p className="font-semibold mb-1">⚠️ Falta supervisor</p>
          <p className="text-neutral-700">
            Esta solicitud se envió sin el paso de aprobación del jefe directo porque el
            solicitante no tiene un supervisor asignado en el expediente. RRHH debe
            asignar uno en <code>humanos.people.supervisor_id</code> o aprobar
            directamente desde su rol.
          </p>
        </>
      )}
      {hasSolicitaInfo && !showFaltaSupervisor && (
        <>
          <p className="font-semibold mb-1">⚠️ Solicitud de información adicional</p>
          <p className="text-neutral-700">
            Un aprobador solicitó información adicional. Revisa los comentarios en la
            línea de tiempo.
          </p>
        </>
      )}
      {hasSolicitaInfo && showFaltaSupervisor && (
        <p className="mt-2 text-neutral-700">
          Adicionalmente, un aprobador solicitó información — revisa los comentarios.
        </p>
      )}
    </div>
  );
}
