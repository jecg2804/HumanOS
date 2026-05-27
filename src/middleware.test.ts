import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

import { middleware } from './middleware';
import { updateSession } from '@/lib/supabase/middleware';

function makeReq(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:3001'));
}

describe('middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes through /login without auth check', async () => {
    const req = makeReq('/login');
    const res = await middleware(req);
    expect(updateSession).not.toHaveBeenCalled();
    expect(res).toBeInstanceOf(NextResponse);
  });

  it('passes through /onboarding/[code]', async () => {
    const req = makeReq('/onboarding/ABC123');
    await middleware(req);
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('passes through /api/auth/callback', async () => {
    const req = makeReq('/api/auth/callback');
    await middleware(req);
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('redirects to /login when user is not authenticated', async () => {
    vi.mocked(updateSession).mockResolvedValue({
      response: NextResponse.next(),
      user: null,
      supabase: {} as never,
    });
    const req = makeReq('/dashboard');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('location')).toContain('next=%2Fdashboard');
  });

  it('redirects to /login?error=no_access when user lacks humanOS', async () => {
    vi.mocked(updateSession).mockResolvedValue({
      response: NextResponse.next(),
      user: {
        id: 'u1',
        app_metadata: { allowed_apps: ['movimientOS'] },
      } as never,
      supabase: {} as never,
    });
    const req = makeReq('/dashboard');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=no_access');
  });

  it('allows authenticated user with humanOS through', async () => {
    const mockResponse = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: {
        id: 'u1',
        app_metadata: { allowed_apps: ['humanOS'] },
      } as never,
      supabase: {} as never,
    });
    const req = makeReq('/dashboard');
    const res = await middleware(req);
    expect(res).toBe(mockResponse);
  });
});
