'use client'

// src/app/onboarding/_steps/StepBusinessProfile.tsx
// =============================================================================
// LUSTRE — Onboarding Step 1: Business Profile
// =============================================================================

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveBusinessProfile } from '@/lib/actions/auth'

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

interface OrgData {
  name: string
  phone: string | null
  website: string | null
  address_line1: string | null
  address_line2: string | null
  town: string | null
  postcode: string | null
}

export default function StepBusinessProfile({ org }: { org: OrgData }) {
  const [state, formAction] = useActionState(saveBusinessProfile, {})

  return (
    <div>
      <h1 className="mb-1 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">
        Business profile
      </h1>
      <p className="mb-8 text-sm font-light text-zinc-500">
        This information appears on your quotes and client-facing documents.
      </p>

      {state.error && (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* Phone */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
            Business phone
          </label>
          <input
            name="phone"
            type="tel"
            defaultValue={org.phone ?? ''}
            placeholder="07700 900000"
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
          />
        </div>

        {/* Website */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
            Website <span className="normal-case tracking-normal text-zinc-400">(optional)</span>
          </label>
          <input
            name="website"
            type="url"
            defaultValue={org.website ?? ''}
            placeholder="https://yourcleaningco.co.uk"
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
          />
        </div>

        {/* Address */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
            Business address <span className="normal-case tracking-normal text-zinc-400">(optional)</span>
          </label>
          <div className="space-y-2">
            <input
              name="address_line1"
              type="text"
              defaultValue={org.address_line1 ?? ''}
              placeholder="Address line 1"
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
            />
            <input
              name="address_line2"
              type="text"
              defaultValue={org.address_line2 ?? ''}
              placeholder="Address line 2"
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="town"
                type="text"
                defaultValue={org.town ?? ''}
                placeholder="Town / City"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
              />
              <input
                name="postcode"
                type="text"
                defaultValue={org.postcode ?? ''}
                placeholder="Postcode"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none transition focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <SubmitButton />
        </div>
      </form>

      {/* Skip */}
      <div className="mt-4 text-center">
        <a
          href="/onboarding?step=2"
          className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline"
        >
          Skip for now
        </a>
      </div>
    </div>
  )
}