'use client'

// src/app/onboarding/_steps/StepFirstClient.tsx
// =============================================================================
// LUSTRE — Onboarding Step 4: First Client
// This is the activation moment. Getting them to create one real record
// dramatically improves 30-day retention. Don't let them skip easily.
// =============================================================================

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Adding client…' : label}
    </button>
  )
}

export default function StepFirstClient({ organisationId }: { organisationId: string }) {
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const supabase = createClient()

    // Insert client
    const { error: clientError } = await supabase.from('clients').insert({
      organisation_id: organisationId,
      first_name: form.get('first_name') as string,
      last_name:  form.get('last_name')  as string,
      email:      form.get('email')      as string || null,
      phone:      form.get('phone')      as string || null,
      status:     'active',
    })

    if (clientError) {
      setError('Failed to add client. Please try again.')
      return
    }

    // Mark onboarding complete
    await supabase
      .from('organisations')
      .update({
        onboarding_step: 4,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', organisationId)

    setSuccess(true)
    // Short pause so they see the success state, then into the product
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (success) {
    return (
      <div className="py-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4a5c4e]/10">
            <svg className="h-6 w-6 text-[#4a5c4e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="font-['Urbanist'] text-xl font-light text-[#0c0c0b]">You're all set</h2>
        <p className="mt-2 text-sm text-zinc-500">Taking you to your dashboard…</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-1 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">
        Add your first client
      </h1>
      <p className="mb-2 text-sm font-light text-zinc-500">
        Who's your first regular? Add them now and see Lustre come to life.
      </p>
      <p className="mb-8 text-xs text-zinc-400">
        You can add properties and jobs from their profile afterwards.
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
              First name
            </label>
            <input
              name="first_name"
              type="text"
              required
              placeholder="Jane"
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
              Last name
            </label>
            <input
              name="last_name"
              type="text"
              required
              placeholder="Doe"
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
            Email <span className="normal-case tracking-normal text-zinc-400">(optional)</span>
          </label>
          <input
            name="email"
            type="email"
            placeholder="jane@example.com"
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
            Phone <span className="normal-case tracking-normal text-zinc-400">(optional)</span>
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="07700 900000"
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            Add client & go to dashboard
          </button>
        </div>
      </form>

      {/* Skip — harder to find, deliberately */}
      <div className="mt-6 text-center">
        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase
              .from('organisations')
              .update({
                onboarding_step: 4,
                onboarding_completed_at: new Date().toISOString(),
              })
              .eq('id', organisationId)
            router.push('/dashboard')
          }}
          className="text-xs text-zinc-300 hover:text-zinc-500 hover:underline"
        >
          I'll add clients later
        </button>
      </div>
    </div>
  )
}