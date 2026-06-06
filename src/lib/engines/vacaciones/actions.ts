'use server';
// VACACIONES server actions (Group 4 worked example). These sit ABOVE the engines and orchestrate
// them (spec §1): FormEngine (validate + snapshot + working_days) -> the SECURITY DEFINER RPCs that
// cross RLS (requests.submit_vacaciones / requests.act_on_approval / requests.process_step) ->
// NotificationEngine (fire-and-forget, R18).
//
// Why RPCs and not direct table writes: requests.approvals RLS only lets a person insert their OWN
// approval row (or hr_admin); the requester cannot instantiate the whole chain. The orchestration
// therefore lives in SECURITY DEFINER functions (migration 094) that re-check authorization inside.
// The TS engines hold the pure, unit-tested logic (state machine, chain resolution, stamp, validation)
// that those functions mirror at runtime.
//
// TYPING NOTE: the migration-094 RPCs are not yet in database.types (regenerated post-apply by the
// main loop). Until then we call them via an untyped client view (typedRpc helper) -- a deliberate,
// localized escape hatch, not a project-wide `any`.

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FormSchema } from '../types';
import { validate, workingDays, readDateRanges, buildSnapshot } from '../form';
import { notifyTicketEvent } from '../notification';

export interface ActionResult<T = unknown> {
  ok: boolean;
  message?: string;
  errors?: { key: string; message: string }[];
  data?: T;
}

/** Localized untyped-RPC escape hatch (migration-094 functions not yet in database.types). */
type RpcArgs = Record<string, unknown>;
function callRpc(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  schema: 'requests' | 'hr',
  fn: string,
  args: RpcArgs
) {
  const untyped = client as unknown as SupabaseClient;
  return untyped.schema(schema as never).rpc(fn as never, args as never);
}

/**
 * Notify whoever must act on the ticket's NEXT actionable step (S3 fix). Resolution lives in the DB
 * (requests.ticket_pending_recipients): the lowest-step_order Pendiente row's named approver, or the
 * active hr_admin pool when that step is pooled (RRHH-recibe / Planilla-verifica). This is what keeps
 * the chain faithful -- after submit the recipient is RRHH (not the supervisor); after RRHH recibe it
 * is the supervisor; after the supervisor approves it is the Planilla pool; etc. Fire-and-forget (R18):
 * notifyTicketEvent never throws, so a notification failure never blocks the business op.
 */
async function notifyPendingRecipients(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  params: { ticketId: string; ticketNumber: string; typeName: string }
): Promise<void> {
  const { data } = await callRpc(supabase, 'requests', 'ticket_pending_recipients', {
    p_ticket_id: params.ticketId,
  });
  const recipients = Array.isArray(data)
    ? (data as { person_id: string }[]).map((r) => r.person_id).filter(Boolean)
    : [];
  for (const recipientPersonId of recipients) {
    await notifyTicketEvent(supabase, {
      recipientPersonId,
      event: 'assigned',
      ticketId: params.ticketId,
      ticketNumber: params.ticketNumber,
      typeName: params.typeName,
    });
  }
}

export interface SubmitVacacionesInput {
  /** the requester's user_input (tipo_pago, tiempo_solicitado, date_ranges, observaciones). */
  userInput: Record<string, unknown>;
  /** chosen supervisor (override); null falls back to employment supervisor inside the RPC. */
  selectedSupervisorId?: string | null;
  /** hr_admin manual entry (ADR-0005). */
  manualEntry?: boolean;
}

/**
 * Submit a VACACIONES request. Resolves prefill (profile + computed) server-side, validates the
 * user_input with the FormEngine (including dias_lte_saldo), builds the ADR-0003 snapshot, and calls
 * requests.submit_vacaciones (which assigns the ticket_number, reserves the balance, and instantiates
 * the chain). Returns the new ticket on success.
 */
