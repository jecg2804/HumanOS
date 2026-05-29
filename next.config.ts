import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const config: NextConfig = {};

const shouldEnableSentryBuild = Boolean(
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN,
);

// Source-map upload + release tracking only engage once the Sentry project is provisioned
// (SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN, set in Vercel + CI). Until then we export the
// bare config so builds stay clean and warning-free; the native instrumentation hooks in
// src/instrumentation*.ts still run as a no-op (no DSN => Sentry.init does nothing).
export default shouldEnableSentryBuild
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : config;
