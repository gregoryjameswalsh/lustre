'use client'

// src/app/portal/[slug]/onboarding/_components/PortalOnboardingForm.tsx
// =============================================================================
// LUSTRE — Portal First-Time Onboarding Form
// Shown once after a client activates their account via invitation.
// Lets them set a password for easy future logins, or skip to use email links.
// =============================================================================

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  slug:           string
  clientFirstName: string
  brand:          string
}

export default function PortalOnboardingForm({ slug, clientFirstName, brand }: Props) {
  const router = useRouter()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  function validate(): string | null {
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (password !== confirm) return 'Passwords don\'t match.'
    return null
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message ?? 'Failed to set password. Please try again.')
      setLoading(false)
      return
    }

    router.push(`/portal/${slug}/dashboard`)
  }

  function handleSkip() {
    router.push(`/portal/${slug}/dashboard`)
  }

  return (
    <form onSubmit={handleSetPassword} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-xs font-medium text-zinc-500 mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-xs font-medium text-zinc-500 mb-1.5">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        style={{ backgroundColor: brand }}
        className="w-full rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Set password & continue'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors underline-offset-2 hover:underline"
        >
          Skip — I&apos;ll use email links to log in
        </button>
      </div>

      <p className="text-center text-xs text-zinc-300 leading-relaxed">
        You can always set or change your password later from your account settings.
      </p>
    </form>
  )
}