export async function submitVacaciones(
  input: SubmitVacacionesInput
): Promise<ActionResult<{ ticketId: string; ticketNumber: string; status: string }>> {
  const supabase = await createSupabaseServerClient();

  // ---- 1. Resolve who is submitting + their schema/prefill (live hr.* reads, pre-submit only). ----
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, message: 'No autenticado.' };

  const { data: person, error: personErr } = await supabase
    .schema('hr')
    .from('people')
    .select('id, full_name, national_id')
    .eq('auth_id', auth.user.id)
    .maybeSingle();
  if (personErr || !person) return { ok: false, message: 'No se encontro tu perfil.' };

  const { data: typeRow, error: typeErr } = await supabase
    .schema('requests')
    .from('types')
    .select('id, name, form_schema')
    .eq('code', 'VACACIONES')
    .maybeSingle();
  if (typeErr || !typeRow?.form_schema) {
    return { ok: false, message: 'El tipo VACACIONES no tiene esquema configurado.' };
  }
  const schema = typeRow.form_schema as unknown as FormSchema;

  // current employment (cargo/depto profile snapshot) + active balance (computed).
  const { data: emp } = await supabase
    .schema('hr')
    .from('employments')
    .select('position_text, department_text, hire_date, supervisor_id')
    .eq('person_id', person.id)
    .eq('is_current', true)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: saldoData } = await callRpc(supabase, 'hr', 'get_leave_balance', {
    p_person_id: person.id,
  });
  const leaveBalance =
    typeof saldoData === 'number' ? saldoData : saldoData == null ? null : Number(saldoData);

  // ---- 2. Compute derived values (computed source) + validate user_input. ----
  const ranges = readDateRanges(input.userInput.date_ranges);
  const dias = workingDays(ranges);

  const validation = validate(schema, input.userInput, {
    leaveBalance,
    diasSolicitados: dias,
  });
  if (!validation.ok) {
    return { ok: false, message: 'Revisa el formulario.', errors: validation.errors };
  }
  if (dias <= 0) {
    return {
      ok: false,
      message: 'Selecciona al menos un rango de fechas valido.',
      errors: [{ key: 'date_ranges', message: 'Dias solicitados debe ser mayor a 0.' }],
    };
  }

  // ---- 3. Build the ADR-0003 snapshot (profile + computed frozen alongside user_input). ----
  const tenureYears =
    emp?.hire_date != null
      ? Math.floor(
          (Date.now() - new Date(emp.hire_date).getTime()) / (365.25 * 24 * 3600 * 1000)
        )
      : null;

  const prefill: Record<string, unknown> = {
    fecha_solicitud: new Date().toISOString().slice(0, 10),
    nombre_empleado: person.full_name,
    cedula: person.national_id,
    cargo: emp?.position_text ?? null,
    departamento: emp?.department_text ?? null,
    antiguedad: tenureYears,
    saldo_vacaciones: leaveBalance,
    dias_solicitados: dias,
  };
  const snapshot = buildSnapshot(schema, input.userInput, prefill);

  // ---- 4. Submit via the SECURITY DEFINER RPC (sequence + reserve + chain). ----
  const { data: ticket, error: submitErr } = await callRpc(
    supabase,
    'requests',
    'submit_vacaciones',
    {
      p_form_data: snapshot,
      p_dias: dias,
      p_selected_supervisor: input.selectedSupervisorId ?? null,
      p_manual_entry: input.manualEntry ?? false,
    }
  );
  if (submitErr || !ticket) {
    return { ok: false, message: submitErr?.message ?? 'No se pudo enviar la solicitud.' };
  }
  const t = ticket as {
    id: string;
    ticket_number: string;
    status: string;
    current_assignee_id: string | null;
  };

  // ---- 5. Notify whoever must act on the FIRST actionable step (fire-and-forget, R18). Non-manual
  // only (the ADR-0005 bypass has no chain). S3 fix: the first actionable step of VACACIONES is the
  // pooled RRHH-recibe (any_hr_admin), NOT the supervisor -- so we resolve recipients via
  // requests.ticket_pending_recipients (the hr_admin pool here) instead of pinging the supervisor
  // prematurely. The supervisor is notified later, when RRHH recibe advances the pointer to them. ----
  if (!input.manualEntry) {
    await notifyPendingRecipients(supabase, {
      ticketId: t.id,
      ticketNumber: t.ticket_number,
      typeName: typeRow.name,
    });
  }

  revalidatePath('/solicitudes');
  return {
    ok: true,
    data: { ticketId: t.id, ticketNumber: t.ticket_number, status: t.status },
  };
}

