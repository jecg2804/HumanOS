import type { SupabaseClient } from '@supabase/supabase-js';
import { type NotificationTypeValue, TEMPLATE_CODE_MAP } from './types';

interface EnqueueParams {
  recipientPersonId: string;
  type: NotificationTypeValue;
  subject: string;
  body: string;
  templateVariables: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export async function enqueueNotification(
  client: SupabaseClient,
  params: EnqueueParams
): Promise<void> {
  const { error } = await client.schema('notifications').rpc('enqueue', {
    p_recipient_id: params.recipientPersonId,
    p_notification_type: params.type,
    p_subject: params.subject,
    p_body: params.body,
    p_template_code: TEMPLATE_CODE_MAP[params.type],
    p_template_variables: params.templateVariables,
    p_metadata: params.metadata,
  });
  if (error) {
    throw new Error(`enqueueNotification failed: ${error.message}`);
  }
}
