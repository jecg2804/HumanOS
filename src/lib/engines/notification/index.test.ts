import { describe, it, expect, vi } from 'vitest';
import { notifyTicketEvent } from './index';

function mockClient(rpcImpl?: () => Promise<{ data: unknown; error: unknown }>) {
  const rpc = vi.fn(rpcImpl ?? (async () => ({ data: null, error: null })));
  const schemaFn = vi.fn(() => ({ rpc }));
  return { schema: schemaFn, rpc } as never;
}

describe('NotificationEngine.notifyTicketEvent', () => {
  it('enqueues an assigned event with the ticket deep-link + dedupe key', async () => {
    const client = mockClient();
    const r = await notifyTicketEvent(client, {
      recipientPersonId: 'sup-1',
      event: 'assigned',
      ticketId: 't-1',
      ticketNumber: 'HUM-2026-0001',
      typeName: 'Solicitud de Vacaciones',
    });
    expect(r.ok).toBe(true);
    const c = client as unknown as { rpc: ReturnType<typeof vi.fn> };
    expect(c.rpc).toHaveBeenCalledWith(
      'enqueue',
      expect.objectContaining({
        p_recipient_id: 'sup-1',
        p_notification_type: 'ticket_created_approver',
        p_dedupe_key: 'ticket:t-1:assigned:sup-1',
      })
    );
  });

  it('maps approved/rejected/returned to the requester status-change type', async () => {
    const client = mockClient();
    await notifyTicketEvent(client, {
      recipientPersonId: 'req-1', event: 'rejected', ticketId: 't-2',
      ticketNumber: 'HUM-2026-0002', typeName: 'Vacaciones',
    });
    const c = client as unknown as { rpc: ReturnType<typeof vi.fn> };
    expect(c.rpc).toHaveBeenCalledWith(
      'enqueue',
      expect.objectContaining({ p_notification_type: 'ticket_status_changed_requester' })
    );
  });

  it('is fire-and-forget: returns ok:false instead of throwing on enqueue failure (R18)', async () => {
    const client = mockClient(async () => ({ data: null, error: { message: 'down' } }));
    const r = await notifyTicketEvent(client, {
      recipientPersonId: 'x', event: 'approved', ticketId: 't-3',
      ticketNumber: 'HUM-2026-0003', typeName: 'Vacaciones',
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/down/);
  });
});
