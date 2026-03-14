'use client'

// src/app/portal/[slug]/invite/[token]/_components/PortalActivateButton.tsx
// =============================================================================
// LUSTRE — Portal Activation Button
// Automatically sends a magic link to the client's email when the invite page
// loads. The invite_token is embedded in the redirect URL so the callback can
// activate the account on first click.
// =============================================================================

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email: string
  token: string
  slug:  string
  brand: string
}

export default function PortalActivateButton({ email, token, slug, brand }: Props) {
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const firedRef = useRef(false)

  // Auto-send the activation link as soon as the page loads so the client
  // only needs to click the link in their inbox — no extra button click needed.
  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    async function sendActivationLink() {
      const supabase = createClient()

      // Store the invite token in a cookie so the callback route can read it
      // even if Supabase drops the query-string params during its redirect.
      document.cookie = `portal_invite_token=${encodeURIComponent(token)}; path=/portal/${slug}/auth; max-age=3600; SameSite=Lax`

      // Keep the token in the URL too — belt-and-braces approach.
      const callbackUrl =
        `${window.location.origin}/portal/${slug}/auth/callback?invite_token=${encodeURIComponent(token)}`

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:  callbackUrl,
          shouldCreateUser: true, // First activation creates the auth user
        },
      })

      if (otpError) {
        setError('Failed to send activation email. Please try again.')
        return
      }

      setSent(true)
    }

    sendActivationLink()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleResend() {
    setError(null)
    firedRef.current = false // allow re-send
    const supabase = createClient()

    document.cookie = `portal_invite_token=${encodeURIComponent(token)}; path=/portal/${slug}/auth; max-age=3600; SameSite=Lax`

    const callbackUrl =
      `${window.location.origin}/portal/${slug}/auth/callback?invite_token=${encodeURIComponent(token)}`

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:  callbackUrl,
        shouldCreateUser: true,
      },
    })

    if (otpError) {
      setError('Failed to resend activation email. Please try again.')
      return
    }

    setSent(true)
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
        <button
          onClick={handleResend}
          style={{ backgroundColor: brand }}
          className="w-full rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-center">
          <p className="text-sm font-medium text-emerald-800">Check your inbox</p>
          <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
            We&apos;ve sent an activation link to <strong>{email}</strong>.
            Click the link in that email to access your portal.
          </p>
        </div>
        <p className="text-xs text-zinc-400 text-center">
          Didn&apos;t receive it?{' '}
          <button
            onClick={handleResend}
            className="underline hover:text-zinc-600 transition-colors"
          >
            Send again
          </button>
        </p>
      </div>
    )
  }

  // Loading state while the auto-send is in flight
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-center">
        <p className="text-sm text-zinc-500">Sending activation link…</p>
      </div>
    </div>
  )
}
