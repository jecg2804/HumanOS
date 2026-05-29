// Sentry server-side init. Loaded by src/instrumentation.ts when NEXT_RUNTIME === 'nodejs'.
// No-op until James provisions the Sentry project and sets NEXT_PUBLIC_SENTRY_DSN / SENTRY_DSN
// (dsn undefined => Sentry.init does nothing). Until then errors still hit stderr via reportError.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  enableLogs: true,
  // R13: HR data is sensitive (medical, personal docs, salary). Never auto-attach PII
  // (request headers, IP, cookies) to error events. Add scrubbed context explicitly via reportError.
  sendDefaultPii: false,
});
