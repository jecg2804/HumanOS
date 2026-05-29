// Sentry client-side init (browser). Next.js loads this automatically. No-op until
// NEXT_PUBLIC_SENTRY_DSN is set. Session replay is privacy-hardened for R13: all text masked and
// all media blocked, so recordings never capture medical/personal/salary data on screen.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    'https://59312544d36c5eca71e37fe2697bee9a@o4511186019680256.ingest.us.sentry.io/4511474673909760',
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
});

// Instruments client-side navigations for tracing (App Router).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
