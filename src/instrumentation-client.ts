// Sentry client-side init (browser). Next.js loads this automatically. No-op until
// NEXT_PUBLIC_SENTRY_DSN is set. Session replay is privacy-hardened for R13: all text masked and
// all media blocked, so recordings never capture medical/personal/salary data on screen.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
});

// Instruments client-side navigations for tracing (App Router).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
