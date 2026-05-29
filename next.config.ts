import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const config: NextConfig = {};

// Source-map upload + release tracking only engage once James provisions the Sentry project
// (SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN, set in Vercel + CI). Until then we export the
// bare config so builds stay clean and warning-free; the native instrumentation hooks in
// src/instrumentation*.ts still run as a no-op (no DSN => Sentry.init does nothing).
export default process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : config;
