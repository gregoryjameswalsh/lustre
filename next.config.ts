import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  // Next.js 16 defaults to Turbopack. withSentryConfig adds a webpack config,
  // which triggers an error unless we declare an explicit turbopack config too.
  // An empty object is sufficient — we don't need custom Turbopack rules.
  turbopack: {},

  // Proxy PostHog through our own domain so requests pass the CSP 'self'
  // allowlist and aren't blocked by ad-blockers.
  async rewrites() {
    return [
      {
        source:      '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source:      '/ingest/decide',
        destination: 'https://eu.i.posthog.com/decide',
      },
      {
        source:      '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // unsafe-eval is only needed by the dev HMR runtime; strip it in production
              isDev
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Sentry ingest + Supabase realtime
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organisation + project (set SENTRY_ORG and SENTRY_PROJECT env vars)
  silent: !isDev,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Upload source maps in CI/CD only to avoid slowing local builds
  sourcemaps: {
    disable: isDev,
  },
});
