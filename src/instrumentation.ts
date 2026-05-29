// Next.js instrumentation hook (App Router, src dir). Wires Sentry server/edge configs and the
// onRequestError hook so errors from Server Components, route handlers, server actions and the
// proxy/middleware are captured. Native Next.js hooks — work independently of withSentryConfig.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
