'use client'

// src/app/error.tsx
// Route-level error boundary — catches unhandled errors in dashboard routes.
// To add error reporting: import * as Sentry from '@sentry/nextjs' and call
// Sentry.captureException(error) inside the useEffect below.

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Lustre] unhandled error:', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#f9f8f5] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm px-6">
        <h2 className="text-xl font-light tracking-tight text-zinc-900">Something went wrong</h2>
        <p className="text-sm text-zinc-400">An unexpected error occurred. Please try again, or contact support if the problem persists.</p>
        {error.digest && (
          <p className="text-xs text-zinc-300 font-mono">Ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-6 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
