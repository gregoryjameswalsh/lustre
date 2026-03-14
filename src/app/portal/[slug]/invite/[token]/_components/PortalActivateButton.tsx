'use client'

// src/app/portal/[slug]/invite/[token]/_components/PortalActivateButton.tsx
// =============================================================================
// LUSTRE — Portal Activation Button
// Sends a magic link to the client's email with the invite_token embedded
// in the redirect URL so the callback can activate the account.
// =============================================================================

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email: string
  token: string
  slug:  string
  brand: string
}

export default function PortalActivateButton({ email, token, slug, brand }: Props) {
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleActivate() {
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Embed the invite_token in the callback URL so the route handler can
    // call portal_activate_client_account() after exchanging the code.
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
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-center">
          <p className="text-sm font-medium text-emerald-800">Activation email sent</p>
          <p className="mt-1 text-xs text-emerald-700">
            Check your inbox at <strong>{email}</strong> and click the link to activate your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
      <button
        onClick={handleActivate}
        disabled={loading}
        style={{ backgroundColor: brand }}
        className="w-full rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Sending link…' : 'Activate my account'}
      </button>
      <p className="text-xs text-zinc-400 text-center">
        We&apos;ll send a one-time activation link to {email}
      </p>
    </div>
  )
}
