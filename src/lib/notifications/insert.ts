import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/database.types';
import { type NotificationTypeValue, TEMPLATE_CODE_MAP } from './types';

type AnySchemaClient = SupabaseClient<
  Database,
  keyof Omit<Database, '__InternalSupabase'>
>;

interface EnqueueParams {
  recipientPersonId: string;
  type: NotificationTypeValue;
  subject: string;
  body: string;
  templateVariables: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export async function enqueueNotification(
  client: AnySchemaClient,
  params: EnqueueParams
): Promise<void> {
  const { error } = await client.schema('notifications').rpc('enqueue', {
    p_recipient_id: params.recipientPersonId,
    p_notification_type: params.type,
    p_subject: params.subject,
    p_body: params.body,
    p_template_code: TEMPLATE_CODE_MAP[params.type],
    p_template_variables: params.templateVariables as Json,
    p_metadata: params.metadata as Json,
  });
  if (error) {
    throw new Error(`enqueueNotification failed: ${error.message}`);
  }
}
