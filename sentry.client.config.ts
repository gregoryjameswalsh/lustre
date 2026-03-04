// sentry.client.config.ts
// Sentry client-side initialisation.
// This file is loaded in the browser.

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of transactions in dev; tune down in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay 10% of sessions; always replay sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Don't send errors in local dev unless DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
