'use client'

// src/app/onboarding/_steps/StepServices.tsx
// =============================================================================
// LUSTRE — Onboarding Step 2: Services
// Job types are now seeded automatically for every new org (Regular Clean,
// Deep Clean, Move In, Move Out, Post Event, Other). Admins can customise
// them after signup from Settings → Job Types.
// This step simply advances onboarding — no hardcoded service type selection.
// =============================================================================

import { useFormStatus } from 'react-dom'
import { useActionState } from 'react'
import { saveServiceConfig } from '@/lib/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Continuing…' : 'Continue'}
    </button>
  )
}

export default function StepServices() {
  const [, formAction] = useActionState(saveServiceConfig, {})

  return (
    <div>
      <h1 className="mb-1 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">
        Your job types are ready
      </h1>
      <p className="mb-8 text-sm font-light text-zinc-500">
        We&apos;ve set up standard job types for you — Regular Clean, Deep Clean, Move In, Move Out, Post Event, and Other. You can customise these any time from Settings → Job Types.
      </p>

      <div className="mb-8 space-y-2">
        {['Regular Clean', 'Deep Clean', 'Move In', 'Move Out', 'Post Event', 'Other'].map((name) => (
          <div
            key={name}
            className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3"
          >
            <span className="h-4 w-4 rounded border border-[#4a5c4e] bg-[#4a5c4e]/10 flex items-center justify-center flex-shrink-0">
              <svg className="h-2.5 w-2.5 text-[#4a5c4e]" fill="currentColor" viewBox="0 0 12 12">
                <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </span>
            <p className="text-sm font-medium text-[#0c0c0b]">{name}</p>
          </div>
        ))}
      </div>

      <form action={formAction}>
        <SubmitButton />
      </form>

      <div className="mt-4 text-center">
        <a href="/onboarding?step=3" className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline">
          Skip for now
        </a>
      </div>
    </div>
  )
}
