import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isPublicRoute } from '@/lib/auth/constants';
import { userHasHumanOSAccess } from '@/lib/auth/allowed-apps';

export async function middleware(request: NextRequest) {
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