export interface VacacionesFormContext {
  ok: boolean;
  message?: string;
  typeName?: string;
  schema?: FormSchema;
  /** profile + computed values for read-only display (the authoritative snapshot is rebuilt at submit). */
  prefill?: Record<string, unknown>;
  /** name of the employment supervisor who will approve by default (display). */
  supervisorName?: string | null;
  /** the employment supervisor's id (default selection for the override picker). */
  defaultSupervisorId?: string | null;
  /** whether the requester may pick a different supervisor (R6/R10). */
  allowSupervisorOverride?: boolean;
  /** candidate supervisors for the override picker (active real supervisors + president, minus self). */
  supervisors?: { id: string; full_name: string }[];
}

/**
 * Load everything the new-VACACIONES form needs to render: the schema, the profile/computed prefill,
 * and the supervisor name. Display-only — submitVacaciones rebuilds the authoritative snapshot
 * server-side at submit (ADR-0003), never trusting client-sent prefill.
 */
export async function getVacacionesFormContext(): Promise<VacacionesFormContext> {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, message: 'No autenticado.' };

  const { data: person, error: personErr } = await supabase
    .schema('hr')
    .from('people')
    .select('id, full_name, national_id')
    .eq('auth_id', auth.user.id)
    .maybeSingle();
  if (personErr || !person) return { ok: false, message: 'No se encontro tu perfil.' };

  const { data: typeRow, error: typeErr } = await supabase
    .schema('requests')
    .from('types')
    .select('name, form_schema, allow_supervisor_override')
    .eq('code', 'VACACIONES')
    .maybeSingle();
  if (typeErr || !typeRow?.form_schema) {
    return { ok: false, message: 'El tipo VACACIONES no tiene esquema configurado.' };
  }
  const schema = typeRow.form_schema as unknown as FormSchema;

  const { data: emp } = await supabase
    .schema('hr')
    .from('employments')
    .select(
      'position_text, department_text, hire_date, supervisor_id, supervisor:people!supervisor_id(full_name)'
    )
    .eq('person_id', person.id)
    .eq('is_current', true)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: saldoData } = await callRpc(supabase, 'hr', 'get_leave_balance', {
    p_person_id: person.id,
  });
  const leaveBalance =
    typeof saldoData === 'number' ? saldoData : saldoData == null ? null : Number(saldoData);

  const supervisorRaw = (emp as { supervisor?: unknown } | null)?.supervisor;
  const supervisor = (Array.isArray(supervisorRaw) ? supervisorRaw[0] : supervisorRaw) as
    | { full_name: string }
    | null
    | undefined;

  const empTyped = emp as
    | {
        position_text: string | null;
        department_text: string | null;
        hire_date: string | null;
        supervisor_id: string | null;
      }
    | null;

  const tenureYears =
    empTyped?.hire_date != null
      ? Math.floor(
          (Date.now() - new Date(empTyped.hire_date).getTime()) / (365.25 * 24 * 3600 * 1000)
        )
      : null;

  const prefill: Record<string, unknown> = {
    fecha_solicitud: new Date().toISOString().slice(0, 10),
    nombre_empleado: person.full_name,
    cedula: person.national_id,
    cargo: empTyped?.position_text ?? null,
    departamento: empTyped?.department_text ?? null,
    antiguedad: tenureYears,
    saldo_vacaciones: leaveBalance,
    // dias_solicitados is computed live from the date ranges in the form (and authoritatively at submit).
  };

  // Override candidates (R6/R10), only when the type allows it. RLS-safe via the definer resolver.
  let supervisors: { id: string; full_name: string }[] = [];
  if (typeRow.allow_supervisor_override) {
    const { data: cand } = await callRpc(supabase, 'requests', 'supervisor_candidates', {});
    supervisors = Array.isArray(cand)
      ? (cand as { id: string; full_name: string }[]).filter((c) => c?.id)
      : [];
  }

  return {
    ok: true,
    typeName: typeRow.name,
    schema,
    prefill,
    supervisorName: supervisor?.full_name ?? null,
    defaultSupervisorId: empTyped?.supervisor_id ?? null,
    allowSupervisorOverride: Boolean(typeRow.allow_supervisor_override),
    supervisors,
  };
}

