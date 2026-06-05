// src/app/api/cron/sdx-people-sync/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/env', () => ({ SUPABASE_URL: 'https://test.supabase.co' }));

import { GET } from './route';

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3001/api/cron/sdx-people-sync', { headers });
}

describe('GET /api/cron/sdx-people-sync — auth gate', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CRON_SECRET = 'secret123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-key';
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('500 when CRON_SECRET is unset (fail-closed)', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it('401 without secret or vercel-cron header', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('401 with a wrong bearer', async () => {
    const res = await GET(makeReq({ authorization: 'Bearer nope' }));
    expect(res.status).toBe(401);
  });

  it('200 with x-vercel-cron:1 (relays to edge fn)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const res = await GET(makeReq({ 'x-vercel-cron': '1' }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/sdx-people-sync',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('200 with a correct Bearer CRON_SECRET', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const res = await GET(makeReq({ authorization: 'Bearer secret123' }));
    expect(res.status).toBe(200);
  });
});
