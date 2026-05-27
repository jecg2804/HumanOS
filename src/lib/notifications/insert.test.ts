import { describe, it, expect, vi } from 'vitest';
import { enqueueNotification } from './insert';
import { NotificationType } from './types';

function mockClient(rpcImpl?: () => Promise<{ data: unknown; error: unknown }>) {
  const rpc = vi.fn(rpcImpl ?? (async () => ({ data: null, error: null })));
  const schemaFn = vi.fn(() => ({ rpc }));
  return { schema: schemaFn, rpc } as never;
}

describe('enqueueNotification', () => {
  it('calls notifications.enqueue RPC with correct params', async () => {
    const client = mockClient();
    await enqueueNotification(client, {
      recipientPersonId: 'rec-uuid',
      type: NotificationType.WelcomeEmployee,
      subject: 'Bienvenido',
      body: 'Hola',
      templateVariables: { name: 'X' },
      metadata: { deep_link: '/perfil' },
    });
    const c = client as unknown as {
      schema: ReturnType<typeof vi.fn>;
      rpc: ReturnType<typeof vi.fn>;
    };
    expect(c.schema).toHaveBeenCalledWith('notifications');
    expect(c.rpc).toHaveBeenCalledWith(
      'enqueue',
      expect.objectContaining({
        p_recipient_id: 'rec-uuid',
        p_notification_type: 'welcome_employee',
        p_subject: 'Bienvenido',
        p_template_code: 'WelcomeEmployee',
      })
    );
  });

  it('throws when RPC returns error', async () => {
    const client = mockClient(async () => ({ data: null, error: { message: 'fail' } }));
    await expect(
      enqueueNotification(client, {
        recipientPersonId: 'rec',
        type: NotificationType.WelcomeEmployee,
        subject: 's',
        body: 'b',
        templateVariables: {},
        metadata: {},
      })
    ).rejects.toThrow(/fail/);
  });
});
