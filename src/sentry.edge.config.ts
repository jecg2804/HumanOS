// Sentry edge-runtime init (middleware/edge routes). Loaded by src/instrumentation.ts when
// NEXT_RUNTIME === 'edge'. Same R13-safe defaults as the server config; no session replay on edge.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    'https://59312544d36c5eca71e37fe2697bee9a@o4511186019680256.ingest.us.sentry.io/4511474673909760',
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  enableLogs: true,
  sendDefaultPii: false,
});
