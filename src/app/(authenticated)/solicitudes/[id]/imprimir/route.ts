import { createSupabaseServerClient } from '@/lib/supabase/server';
import { renderExpediente, type ExpedienteData } from '@/lib/engines/pdf';
import { formatFieldValue, stepLabel, decisionLabel } from '@/lib/solicitudes/format';
import type { FormSchema } from '@/lib/engines/types';

// GET /solicitudes/[id]/imprimir -> the expediente PDF (IT-01). PdfEngine renders from the ticket
// snapshot + stamped approvals; RLS (requests.can_view_ticket) decides who may load the ticket.
export const runtime = 'nodejs';

interface ApprovalRow {
  step_order: number;
  approver_role: string;
  kind: string;
  decision: string | null;
  stamp_text: string | null;
  comments: string | null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('No autenticado', { status: 401 });

  const { data: ticket } = await supabase
    .schema('requests')
    .from('tickets')
    .select(
      `id, ticket_number, status, created_at, form_data,
       type:types(name, form_schema, sop_reference),
       requester:people!requester_id(full_name)`
    )
    .eq('id', id)
    .maybeSingle();
  if (!ticket) return new Response('No encontrado', { status: 404 });

  const { data: approvalsRaw } = await supabase
    .schema('requests')
    .from('approvals')
    .select('step_order, approver_role, kind, decision, stamp_text, comments')
    .eq('ticket_id', id)
    .order('step_order', { ascending: true });
  const approvals = (approvalsRaw ?? []) as ApprovalRow[];

  const type = (Array.isArray(ticket.type) ? ticket.type[0] : ticket.type) as
    | { name: string; form_schema: unknown; sop_reference: string | null }
    | null;
  const requester = (Array.isArray(ticket.requester) ? ticket.requester[0] : ticket.requester) as
    | { full_name: string }
    | null;
  const schema = (type?.form_schema as FormSchema | null) ?? null;
  const formData = (ticket.form_data ?? {}) as Record<string, unknown>;

  const data: ExpedienteData = {
    typeName: type?.name ?? 'Solicitud',
    ticketNumber: ticket.ticket_number,
    status: ticket.status,
    requesterName: requester?.full_name ?? '—',
    createdAt: new Date(ticket.created_at).toLocaleDateString('es-PA'),
    sopReference: type?.sop_reference ?? null,
    fields: (schema?.fields ?? []).map((f) => ({
      label: f.label,
      value: formatFieldValue(f.key, formData[f.key]),
    })),
    steps: approvals.map((a) => ({
      label: stepLabel(a.approver_role, a.kind),
      decision: decisionLabel(a.decision),
      stamp: a.stamp_text,
      comments: a.comments,
    })),
  };

  const bytes = await renderExpediente(data);

  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${ticket.ticket_number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
