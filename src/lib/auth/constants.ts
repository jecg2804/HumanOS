export const APP_NAME = 'humanOS' as const;

export const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/api/auth',
  '/error',
] as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((prefix) => pathname.startsWith(prefix));
}
