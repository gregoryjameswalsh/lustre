'use client'

// src/app/onboarding/_steps/StepServices.tsx
// =============================================================================
// LUSTRE — Onboarding Step 2: Services
// Lets them tick which service types they offer. Lightweight for now —
// in Phase 2 this will expand to include per-service pricing defaults.
// =============================================================================

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveServiceConfig } from '@/lib/actions/auth'

const SERVICE_OPTIONS = [
  { value: 'regular',    label: 'Regular cleaning',    desc: 'Weekly or fortnightly visits' },
  { value: 'deep_clean', label: 'Deep clean',          desc: 'Top-to-toe intensive cleans'  },
  { value: 'move_in',    label: 'Move-in clean',       desc: 'For new tenants or owners'    },
  { value: 'move_out',   label: 'Move-out clean',      desc: 'End of tenancy'               },
  { value: 'post_event', label: 'Post-event clean',    desc: 'After parties or gatherings'  },
  { value: 'other',      label: 'Other',               desc: 'Anything else you offer'      },
]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Continue'}
    </button>
  )
}

export default function StepServices() {
  const [, formAction] = useActionState(saveServiceConfig, {})

  return (
    <div>
      <h1 className="mb-1 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">
        What do you offer?
      </h1>
      <p className="mb-8 text-sm font-light text-zinc-500">
        Tick everything that applies — you can change this any time.
      </p>

      <form action={formAction}>
        <div className="mb-8 space-y-2">
          {SERVICE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-4 transition-colors hover:border-[#4a5c4e]/40 has-[:checked]:border-[#4a5c4e] has-[:checked]:bg-[#4a5c4e]/5"
            >
              <input
                type="checkbox"
                name="service_types"
                value={option.value}
                defaultChecked={['regular', 'deep_clean'].includes(option.value)}
                className="h-4 w-4 rounded border-zinc-300 text-[#4a5c4e] focus:ring-[#4a5c4e]"
              />
              <div>
                <p className="text-sm font-medium text-[#0c0c0b]">{option.label}</p>
                <p className="text-xs text-zinc-400">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>

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