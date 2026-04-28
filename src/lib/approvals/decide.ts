'use server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getMe } from '@/lib/auth/getMe';
import { sendNotification } from '@/lib/email/send';

export type DecideInput = {
  approvalId: string;
  decision: 'Aprobada' | 'Rechazada';
  comments: string;
};

type DecideRpcRow = {
  request_status: string;
  next_approver_id: string | null;
  is_final: boolean;
};

export async function decideApprovalAction(input: DecideInput): Promise<void> {
  const me = await getMe();
  const supa = await createServerClient();

  const { data, error } = await supa.rpc('decide_approval', {
    p_approval_id: input.approvalId,
    p_decider_id: me.id,
    p_decision: input.decision,
    p_comments: input.comments,
  });
  if (error) throw new Error(`Error al decidir: ${error.message}`);

  const rows = (data ?? []) as DecideRpcRow[];
  const row = rows[0];
  if (!row) throw new Error('decide_approval did not return a row');

  // Lookup request_id desde el approval, luego request + tipo + requester en queries separadas.
  const { data: appr } = await supa
    .from('request_approvals')
    .select('request_id')
    .eq('id', input.approvalId)
    .single();
  if (!appr) return;

  const { data: req } = await supa
    .from('requests')
    .select('id, request_number, requester_id, type_id')
    .eq('id', appr.request_id)
    .single();
  if (!req) return;

  const [{ data: requester }, { data: type }] = await Promise.all([
    supa.from('people').select('email, name').eq('id', req.requester_id).single(),
    supa.from('request_types').select('name').eq('id', req.type_id).single(),
  ]);

  const typeLabel = type?.name ?? 'Solicitud';

  if (row.is_final) {
    if (requester?.email) {
      await sendNotification('decision-final', {
        to: requester.email,
        to_name: requester.name.split(' ')[0],
        request_number: req.request_number ?? '',
        request_id: req.id,
        request_type_label: typeLabel,
        requester_name: requester.name,
        decision: row.request_status === 'Aprobada' ? 'Aprobada' : 'Rechazada',
      });
    }
  } else if (row.next_approver_id) {
    const { data: nextApprover } = await supa
      .from('people')
      .select('email, name')
      .eq('id', row.next_approver_id)
      .single();
    if (nextApprover?.email) {
      await sendNotification('solicitud-decidida', {
        to: nextApprover.email,
        to_name: nextApprover.name.split(' ')[0],
        request_number: req.request_number ?? '',
        request_id: req.id,
        request_type_label: typeLabel,
        requester_name: requester?.name ?? '',
      });
    }
  }

  revalidatePath('/solicitudes');
  revalidatePath(`/solicitudes/${req.id}`);
  revalidatePath('/admin');
}
