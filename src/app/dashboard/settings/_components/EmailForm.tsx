'use client'

// src/app/dashboard/settings/_components/EmailForm.tsx
// =============================================================================
// LUSTRE — Change Email Form
// =============================================================================

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateEmail } from '@/lib/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[#1A3329] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Sending…' : 'Update email'}
    </button>
  )
}

export default function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction] = useActionState(updateEmail, {})

  if (state.success) {
    return (
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-medium text-emerald-800">Check your new inbox</p>
        <p className="mt-0.5 text-xs text-emerald-700">
          A confirmation link has been sent. Click it to complete the change.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500"
        >
          New email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={currentEmail}
          className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#1A3329] focus:ring-2 focus:ring-[#4a5c4e]/10"
        />
      </div>

      <div className="flex justify-start pt-2 sm:justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
