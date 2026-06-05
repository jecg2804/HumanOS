// src/app/api/cron/sdx-people-sync/route.ts
// Vercel Cron worker for Spectrum people sync (v2). Auth gate mirrors process-notifications.
// Relays to the Edge function sdx-people-sync (service_role). The cron is DISABLED in vercel.ts
// until the SDX vendor (Dexter+Chaney / iconsanet) confirms the intended auth model; this route is
// reachable for manual/authorized invocation in the meantime.
//
// ADR-0006 exception: server-only worker, no user session (uses SERVICE_ROLE to invoke the Edge fn).

import { NextResponse } from 'next/server';
import { SUPABASE_URL } from '@/lib/supabase/env';

export async function GET(request: Request) {
  // CRON_SECRET fail-closed: an unset secret would make `Bearer undefined` trivially replicable.
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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('[cron] SUPABASE_SERVICE_ROLE_KEY missing — cannot invoke edge fn');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/sdx-people-sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json({ invoked: true, edge_status: res.status, edge_body: body }, { status: res.ok ? 200 : 502 });
}
