'use client'

import { useRouter } from 'next/navigation'
import { advanceOnboardingStep } from '@/lib/actions/auth'

export default function StepTeam({ organisationId }: { organisationId: string }) {
  const router = useRouter()

  async function handleContinue() {
  await advanceOnboardingStep(3)
  router.push('/onboarding?step=4')
}

  return (
    <div>
      <h1 className="mb-1 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">
        Your team
      </h1>
      <p className="mb-8 text-sm font-light text-zinc-500">
        Invite your cleaners so they can see their jobs. You can do this later too.
      </p>

      <div className="mb-6 rounded-lg border border-dashed border-zinc-200 bg-white px-5 py-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
            <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-medium text-[#0c0c0b]">Team invites coming soon</p>
        <p className="mt-1 text-xs text-zinc-400">
          You'll be able to invite cleaners by email in a future update.
          For now, you can add team members from your settings.
        </p>
      </div>

      <div className="mb-8 flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
        <svg className="h-4 w-4 flex-shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-zinc-500">
          Just you for now? No problem — Lustre works great for solo operators too.
        </p>
      </div>

      <button
        onClick={handleContinue}
        className="w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90"
      >
        Continue
      </button>
    </div>
  )
}