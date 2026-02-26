'use client'

// src/app/signup/page.tsx
// =============================================================================
// LUSTRE — Sign Up Page
// Public-facing. Follows Lustre design system:
//   Background: #f9f8f5, Accent: #4a5c4e, Font: Urbanist
// =============================================================================

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { signUp, type SignUpState } from '@/lib/actions/auth'

// -----------------------------------------------------------------------------
// Submit Button — uses useFormStatus to show loading state
// -----------------------------------------------------------------------------

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  )
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

const initialState: SignUpState = {}

export default function SignUpPage() {
  const [state, formAction] = useActionState(signUp, initialState)

  // Email confirmation required state
  if (state.requiresEmailConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f8f5] px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4a5c4e]/10">
              <svg className="h-6 w-6 text-[#4a5c4e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h1 className="mb-2 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">
            Check your email
          </h1>
          <p className="text-sm font-light leading-relaxed text-zinc-500">
            We've sent a confirmation link to your inbox. Click it to activate your account and continue setup.
          </p>
          <p className="mt-6 text-xs text-zinc-400">
            Already confirmed?{' '}
            <Link href="/login" className="text-[#4a5c4e] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f9f8f5]">
      {/* Left panel — form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="mb-10">
            <span className="font-['Urbanist'] text-xl font-light tracking-widest text-[#0c0c0b]">
              LUSTRE
            </span>
          </div>

          <h1 className="mb-2 font-['Urbanist'] text-3xl font-light text-[#0c0c0b]">
            Start your free trial
          </h1>
          <p className="mb-8 text-sm font-light text-zinc-500">
            14 days free. No credit card required.
          </p>

          {/* Error message */}
          {state.error && (
            <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {/* Your name */}
            <div>
              <label
                htmlFor="full_name"
                className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500"
              >
                Your name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                placeholder="Jane Smith"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
              />
            </div>

            {/* Business name */}
            <div>
              <label
                htmlFor="organisation_name"
                className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500"
              >
                Business name
              </label>
              <input
                id="organisation_name"
                name="organisation_name"
                type="text"
                required
                placeholder="Sparkle Cleaning Co."
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="jane@sparklecleaning.co.uk"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Min. 8 characters"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
              />
            </div>

            <div className="pt-2">
              <SubmitButton />
            </div>
          </form>

          {/* Footer links */}
          <p className="mt-6 text-center text-xs text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#4a5c4e] hover:underline">
              Log in
            </Link>
          </p>

          <p className="mt-4 text-center text-xs leading-relaxed text-zinc-300">
            By signing up you agree to our{' '}
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Right panel — brand / social proof */}
      <div className="hidden bg-[#4a5c4e] lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-16">
        {/* Quote */}
        <div className="flex flex-1 flex-col justify-center">
          <blockquote className="mb-8">
            <p className="font-['Urbanist'] text-2xl font-light leading-relaxed text-white/90">
              "Your clients feel looked after.
              <br />
              Your business runs itself."
            </p>
          </blockquote>

          {/* Feature list */}
          <ul className="space-y-4">
            {[
              'CRM built for cleaning — not construction',
              'Client profiles, properties & job history',
              'Activity timeline & follow-up tracking',
              'Quote builder & automated touchpoints',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm font-light text-white/70">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/20">
                  <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M3.72 9.53L1.22 7.03a.75.75 0 011.06-1.06l2 2L9.72 3.03a.75.75 0 111.06 1.06L4.78 9.53a.75.75 0 01-1.06 0z" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Trial note */}
        <div className="rounded-lg border border-white/10 bg-white/5 px-5 py-4">
          <p className="text-xs font-light uppercase tracking-widest text-white/50">
            Free trial
          </p>
          <p className="mt-1 text-sm font-light text-white/80">
            14 days, full access, no credit card. Cancel any time.
          </p>
        </div>
      </div>
    </div>
  )
}