export interface ActOnApprovalInput {
  ticketId: string;
  decision: 'Aprobada' | 'Rechazada' | 'Modificada';
  comments?: string;
}

/**
 * Act on the current approval gate of a ticket (approve / reject / return-for-modification). The RPC
 * validates the resolved current approver + R5 (not-self), records the decision + stamp, applies the
 * ledger effect, and transitions the ticket. Notifies the requester (fire-and-forget).
 */
export async function actOnApproval(
  input: ActOnApprovalInput
): Promise<ActionResult<{ status: string }>> {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, message: 'No autenticado.' };

  const { data: ticket, error } = await callRpc(supabase, 'requests', 'act_on_approval', {
    p_ticket_id: input.ticketId,
    p_decision: input.decision,
    p_comments: input.comments ?? null,
  });
  if (error || !ticket) {
    return { ok: false, message: error?.message ?? 'No se pudo registrar la decision.' };
  }
  const t = ticket as { id: string; ticket_number: string; status: string; requester_id: string };

  const event =
    input.decision === 'Aprobada'
      ? 'approved'
      : input.decision === 'Rechazada'
        ? 'rejected'
        : 'returned';
  await notifyTicketEvent(supabase, {
    recipientPersonId: t.requester_id,
    event,
    ticketId: t.id,
    ticketNumber: t.ticket_number,
    typeName: 'Solicitud de Vacaciones',
  });

  // If the gate approval advanced the ticket (still En_Revision), notify whoever must act next (the
  // Planilla pool, then the GG gate). Terminal decisions (Aprobada/Rechazada/Devuelta) have no next
  // actor. S3: this keeps the chain's notifications faithful instead of stopping at the requester.
  if (t.status === 'En_Revision') {
    await notifyPendingRecipients(supabase, {
      ticketId: t.id,
      ticketNumber: t.ticket_number,
      typeName: 'Solicitud de Vacaciones',
    });
  }

  revalidatePath(`/solicitudes/${input.ticketId}`);
  return { ok: true, data: { status: t.status } };
}

export interface ProcessStepInput {
  ticketId: string;
  roleKind: 'received' | 'processed';
}

/**
 * Mark a processing step done (RRHH recibe / Planilla verifica). hr_admin-only (enforced in the RPC).
 * Never gates -- stamps + advances the pointer.
 */
export async function processStep(
  input: ProcessStepInput
): Promise<ActionResult<{ status: string }>> {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, message: 'No autenticado.' };

  const { data: ticket, error } = await callRpc(supabase, 'requests', 'process_step', {
    p_ticket_id: input.ticketId,
    p_role_kind: input.roleKind,
  });
  if (error || !ticket) {
    return { ok: false, message: error?.message ?? 'No se pudo procesar el paso.' };
  }
  const t = ticket as { id: string; ticket_number: string; status: string };

  // Processing advanced the pointer to the next step; notify whoever must act next (RRHH recibe ->
  // supervisor gate; Planilla verifica -> GG gate). Fire-and-forget (R18). S3 chain fidelity.
  await notifyPendingRecipients(supabase, {
    ticketId: t.id,
    ticketNumber: t.ticket_number,
    typeName: 'Solicitud de Vacaciones',
  });

  revalidatePath(`/solicitudes/${input.ticketId}`);
  return { ok: true, data: { status: t.status } };
}
