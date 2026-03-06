'use client'

// src/app/invite/[token]/signup/_components/InviteSignupForm.tsx
// =============================================================================
// LUSTRE — Invite Signup Form
// Name + password only. Email is pre-resolved from the invite token server-side
// and displayed read-only — the user can't mistype it.
// =============================================================================

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { signUpAsInvitee, type InviteeSignUpState } from '@/lib/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Creating account…' : 'Join team'}
    </button>
  )
}

const initialState: InviteeSignUpState = {}

export default function InviteSignupForm({
  token,
  email,
}: {
  token: string
  email: string
}) {
  const [state, formAction] = useActionState(signUpAsInvitee, initialState)

  if (state.requiresEmailConfirmation) {
    return (
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4a5c4e]/10">
            <svg className="h-6 w-6 text-[#4a5c4e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h2 className="mb-2 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">
          Check your email
        </h2>
        <p className="text-sm font-light leading-relaxed text-zinc-500">
          We&apos;ve sent a confirmation link to <strong className="font-medium text-zinc-700">{email}</strong>.
          Click it to confirm your account and accept the invitation.
        </p>
        <p className="mt-6 text-xs text-zinc-400">
          Already confirmed?{' '}
          <Link href={`/invite/${token}`} className="text-[#4a5c4e] hover:underline">
            Continue to invitation
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {/* Error */}
      {state.error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

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
          autoFocus
          placeholder="Jane Smith"
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
        />
      </div>

      {/* Email — read-only, resolved from invite token */}
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
          Email address
        </label>
        <div className="flex w-full items-center rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
          <span className="text-sm text-zinc-400">{email}</span>
          <span className="ml-2 rounded-full bg-[#4a5c4e]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#4a5c4e]">
            From invite
          </span>
        </div>
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

      <p className="text-center text-xs text-zinc-400">
        Already have an account?{' '}
        <Link
          href={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}
          className="text-[#4a5c4e] hover:underline"
        >
          Log in
        </Link>
      </p>

      <p className="text-center text-xs leading-relaxed text-zinc-300">
        By joining you agree to our{' '}
        <Link href="/legal/terms" className="hover:underline">Terms</Link>{' '}
        and{' '}
        <Link href="/legal/privacy" className="hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  )
}
