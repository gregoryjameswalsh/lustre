'use client'

import { useActionState } from 'react'
import { useFormStatus }  from 'react-dom'
import { advanceOnboardingStep } from '@/lib/actions/auth'
import { inviteTeamMember }      from '@/lib/actions/team'

function InviteSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-zinc-300 px-5 py-2 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors hover:border-zinc-500 hover:text-zinc-900 disabled:opacity-50"
    >
      {pending ? 'Sending…' : 'Send invite'}
    </button>
  )
}

export default function StepTeam({ organisationId: _organisationId }: { organisationId: string }) {
  const [inviteState, inviteAction] = useActionState(inviteTeamMember, {})

  async function handleContinue() {
    await advanceOnboardingStep(3)
  }

  return (
    <div>
      <h1 className="mb-1 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">
        Your team
      </h1>
      <p className="mb-8 text-sm font-light text-zinc-500">
        Invite your cleaners so they can see their jobs. You can skip this and do it later from Settings.
      </p>

      {/* Invite form */}
      <form action={inviteAction} className="mb-4 space-y-3">
        <input type="hidden" name="role" value="team_member" />

        {inviteState.error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{inviteState.error}</p>
          </div>
        )}
        {inviteState.success && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald-700">Invitation sent.</p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            name="email"
            type="email"
            placeholder="colleague@example.com"
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
          />
          <InviteSubmitButton />
        </div>
      </form>

      <div className="mb-8 flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
        <svg className="h-4 w-4 flex-shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-zinc-500">
          Just you for now? No problem — Lustre works great for solo operators too.
          You can add team members anytime from <strong>Settings → Team</strong>.
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
