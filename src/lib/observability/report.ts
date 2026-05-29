// Single entry point for reporting handled errors from app code (server actions, cron worker,
// route handlers). Sends to Sentry when configured and always logs to stderr so nothing is lost
// before the Sentry DSN is provisioned. Use this instead of bare console.error for swallowed errors
// (e.g. a failed audit-log write that must not fail the primary operation).
import * as Sentry from '@sentry/nextjs';

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, context ? { extra: context } : undefined);
  console.error('[reportError]', error, context ?? '');
}
