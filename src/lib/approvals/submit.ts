'use server';
import { createServerClient } from '@/lib/supabase/server';
import { getMe } from '@/lib/auth/getMe';
import { sendNotification } from '@/lib/email/send';
import { effectiveChain, type RequestTypeCode } from './chains';
import type { ApprovalRole } from './roles';

export type SubmitInput = {
  typeCode: RequestTypeCode;
  formData: Record<string, unknown>;
  attachments: Array<{ name: string; url: string; mime: string; size: number }>;
};

export type SubmitResult = {
  requestId: string;
  requestNumber: string;
};

type SubmitRpcRow = {
  request_id: string;
  request_number: string;
  first_approver_id: string | null;
};

export async function submitRequestAction(input: SubmitInput): Promise<SubmitResult> {
  const me = await getMe();
  const supa = await createServerClient();

  const { data: type, error: typeErr } = await supa
    .from('request_types')
    .select('id, name, approval_chain')
    .eq('code', input.typeCode)
    .single();
  if (typeErr || !type) {
    throw new Error(`Tipo de solicitud no encontrado: ${input.typeCode}`);
  }

  const baseChain = (type.approval_chain ?? []) as ApprovalRole[];
  const chain = effectiveChain(input.typeCode, input.formData, baseChain);

  const { data, error } = await supa.rpc('submit_request', {
    p_type_code: input.typeCode,
    p_requester_id: me.id,
    p_form_data: input.formData,
    p_attachments: input.attachments,
    p_approval_chain: chain,
  });
  if (error) throw new Error(`Error al enviar solicitud: ${error.message}`);

  const rows = (data ?? []) as SubmitRpcRow[];
  const row = rows[0];
  if (!row) throw new Error('submit_request did not return a row');

  if (row.first_approver_id) {
    const { data: approver } = await supa
      .from('people')
      .select('email, name')
      .eq('id', row.first_approver_id)
      .single();
    if (approver?.email) {
      await sendNotification('solicitud-enviada', {
        to: approver.email,
        to_name: approver.name.split(' ')[0],
        request_number: row.request_number,
        request_id: row.request_id,
        request_type_label: type.name,
        requester_name: me.name,
      });
    }
  }

  return { requestId: row.request_id, requestNumber: row.request_number };
}
