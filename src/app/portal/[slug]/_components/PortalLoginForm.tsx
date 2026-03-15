'use client'

// src/app/portal/[slug]/_components/PortalLoginForm.tsx
// =============================================================================
// LUSTRE — Portal Login Form
// Supports two modes:
//   • Email link  — magic link sent to inbox (passwordless, the default)
//   • Password    — email + password for clients who set one during onboarding
// =============================================================================

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  slug:           string
  orgName?:       string
  orgBrandColor?: string | null
  orgLogoUrl?:    string | null
  welcomeMessage?: string | null
  authError?:     string
}

export default function PortalLoginForm({
  slug,
  orgName,
  orgBrandColor,
  orgLogoUrl,
  welcomeMessage,
  authError,
}: Props) {
  const [mode,     setMode]    = useState<'link' | 'password'>('link')
  const [email,    setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [sent,     setSent]    = useState(false)
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState<string | null>(null)

  const brand       = orgBrandColor ?? '#1A3329'
  const displayName = orgName ?? 'Your Client Portal'

  // ── Magic link (passwordless) ──────────────────────────────────────────────

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase      = createClient()
    const activatePath  = `/portal/${slug}/auth/activate`
    const callbackUrl   = `${window.location.origin}/auth/callback?next=${encodeURIComponent(activatePath)}`

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo:  callbackUrl,
        shouldCreateUser: false, // Portal clients must be invited first
      },
    })

    if (otpError) {
      setError('We couldn\'t find a portal account for that email address. Check you\'re using the email your service provider has on file, or look for an invitation email.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  // ── Password login ─────────────────────────────────────────────────────────

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    })

    if (signInError) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }

    // Session set — navigate to dashboard
    window.location.href = `/portal/${slug}/dashboard`
  }

  function switchMode(next: 'link' | 'password') {
    setMode(next)
    setError(null)
    setPassword('')
    setSent(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="mb-8 text-center">
          {orgLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={orgLogoUrl}
              alt={displayName}
              className="mx-auto mb-4 max-h-12 max-w-[180px] object-contain"
            />
          ) : (
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-4"
              style={{ color: brand }}
            >
              {displayName}
            </p>
          )}
          <h1 className="text-2xl font-light tracking-tight text-zinc-900">
            Client Portal
          </h1>
          {welcomeMessage && (
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{welcomeMessage}</p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">

          {/* Auth-error banner (e.g. link expired after returning from callback) */}
          {authError && (
            <div className="mb-6 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-700 leading-relaxed">
                Your login link has expired or was already used. Enter your email below to
                receive a new one.
              </p>
            </div>
          )}

          {/* Mode tabs */}
          <div className="mb-6 flex rounded-lg border border-zinc-100 bg-zinc-50 p-0.5">
            <button
              type="button"
              onClick={() => switchMode('link')}
              className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                mode === 'link'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              Email link
            </button>
            <button
              type="button"
              onClick={() => switchMode('password')}
              className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                mode === 'password'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              Password
            </button>
          </div>

          {/* ── Magic link mode ─────────────────────────────────────────── */}
          {mode === 'link' && (
            <>
              {sent ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-zinc-900">Check your inbox</p>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    We sent a login link to{' '}
                    <strong className="text-zinc-600">{email}</strong>.
                    The link is valid for 1 hour.
                  </p>
                  <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                    Open the link in the same browser you&apos;re using now.
                  </p>
                  <button
                    onClick={() => { setSent(false); setEmail('') }}
                    className="mt-6 text-xs font-medium uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label htmlFor="email-link" className="block text-xs font-medium text-zinc-500 mb-1.5">
                      Email address
                    </label>
                    <input
                      id="email-link"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                      <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    style={{ backgroundColor: brand }}
                    className="w-full rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? 'Sending…' : 'Send login link'}
                  </button>

                  <p className="text-center text-xs text-zinc-400 leading-relaxed">
                    We&apos;ll send a secure one-time link to your inbox — no password needed.
                  </p>
                  <p className="text-center text-xs text-zinc-300 leading-relaxed">
                    First time here? Check your email for an invitation.
                  </p>
                </form>
              )}
            </>
          )}

          {/* ── Password mode ───────────────────────────────────────────── */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="email-pw" className="block text-xs font-medium text-zinc-500 mb-1.5">
                  Email address
                </label>
                <input
                  id="email-pw"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-zinc-500 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
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
                disabled={loading || !email || !password}
                style={{ backgroundColor: brand }}
                className="w-full rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <p className="text-center text-xs text-zinc-400 leading-relaxed">
                Forgotten your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('link')}
                  className="underline hover:text-zinc-600 transition-colors"
                >
                  Use an email link instead.
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-300">
          Powered by Lustre
        </p>
      </div>
    </div>
  )
}
