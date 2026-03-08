'use client'

// src/app/dashboard/settings/team/_components/InviteForm.tsx

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { inviteTeamMember } from '@/lib/actions/team'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[#1A3329] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Sending…' : 'Send invitation'}
    </button>
  )
}

export default function InviteForm() {
  const [state, formAction] = useActionState(inviteTeamMember, {})

  return (
    <form action={formAction} className="space-y-4">

      {state.error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-700">Invitation sent.</p>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Email address</label>
        <input
          name="email"
          type="email"
          required
          placeholder="colleague@example.com"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none focus:border-[#1A3329] focus:ring-2 focus:ring-[#4a5c4e]/10"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Role</label>
        <select
          name="role"
          defaultValue="team_member"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-[#0c0c0b] outline-none focus:border-[#1A3329] focus:ring-2 focus:ring-[#4a5c4e]/10"
        >
          <option value="team_member">Team member</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex justify-start pt-1 sm:justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
