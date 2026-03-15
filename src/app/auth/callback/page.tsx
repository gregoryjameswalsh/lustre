'use client'

// src/app/auth/callback/page.tsx
// =============================================================================
// LUSTRE — Unified Auth Callback
//
// Supabase redirects here after magic links and password-reset links.
// Handles two session-delivery formats:
//
//   • PKCE (operator login, portal magic link via PortalActivateButton)
//     → Supabase delivers a ?code= query param
//     → We call exchangeCodeForSession(code) which resolves the PKCE verifier
//       from the browser cookies set when signInWithOtp was called.
//
//   • Implicit (admin-generated invitation links)
//     → Supabase delivers #access_token=...&refresh_token=... in the URL hash
//     → We call setSession() to establish the session
//
// After the session is set we redirect to the ?next= param (default /dashboard).
// =============================================================================

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const router      = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleAuth() {
      const supabase = createClient()

      // Only allow relative paths to prevent open-redirect attacks
      const rawNext = searchParams.get('next') ?? '/dashboard'
      const next    = rawNext.startsWith('/') ? rawNext : '/dashboard'

      // ── PKCE flow ──────────────────────────────────────────────────────────
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          window.location.href = next
          return
        }
        window.location.href = '/login?error=link_expired'
        return
      }

      // ── Implicit flow (admin-generated invitation links) ───────────────────
      const hash       = window.location.hash.slice(1)
      const hashParams = new URLSearchParams(hash)
      const accessToken  = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        })
        if (!error) {
          window.location.href = next
          return
        }
      }

      // Nothing worked — send to login with a hint
      window.location.href = '/login?error=link_expired'
    }

    handleAuth()
  // searchParams identity is stable; exhaustive-deps lint disabled intentionally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f8f5]">
      <p className="text-sm text-zinc-400">Signing in…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f9f8f5]">
          <p className="text-sm text-zinc-400">Signing in…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
