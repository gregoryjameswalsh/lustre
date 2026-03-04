'use client'

// src/app/global-error.tsx
// Catches errors in the root layout itself (rare but possible).
// Must include its own <html> and <body> tags.

import * as Sentry from "@sentry/nextjs";
import Error from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f9f8f5', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 300, color: '#0c0c0b', marginBottom: '0.75rem' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '1.5rem' }}>
              A critical error occurred. Please refresh the page.
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#d4d4d8', fontFamily: 'monospace', marginBottom: '1rem' }}>
                Ref: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                background: '#0c0c0b', color: '#f9f8f5', padding: '0.75rem 1.5rem',
                borderRadius: '9999px', border: 'none', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
