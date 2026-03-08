'use client'

// src/app/dashboard/settings/_components/InlineEditEmail.tsx
// =============================================================================
// LUSTRE — Inline email editor
// Shows the current email as text. A "Change" button reveals the change form.
// Email changes require Supabase email verification, so we show a confirmation
// message on success rather than an optimistic update.
// =============================================================================

import { useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateEmail } from '@/lib/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[#1A3329] px-4 py-2 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Sending…' : 'Send confirmation'}
    </button>
  )
}

export default function InlineEditEmail({ currentEmail }: { currentEmail: string }) {
  const [editing, setEditing]  = useState(false)
  const [state, formAction]    = useActionState(updateEmail, {})

  // After a successful submission, show the confirmation prompt
  if (state.success) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">Check your new inbox</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            A confirmation link has been sent. Click it to complete the change.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
        >
          Done
        </button>
      </div>
    )
  }

  if (editing) {
    return (
      <form action={formAction} className="space-y-3">
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-500">
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
        <div className="flex items-center gap-3">
          <SubmitButton />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-zinc-900">{currentEmail}</p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
      >
        Change
      </button>
    </div>
  )
}
