import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isPublicRoute } from '@/lib/auth/constants';
import { userHasHumanOSAccess } from '@/lib/auth/allowed-apps';

// FW-PROXY (Next 16): renamed from middleware.ts -> proxy.ts; export `middleware` -> `proxy`
// (verified via Context7 — version-16 upgrade guide). `proxy` runs the nodejs runtime (edge is
// NOT supported in proxy); our auth/session logic uses @supabase/ssr which works on nodejs, so
// there is no edge dependency. The `@/lib/supabase/middleware` import is a local helper module,
// not the Next file convention, so it keeps its name. config.matcher is unchanged.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request });
  }

  const { response, user } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!userHasHumanOSAccess(user)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'no_access');
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
