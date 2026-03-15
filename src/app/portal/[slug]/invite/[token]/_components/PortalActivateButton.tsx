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
  email:    string
  token:    string
  slug:     string
  brand:    string
  autoSend?: boolean
}

export default function PortalActivateButton({ email, token, slug, brand, autoSend = false }: Props) {
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const firedRef = useRef(false)

  // Auto-send only when the parent explicitly requests it (e.g. after an
  // activation failure redirect) — otherwise show a manual button so we
  // don't send an extra email when the client already has one in their inbox.
  useEffect(() => {
    if (!autoSend) return
    if (firedRef.current) return
    firedRef.current = true

    async function sendActivationLink() {
      const supabase = createClient()

      // Store the invite token in a cookie as a belt-and-braces backup.
      document.cookie = `portal_invite_token=${encodeURIComponent(token)}; path=/; max-age=3600; SameSite=Lax`

      // Route through the whitelisted /auth/callback, passing the portal
      // activate URL as ?next= so the session exchange happens there first.
      const activatePath = `/portal/${slug}/auth/activate?invite_token=${encodeURIComponent(token)}`
      const callbackUrl  = `${window.location.origin}/auth/callback?next=${encodeURIComponent(activatePath)}`

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
    setLoading(true)
    firedRef.current = false // allow re-send
    const supabase = createClient()

    document.cookie = `portal_invite_token=${encodeURIComponent(token)}; path=/; max-age=3600; SameSite=Lax`

    const activatePath = `/portal/${slug}/auth/activate?invite_token=${encodeURIComponent(token)}`
    const callbackUrl  = `${window.location.origin}/auth/callback?next=${encodeURIComponent(activatePath)}`

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:  callbackUrl,
        shouldCreateUser: true,
      },
    })

    setLoading(false)
    if (otpError) {
      setError('Failed to send activation email. Please try again.')
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

  // Manual button (autoSend=false) or loading spinner (autoSend=true in flight)
  return (
    <div className="space-y-3">
      {autoSend ? (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-center">
          <p className="text-sm text-zinc-500">Sending activation link…</p>
        </div>
      ) : (
        <>
          <button
            onClick={handleResend}
            disabled={loading}
            style={{ backgroundColor: brand }}
            className="w-full rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send activation link'}
          </button>
          <p className="text-xs text-zinc-400 text-center">
            We&apos;ll send a one-time link to <strong>{email}</strong>
          </p>
        </>
      )}
    </div>
  )
}
