// Vercel Cron worker. Schedule: */5 * * * * (declared in vercel.ts).
// Auth: x-vercel-cron header (Vercel-signed) + Authorization: Bearer ${CRON_SECRET}.
// Reads notifications.outbox WHERE channel='email' AND status='pending'.
// Renders @react-email template + sends via Resend with Reply-To.
//
// ADR-0006 exception: uses service_role admin client (worker has no user session).

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import * as Templates from '@/emails';
import type { Database } from '@/lib/supabase/database.types';

type OutboxRow = Database['notifications']['Tables']['outbox']['Row'];

const MAX_PER_TICK = 50;

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function GET(request: Request) {
  // P3.43->P2 Batch 3: validar CRON_SECRET no undefined antes de comparison.
  // Si env var no seteada, comparison seria `Bearer undefined` que cliente
  // puede replicar trivialmente. Fail closed.
  if (!process.env.CRON_SECRET) {
    console.error('[cron] CRON_SECRET env var no esta seteada — abort');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!isVercelCron && authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn('[cron] RESEND_API_KEY or RESEND_FROM_EMAIL missing — skipping cycle');
    return NextResponse.json({ skipped: true, reason: 'env missing' });
  }

  const supabase = createSupabaseAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: rows, error } = await supabase
    .schema('notifications')
    .from('outbox')
    .select(
      'id, recipient_id, subject, body, template_code, template_variables, attempts, max_attempts'
    )
    .eq('channel', 'email')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(MAX_PER_TICK);

  if (error) {
    console.error('[cron] fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const row of (rows ?? []) as OutboxRow[]) {
    try {
      const { data: person } = await supabase
        .schema('hr')
        .from('people')
        .select('auth_id, full_name')
        .eq('id', row.recipient_id)
        .maybeSingle();

      if (!person?.auth_id) {
        await markFailed(supabase, row.id, 'No auth_id for recipient', row.attempts + 1);
        failed++;
        continue;
      }

      const userResult = await supabase.auth.admin.getUserById(person.auth_id);
      const recipientEmail = userResult.data.user?.email;
      if (!recipientEmail) {
        await markFailed(supabase, row.id, 'No email on auth.user', row.attempts + 1);
        failed++;
        continue;
      }

      const templateCode = row.template_code ?? '';
      const Template = (
        Templates as unknown as Record<
          string,
          (props: Record<string, unknown>) => React.ReactElement
        >
      )[templateCode];
      if (!Template) {
        await markFailed(
          supabase,
          row.id,
          `Template ${templateCode} not found`,
          row.attempts + 1
        );
        failed++;
        continue;
      }

      const replyTo =
        templateCode === 'PasswordReset' ? undefined : process.env.RESEND_REPLY_TO;

      const { error: sendErr } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [recipientEmail],
        ...(replyTo ? { replyTo } : {}),
        subject: row.subject ?? '',
        react: Template((row.template_variables as Record<string, unknown>) ?? {}),
      });

      if (sendErr) throw new Error(sendErr.message);

      await supabase
        .schema('notifications')
        .from('outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: row.attempts + 1,
        })
        .eq('id', row.id);
      sent++;
    } catch (err) {
      await markFailed(supabase, row.id, (err as Error).message, row.attempts + 1);
      failed++;
    }
  }

  return NextResponse.json({ processed: rows?.length ?? 0, sent, failed });
}

async function markFailed(
  supabase: AdminClient,
  id: string,
  message: string,
  attempts: number
) {
  await supabase
    .schema('notifications')
    .from('outbox')
    .update({ status: 'failed', error_message: message, attempts })
    .eq('id', id);
}
