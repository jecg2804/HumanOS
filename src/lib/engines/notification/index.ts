// NotificationEngine (ADR-0008, R18). A thin facade over the shipped notifications foundation
// (src/lib/notifications/insert.ts -> notifications.enqueue RPC + Vercel Cron worker + Resend
// templates). Mostly reuse: this module gives the engines/server-actions ticket-event helpers with
// the right type + dedupe key, so callers do not hand-roll enqueue params per event.
//
// Fire-and-forget (R18): the orchestration INSERTs the business mutation + audit + ledger in the same
// transaction; the notification enqueue is best-effort and must NEVER block or fail the business op
// (audit/ledger are NOT fire-and-forget -- only this is). Hence notifyTicketEvent swallows errors and
// reports them, rather than throwing.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { enqueueNotification } from '@/lib/notifications/insert';
import { NotificationType } from '@/lib/notifications/types';

type AnySchemaClient = SupabaseClient<
  Database,
  keyof Omit<Database, '__InternalSupabase'>
>;

export type TicketEvent =
  | 'assigned' // a step (gate/processing) was assigned to someone
  | 'approved' // a gate was approved / the ticket reached Aprobada
  | 'rejected' // the ticket was rejected
  | 'returned'; // the ticket was returned for modification

const EVENT_TYPE = {
  assigned: NotificationType.TicketCreatedApprover,
  approved: NotificationType.TicketStatusChangedRequester,
  rejected: NotificationType.TicketStatusChangedRequester,
  returned: NotificationType.TicketStatusChangedRequester,
} as const;

const EVENT_SUBJECT: Record<TicketEvent, string> = {
  assigned: 'Tienes una solicitud pendiente de tu accion',
  approved: 'Tu solicitud avanzo',
  rejected: 'Tu solicitud fue rechazada',
  returned: 'Tu solicitud requiere modificacion',
};

export interface NotifyTicketEventParams {
  recipientPersonId: string;
  event: TicketEvent;
  ticketId: string;
  ticketNumber: string;
  typeName: string;
  body?: string;
}

/**
 * Enqueue a ticket-event notification. Fire-and-forget (R18): never throws -- on failure it returns
 * { ok:false } so the caller can log but never block the business op. The dedupe key (BE-2) makes
 * retries idempotent per (ticket, event, recipient).
 */
export async function notifyTicketEvent(
  client: AnySchemaClient,
  params: NotifyTicketEventParams
): Promise<{ ok: boolean; error?: string }> {
  try {
    await enqueueNotification(client, {
      recipientPersonId: params.recipientPersonId,
      type: EVENT_TYPE[params.event],
      subject: EVENT_SUBJECT[params.event],
      body:
        params.body ??
        `Solicitud ${params.ticketNumber} (${params.typeName}).`,
      templateVariables: {
        ticket_number: params.ticketNumber,
        type_name: params.typeName,
        event: params.event,
      },
      metadata: { deep_link: `/solicitudes/${params.ticketId}`, ticket_id: params.ticketId },
      dedupeKey: `ticket:${params.ticketId}:${params.event}:${params.recipientPersonId}`,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
