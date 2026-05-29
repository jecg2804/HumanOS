// Vercel Cron worker. Schedule: */5 * * * * (declared in vercel.ts).
// Auth: x-vercel-cron header (Vercel-signed) + Authorization: Bearer ${CRON_SECRET}.
// Reads notifications.outbox WHERE channel='email' AND status='pending'.
// Renders @react-email template + sends via Resend with Reply-To.
//
// ADR-0006 exception: uses service_role admin client (worker has no user session).
//
// Audit 2026-05-29 BE-1: retry machinery rewritten. A transient Resend error now keeps
// status='pending' and increments attempts (retried next tick) until attempts >= max_attempts,
// then flips to terminal 'failed'. Permanent failures (no recipient/template) flip to 'failed'
// immediately. last_attempt_at is now written. Previously ANY error set terminal 'failed' on
// the first try, so max_attempts/attempts<3/backoff were inert and one transient hiccup
// silently dropped an email forever.

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import * as Templates from '@/emails';
import type { Database } from '@/lib/supabase/database.types';

type OutboxRow = Database['notifications']['Tables']['outbox']['Row'];

const MAX_PER_TICK = 50;

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function GET(request: Request) {
  // CRON_SECRET fail-closed: if unset, comparison would be `Bearer undefined` (trivially
  // replicable by a client). Abort rather than auth on an empty secret.
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

  // Only pending rows are eligible. A row stays 'pending' across transient failures (so it is
  // re-selected next tick) until attempts >= max_attempts flips it to terminal 'failed'.
  const { data: rows, error } = await supabase
    .schema('notifications')
    .from('outbox')
    .select(
      'id, recipient_id, subject, body, template_code, template_variables, attempts, max_attempts'
    )
    .eq('channel', 'email')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(MAX_PER_TICK);

  if (error) {
    console.error('[cron] fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let retrying = 0;
  let failed = 0;

  for (const row of (rows ?? []) as OutboxRow[]) {
    // Permanent (non-retryable) failures: recipient/template problems will not fix themselves.
    const { data: person } = await supabase
      .schema('hr')
      .from('people')
      .select('auth_id, full_name')
      .eq('id', row.recipient_id)
      .maybeSingle();

    if (!person?.auth_id) {
      await markPermanent(supabase, row.id, 'No auth_id for recipient', row.attempts + 1);
      failed++;
      continue;
    }

    const userResult = await supabase.auth.admin.getUserById(person.auth_id);
    const recipientEmail = userResult.data.user?.email;
    if (!recipientEmail) {
      await markPermanent(supabase, row.id, 'No email on auth.user', row.attempts + 1);
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
      await markPermanent(supabase, row.id, `Template ${templateCode} not found`, row.attempts + 1);
      failed++;
      continue;
    }

    const replyTo =
      templateCode === 'PasswordReset' ? undefined : process.env.RESEND_REPLY_TO;

    // Transient (retryable) failures: a Resend send error keeps the row pending until exhausted.
    try {
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
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      sent++;
    } catch (err) {
      const exhausted = await markRetryable(
        supabase,
        row.id,
        (err as Error).message,
        row.attempts + 1,
        row.max_attempts ?? 3
      );
      if (exhausted) failed++;
      else retrying++;
    }
  }

  return NextResponse.json({ processed: rows?.length ?? 0, sent, retrying, failed });
}

// Permanent failure: recipient/template issue that will not resolve on retry. Terminal 'failed'.
async function markPermanent(
  supabase: AdminClient,
  id: string,
  message: string,
  attempts: number
) {
  await supabase
    .schema('notifications')
    .from('outbox')
    .update({
      status: 'failed',
      error_message: message,
      attempts,
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', id);
}

// Transient failure: keep 'pending' for the next tick unless attempts exhausted max_attempts,
// in which case flip to terminal 'failed'. Returns true if exhausted (terminal).
async function markRetryable(
  supabase: AdminClient,
  id: string,
  message: string,
  attempts: number,
  maxAttempts: number
): Promise<boolean> {
  const exhausted = attempts >= maxAttempts;
  await supabase
    .schema('notifications')
    .from('outbox')
    .update({
      status: exhausted ? 'failed' : 'pending',
      error_message: message,
      attempts,
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', id);
  return exhausted;
}
