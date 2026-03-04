'use client'

// src/components/PostHogProvider.tsx
// =============================================================================
// LUSTRE — PostHog client-side provider
//
// Initialises posthog-js, tracks pageviews on navigation, and identifies the
// authenticated user so client-side and server-side events are joined.
//
// All requests go through the /ingest reverse proxy (see next.config.ts) to
// avoid ad-blockers and keep PostHog within our CSP 'self' allowlist.
// =============================================================================

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Initialise once on the client
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host:         '/ingest',
    ui_host:          'https://eu.posthog.com',
    capture_pageview: false,  // captured manually via PostHogPageView below
    capture_pageleave: true,
    person_profiles:  'identified_only',
  })
}

// ---------------------------------------------------------------------------
// Pageview tracker — must be in Suspense because useSearchParams suspends
// ---------------------------------------------------------------------------

function PostHogPageView() {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const ph          = usePostHog()

  useEffect(() => {
    if (!pathname || !ph) return
    let url = window.origin + pathname
    if (searchParams.toString()) url += `?${searchParams.toString()}`
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

// ---------------------------------------------------------------------------
// User identifier — runs once when userId is available
// ---------------------------------------------------------------------------

function UserIdentifier({ userId, email }: { userId: string; email: string }) {
  const ph         = usePostHog()
  const identified = useRef(false)

  useEffect(() => {
    if (!ph || identified.current) return
    ph.identify(userId, { email })
    identified.current = true
  }, [userId, email, ph])

  return null
}

// ---------------------------------------------------------------------------
// Provider — wrap in root layout
// ---------------------------------------------------------------------------

export function PostHogProvider({
  children,
  userId,
  email,
}: {
  children: React.ReactNode
  userId?:  string
  email?:   string
}) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {userId && email && <UserIdentifier userId={userId} email={email} />}
      {children}
    </PHProvider>
  )
}
